import {
  describe, it, expect, afterEach,
} from 'vitest';
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { FIELD, STATUS_APPROVED } from '../constants.js';
import { fieldsToProperties } from '../enrich-classic.js';
import { isAlreadyEnriched } from '../metadata.js';
import { parseArgs, validateOptions } from '../config.js';
import {
  extractAssetUrls,
  extractDocumentUrls,
  extFromContentType,
} from '../scrape-site.js';

const repoRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const hookPath = join(repoRoot, '.claude/skills/customer-migration/hooks/guard-da-publish.sh');
const tempDirs = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

function tempProjectWithState(state) {
  const dir = mkdtempSync(join(tmpdir(), 'customer-migration-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, '.internal'), { recursive: true });
  writeFileSync(join(dir, '.internal/onboarding-state.json'), JSON.stringify(state), 'utf8');
  return dir;
}

function runGuard(projectDir, event) {
  return spawnSync('bash', [hookPath], {
    input: JSON.stringify(event),
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: projectDir,
    },
  });
}

describe('customer migration asset metadata guardrails', () => {
  it('stamps global country visibility on classic metadata writes', () => {
    const props = fieldsToProperties(
      { title: 'Hero', keywords: ['hero'] },
      { company: 'acme', status: STATUS_APPROVED, allowedCountries: 'global' },
    );

    expect(props[FIELD.COMPANY]).toBe('acme');
    expect(props[FIELD.STATUS]).toBe(STATUS_APPROVED);
    expect(props[FIELD.ALLOWED_COUNTRIES]).toBe('global');
  });

  it('does not skip assets missing required visibility metadata', () => {
    expect(isAlreadyEnriched({
      [FIELD.COMPANY]: 'acme',
      [FIELD.TITLE]: 'Hero',
      [FIELD.STATUS]: STATUS_APPROVED,
    }, 'acme')).toBe(false);

    expect(isAlreadyEnriched({
      [FIELD.COMPANY]: 'acme',
      [FIELD.TITLE]: 'Hero',
      [FIELD.STATUS]: STATUS_APPROVED,
      [FIELD.ALLOWED_COUNTRIES]: ['global'],
    }, 'acme')).toBe(true);
  });
});

describe('customer migration scope validation', () => {
  it('rejects reserved company keys', () => {
    const opts = parseArgs(['--customer-key', 'en']);
    expect(validateOptions(opts)).toContain('--customer-key "en" is reserved; use a real company key');
  });

  it('rejects DAM paths outside the customer folder', () => {
    const opts = parseArgs(['--customer-key', 'acme', '--dam-path', '/content/dam/other']);
    expect(validateOptions(opts)).toContain('--dam-path must stay under /content/dam/acme (got /content/dam/other)');
  });
});

describe('customer migration bring-in extraction', () => {
  it('extracts linked documents as customer assets', () => {
    const html = `
      <img src="/media/hero.jpg">
      <a href="/docs/catalog.pdf">Catalog</a>
      <a href="/docs/pricing.xlsx">Pricing</a>
    `;

    expect(extractDocumentUrls(html, 'https://example.com/shop')).toEqual([
      'https://example.com/docs/catalog.pdf',
      'https://example.com/docs/pricing.xlsx',
    ]);
    expect(extractAssetUrls(html, 'https://example.com/shop')).toContain('https://example.com/docs/catalog.pdf');
    expect(extFromContentType('application/pdf; charset=utf-8')).toBe('pdf');
  });
});

describe('customer migration publish guard hook', () => {
  it('allows DA writes under the company folder and blocks root writes', () => {
    const projectDir = tempProjectWithState({
      customer: { daFolder: '/acme' },
    });

    const allowed = runGuard(projectDir, {
      tool_input: {
        command: 'curl -X POST https://admin.hlx.page/preview/org/repo/main/acme/en/',
      },
    });
    expect(allowed.status).toBe(0);

    const blocked = runGuard(projectDir, {
      tool_input: {
        command: 'curl -X POST https://admin.hlx.page/preview/org/repo/main/en/',
      },
    });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toContain('outside the company folder');

    const blockedWrapper = runGuard(projectDir, {
      tool_input: {
        command: 'scripts/da-copy-folder.sh org repo other',
      },
    });
    expect(blockedWrapper.status).toBe(2);
    expect(blockedWrapper.stderr).toContain('DA copy script destination -> /other');
  });

  it('rejects reserved company keys in the DA copy script before token lookup', () => {
    const result = spawnSync('bash', [join(repoRoot, 'scripts/da-copy-folder.sh'), 'org', 'repo', 'en'], {
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("companyKey 'en' is reserved");
  });

  it('rejects DA copy destinations that do not match existing migration state', () => {
    const projectDir = tempProjectWithState({
      customer: { daFolder: '/acme' },
    });

    const result = spawnSync(
      'bash',
      [join(repoRoot, '.claude/skills/customer-migration/scripts/da-copy-folder.sh'), 'org', 'repo', 'other'],
      {
        cwd: projectDir,
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("companyKey 'other' does not match state company folder /acme");
  });
});
