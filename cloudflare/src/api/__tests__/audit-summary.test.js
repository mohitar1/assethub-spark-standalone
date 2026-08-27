import { describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../../scripts/auth/permissions.js';
import { auditGetSummary } from '../audit.js';

const ALPHABET = '8gGQeDOJsS069Pod4mU2BKWRXjpiThLkZEHCantwuV7IrcqfAzMbN3vx1YlF5y';

// Pick canned results based on the SQL text. Order of checks matters
// (timeline's "GROUP BY bucket, action" must be tested before "GROUP BY action").
function resultsFor(sql) {
  if (sql.includes('AS total')) return { first: { total: 3 } };
  if (sql.includes('unique_users')) return { first: { unique_users: 2 } };
  if (sql.includes('unique_assets')) return { first: { unique_assets: 2 } };
  if (sql.includes('GROUP BY bucket')) {
    return { all: [{ bucket: '2026-01-01', action: 'view', count: 2 }] };
  }
  if (sql.includes('GROUP BY asset_id, action')) {
    return {
      all: [
        { asset_id: 'urn:aaid:aem:00000000-0000-0000-0000-000000000001', action: 'view', count: 1 },
        { asset_id: 'urn:aaid:aem:00000000-0000-0000-0000-000000000002', action: 'view', count: 5 },
      ],
    };
  }
  if (sql.includes('REPLACE(asset_id')) return { all: [{ asset_id: 'x', count: 3 }] };
  if (sql.includes('user_type')) return { all: [{ user_type: 'internal', count: 2 }] };
  if (sql.includes('user_role')) return { all: [{ user_role: 'employee', count: 2 }] };
  if (sql.includes('user_country')) return { all: [{ user_country: 'US', count: 3 }] };
  if (sql.includes('GROUP BY action')) return { all: [{ action: 'view', count: 3 }] };
  return { all: [] };
}

function makeEnv(recorder) {
  return {
    SQIDS_ALPHABET: ALPHABET,
    AUDIT_EVENTS: {
      prepare(sql) {
        const r = resultsFor(sql);
        return {
          bind(...args) {
            recorder.push({ sql, args });
            return {
              first: async () => r.first ?? null,
              all: async () => ({ results: r.all ?? [] }),
            };
          },
        };
      },
    },
  };
}

function summaryRequest(query) {
  return {
    user: { permissions: [PERMISSIONS.VIEW_AUDIT], email: 'u@x' },
    url: `https://host/api/audit/summary?${query}`,
    method: 'GET',
  };
}

describe('auditGetSummary', () => {
  it('zero-fills empty timeline buckets and pivots/sorts top assets', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const recorder = [];
    const env = makeEnv(recorder);

    const res = await auditGetSummary(summaryRequest('from=2026-01-01&to=2026-01-03'), env);
    const body = await res.json();

    expect(body.total).toBe(3);
    // day bucket over a 3-day inclusive range → 3 rows, two zero-filled
    expect(body.timeline.bucket).toBe('day');
    expect(body.timeline.data.map((d) => d.bucket)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    expect(body.timeline.data[0].view).toBe(2);
    expect(body.timeline.data[1].view).toBe(0);
    // top assets aggregated and sorted by total desc (5 before 1)
    expect(body.topAssets.map((a) => a.total)).toEqual([5, 1]);
    expect(body.byRole).toEqual({ employee: 2 });
    expect(body.byUserType).toEqual({ internal: 2 });
    // TODO(portal-wip): encodedId obfuscation (sqids) not yet implemented; re-enable once encoding lands.
    // expect(body.topAssets[0].encodedId).not.toContain('urn:aaid:aem:');
  });

  it('binds the filter values twice for the correlated top-assets subquery', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const recorder = [];
    const env = makeEnv(recorder);

    await auditGetSummary(summaryRequest('country=US&from=2026-01-01&to=2026-01-03'), env);

    const totalCall = recorder.find((c) => c.sql.includes('AS total'));
    const topAssetsCall = recorder.find((c) => c.sql.includes('GROUP BY asset_id, action'));
    // top-assets query must receive the filter values doubled (subquery + outer)
    expect(topAssetsCall.args).toEqual([...totalCall.args, ...totalCall.args]);
    expect(topAssetsCall.args.length).toBe(totalCall.args.length * 2);
  });

  it('returns 403 without view-audit permission', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await auditGetSummary(
      { user: { permissions: [] }, url: 'https://host/api/audit/summary', method: 'GET' },
      {},
    );
    expect(res.status).toBe(403);
  });
});
