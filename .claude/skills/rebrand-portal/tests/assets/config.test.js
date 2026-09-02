import { describe, it, expect } from 'vitest';
import {
  mkdtempSync, writeFileSync, rmSync, mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  slugify, parseEnvFile, parseArgs, validateOptions, resolveCreds, resolveAemEnvId,
} from '../../scripts/assets/config.js';

describe('config', () => {
  describe('slugify', () => {
    it('slugifies brand names', () => {
      expect(slugify('Santander AG')).toBe('santander-ag');
      expect(slugify('  ACME, Inc.  ')).toBe('acme-inc');
    });
  });

  describe('parseEnvFile', () => {
    it('parses key=value, ignores comments, strips quotes', () => {
      const parsed = parseEnvFile('# comment\nA=1\nB="two"\nC=\'three\'\n\nBAD');
      expect(parsed).toEqual({ A: '1', B: 'two', C: 'three' });
    });
  });

  describe('parseArgs', () => {
    it('derives damPath from customerKey and parses flags', () => {
      const opts = parseArgs(['--customer-key', 'Santander', '--dry-run', '--concurrency', '2']);
      expect(opts.customerKey).toBe('santander');
      expect(opts.damPath).toBe('/content/dam/santander');
      expect(opts.dryRun).toBe(true);
      expect(opts.concurrency).toBe(2);
      expect(opts.writeMode).toBeUndefined();
      expect(opts.productCategoryVocab).toBeUndefined();
    });

    it('turns on bring-in when a source URL is given', () => {
      const opts = parseArgs(['--customer-key', 'x', '--source-url', 'https://x.com']);
      expect(opts.bringIn).toBe(true);
      expect(opts.sourceUrl).toBe('https://x.com');
    });

    it('ignores removed write-mode and vocab flags', () => {
      const opts = parseArgs([
        '--customer-key', 'x',
        '--write-mode', 'bulk',
        '--product-category-vocab', 'a,b',
      ]);
      expect(opts.writeMode).toBeUndefined();
      expect(opts.productCategoryVocab).toBeUndefined();
    });

    it('ignores a removed metadata-mode flag — there is one enrichment path, no mode to select', () => {
      expect(parseArgs(['--customer-key', 'x']).metadataMode).toBeUndefined();
      expect(parseArgs(['--customer-key', 'x', '--metadata-mode', 'vision']).metadataMode).toBeUndefined();
    });
  });

  describe('validateOptions', () => {
    it('requires a customer key', () => {
      expect(validateOptions(parseArgs([]))).toContain('--customer-key is required');
    });

    it('rejects reserved customer keys', () => {
      const errs = validateOptions(parseArgs(['--customer-key', 'api']));
      expect(errs.some((e) => e.includes('reserved'))).toBe(true);
    });

    it('rejects DAM paths outside the customer folder', () => {
      const errs = validateOptions(parseArgs([
        '--customer-key', 'acme',
        '--dam-path', '/content/dam/other',
      ]));
      expect(errs.some((e) => e.includes('/content/dam/acme'))).toBe(true);
    });

    it('passes for a valid set', () => {
      expect(validateOptions(parseArgs(['--customer-key', 'x']))).toEqual([]);
    });
  });

  describe('resolveCreds', () => {
    it('prefers explicit env creds', () => {
      const dir = mkdtempSync(join(tmpdir(), 'agent-envcreds-'));
      try {
        const out = resolveCreds({
          env: { SPARK_DM_CLIENT_ID: 'id', SPARK_DM_CLIENT_SECRET: 'sec' },
          secretsFile: join(dir, 'missing'),
          repoRoot: dir,
        });
        expect(out).toMatchObject({ clientId: 'id', clientSecret: 'sec', source: 'env' });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('reads SPARK_DM_* from a secrets file', () => {
      const dir = mkdtempSync(join(tmpdir(), 'agent-creds-'));
      const file = join(dir, '.secrets');
      try {
        writeFileSync(file, 'SPARK_DM_CLIENT_ID=abc\nSPARK_DM_CLIENT_SECRET=xyz\n');
        const out = resolveCreds({ secretsFile: file, env: {} });
        expect(out).toMatchObject({ clientId: 'abc', clientSecret: 'xyz', source: file });
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('throws with guidance when nothing is found', () => {
      const dir = mkdtempSync(join(tmpdir(), 'agent-nocreds-'));
      try {
        expect(() => resolveCreds({
          secretsFile: join(dir, 'missing'), repoRoot: dir, env: {},
        })).toThrow(/No DM credentials/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('resolveAemEnvId', () => {
    it('prefers the explicit option', () => {
      expect(resolveAemEnvId({ aemEnvId: 'p1-e2', env: {} })).toBe('p1-e2');
    });

    it('reads AEM_ENV_ID from the environment', () => {
      expect(resolveAemEnvId({ env: { AEM_ENV_ID: 'p3-e4' } })).toBe('p3-e4');
    });

    it('reads AEM_ENV_ID from worker config', () => {
      const dir = mkdtempSync(join(tmpdir(), 'agent-aemenv-'));
      try {
        mkdirSync(join(dir, 'cloudflare/src'), { recursive: true });
        writeFileSync(join(dir, 'cloudflare/src/config.js'), "export default { AEM_ENV_ID: 'p5-e6' };\n");
        expect(resolveAemEnvId({ repoRoot: dir, env: {} })).toBe('p5-e6');
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
