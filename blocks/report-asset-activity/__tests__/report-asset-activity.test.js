import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  describe, it, expect, vi, afterEach,
} from 'vitest';
import {
  ASSET_AUDIT_ROLE_OPTIONS,
  ASSET_AUDIT_USER_TYPES,
} from '../../../scripts/audit/asset-audit-constants.js';

// chart-loader injects <script> tags; mock it so we can assert the denied
// branch returns before any chart bootstrap happens.
const { loadChartJs } = vi.hoisted(() => ({ loadChartJs: vi.fn(() => Promise.resolve()) }));
vi.mock('../../../scripts/audit/chart-loader.js', () => ({ default: loadChartJs }));

const { default: decorate } = await import('../report-asset-activity.js');
const reportSource = readFileSync(
  fileURLToPath(new URL('../report-asset-activity.js', import.meta.url)),
  'utf8',
);

describe('report-asset-activity constants', () => {
  it('uses session-aligned userType and role filter options', () => {
    expect(ASSET_AUDIT_USER_TYPES).toEqual(['internal', 'external', 'unknown']);
    expect(ASSET_AUDIT_ROLE_OPTIONS.map((o) => o.value)).toEqual(['', 'associate', 'agency', 'partner']);
  });
});

describe('report-asset-activity source', () => {
  it('includes Role chart/filter and removes Organisation API usage', () => {
    expect(reportSource).toContain('By Role');
    expect(reportSource).toContain('name="role"');
    expect(reportSource).toContain('data.byRole');
    expect(reportSource).not.toContain('Organisation');
    expect(reportSource).not.toContain('/api/audit/organisations');
  });
});

describe('report-asset-activity decorate — access gating', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the access-denied notice and skips chart init without view-audit', async () => {
    vi.stubGlobal('window', { user: { permissions: ['something-else'] } });
    const block = { innerHTML: '' };

    await decorate(block);

    expect(block.innerHTML).toContain('aar-denied');
    expect(loadChartJs).not.toHaveBeenCalled();
  });

  it('renders the access-denied notice when there is no user', async () => {
    vi.stubGlobal('window', {});
    const block = { innerHTML: '' };

    await decorate(block);

    expect(block.innerHTML).toContain('aar-denied');
    expect(loadChartJs).not.toHaveBeenCalled();
  });
});
