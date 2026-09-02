import { describe, it, expect } from 'vitest';
import {
  buildSlingMetadataUpdate,
  entriesToFormBody,
  getSlingAssetMetadata,
  SLING_FORM_CONTENT_TYPE,
  waitForAssetProcessed,
  writeSlingAssetMetadata,
} from '../../scripts/assets/sling-metadata.js';
import { makeClient, makeRes } from './helpers.js';

function metadataRes(assetMetadata) {
  return makeRes({ body: assetMetadata, headers: { ETag: '"v1"' } });
}

// Deterministic clock: advances by intervalMs on every call, so a fixed timeoutMs
// still bounds the number of polls without any real waiting.
function fakeClock(intervalMs) {
  let t = 0;
  return () => {
    const now = t;
    t += intervalMs;
    return now;
  };
}

describe('sling-metadata', () => {
  it('reads metadata by DAM repo path without an API key', async () => {
    const client = makeClient([makeRes({
      body: { 'dc:title': 'A', 'dc:format': 'image/jpeg' },
      headers: { ETag: '"v1"' },
    })]);
    const out = await getSlingAssetMetadata(client, '/content/dam/acme/a file.jpg');
    expect(out.assetMetadata['dc:title']).toBe('A');
    expect(out.repositoryMetadata['dc:format']).toBe('image/jpeg');
    expect(out.etag).toBe('"v1"');
    expect(client.calls[0]).toMatchObject({
      op: 'sling',
      opts: {
        method: 'GET',
        includeApiKey: false,
        path: '/content/dam/acme/a%20file.jpg/jcr:content/metadata.json',
      },
    });
  });

  it('builds missing scalar fields and dam:status as Sling form entries', () => {
    const plan = buildSlingMetadataUpdate(
      {
        title: 'A',
        description: 'D',
        keywords: ['k1', 'k2'],
        productCategory: 'products',
      },
      { company: 'acme', status: 'approved', allowedCountries: ['global'] },
      {},
    );
    expect(plan.entries).toContainEqual({ name: './dc:title', value: 'A' });
    expect(plan.entries).toContainEqual({ name: './dc:description', value: 'D' });
    expect(plan.entries).toContainEqual({ name: './productCategory', value: 'products' });
    expect(plan.entries).toContainEqual({ name: './company', value: 'acme' });
    expect(plan.entries).toContainEqual({ name: './dam:status', value: 'approved' });
    expect(plan.entries).toContainEqual({ name: './allowedCountries@TypeHint', value: 'String[]' });
    expect(plan.entries).toContainEqual({ name: './allowedCountries', value: 'global' });
    expect(plan.conflicts).toEqual([]);
  });

  it('never overwrites existing scalar metadata and appends only missing array values', () => {
    const plan = buildSlingMetadataUpdate(
      {
        title: 'New',
        keywords: ['launch', 'hero'],
        productCategory: 'products',
      },
      { company: 'acme', status: 'approved', allowedCountries: ['global'] },
      {
        'dc:title': 'Existing',
        'dc:subject': ['launch'],
        productCategory: 'products',
        company: 'acme',
        'dam:status': 'approved',
        allowedCountries: ['global'],
      },
    );
    expect(plan.entries).toEqual([
      { name: './dc:subject@TypeHint', value: 'String[]' },
      { name: './dc:subject@Patch', value: 'true' },
      { name: './dc:subject', value: '+hero' },
    ]);
    expect(plan.kept.map((k) => k.field)).toEqual(expect.arrayContaining(['dc:title', 'productCategory']));
  });

  it('reports conflicting scope metadata instead of overwriting it', () => {
    const plan = buildSlingMetadataUpdate(
      { title: 'A', productCategory: 'products' },
      { company: 'acme', status: 'approved', allowedCountries: ['global'] },
      { company: 'other', 'dam:status': 'draft', allowedCountries: 'us' },
    );
    expect(plan.conflicts.map((c) => c.field)).toEqual(['company', 'dam:status', 'allowedCountries']);
    expect(plan.entries.map((entry) => entry.name)).not.toContain('./company');
    expect(plan.entries.map((entry) => entry.name)).not.toContain('./dam:status');
    expect(plan.entries.map((entry) => entry.name)).not.toContain('./allowedCountries');
  });

  it('serializes repeated Sling form fields', () => {
    const body = entriesToFormBody([
      { name: './dc:subject@TypeHint', value: 'String[]' },
      { name: './dc:subject', value: 'a' },
      { name: './dc:subject', value: 'b' },
    ]);
    expect(body.get('_charset_')).toBe('utf-8');
    expect(body.getAll('./dc:subject')).toEqual(['a', 'b']);
  });

  it('posts Sling form metadata without an API key', async () => {
    const client = makeClient([makeRes({ status: 200, body: '<html>ok</html>' })]);
    const res = await writeSlingAssetMetadata(
      client,
      '/content/dam/acme/a.jpg',
      { entries: [{ name: './dam:status', value: 'approved' }] },
    );
    expect(res.ok).toBe(true);
    expect(client.calls[0]).toMatchObject({
      op: 'sling',
      opts: {
        method: 'POST',
        path: '/content/dam/acme/a.jpg/jcr:content/metadata',
        includeApiKey: false,
      },
    });
    expect(client.calls[0].opts.headers['Content-Type']).toBe(SLING_FORM_CONTENT_TYPE);
    expect(client.calls[0].opts.body).toContain('.%2Fdam%3Astatus=approved');
  });
});

describe('waitForAssetProcessed', () => {
  it('returns immediately when the asset is already processed', async () => {
    const client = makeClient([metadataRes({ 'dam:assetState': 'processed', 'dc:title': 'A' })]);
    const { processed, meta } = await waitForAssetProcessed(client, '/content/dam/acme/a.jpg');
    expect(processed).toBe(true);
    expect(meta.assetMetadata['dc:title']).toBe('A');
    expect(client.calls).toHaveLength(1);
  });

  it('polls until dam:assetState flips to processed', async () => {
    const client = makeClient([
      metadataRes({ 'dam:assetState': 'processing' }),
      metadataRes({ 'dam:assetState': 'processing' }),
      metadataRes({ 'dam:assetState': 'processed', 'dc:title': 'A' }),
    ]);
    const { processed, meta } = await waitForAssetProcessed(client, '/content/dam/acme/a.jpg', {
      timeoutMs: 1000,
      intervalMs: 1,
      sleepFn: () => Promise.resolve(),
      now: fakeClock(1),
    });
    expect(processed).toBe(true);
    expect(meta.assetMetadata['dc:title']).toBe('A');
    expect(client.calls).toHaveLength(3);
  });

  it('gives up at the timeout and reports not-processed with the last read metadata', async () => {
    const client = makeClient([
      metadataRes({ 'dam:assetState': 'processing' }),
    ]);
    const { processed, meta } = await waitForAssetProcessed(client, '/content/dam/acme/a.jpg', {
      timeoutMs: 0,
      intervalMs: 1,
      sleepFn: () => Promise.resolve(),
      now: fakeClock(1),
    });
    expect(processed).toBe(false);
    expect(meta.assetMetadata['dam:assetState']).toBe('processing');
    expect(client.calls).toHaveLength(1);
  });

  it('treats a missing dam:assetState (no field at all) as not processed', async () => {
    const client = makeClient([
      metadataRes({}),
    ]);
    const { processed } = await waitForAssetProcessed(client, '/content/dam/acme/a.jpg', {
      timeoutMs: 0,
      intervalMs: 1,
      sleepFn: () => Promise.resolve(),
      now: fakeClock(1),
    });
    expect(processed).toBe(false);
  });
});
