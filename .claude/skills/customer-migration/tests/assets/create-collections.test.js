import {
  describe, it, expect, vi,
} from 'vitest';
import {
  parseArgs, validateOptions, createCollectionsRun,
} from '../../scripts/assets/create-collections.js';

function silentLog() {
  return { warn: vi.fn(), error: vi.fn(), log: vi.fn() };
}

const ASSETS = [
  { assetId: 'a1', productCategory: 'coffee' },
  { assetId: 'a2', productCategory: 'coffee' },
  { assetId: 'a3', productCategory: 'tea' },
];

describe('create-collections controller', () => {
  describe('parseArgs', () => {
    it('slugifies the customer key and applies defaults', () => {
      const opts = parseArgs(['--customer-key', 'Acme Corp']);
      expect(opts.customerKey).toBe('acme-corp');
      expect(opts.groupBy).toBe('productCategory');
      expect(opts.limit).toBe(200);
      expect(opts.accessLevel).toBe('public');
      expect(opts.dryRun).toBe(false);
    });
    it('parses flags', () => {
      const opts = parseArgs([
        '--customer-key', 'acme', '--group-by', 'campaign',
        '--limit', '50', '--min-assets', '2', '--dry-run', '--force',
      ]);
      expect(opts).toMatchObject({
        customerKey: 'acme', groupBy: 'campaign', limit: 50, minAssets: 2, dryRun: true, force: true,
      });
    });
    it('parses an explicit display name, defaulting to null', () => {
      expect(parseArgs(['--customer-key', 'acme']).displayName).toBeNull();
      expect(parseArgs(['--customer-key', 'urbn', '--display-name', 'URBN']).displayName).toBe('URBN');
    });
  });

  describe('validateOptions', () => {
    it('requires a customer key', () => {
      expect(validateOptions(parseArgs([]))).toContain('--customer-key is required');
    });
    it('rejects reserved keys', () => {
      const errs = validateOptions(parseArgs(['--customer-key', 'config']));
      expect(errs.join(' ')).toMatch(/reserved/);
    });
    it('rejects an unsupported group-by facet', () => {
      const errs = validateOptions(parseArgs(['--customer-key', 'acme', '--group-by', 'nope']));
      expect(errs.join(' ')).toMatch(/--group-by must be/);
    });
    it('accepts a valid config', () => {
      expect(validateOptions(parseArgs(['--customer-key', 'acme']))).toEqual([]);
    });
  });

  describe('createCollectionsRun', () => {
    it('creates one company-scoped collection per facet value', async () => {
      const client = {
        searchCompanyAssets: vi.fn(async () => ASSETS),
        createCollection: vi.fn(async () => ({ collectionId: 'col' })),
      };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'acme']), client, log: silentLog(),
      });
      expect(report.assetsFound).toBe(3);
      expect(report.created).toBe(2);
      expect(report.failed).toBe(0);
      expect(client.createCollection).toHaveBeenCalledTimes(2);
      // company stamped on every created collection
      client.createCollection.mock.calls.forEach(([arg]) => {
        expect(arg.company).toBe('acme');
      });
    });

    it('uses --display-name verbatim in titles instead of title-casing the slug', async () => {
      const client = {
        searchCompanyAssets: vi.fn(async () => ASSETS),
        createCollection: vi.fn(async () => ({ collectionId: 'col' })),
      };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'urbn', '--display-name', 'URBN']),
        client,
        assets: ASSETS,
        log: silentLog(),
      });
      expect(report.collections.map((c) => c.title)).toEqual([
        'URBN — Coffee', 'URBN — Tea',
      ]);
    });

    it('falls back to title-casing the customer key when no display name is given', async () => {
      const client = {
        searchCompanyAssets: vi.fn(async () => ASSETS),
        createCollection: vi.fn(async () => ({ collectionId: 'col' })),
      };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'urbn']),
        client,
        assets: ASSETS,
        log: silentLog(),
      });
      expect(report.collections.map((c) => c.title)).toEqual([
        'Urbn — Coffee', 'Urbn — Tea',
      ]);
    });

    it('dry-run plans without creating', async () => {
      const client = {
        searchCompanyAssets: vi.fn(async () => ASSETS),
        createCollection: vi.fn(),
      };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'acme', '--dry-run']), client, log: silentLog(),
      });
      expect(report.dryRun).toBe(true);
      expect(report.created).toBe(0);
      expect(report.collections).toHaveLength(2);
      expect(client.createCollection).not.toHaveBeenCalled();
    });

    it('errors clearly when no assets are searchable', async () => {
      const log = silentLog();
      const client = { searchCompanyAssets: vi.fn(async () => []), createCollection: vi.fn() };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'acme']), client, log,
      });
      expect(report.error).toBe('no-assets');
      expect(log.error).toHaveBeenCalledWith(expect.stringMatching(/no searchable assets/));
    });

    it('warns when assets exist but none carry the facet', async () => {
      const client = {
        searchCompanyAssets: vi.fn(async () => [{ assetId: 'a1' }, { assetId: 'a2' }]),
        createCollection: vi.fn(),
      };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'acme']), client, log: silentLog(),
      });
      expect(report.error).toBe('no-groups');
      expect(client.createCollection).not.toHaveBeenCalled();
    });

    it('records per-collection failures without aborting the rest', async () => {
      const client = {
        searchCompanyAssets: vi.fn(async () => ASSETS),
        createCollection: vi.fn()
          .mockRejectedValueOnce(new Error('boom'))
          .mockResolvedValueOnce({ collectionId: 'ok' }),
      };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'acme']), client, log: silentLog(),
      });
      expect(report.created).toBe(1);
      expect(report.failed).toBe(1);
      expect(report.collections.find((c) => c.status === 'failed').error).toBe('boom');
    });

    it('uses seeded assets (fixture) without calling search', async () => {
      const client = { searchCompanyAssets: vi.fn(), createCollection: vi.fn() };
      const { report } = await createCollectionsRun({
        options: parseArgs(['--customer-key', 'acme', '--dry-run']),
        client,
        assets: ASSETS,
        log: silentLog(),
      });
      expect(client.searchCompanyAssets).not.toHaveBeenCalled();
      expect(report.collections).toHaveLength(2);
    });
  });
});
