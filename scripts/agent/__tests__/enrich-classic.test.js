import { describe, it, expect } from 'vitest';
import { enrichAssetsClassic, fieldsToProperties } from '../enrich-classic.js';

const silent = { info: () => {}, warn: () => {} };

const generator = async () => ({
  title: 'Doc A', description: 'desc', keywords: ['x', 'y', 'z'], productCategory: 'cards',
});

function baseOptions(overrides = {}) {
  return {
    customerKey: 'acme',
    damPath: '/content/dam/acme',
    dryRun: false,
    force: false,
    concurrency: 1,
    limit: null,
    ...overrides,
  };
}

/**
 * Fake ClassicAuthorClient. `meta` maps repoPath -> metadata props; enumerate returns the
 * given assets. Records metadata writes.
 */
function fakeClient({ assets = [], meta = {} } = {}) {
  const writes = [];
  const live = [...assets];
  const listPrefix = '/api/assets/acme.json';
  return {
    authorHost: 'https://author-test.adobeaemcloud.com',
    writes,
    addUploaded(name) {
      live.push({ name });
    },
    async buildHeaders(extra = {}) {
      return { Authorization: 'Bearer tok', ...extra };
    },
    async getJson(path) {
      if (path.startsWith(listPrefix)) {
        return {
          entities: live.map((a) => ({
            class: ['assets/asset'],
            properties: { name: a.name, metadata: a.halMetadata || {} },
          })),
        };
      }
      const m = path.match(/^(.*)\/jcr:content\/metadata\.json$/);
      if (m) return meta[m[1]] || {};
      return null;
    },
    async postForm(path, params) {
      writes.push({ path, params });
      return { ok: true, status: 200 };
    },
  };
}

describe('fieldsToProperties', () => {
  it('maps normalized fields + scope onto AEM property names', () => {
    const props = fieldsToProperties(
      {
        title: 'T', description: 'D', keywords: ['a'], productCategory: 'cards',
      },
      { company: 'acme', status: 'approved' },
    );
    expect(props['dc:title']).toBe('T');
    expect(props['dc:subject']).toEqual(['a']);
    expect(props.productCategory).toBe('cards');
    expect(props.company).toBe('acme');
    expect(props['dam:status']).toBe('approved');
    expect(props.campaign).toBeNull();
  });
});

describe('enrichAssetsClassic controller', () => {
  it('dry-run: generates + previews without writing', async () => {
    const client = fakeClient({ assets: [{ name: 'a.jpg' }] });
    const out = await enrichAssetsClassic({
      options: baseOptions({ dryRun: true }), client, generator, log: silent,
    });
    expect(out.dryRun).toBe(true);
    expect(out.report.counts().enriched).toBe(1);
    expect(out.preview).toContain('/content/dam/acme/a.jpg');
    expect(client.writes).toHaveLength(0);
  });

  it('stops cleanly when the folder has no assets', async () => {
    const client = fakeClient({ assets: [] });
    const out = await enrichAssetsClassic({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.assets).toHaveLength(0);
  });

  it('skips assets already enriched for this customer', async () => {
    const client = fakeClient({
      assets: [{ name: 'a.jpg' }],
      meta: {
        '/content/dam/acme/a.jpg': {
          company: 'acme',
          'dc:title': 'Existing',
          'dam:status': 'approved',
          allowedCountries: 'global',
        },
      },
    });
    const out = await enrichAssetsClassic({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().skipped).toBe(1);
    expect(client.writes).toHaveLength(0);
  });

  it('writes each asset via Sling POST and reports enriched', async () => {
    const client = fakeClient({ assets: [{ name: 'a.jpg' }] });
    const out = await enrichAssetsClassic({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().enriched).toBe(1);
    expect(out.report.exitCode()).toBe(0);
    expect(client.writes[0].path).toBe('/content/dam/acme/a.jpg/jcr:content/metadata');
  });

  it('records a failure when a write throws', async () => {
    const client = fakeClient({ assets: [{ name: 'a.jpg' }] });
    client.postForm = async () => { throw Object.assign(new Error('boom'), { status: 500 }); };
    const out = await enrichAssetsClassic({
      options: baseOptions(), client, generator, log: silent,
    });
    expect(out.report.counts().failed).toBe(1);
    expect(out.report.exitCode()).toBe(1);
  });
});

describe('enrichAssetsClassic bring-in (E3)', () => {
  const pageHtml = '<img src="https://x.com/a.png"><img src="https://x.com/b.png">';
  function siteAndRepositoryFetch(client, calls = []) {
    return async (url) => {
      if (url === 'https://site.test/home') {
        return {
          ok: true, status: 200, headers: { get: () => 'text/html' }, text: async () => pageHtml,
        };
      }
      if (url.includes('/adobe/repository/content/dam;api=create')) {
        calls.push({ step: 'folder', url });
        return {
          ok: true, status: 200, headers: { get: () => null }, text: async () => '',
        };
      }
      if (url.includes(';api=create')) {
        calls.push({ step: 'create', url });
        return {
          ok: true,
          status: 200,
          headers: { get: (k) => (k === 'etag' ? '"0"' : null) },
          text: async () => '',
        };
      }
      if (url.includes('block_upload_finalize')) {
        calls.push({ step: 'finalize', url });
        const fileName = decodeURIComponent(url.match(/;path=([^;]+)/)?.[1] || 'asset.png');
        client.addUploaded(fileName);
        return {
          ok: true,
          status: 201,
          headers: {
            get: (k) => (k === 'location'
              ? `https://author-test.adobeaemcloud.com/content/dam/acme/${fileName}`
              : null),
          },
          text: async () => '',
        };
      }
      if (url.includes(';api=block_upload')) {
        calls.push({ step: 'block_upload', url });
        const fileName = url.match(/;path=([^;]+)/)?.[1] || 'asset.png';
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({
            'repo:blocksize': 5 * 1024 * 1024,
            _links: {
              'http://ns.adobe.com/adobecloud/rel/block/transfer': [
                { href: `https://blob.test/${fileName}` },
              ],
              'http://ns.adobe.com/adobecloud/rel/block/finalize': {
                href: `https://author-test.adobeaemcloud.com/adobe/repository/content/dam/acme;path=${fileName};api=block_upload_finalize;token=abc`,
              },
            },
          }),
        };
      }
      if (url.startsWith('https://blob.test/')) {
        calls.push({ step: 'put', url });
        return {
          ok: true, status: 201, headers: { get: () => null }, text: async () => '',
        };
      }
      if (!url.startsWith('https://x.com/')) throw new Error(`unexpected fetch ${url}`);
      const bytes = new Uint8Array(11 * 1024).fill(1);
      return {
        ok: true,
        status: 200,
        headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'image/png' : null) },
        arrayBuffer: async () => bytes.buffer,
      };
    };
  }

  it('dry-run: scrapes + downloads but does not upload or enrich', async () => {
    const client = fakeClient({ assets: [] });
    const out = await enrichAssetsClassic({
      options: baseOptions({ dryRun: true, bringIn: true, sourceUrl: 'https://site.test/home' }),
      client,
      generator,
      log: silent,
      fetchFn: siteAndRepositoryFetch(client),
    });
    expect(out.dryRun).toBe(true);
    expect(out.broughtIn.dryRun).toBe(true);
    expect(out.broughtIn.images).toHaveLength(2);
    expect(client.writes).toHaveLength(0);
  });

  it('live: uploads scraped images through repository block upload then enriches them', async () => {
    const client = fakeClient({ assets: [] });
    const calls = [];
    const out = await enrichAssetsClassic({
      options: baseOptions({ bringIn: true, sourceUrl: 'https://site.test/home' }),
      client,
      generator,
      log: silent,
      fetchFn: siteAndRepositoryFetch(client, calls),
    });
    expect(calls.map((c) => c.step)).toEqual([
      'folder',
      'create', 'block_upload', 'put', 'finalize',
      'create', 'block_upload', 'put', 'finalize',
    ]);
    expect(calls.find((c) => c.step === 'folder').url)
      .toContain('/adobe/repository/content/dam;api=create;path=acme');
    expect(calls.find((c) => c.step === 'create').url)
      .toContain('/adobe/repository/content/dam/acme;api=create');
    // Both uploaded assets are discovered and enriched; dam:status=approved drives Delivery.
    expect(out.report.counts().enriched).toBe(2);
    expect(client.writes).toHaveLength(2);
  });

  it('creates the customer folder through the repository API before uploading', async () => {
    const client = fakeClient({ assets: [] });
    const calls = [];
    await enrichAssetsClassic({
      options: baseOptions({ bringIn: true, sourceUrl: 'https://site.test/home' }),
      client,
      generator,
      log: silent,
      fetchFn: siteAndRepositoryFetch(client, calls),
    });
    expect(calls[0].step).toBe('folder');
    expect(calls[0].url).toContain('/adobe/repository/content/dam;api=create;path=acme');
    expect(calls.filter((c) => c.step === 'finalize')).toHaveLength(2);
  });

  it('warns and no-ops when --bring-in is set without --source-url', async () => {
    const client = fakeClient({ assets: [] });
    const out = await enrichAssetsClassic({
      options: baseOptions({ bringIn: true, sourceUrl: null }),
      client,
      generator,
      log: silent,
      fetchFn: siteAndRepositoryFetch(client),
    });
    expect(client.writes).toHaveLength(0);
    expect(out.report.assets).toHaveLength(0);
  });
});
