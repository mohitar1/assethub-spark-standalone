/**
 * Controller for the asset-enrichment agent. Wires discovery -> read ->
 * generate -> normalize -> write approved metadata -> report, with a --dry-run that stops before
 * any write. Dependency-injected (`client`, `generator`, `log`) so the flow is testable
 * without live network or credentials; the CLI bootstrap at the bottom supplies the real
 * implementations.
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { enumerateFolder } from './enumerate.js';
import { isAlreadyEnriched, fieldsFromMetadata } from './metadata.js';
import { fetchRenditionBytes, isImageFormat } from './rendition.js';
import { normalizeGenerated } from './normalize.js';
import {
  buildSlingMetadataUpdate,
  getSlingAssetMetadata,
  waitForAssetProcessed,
  writeSlingAssetMetadata,
} from './sling-metadata.js';
import { Report, OUTCOME } from './report.js';
import { createAssetMetadataGenerator } from './generate.js';
import { buildProductCategoryRepresentatives } from './representatives.js';
import { applyCategoryPlan, buildCategoryCoverage } from './category-plan.js';
import { scrapeSiteImages } from './scrape-site.js';
import { createUploadStrategy } from './upload-strategy.js';
import { ImsTokenProvider } from './ims-auth.js';
import { AuthorClient } from './author-client.js';
import { createFixtureClient } from './fixture-client.js';
import {
  STATUS_APPROVED, buildHosts, buildAuthorHost, BRING_IN_MIN_TARGET_IMAGES,
} from './constants.js';
import { mapWithConcurrency } from './concurrency.js';
import {
  parseArgs, validateOptions, resolveCreds, resolveAemEnvId,
} from './config.js';

export { mapWithConcurrency };

/**
 * Plan one asset: read metadata, skip if already enriched, fetch a rendition, generate +
 * normalize. Returns { asset, skip } or { asset, fields }.
 */
async function planAsset({
  client, asset, generator, customerKey, force, assetProcessedPoll,
}) {
  let meta;
  if (asset.dryRunSourceAsset) {
    meta = {
      assetMetadata: {},
      repositoryMetadata: { 'dc:format': asset.contentType || 'application/octet-stream' },
      etag: null,
    };
  } else {
    // Wait for AEM's asset-processing pipeline (thumbnail, metadata extraction, smart
    // tagging) to finish before reading metadata — otherwise autogen:* fields may be
    // missing or stale, and generate.js/category-plan.js would silently fall back to
    // weaker filename/alt-text evidence with no indication anything was incomplete.
    const { processed, meta: polled } = await waitForAssetProcessed(
      client,
      asset.repoPath,
      assetProcessedPoll,
    );
    meta = polled;
    if (!processed) {
      throw new Error('asset did not reach dam:assetState=processed before the poll timeout');
    }
  }
  if (!force && isAlreadyEnriched(meta.assetMetadata, customerKey)) {
    return {
      asset,
      skip: true,
      fields: fieldsFromMetadata(meta.assetMetadata),
      existingMetadata: meta.assetMetadata,
      repositoryMetadata: meta.repositoryMetadata,
    };
  }
  const dcFormat = meta.repositoryMetadata['dc:format'] || asset.contentType;
  let renditionBytes = null;
  if (!asset.dryRunSourceAsset && isImageFormat(dcFormat)) {
    const rendition = await fetchRenditionBytes(client, asset.assetId).catch(() => null);
    renditionBytes = rendition?.bytes || null;
  }
  const hints = {
    machineKeywords: meta.assetMetadata['xcm:machineKeywords'],
    repoName: asset.repoName || asset.fileName,
    dcFormat,
    sourcePage: asset.sourcePage,
    pageTitle: asset.pageTitle,
    heading: asset.heading,
    altText: asset.altText,
    nearbyText: asset.nearbyText,
  };
  const raw = await generator({
    assetId: asset.assetId,
    repoName: asset.repoName || asset.fileName,
    hints,
    renditionBytes,
    existingAssetMetadata: meta.assetMetadata,
  });
  const fields = normalizeGenerated(raw);
  return {
    asset,
    etag: meta.etag,
    fields,
    existingMetadata: meta.assetMetadata,
    repositoryMetadata: meta.repositoryMetadata,
  };
}

function metadataPreview(plans = []) {
  return plans
    .map((p) => `${p.asset.repoPath || p.asset.assetId}\n${JSON.stringify(p.metadataPlan.entries, null, 2)}`)
    .join('\n\n');
}

function findRepoRoot(startDir) {
  let dir = resolve(startDir);
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'cloudflare/src/config.js'))) return dir;
    dir = dirname(dir);
  }
  return null;
}

async function discoverTargetAssets({
  options, client, folderPath, report, log,
}) {
  if (options.sourceUrl) {
    const scraped = await scrapeSiteImages({
      pageUrl: options.sourceUrl,
      maxImages: options.limit || undefined,
      fetchFn: options.fetchFn || fetch,
      log,
    });
    report.setContext({
      sourceUrl: options.sourceUrl,
      scrapedCandidates: scraped.candidates,
      downloadedAssets: scraped.images.length,
    });

    if (options.dryRun) {
      log.info?.('[agent] DRY RUN — scraped/downloaded assets; upload and metadata PATCH require a live run');
      return {
        assets: scraped.images.map((img) => {
          const {
            bytes, fileName, contentType, ...evidence
          } = img;
          return {
            ...evidence,
            dryRunSourceAsset: true,
            assetId: `dry-run:${fileName}`,
            repoPath: `${folderPath}/${fileName}`,
            repoName: fileName,
            fileName,
            contentType,
          };
        }),
      };
    }

    const uploader = createUploadStrategy('repository', { client });
    await uploader.ensureFolder({ folderPath });
    const { uploaded, failures } = await uploader.uploadImages({
      folderPath,
      images: scraped.images,
    });
    failures.forEach((f) => {
      report.record(f.fileName, OUTCOME.FAILED, { stage: 'upload', error: f.error });
    });
    if (uploaded.length < BRING_IN_MIN_TARGET_IMAGES) {
      log.warn?.(`[agent] only uploaded ${uploaded.length} asset(s); target at least ${BRING_IN_MIN_TARGET_IMAGES} for credible category coverage`);
    }

    log.info?.('[agent] resolving uploaded file asset ids from folder enumeration');
    const recovered = await enumerateFolder({ client, folderPath });
    const byPath = new Map(recovered.assets.map((asset) => [asset.repoPath, asset]));
    const byName = new Map(recovered.assets.map((asset) => [asset.repoName, asset]));
    const unresolved = [];
    const resolved = [];
    for (const asset of uploaded) {
      const match = byPath.get(asset.repoPath) || byName.get(asset.repoName);
      if (match?.assetId) resolved.push({ ...asset, ...match });
      else unresolved.push(asset);
    }
    unresolved.forEach((asset) => {
      report.record(asset.repoPath || asset.repoName || asset.fileName, OUTCOME.FAILED, {
        stage: 'upload-id',
        error: 'uploaded asset was not found by folder enumeration',
      });
    });
    return {
      assets: resolved,
    };
  }

  const {
    assets, scanned, matched, exceededWindow,
  } = await enumerateFolder({ client, folderPath });
  log.info?.(`[agent] scanned ${scanned} repo assets, ${matched} under ${folderPath}`);
  if (exceededWindow) {
    log.warn?.(`[agent] hit the scan cap before exhausting the repo — some assets under ${folderPath} may be missed; narrow with --dam-path`);
  }

  if (options.limit && Number.isFinite(options.limit)) {
    return { assets: assets.slice(0, options.limit) };
  }
  return { assets };
}

/**
 * Run the enrichment flow.
 * @returns {Promise<{
 *   report: Report,
 *   dryRun: boolean,
 *   metadataPreview?: string,
 *   patchPreview?: string
 * }>}
 */
export async function enrichAssets({
  options, client, generator, log = console,
}) {
  const report = new Report();
  const { customerKey } = options;
  // allowedCountries: ['global'] makes every enriched asset visible regardless of the
  // viewer's country. The worker's country authz clause (dm.js) otherwise hides untagged
  // assets from any country-scoped user (the demo's "0 results" failure).
  const scope = { company: customerKey, status: STATUS_APPROVED, allowedCountries: ['global'] };
  const folderPath = options.damPath || `/content/dam/${customerKey}`;
  report.setContext({
    customerKey,
    damPath: folderPath,
    metadataWrite: 'sling-post',
  });

  log.info?.(`[agent] enrich customer=${customerKey} folder=${folderPath} dryRun=${options.dryRun}`);

  const { assets: targetAssets } = await discoverTargetAssets({
    options,
    client,
    folderPath,
    report,
    log,
  });

  if (targetAssets.length === 0) {
    log.warn?.(`[agent] No assets ready for metadata enrichment under ${folderPath}.`);
    return { report, dryRun: options.dryRun, patchPreview: '' };
  }

  // [4] Read + generate + normalize (bounded concurrency)
  const planned = await mapWithConcurrency(
    targetAssets,
    options.concurrency,
    async (asset) => {
      try {
        return await planAsset({
          client,
          asset,
          generator,
          customerKey,
          force: options.force,
          assetProcessedPoll: options.assetProcessedPoll,
        });
      } catch (err) {
        report.record(asset.assetId, OUTCOME.FAILED, { stage: 'plan', error: String(err.message || err) });
        return { asset, error: err };
      }
    },
  );

  const categorized = applyCategoryPlan(planned);
  const withMetadataPlans = categorized.map((p) => {
    if (!p || p.error || p.skip || !p.fields) return p;
    return {
      ...p,
      metadataPlan: buildSlingMetadataUpdate(p.fields, scope, p.existingMetadata),
    };
  });
  const categoryCoverage = buildCategoryCoverage(withMetadataPlans);
  report.setCategoryCoverage(categoryCoverage);
  report.setRepresentatives(buildProductCategoryRepresentatives(withMetadataPlans));

  const writable = [];
  withMetadataPlans.forEach((p) => {
    if (!p || p.error) return;
    if (p.skip) {
      report.record(p.asset.assetId, OUTCOME.SKIPPED, { reason: 'already-enriched' });
      return;
    }
    if (!p.fields?.productCategory) {
      report.record(p.asset.assetId, OUTCOME.FAILED, {
        stage: 'category',
        error: 'no supported productCategory from source evidence',
      });
      return;
    }
    if (!p.asset?.repoPath) {
      report.record(p.asset.assetId, OUTCOME.FAILED, {
        stage: 'metadata-path',
        error: 'missing DAM repoPath required for Sling metadata write',
      });
      return;
    }
    if (p.metadataPlan?.conflicts?.length) {
      report.record(p.asset.assetId, OUTCOME.FAILED, {
        stage: 'metadata-plan',
        error: JSON.stringify(p.metadataPlan.conflicts),
      });
      return;
    }
    if (!p.metadataPlan?.entries?.length) {
      report.record(p.asset.assetId, OUTCOME.SKIPPED, { reason: 'no-missing-metadata' });
      return;
    }
    writable.push(p);
  });

  const preview = metadataPreview(writable);

  // [5] Dry-run stops here
  if (options.dryRun) {
    log.info?.(`[agent] DRY RUN - would update Sling metadata for ${writable.length} asset(s):`);
    log.info?.(preview);
    writable.forEach((p) => report.record(p.asset.assetId, OUTCOME.ENRICHED, { dryRun: true }));
    return {
      report, dryRun: true, metadataPreview: preview, patchPreview: preview,
    };
  }

  // [5] Write
  await mapWithConcurrency(writable, options.concurrency, async (p) => {
    const res = await writeSlingAssetMetadata(
      client,
      p.asset.repoPath,
      p.metadataPlan,
    );
    if (res.ok && res.skipped) {
      report.record(p.asset.assetId, OUTCOME.SKIPPED, { reason: 'no-missing-metadata-after-reread' });
    } else if (res.ok) {
      try {
        const fresh = await getSlingAssetMetadata(client, p.asset.repoPath);
        if (!isAlreadyEnriched(fresh.assetMetadata, customerKey)) {
          report.record(p.asset.assetId, OUTCOME.FAILED, {
            stage: 'verify',
            error: 'metadata write succeeded but required scope fields were not readable after write',
          });
          return;
        }
        report.record(p.asset.assetId, OUTCOME.ENRICHED, { via: 'sling' });
      } catch (err) {
        report.record(p.asset.assetId, OUTCOME.FAILED, {
          stage: 'verify',
          error: String(err.message || err),
        });
      }
    } else {
      report.record(p.asset.assetId, OUTCOME.FAILED, { stage: 'sling-post', status: res.status, error: res.error });
    }
  });

  log.info?.('[agent] enriched assets stamped dam:status=approved through Sling metadata');

  return {
    report, dryRun: false, metadataPreview: preview, patchPreview: preview,
  };
}

/**
 * Rewrites the demo scope keys in cloudflare/src/config.js to `customerKey`:
 *   - `DEMO_COMPANY`   → asset-search scope (assetMetadata.company === customerKey)
 *   - `DEMO_BASE_PATH` → portal routing/login base ('/<customerKey>')
 * Both are the SAME key: the content lives under the /<customerKey> DA folder and
 * the assets are tagged with the same company. No-ops on dry runs / missing file.
 * @param {string} customerKey
 * @param {{ dryRun?: boolean }} options
 */
function patchDemoCompany(customerKey, { dryRun = false } = {}) {
  if (dryRun) return;
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(process.cwd()) || findRepoRoot(scriptDir);
  const configPath = repoRoot && resolve(repoRoot, 'cloudflare/src/config.js');
  if (!configPath || !existsSync(configPath)) {
    console.warn('[agent] config.js not found — skipping demo scope patch');
    return;
  }
  const original = readFileSync(configPath, 'utf8');
  let patched = original.replace(
    /DEMO_COMPANY:\s*(?:null|'[^']*'|"[^"]*")/,
    `DEMO_COMPANY: '${customerKey}'`,
  );
  patched = patched.replace(
    /DEMO_BASE_PATH:\s*(?:null|'[^']*'|"[^"]*")/,
    `DEMO_BASE_PATH: '/${customerKey}'`,
  );
  if (patched === original) {
    console.warn('[agent] DEMO_COMPANY + DEMO_BASE_PATH already set correctly — no patch needed');
    return;
  }
  writeFileSync(configPath, patched, 'utf8');
  console.warn(`[agent] patched cloudflare/src/config.js → DEMO_COMPANY: '${customerKey}', DEMO_BASE_PATH: '/${customerKey}'`);
  console.warn('[agent] local dev server will pick this up automatically on next request');
  console.warn('[agent] the per-PR worker deploy applies it to the preview URL');
}

/** CLI bootstrap. */
export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const errors = validateOptions(options);
  if (errors.length > 0) {
    console.error(`Invalid arguments:\n  - ${errors.join('\n  - ')}`);
    process.exit(2);
  }

  const generator = createAssetMetadataGenerator();

  // Dispatch:
  //  - --fixture: fully offline preview, forced dry-run.
  //  - otherwise: DM client_credentials against the AEM Assets Author API.
  let run;

  if (options.fixture) {
    const assets = JSON.parse(readFileSync(options.fixture, 'utf8'));
    const client = createFixtureClient(assets);
    if (!options.dryRun) {
      console.warn('[agent] --fixture is offline-only; forcing --dry-run.');
      options.dryRun = true;
    }
    run = () => enrichAssets({ options, client, generator });
  } else {
    const aemEnvId = resolveAemEnvId({ aemEnvId: options.aemEnvId });
    let creds = null;
    try {
      creds = resolveCreds({ secretsFile: options.secretsFile });
    } catch (err) {
      if (options.dryRun) {
        console.error(
          `[agent] ${err.message}\n`
          + '[agent] --dry-run against AEM needs folder discovery, which requires DM creds and network. '
          + 'Provide SPARK_DM_CLIENT_ID/SPARK_DM_CLIENT_SECRET, pass --fixture <file.json> for a '
          + 'fully offline preview, or run the unit tests for offline verification of the pipeline logic.',
        );
        process.exit(2);
      }
      throw err;
    }
    const authorHost = buildAuthorHost(aemEnvId);
    const tokenProvider = new ImsTokenProvider({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    });
    const client = new AuthorClient({
      tokenProvider,
      clientId: creds.clientId,
      hosts: buildHosts(aemEnvId),
      authorHost,
    });
    console.warn(`[agent] using DM creds from ${creds.source}`);
    console.warn(`[agent] targeting AEM author env ${aemEnvId} via the Assets Author API`);
    run = () => enrichAssets({ options, client, generator });
  }

  const { report } = await run();

  // Surface per-asset failures on the CLI (not just in --report-file).
  const failures = report.assets.filter((a) => a.outcome === OUTCOME.FAILED);
  for (const f of failures) {
    const bits = [f.stage && `stage=${f.stage}`, f.status && `status=${f.status}`, f.error]
      .filter(Boolean)
      .join(' ');
    console.error(`[agent] FAILED ${f.assetId}: ${bits}`);
  }

  if (report.representatives) {
    const { items = {}, missing = [] } = report.representatives;
    const categories = Object.keys(items);
    if (categories.length > 0) {
      console.warn(`[agent] representatives productCategory=${categories.join(', ')}`);
    }
    if (missing.length > 0) {
      console.warn(`[agent] missing representatives for productCategory=${missing.join(', ')}`);
    }
  }
  if (report.categoryCoverage?.categories?.length) {
    const coverage = report.categoryCoverage.categories
      .map((c) => `${c.slug}:${c.assetCount}`)
      .join(', ');
    console.warn(`[agent] category coverage productCategory=${coverage}`);
  }
  if (report.categoryCoverage?.unclassified?.length) {
    console.warn(`[agent] unclassified assets=${report.categoryCoverage.unclassified.length}`);
  }

  if (options.reportFile) {
    writeFileSync(options.reportFile, JSON.stringify(report.toJSON(), null, 2));
  }

  // Auto-scope the worker to this customer after a live enrichment run.
  if (!options.dryRun && options.customerKey) {
    patchDemoCompany(options.customerKey, { dryRun: false });
  }

  console.log(`[agent] done: ${report.summaryLine()}`);
  process.exit(report.exitCode());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    const msg = err?.message || String(err);
    if (err && (err.status || err.responseBody || err.responseHeaders)) {
      const interesting = ['x-request-id', 'x-gw-ims-org-id', 'www-authenticate', 'content-type'];
      const hdrs = err.responseHeaders || {};
      const picked = interesting
        .filter((h) => hdrs[h] != null)
        .map((h) => `  ${h}: ${hdrs[h]}`)
        .join('\n');
      console.error('[agent] exact author API response:');
      if (err.status) console.error(`  status: ${err.status}`);
      if (picked) console.error(picked);
      console.error(`  body: ${err.responseBody || '(empty)'}`);
    }
    if (/not allowlisted/i.test(msg)) {
      console.error(
        '[agent] fatal: the AEM author API rejected this client ID as not allowlisted.\n'
        + '[agent] The IMS technical-account client ID must be allowlisted for this environment '
        + 'via the AEM Configuration Pipeline (cloud manager config, "api allowlist") before the '
        + 'author Assets HTTP API will accept it. Credentials and scopes are otherwise correct.',
      );
      process.exit(3);
    }
    console.error(`[agent] fatal: ${err.stack || msg}`);
    process.exit(1);
  });
}
