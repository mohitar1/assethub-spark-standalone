import { describe, it, expect } from 'vitest';
import { enrichAssets, mapWithConcurrency } from '../enrich-assets.js';
import { makeRes, makeClient } from './helpers.js';

const silent = { info: () => {}, warn: () => {} };

function baseOptions(overrides = {}) {
  return {
    customerKey: 'santander',
    damPath: '/content/dam/santander',
    dryRun: false,
    force: false,
    bringIn: false,
    writeMode: 'bulk',
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
  repositoryMetadata: { 'repo:path': '/content/dam/santander/a.jpg', 'repo:name': 'a.jpg' },
}];

const generator = async () => ({
  title: 'Doc A', description: 'desc', keywords: ['x', 'y', 'z'], productCategory: 'cards',
});

describe('mapWithConcurrency', () => {
  it('preserves order and processes every item', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8]);
  });
});

describe('enrichAssets controller', () => {
  it('dry-run: generates + previews without writing', async () => {
    const meta = makeRes({
      body: { assetMetadata: {}, repositoryMetadata: { 'dc:format': 'application/pdf' } },
      headers: { ETag: '"v1"' },
    });
    const client = makeClient([searchPage(oneAsset), meta]);
    const out = await enrichAssets({
      options: baseOptions({ dryRun: true }), client, generator, log: silent,
    });
    expect(out.dryRun).toBe(true);
    expect(out.report.counts().enriched).toBe(1);
    expect(out.csvPreview).toContain('dc:title[string]');
    expect(out.report.toJSON().representatives.items.cards).toMatchObject({
      assetId: 'a1',
      assetPath: '/content/dam/santander/a.jpg',
      productCategory: 'cards',
      title: 'Doc A',
    });
    // Only enumerate + read happened — no write calls.
    expect(client.calls.map((c) => c.op)).toEqual(['search', 'metadata']);
  });

  it('stops cleanly when the folder has no assets', async () => {
    const client = makeClient([searchPage([])]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.assets).toHaveLength(0);
  });

  it('skips assets already enriched for this customer', async () => {
    const meta = makeRes({
      body: {
        assetMetadata: {
          company: 'santander',
          'dc:title': 'Existing',
          'dam:status': 'approved',
          allowedCountries: 'global',
        },
        repositoryMetadata: {},
      },
      headers: { ETag: '"v1"' },
    });
    const client = makeClient([searchPage(oneAsset), meta]);
    const out = await enrichAssets({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().skipped).toBe(1);
    expect(out.report.counts().enriched).toBeUndefined();
  });

  it('reports missing representatives for expected category-card slugs', async () => {
    const meta = makeRes({
      body: { assetMetadata: {}, repositoryMetadata: { 'dc:format': 'application/pdf' } },
      headers: { ETag: '"v1"' },
    });
    const client = makeClient([searchPage(oneAsset), meta]);
    const out = await enrichAssets({
      options: baseOptions({ dryRun: true, productCategoryVocab: ['cards', 'loans'] }),
      client,
      generator,
      log: silent,
    });
    expect(out.report.toJSON().representatives).toMatchObject({
      groupBy: 'productCategory',
      expected: ['cards', 'loans'],
      missing: ['loans'],
    });
  });

  it('uses already-enriched assets as representatives when their category matches the vocab', async () => {
    const meta = makeRes({
      body: {
        assetMetadata: {
          company: 'santander',
          'dc:title': 'Existing Card',
          'dc:description': 'Existing description',
          'dc:subject': ['card'],
          'dam:status': 'approved',
          allowedCountries: 'global',
          productCategory: 'cards',
        },
        repositoryMetadata: {},
      },
      headers: { ETag: '"v1"' },
    });
    const client = makeClient([searchPage(oneAsset), meta]);
    const out = await enrichAssets({
      options: baseOptions({ productCategoryVocab: ['cards'] }), client, generator, log: silent,
    });
    expect(out.report.counts().skipped).toBe(1);
    expect(out.report.toJSON().representatives.items.cards).toMatchObject({
      title: 'Existing Card',
      source: 'already-enriched',
    });
  });

  it('live patch mode writes each asset and reports enriched', async () => {
    const meta = makeRes({
      body: { assetMetadata: {}, repositoryMetadata: { 'dc:format': 'application/pdf' } },
      headers: { ETag: '"v1"' },
    });
    const client = makeClient([searchPage(oneAsset), meta, makeRes({ status: 200 })]);
    const out = await enrichAssets({
      options: baseOptions({ writeMode: 'patch' }), client, generator, log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    expect(out.report.exitCode()).toBe(0);
    const patchCall = client.calls.find((c) => c.opts.method === 'PATCH');
    expect(patchCall).toBeTruthy();
  });

  it('does not call asset publish after writing approved metadata', async () => {
    const meta = makeRes({
      body: { assetMetadata: {}, repositoryMetadata: { 'dc:format': 'application/pdf' } },
      headers: { ETag: '"v1"' },
    });
    const client = makeClient([searchPage(oneAsset), meta, makeRes({ status: 200 })]);
    const out = await enrichAssets({
      options: baseOptions({ writeMode: 'patch' }), client, generator, log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    expect(client.calls.some((c) => c.op === 'publish')).toBe(false);
  });
});
