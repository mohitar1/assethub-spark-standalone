import { describe, it, expect, vi } from 'vitest';
import { uploadCardImage, materializeCardImages } from '../../scripts/assets/da-card-images.js';
import { makeRes, makeClient } from './helpers.js';

describe('uploadCardImage', () => {
  it('fetches the rendition and PUTs it to DA, returning the content.da.live source URL', async () => {
    const client = makeClient([
      makeRes({ status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
    ]);
    const putCalls = [];
    const fetchFn = vi.fn(async (url, opts) => {
      putCalls.push({ url, opts });
      return { ok: true, status: 200, text: async () => '' };
    });

    const result = await uploadCardImage({
      client,
      daToken: 'secret-token',
      org: 'acme-org',
      repo: 'acme-repo',
      companyKey: 'acme',
      rep: { assetId: 'urn:aaid:aem:abc', productCategory: 'oncology' },
      fetchFn,
    });

    expect(result).toEqual({
      ok: true,
      daSourceUrl: 'https://content.da.live/acme-org/acme-repo/acme/en/media_oncology.jpg',
    });
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].url).toBe('https://admin.da.live/source/acme-org/acme-repo/acme/en/media_oncology.jpg');
    expect(putCalls[0].opts.method).toBe('PUT');
    expect(putCalls[0].opts.headers.Authorization).toBe('Bearer secret-token');
    // The DA token must appear exactly once (the Authorization header) — never duplicated
    // into the URL, body, or another header.
    const occurrences = (JSON.stringify(putCalls[0].url) + JSON.stringify(putCalls[0].opts.headers))
      .split('secret-token').length - 1;
    expect(occurrences).toBe(1);
  });

  it('derives the file extension from the rendition content-type', async () => {
    const client = makeClient([
      makeRes({ status: 200, headers: { 'Content-Type': 'image/png' } }),
    ]);
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));

    const result = await uploadCardImage({
      client, daToken: 't', org: 'o', repo: 'r', companyKey: 'acme', rep: { assetId: 'a1', productCategory: 'vaccines' }, fetchFn,
    });

    expect(result.daSourceUrl).toBe('https://content.da.live/o/r/acme/en/media_vaccines.png');
  });

  it('falls back to jpg when content-type is missing/unrecognized', async () => {
    const client = makeClient([
      makeRes({ status: 200, headers: {} }),
    ]);
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));

    const result = await uploadCardImage({
      client, daToken: 't', org: 'o', repo: 'r', companyKey: 'acme', rep: { assetId: 'a1', productCategory: 'rare-disease' }, fetchFn,
    });

    expect(result.daSourceUrl).toBe('https://content.da.live/o/r/acme/en/media_rare-disease.jpg');
  });

  it('returns a failure (not a throw) when the DA upload responds non-2xx', async () => {
    const client = makeClient([
      makeRes({ status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
    ]);
    const fetchFn = vi.fn(async () => ({ ok: false, status: 401, text: async () => 'Unauthorized' }));

    const result = await uploadCardImage({
      client, daToken: 'bad', org: 'o', repo: 'r', companyKey: 'acme', rep: { assetId: 'a1', productCategory: 'oncology' }, fetchFn,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('401');
  });

  it('returns a failure when no rendition bytes are available (both paths 404)', async () => {
    const client = makeClient([
      makeRes({ status: 404 }),
      makeRes({ status: 404 }),
    ]);
    const fetchFn = vi.fn();

    const result = await uploadCardImage({
      client, daToken: 't', org: 'o', repo: 'r', companyKey: 'acme', rep: { assetId: 'a1', productCategory: 'oncology' }, fetchFn,
    });

    expect(result).toEqual({ ok: false, error: 'no rendition bytes available' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns a failure without an assetId, never calling the client', async () => {
    const client = makeClient([]);
    const fetchFn = vi.fn();

    const result = await uploadCardImage({
      client, daToken: 't', org: 'o', repo: 'r', companyKey: 'acme', rep: { productCategory: 'oncology' }, fetchFn,
    });

    expect(result).toEqual({ ok: false, error: 'representative has no assetId' });
    expect(client.calls).toHaveLength(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('materializeCardImages', () => {
  const representatives = {
    items: {
      oncology: { assetId: 'a1', productCategory: 'oncology' },
      vaccines: { assetId: 'a2', productCategory: 'vaccines' },
    },
  };

  it('uploads an image for every representative missing one, preserving already-set ones', async () => {
    const alreadySet = {
      items: {
        oncology: { assetId: 'a1', productCategory: 'oncology', cardImageUrl: 'https://content.da.live/o/r/acme/en/media_oncology.jpg' },
        vaccines: { assetId: 'a2', productCategory: 'vaccines' },
      },
    };
    const client = makeClient([
      makeRes({ status: 200, headers: { 'Content-Type': 'image/jpeg' } }),
    ]);
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));

    const { items, failures } = await materializeCardImages({
      client, daToken: 't', org: 'o', repo: 'r', companyKey: 'acme', representatives: alreadySet, fetchFn,
    });

    expect(failures).toEqual([]);
    // oncology already had a cardImageUrl — untouched, no upload attempted for it.
    expect(items.oncology.cardImageUrl).toBe('https://content.da.live/o/r/acme/en/media_oncology.jpg');
    // vaccines had none — uploaded.
    expect(items.vaccines.cardImageUrl).toBe('https://content.da.live/o/r/acme/en/media_vaccines.jpg');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('dry-run reports what would be uploaded without any network write', async () => {
    const client = makeClient([]);
    const fetchFn = vi.fn();

    const { items, failures } = await materializeCardImages({
      client, daToken: 't', org: 'o', repo: 'r', companyKey: 'acme', representatives, dryRun: true, fetchFn,
    });

    expect(failures).toEqual([]);
    expect(items.oncology.cardImageUrl).toContain('[dry-run]');
    expect(items.oncology.cardImageUrl).toContain('media_oncology.jpg');
    expect(items.vaccines.cardImageUrl).toContain('media_vaccines.jpg');
    expect(client.calls).toHaveLength(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('collects per-category failures without aborting the whole batch', async () => {
    const client = makeClient([
      makeRes({ status: 200, headers: { 'Content-Type': 'image/jpeg' } }), // oncology: ok
      makeRes({ status: 404 }), // vaccines: rendition 404
      makeRes({ status: 404 }), // vaccines: original also 404
    ]);
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));

    const { items, failures } = await materializeCardImages({
      client, daToken: 't', org: 'o', repo: 'r', companyKey: 'acme', representatives, fetchFn,
    });

    expect(items.oncology.cardImageUrl).toBe('https://content.da.live/o/r/acme/en/media_oncology.jpg');
    expect(items.vaccines.cardImageUrl).toBeUndefined();
    expect(failures).toEqual([{ slug: 'vaccines', error: 'no rendition bytes available' }]);
  });
});
