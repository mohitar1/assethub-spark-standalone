import {
  describe, it, expect, vi,
} from 'vitest';
import {
  RepositoryUploadStrategy, createUploadStrategy,
} from '../../scripts/assets/upload-strategy.js';
import { BRING_IN_MAX_IMAGES } from '../../scripts/assets/constants.js';

// ---------------------------------------------------------------------------
// Fake client that captures calls
// ---------------------------------------------------------------------------

function fakeClient() {
  return {
    authorHost: 'https://author-test.adobeaemcloud.com',
    async buildHeaders(extra = {}) {
      return { Authorization: 'Bearer tok', ...extra };
    },
  };
}

const smallPng = new Uint8Array([137, 80, 78, 71]); // 4-byte fake PNG

// ---------------------------------------------------------------------------
// createUploadStrategy factory
// ---------------------------------------------------------------------------

describe('createUploadStrategy factory', () => {
  it('returns RepositoryUploadStrategy when name=repository', () => {
    const s = createUploadStrategy('repository', { client: fakeClient(), apiKey: 'k', fetchFn: fetch });
    expect(s).toBeInstanceOf(RepositoryUploadStrategy);
  });

  it('auto-selects repository when name=null', () => {
    const s = createUploadStrategy(null, { client: fakeClient(), apiKey: 'k', fetchFn: fetch });
    expect(s).toBeInstanceOf(RepositoryUploadStrategy);
  });

  it('throws on unknown strategy name', () => {
    expect(() => createUploadStrategy('foobar', { client: fakeClient(), fetchFn: fetch }))
      .toThrow(/Unknown upload strategy/);
  });
});

// ---------------------------------------------------------------------------
// RepositoryUploadStrategy (mock fetch)
// ---------------------------------------------------------------------------

describe('RepositoryUploadStrategy', () => {
  function buildFetch({ assetId = 'urn:aaid:aem:abc', etag = '"0"' } = {}) {
    const putCalls = [];
    const postCalls = [];

    const fetchFn = vi.fn(async (url, opts) => {
      const method = opts?.method || 'GET';

      // Step 1 — POST ;api=create → asset-id + etag
      if (method === 'POST' && url.includes(';api=create')) {
        postCalls.push({ step: 'create', url, headers: opts.headers });
        return {
          ok: true,
          status: 200,
          headers: {
            get: (k) => {
              if (k === 'asset-id') return assetId;
              if (k === 'etag') return etag;
              return null;
            },
          },
          text: async () => '',
        };
      }

      // Step 4 — POST finalize → 201 + Location
      if (method === 'POST' && url.includes('block_upload_finalize')) {
        postCalls.push({
          step: 'finalize', url, headers: opts.headers, body: opts.body,
        });
        return {
          ok: true,
          status: 201,
          headers: {
            get: (k) => (k === 'location'
              ? 'https://author-test.adobeaemcloud.com/content/dam/acme/hero.png'
              : null),
          },
          text: async () => '',
        };
      }

      // Step 2 — POST ;api=block_upload → SAS URLs + finalize URL
      if (method === 'POST' && url.includes(';api=block_upload')) {
        postCalls.push({
          step: 'block_upload', url, headers: opts.headers, body: opts.body,
        });
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({
            'repo:blocksize': 10 * 1024 * 1024,
            _links: {
              'http://ns.adobe.com/adobecloud/rel/block/transfer': [
                { href: 'https://blob.azure.test/container/blob?blockid=1&comp=block&sig=x' },
              ],
              'http://ns.adobe.com/adobecloud/rel/block/finalize': {
                href: 'https://author-test.adobeaemcloud.com/adobe/repository/content/dam/acme;api=block_upload_finalize;token=abc',
              },
            },
          }),
        };
      }

      // Step 3 — PUT to presigned blob URL
      if (method === 'PUT' && url.includes('blob.azure.test')) {
        putCalls.push({ url, size: opts?.body?.byteLength, headers: opts.headers });
        return {
          ok: true, status: 201, headers: { get: () => null }, text: async () => '',
        };
      }

      return {
        ok: false, status: 404, headers: { get: () => null }, text: async () => 'not found',
      };
    });

    return { fetchFn, putCalls, postCalls };
  }

  it('uploadAsset: executes the repository create -> block_upload -> PUT -> finalize flow', async () => {
    const client = fakeClient();
    const { fetchFn, putCalls, postCalls } = buildFetch();
    const strategy = new RepositoryUploadStrategy({ client, fetchFn });

    const res = await strategy.uploadAsset({
      folderPath: '/content/dam/acme',
      fileName: 'hero.png',
      bytes: smallPng,
      contentType: 'image/png',
    });

    expect(res.assetId).toBe('urn:aaid:aem:abc');
    expect(res.repoPath).toBe('/content/dam/acme/hero.png');
    expect(res.repoName).toBe('hero.png');
    expect(postCalls.map((c) => c.step)).toEqual(['create', 'block_upload', 'finalize']);
    expect(putCalls).toHaveLength(1);
    expect(fetchFn.mock.calls.some(([url, opts]) => (
      (opts?.method || 'GET') === 'GET' && url.includes('/adobe/repository?path=')
    ))).toBe(false);
    expect(postCalls[0].url).toBe(
      'https://author-test.adobeaemcloud.com/adobe/repository/content/dam/acme;api=create;path=hero.png;intermediates=true',
    );
    expect(postCalls[0].headers['x-api-key']).toBe('aem-assets-frontend-1');
    expect(JSON.parse(postCalls[1].body).assetMetadata).toEqual({});
    expect(JSON.parse(postCalls[2].body)).toHaveProperty('_links');
  });

  it('uploadAsset: splits large bytes into multiple blocks', async () => {
    const client = fakeClient();
    const bigBytes = new Uint8Array(25 * 1024 * 1024); // 25 MB
    const putCalls = [];

    const fetchFn = vi.fn(async (url, opts) => {
      const method = opts?.method || 'GET';
      if (method === 'POST' && url.includes(';api=create')) {
        return {
          ok: true,
          status: 200,
          headers: {
            get: (k) => {
              if (k === 'asset-id') return 'urn:x';
              if (k === 'etag') return '"0"';
              return null;
            },
          },
          text: async () => '',
        };
      }
      if (method === 'POST' && url.includes(';api=block_upload')) {
        // Return 3 SAS URLs for the 3 blocks expected (25 MB / 10 MB = 3)
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({
            'repo:blocksize': 10 * 1024 * 1024, // 10 MB blocks
            _links: {
              'http://ns.adobe.com/adobecloud/rel/block/transfer': [
                { href: 'https://blob.test/b?blockid=1' },
                { href: 'https://blob.test/b?blockid=2' },
                { href: 'https://blob.test/b?blockid=3' },
              ],
              'http://ns.adobe.com/adobecloud/rel/block/finalize': { href: 'https://author-test.adobeaemcloud.com/finalize' },
            },
          }),
        };
      }
      if (method === 'PUT') {
        putCalls.push(opts?.body?.byteLength);
        return {
          ok: true, status: 201, headers: { get: () => null }, text: async () => '',
        };
      }
      if (method === 'POST') {
        return {
          ok: true,
          status: 201,
          headers: { get: (k) => (k === 'location' ? '/content/dam/acme/big.png' : null) },
          text: async () => '',
        };
      }
      return {
        ok: false, status: 404, headers: { get: () => null }, text: async () => 'unexpected',
      };
    });

    const strategy = new RepositoryUploadStrategy({ client, fetchFn });
    await strategy.uploadAsset({
      folderPath: '/content/dam/acme',
      fileName: 'big.png',
      bytes: bigBytes,
      contentType: 'image/png',
    });

    expect(putCalls).toHaveLength(3);
    expect(putCalls[0]).toBe(10 * 1024 * 1024);
    expect(putCalls[1]).toBe(10 * 1024 * 1024);
    expect(putCalls[2]).toBe(5 * 1024 * 1024);
  });

  it('throws when create step fails', async () => {
    const client = fakeClient();
    const fetchFn = vi.fn(async (url, opts) => {
      const method = opts?.method || 'GET';
      if (method === 'POST' && url.includes(';api=create')) {
        return {
          ok: false, status: 403, headers: { get: () => null }, text: async () => 'forbidden',
        };
      }
      return {
        ok: false, status: 404, headers: { get: () => null }, text: async () => '',
      };
    });
    const strategy = new RepositoryUploadStrategy({ client, fetchFn });
    await expect(strategy.uploadAsset({
      folderPath: '/content/dam/acme', fileName: 'x.png', bytes: smallPng, contentType: 'image/png',
    })).rejects.toThrow(/403/);
  });

  it('uploadImages captures per-file failures without aborting', async () => {
    const client = fakeClient();
    let callCount = 0;
    const { fetchFn } = buildFetch();
    const origFetch = fetchFn.getMockImplementation();
    fetchFn.mockImplementation(async (url, opts) => {
      if ((opts?.method || 'GET') === 'POST' && url.includes(';api=create')) {
        callCount += 1;
        if (callCount === 1) {
          return {
            ok: false, status: 500, headers: { get: () => null }, text: async () => 'err',
          };
        }
      }
      return origFetch(url, opts);
    });

    const strategy = new RepositoryUploadStrategy({ client, fetchFn });
    const images = [
      {
        fileName: 'fail.png', bytes: smallPng, contentType: 'image/png', sourcePage: 'https://x/fail',
      },
      {
        fileName: 'ok.png', bytes: smallPng, contentType: 'image/png', sourcePage: 'https://x/ok',
      },
    ];
    const res = await strategy.uploadImages({ folderPath: '/content/dam/acme', images });
    expect(res.failures).toHaveLength(1);
    expect(res.failures[0].fileName).toBe('fail.png');
    expect(res.uploaded).toHaveLength(1);
    expect(res.uploaded[0]).toMatchObject({
      assetId: 'urn:aaid:aem:abc',
      repoName: 'ok.png',
      fileName: 'ok.png',
      contentType: 'image/png',
      sourcePage: 'https://x/ok',
    });
    expect(res.uploaded[0]).not.toHaveProperty('bytes');
  });

  it('caps uploads at BRING_IN_MAX_IMAGES even when the caller collected more', async () => {
    const client = fakeClient();
    const { fetchFn } = buildFetch();
    const strategy = new RepositoryUploadStrategy({ client, fetchFn });
    const images = Array.from({ length: BRING_IN_MAX_IMAGES + 42 }, (_, i) => ({
      fileName: `img-${i}.png`, bytes: smallPng, contentType: 'image/png',
    }));
    const res = await strategy.uploadImages({ folderPath: '/content/dam/acme', images });
    expect(res.uploaded).toHaveLength(BRING_IN_MAX_IMAGES);
    expect(res.failures).toHaveLength(0);
  });

  it('ensureFolder creates folders through the repository API', async () => {
    const client = fakeClient();
    const calls = [];
    const fetchFn = vi.fn(async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true, status: 200, headers: { get: () => null }, text: async () => '',
      };
    });
    const strategy = new RepositoryUploadStrategy({ client, fetchFn });
    const out = await strategy.ensureFolder({ folderPath: '/content/dam/acme' });
    expect(out.created).toBe(true);
    expect(calls[0].url).toBe(
      'https://author-test.adobeaemcloud.com/adobe/repository/content/dam;api=create;path=acme;intermediates=true;respondWith=%7B%22reltype%22%3A%22http%3A%2F%2Fns.adobe.com%2Fadobecloud%2Frel%2Fmetadata%2Frepository%22%7D',
    );
    expect(calls[0].opts.method).toBe('POST');
    expect(calls[0].opts.headers['Content-Type']).toBe('application/vnd.adobecloud.directory+json');
    expect(calls[0].opts.headers['x-api-key']).toBe('aem-assets-frontend-1');
  });
});
