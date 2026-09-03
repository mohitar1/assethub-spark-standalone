import { describe, it, expect } from 'vitest';
import {
  enrichAssets, mapWithConcurrency, normalizeContract, buildCardRows, checkCardGate,
} from '../../scripts/assets/enrich-assets.js';
import { createAssetMetadataGenerator } from '../../scripts/assets/generate.js';
import { makeRes, makeClient } from './helpers.js';

const silent = { info: () => {}, warn: () => {} };

// Source-derived category contract (Step 4). Fixtures below carry filename/keyword/smart-tag
// evidence for "products"; the deterministic classifier maps them into this contract.
const CONTRACT = [
  { slug: 'products', label: 'Products' },
  { slug: 'lifestyle', label: 'Lifestyle' },
  { slug: 'accessories', label: 'Accessories' },
  { slug: 'machines', label: 'Machines' },
];

function baseOptions(overrides = {}) {
  return {
    customerKey: 'santander',
    damPath: '/content/dam/santander',
    dryRun: false,
    force: false,
    bringIn: false,
    concurrency: 1,
    limit: null,
    categoryContract: CONTRACT,
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

// waitForAssetProcessed polls jcr:content.json (NOT the metadata.json sub-node) for
// dam:assetState, then does one final metadata.json read once processed. Every fixture
// that goes through waitForAssetProcessed therefore needs a jcrContent() response
// immediately before its metadata() response, one jcrContent() per poll iteration.
function jcrContent(assetState = 'processed') {
  return makeRes({ body: { 'dam:assetState': assetState } });
}

// metadata() itself no longer needs 'dam:assetState': 'processed' baked in by default —
// that field is read from jcrContent() during polling, not from this response — but
// several fixtures still pass dam:assetState here incidentally; it's harmless, just unread
// by the poll.
function metadata(assetMetadata = {}, repositoryMetadata = { 'dc:format': 'application/octet-stream' }) {
  return makeRes({
    body: { ...assetMetadata, 'dc:format': repositoryMetadata['dc:format'] },
    headers: { ETag: '"v1"' },
  });
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
    const client = makeClient([searchPage(oneAsset), jcrContent(), metadata()]);
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

  it('materializes DA card images when --org/--repo are set (dry-run: no network write)', async () => {
    const client = makeClient([searchPage(oneAsset), jcrContent(), metadata()]);
    const out = await enrichAssets({
      options: baseOptions({
        dryRun: true, org: 'acme-org', repo: 'acme-repo',
      }),
      client,
      generator,
      log: silent,
    });
    const rep = out.report.toJSON().representatives.items.products;
    expect(rep.cardImageUrl).toContain('[dry-run]');
    expect(rep.cardImageUrl).toContain('media_products');
    // A dry run must never touch the DA upload endpoint.
    expect(client.calls.every((c) => c.op !== 'da-upload')).toBe(true);
  });

  it('leaves cardImageUrl unset when --org/--repo are not provided (no proxy fallback)', async () => {
    const client = makeClient([searchPage(oneAsset), jcrContent(), metadata()]);
    const out = await enrichAssets({
      options: baseOptions({ dryRun: true }),
      client,
      generator,
      log: silent,
    });
    const rep = out.report.toJSON().representatives.items.products;
    expect(rep.cardImageUrl).toBeUndefined();
    // The card gate then correctly flags this card as broken (missing image).
    const gate = checkCardGate(out.report.toJSON(), CONTRACT);
    expect(gate.ok).toBe(false);
  });

  it('stops cleanly when the folder has no assets', async () => {
    const client = makeClient([searchPage([])]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.assets).toHaveLength(0);
  });

  it('skips assets already enriched for this customer and category', async () => {
    const client = makeClient([searchPage(oneAsset), jcrContent(), metadata({
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
      jcrContent(),
      metadata({
        company: 'santander',
        'dc:title': 'Existing',
        'dam:status': 'approved',
        allowedCountries: 'global',
      }),
      makeRes({ status: 200 }),
      metadata({
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

  it('mandatory assignment: an evidence-less asset is still assigned a contract category (not failed)', async () => {
    // Category assignment is now mandatory (user decision: a low-confidence agent mapping
    // beats a blank card). An asset with no strong evidence lands in a contract slug via the
    // deterministic fallback and is written — it is NOT dropped as FAILED/unclassified.
    const asset = [{
      assetId: 'a1',
      repositoryMetadata: { 'repo:path': '/content/dam/santander/asset.bin', 'repo:name': 'asset.bin' },
    }];
    const client = makeClient([
      searchPage(asset),
      jcrContent(),
      metadata(),
      makeRes({ status: 200 }),
      metadata({
        company: 'santander',
        'dc:title': 'Asset',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'products',
      }),
    ]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator: async () => ({ title: 'Asset' }), log: silent,
    });
    expect(out.report.counts().failed).toBeUndefined();
    expect(out.report.counts().enriched).toBe(1);
    expect(out.report.toJSON().categoryCoverage.unclassified).toEqual([]);
    const postCall = client.calls.find((c) => c.op === 'sling' && c.opts.method === 'POST');
    expect(postCall.opts.body).toContain('.%2FproductCategory=');
  });

  it('live mode writes each asset through Sling POST and reports enriched', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      jcrContent(),
      metadata(),
      makeRes({ status: 200 }),
      metadata({
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
    const client = makeClient([searchPage(oneAsset), jcrContent(), metadata({
      'dc:title': 'Existing Title',
    }), makeRes({ status: 200 }), metadata({
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
      jcrContent('processing'),
      jcrContent('processing'),
      jcrContent('processed'),
      metadata(),
      makeRes({ status: 200 }),
      metadata({
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
    // 3 polling GETs (processing, processing, processed) + 1 metadata GET once processed
    // + 1 post-write verify GET.
    const slingGets = client.calls.filter((c) => c.op === 'sling' && c.opts.method === 'GET');
    expect(slingGets).toHaveLength(5);
  });

  it('fails the asset (does not write) when it never reaches processed before the poll timeout', async () => {
    const client = makeClient([
      searchPage(oneAsset),
      jcrContent('processing'),
      metadata({ 'dam:assetState': 'processing' }),
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
      jcrContent(),
      metadata({
        'autogen:title': 'Braided USB-C Cable',
        'autogen:description': 'A durable braided USB-C charging cable.',
        'autogen:subject': ['cable', 'usb-c'],
      }),
      makeRes({ status: 200 }),
      metadata({
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
      jcrContent(),
      metadata(),
      makeRes({ status: 200 }),
      metadata({
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

describe('normalizeContract', () => {
  it('parses a comma-separated slug string into {slug,label}', () => {
    expect(normalizeContract('dermatology,cancer,diabetes')).toEqual([
      { slug: 'dermatology', label: 'Dermatology' },
      { slug: 'cancer', label: 'Cancer' },
      { slug: 'diabetes', label: 'Diabetes' },
    ]);
  });

  it('accepts an array of {slug,label} and preserves labels, de-duping slugs', () => {
    expect(normalizeContract([
      { slug: 'Coffee', label: 'Coffee' },
      { slug: 'coffee' },
    ])).toEqual([{ slug: 'coffee', label: 'Coffee' }]);
  });

  it('returns [] for empty/nullish input', () => {
    expect(normalizeContract(null)).toEqual([]);
    expect(normalizeContract('')).toEqual([]);
  });
});

describe('buildCardRows', () => {
  const contract = [
    { slug: 'dermatology', label: 'Dermatology' },
    { slug: 'cancer', label: 'Cancer' },
  ];
  const representatives = {
    items: {
      dermatology: {
        assetId: 'a1', repoName: 'eczema.jpg', description: 'Skin care imagery.', cardImageUrl: 'https://content.da.live/org/repo/company/en/media_dermatology.jpg',
      },
      cancer: {
        assetId: 'a2', repoName: 'oncology.jpg', cardImageUrl: 'https://content.da.live/org/repo/company/en/media_cancer.jpg',
      },
    },
  };
  const categoryCoverage = { categories: [{ slug: 'dermatology', assetCount: 14 }, { slug: 'cancer', assetCount: 4 }] };

  it('emits one well-formed row per contract category (label, blurb, href, image)', () => {
    const rows = buildCardRows({ contract, categoryCoverage, representatives });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      slug: 'dermatology',
      label: 'Dermatology',
      assetCount: 14,
      blurb: 'Dermatology product and campaign imagery.',
      href: '/en/search?facetFilters=%7B%22productCategory%22%3A%7B%22dermatology%22%3Atrue%7D%7D',
      cardImageUrl: 'https://content.da.live/org/repo/company/en/media_dermatology.jpg',
    });
    // Blurb is always a short authored-style sentence, never rep.description (which is
    // autogen:description evidence, not customer-facing card copy — see buildCardRows doc).
    expect(rows[1].blurb).toBe('Cancer product and campaign imagery.');
  });

  it('skips contract categories that have no representative', () => {
    const rows = buildCardRows({
      contract: [...contract, { slug: 'diabetes', label: 'Diabetes' }],
      categoryCoverage,
      representatives,
    });
    expect(rows.map((r) => r.slug)).toEqual(['dermatology', 'cancer']);
  });
});

describe('checkCardGate', () => {
  function reportWith(cards, missing = []) {
    return { cards, representatives: { missing } };
  }
  const goodCard = (slug) => ({
    slug, href: `/en/search?x=${slug}`, cardImageUrl: `https://content.da.live/org/repo/company/en/media_${slug}.jpg`, assetCount: 3,
  });

  it('passes with enough well-formed cards and no missing categories', () => {
    const report = reportWith(['a', 'b', 'c', 'd', 'e'].map(goodCard));
    expect(checkCardGate(report, normalizeContract('a,b,c,d,e'))).toEqual({ ok: true });
  });

  it('fails when a contract category has no assets', () => {
    const report = reportWith(['a', 'b', 'c', 'd', 'e'].map(goodCard), ['f']);
    expect(checkCardGate(report, normalizeContract('a,b,c,d,e,f')).ok).toBe(false);
  });

  it('fails below the minimum card count (floor is 5)', () => {
    const report = reportWith(['a', 'b', 'c', 'd'].map(goodCard));
    expect(checkCardGate(report, []).ok).toBe(false);
  });

  it('fails a card missing its href or image', () => {
    const cards = ['a', 'b', 'c'].map(goodCard);
    cards.push({
      slug: 'd', href: '/x', cardImageUrl: null, assetCount: 1,
    });
    expect(checkCardGate(reportWith(cards), []).ok).toBe(false);
  });
});
