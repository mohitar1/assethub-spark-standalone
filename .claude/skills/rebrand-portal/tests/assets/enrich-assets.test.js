import { describe, it, expect } from 'vitest';
import { enrichAssets, mapWithConcurrency } from '../../scripts/assets/enrich-assets.js';
import { createAssetMetadataGenerator } from '../../scripts/assets/generate.js';
import { makeRes, makeClient } from './helpers.js';

const silent = { info: () => {}, warn: () => {} };

function baseOptions(overrides = {}) {
  return {
    customerKey: 'santander',
    damPath: '/content/dam/santander',
    dryRun: false,
    force: false,
    bringIn: false,
    concurrency: 1,
    limit: null,
    ...overrides,
  };
}

function searchPage(assets) {
  return makeRes({ body: { items: assets } });
}

const oneAsset = [{
  assetId: 'a1',
  repositoryMetadata: { 'repo:path': '/content/dam/santander/product-hero.bin', 'repo:name': 'product-hero.bin' },
}];

const generator = async () => ({
  title: 'Product Hero',
  description: 'desc',
  keywords: ['product', 'hero', 'launch'],
});

// dam:assetState lives on the asset's jcr:content node itself, not inside the
// jcr:content/metadata sub-node — so waitForAssetProcessed does a separate GET
// (jcr:content.json) for the state before reading the full jcr:content/metadata.json.
// `metadata()` returns BOTH responses as a pair (spread into the client queue), defaulting
// to already-processed. Use `stateRes('not-yet')` standalone for tests that need the poll
// to keep going (see the "waits for asset processing" tests below).
function stateRes(assetState = 'processed') {
  return makeRes({ body: assetState === undefined ? {} : { 'dam:assetState': assetState } });
}

function metadataOnly(assetMetadata = {}, repositoryMetadata = { 'dc:format': 'application/octet-stream' }) {
  return makeRes({
    body: { ...assetMetadata, 'dc:format': repositoryMetadata['dc:format'] },
    headers: { ETag: '"v1"' },
  });
}

// Pre-write plan read: waitForAssetProcessed's state check + the full metadata GET.
function metadata(assetMetadata = {}, repositoryMetadata = { 'dc:format': 'application/octet-stream' }) {
  return [stateRes('processed'), metadataOnly(assetMetadata, repositoryMetadata)];
}

// Post-write verify: a single direct getSlingAssetMetadata GET (no polling involved).
function verifyRes(assetMetadata = {}, repositoryMetadata = { 'dc:format': 'application/octet-stream' }) {
  return metadataOnly(assetMetadata, repositoryMetadata);
}

function htmlRes(html) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'text/html' },
    text: async () => html,
  };
}

function assetRes(bytes, contentType = 'image/png') {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return {
    ok: true,
    status: 200,
    headers: { get: (key) => (key.toLowerCase() === 'content-type' ? contentType : null) },
    arrayBuffer: async () => buf,
  };
}

describe('mapWithConcurrency', () => {
  it('preserves order and processes every item', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8]);
  });
});

describe('enrichAssets controller', () => {
  it('dry-run: generates a Sling metadata preview without writing', async () => {
    const client = makeClient([searchPage(oneAsset), ...metadata()]);
    const out = await enrichAssets({
      options: baseOptions({ dryRun: true }), client, generator, log: silent,
    });
    expect(out.dryRun).toBe(true);
    expect(out.report.counts().enriched).toBe(1);
    expect(out.metadataPreview).toContain('./productCategory');
    expect(out.metadataPreview).toContain('./company');
    expect(out.report.toJSON().representatives.items.products).toMatchObject({
      assetId: 'a1',
      assetPath: '/content/dam/santander/product-hero.bin',
      productCategory: 'products',
      title: 'Product Hero',
    });
    expect(client.calls.map((c) => c.op)).toEqual(['search', 'sling', 'sling']);
  });

  it('source-url dry-run builds category coverage from scraped assets without AEM writes', async () => {
    const fetchFn = async (url) => {
      if (url === 'https://brand.example/products') {
        return htmlRes(`
          <title>Brand Products</title>
          <h1>Product Gallery</h1>
          <img src="/hero.png" alt="Product hero">
        `);
      }
      return assetRes(new Uint8Array(12 * 1024).fill(1));
    };
    const client = makeClient([]);
    const out = await enrichAssets({
      options: baseOptions({
        dryRun: true,
        sourceUrl: 'https://brand.example/products',
        fetchFn,
      }),
      client,
      generator,
      log: silent,
    });
    expect(client.calls).toHaveLength(0);
    expect(out.report.counts().enriched).toBe(1);
    expect(out.report.toJSON().categoryCoverage.categories).toMatchObject([
      { slug: 'products', assetCount: 1 },
    ]);
    expect(out.metadataPreview).toContain('/content/dam/santander/hero.png');
  });

  it('stops cleanly when the folder has no assets', async () => {
    const client = makeClient([searchPage([])]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.assets).toHaveLength(0);
  });

  it('skips assets already enriched for this customer and category', async () => {
    const client = makeClient([searchPage(oneAsset), ...metadata({
      company: 'santander',
      'dc:title': 'Existing',
      'dam:status': 'approved',
      allowedCountries: 'global',
      productCategory: 'products',
    })]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().skipped).toBe(1);
    expect(out.report.counts().enriched).toBeUndefined();
    expect(out.report.toJSON().representatives.items.products).toMatchObject({
      title: 'Existing',
      source: 'already-enriched',
    });
  });

  it('does not skip an asset that is missing productCategory', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      ...metadata({
        company: 'santander',
        'dc:title': 'Existing',
        'dam:status': 'approved',
        allowedCountries: 'global',
      }),
      makeRes({ status: 200 }),
      verifyRes({
        company: 'santander',
        'dc:title': 'Existing',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'products',
      }),
    ]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    const postCall = client.calls.find((c) => c.op === 'sling' && c.opts.method === 'POST');
    expect(postCall.opts.body).toContain('.%2FproductCategory=products');
  });

  it('fails category planning when no productCategory can be inferred', async () => {
    const asset = [{
      assetId: 'a1',
      repositoryMetadata: { 'repo:path': '/content/dam/santander/asset.bin', 'repo:name': 'asset.bin' },
    }];
    const client = makeClient([searchPage(asset), ...metadata()]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator: async () => ({ title: 'Asset' }), log: silent,
    });
    expect(out.report.counts().failed).toBe(1);
    expect(client.calls.some((c) => c.op === 'sling' && c.opts.method === 'POST')).toBe(false);
    expect(out.report.toJSON().categoryCoverage.unclassified).toEqual(['a1']);
  });

  it('live mode writes each asset through Sling POST and reports enriched', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      ...metadata(),
      makeRes({ status: 200 }),
      verifyRes({
        company: 'santander',
        'dc:title': 'Product Hero',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'products',
      }),
    ]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    expect(out.report.exitCode()).toBe(0);
    const postCall = client.calls.find((c) => c.op === 'sling' && c.opts.method === 'POST');
    expect(postCall).toBeTruthy();
    expect(postCall.op).toBe('sling');
    expect(postCall.opts.includeApiKey).toBe(false);
    expect(postCall.opts.body).toContain('.%2Fdam%3Astatus=approved');
  });

  it('never overwrites existing metadata values', async () => {
    const client = makeClient([searchPage(oneAsset), ...metadata({
      'dc:title': 'Existing Title',
    }), makeRes({ status: 200 }), verifyRes({
      company: 'santander',
      'dc:title': 'Existing Title',
      'dam:status': 'approved',
      allowedCountries: 'global',
      productCategory: 'products',
    })]);
    await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    const postCall = client.calls.find((c) => c.op === 'sling' && c.opts.method === 'POST');
    expect(postCall.opts.body).not.toContain('.%2Fdc%3Atitle=');
  });

  // Fast, deterministic polling for tests: no real sleeping, and `now()` advances by
  // `intervalMs` on every call so a fixed timeoutMs still bounds how many polls happen.
  function fastPoll({ timeoutMs, intervalMs = 1 } = {}) {
    let clock = 0;
    return {
      timeoutMs,
      intervalMs,
      sleepFn: () => Promise.resolve(),
      now: () => {
        const t = clock;
        clock += intervalMs;
        return t;
      },
    };
  }

  it('waits for dam:assetState=processed, polling until it flips before reading metadata', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      stateRes('processing'),
      stateRes('processing'),
      stateRes('processed'),
      metadataOnly(),
      makeRes({ status: 200 }),
      verifyRes({
        company: 'santander',
        'dc:title': 'Product Hero',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'products',
      }),
    ]);
    const out = await enrichAssets({
      options: baseOptions({ assetProcessedPoll: fastPoll({ timeoutMs: 1000 }) }),
      client,
      generator,
      log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    // 3 state-check GETs (processing, processing, processed) + 1 full-metadata GET
    // (post-processed read) + 1 post-write verify GET.
    const slingGets = client.calls.filter((c) => c.op === 'sling' && c.opts.method === 'GET');
    expect(slingGets).toHaveLength(5);
  });

  it('fails the asset (does not write) when it never reaches processed before the poll timeout', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      stateRes('processing'),
      metadataOnly({ 'dam:assetState': 'processing' }),
    ]);
    const out = await enrichAssets({
      options: baseOptions({ assetProcessedPoll: fastPoll({ timeoutMs: 0 }) }),
      client,
      generator,
      log: silent,
    });
    expect(out.report.counts().failed).toBe(1);
    expect(client.calls.some((c) => c.op === 'sling' && c.opts.method === 'POST')).toBe(false);
    const [failed] = out.report.assets.filter((a) => a.outcome === 'failed');
    expect(failed.stage).toBe('plan');
    expect(failed.error).toMatch(/dam:assetState=processed/);
  });

  it('uses autogen:* fields as primary evidence over filename tokens once processed', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      ...metadata({
        'autogen:title': 'Braided USB-C Cable',
        'autogen:description': 'A durable braided USB-C charging cable.',
        'autogen:subject': ['cable', 'usb-c'],
      }),
      makeRes({ status: 200 }),
      verifyRes({
        company: 'santander',
        'dc:title': 'Braided USB-C Cable',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'accessories',
      }),
    ]);
    const realGenerator = createAssetMetadataGenerator();
    const out = await enrichAssets({
      options: baseOptions(), client, generator: realGenerator, log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    const postCall = client.calls.find((c) => c.op === 'sling' && c.opts.method === 'POST');
    expect(postCall.opts.body).toContain(encodeURIComponent('Braided USB-C Cable').replace(/%20/g, '+'));
  });

  it('does not call asset publish after writing approved metadata', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      ...metadata(),
      makeRes({ status: 200 }),
      verifyRes({
        company: 'santander',
        'dc:title': 'Product Hero',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'products',
      }),
    ]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    expect(client.calls.some((c) => c.op === 'publish')).toBe(false);
  });
});
