/**
 * Search report summary metrics — all from search_events (no user_logins).
 */

import { describe, expect, it } from 'vitest';
import { searchMetricsApi } from '../analytics.js';

function mockDb(handlers) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          first: async () => handlers.first?.(sql, args),
          all: async () => handlers.all?.(sql, args) ?? { results: [] },
        }),
      };
    },
  };
}

function metricsRequest(type, startDate = '2026-01-01', endDate = '2026-01-31', extra = '') {
  const q = extra ? `&${extra}` : '';
  return {
    method: 'GET',
    url: `https://host/api/analytics/search-metrics?type=${type}&startDate=${startDate}&endDate=${endDate}${q}`,
  };
}

describe('searchMetricsApi summary metrics', () => {
  it('totalSearches counts rows in search_events for the date range', async () => {
    let capturedSql = '';
    const env = {
      SEARCH_EVENTS: mockDb({
        first: (sql) => {
          capturedSql = sql;
          return { total: 88 };
        },
      }),
    };

    const res = await searchMetricsApi(metricsRequest('totalSearches'), env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([{ total: 88 }]);
    expect(capturedSql).toContain('COUNT(*)');
    expect(capturedSql).toContain('search_events');
    expect(capturedSql).not.toContain('user_logins');
  });

  it('uniqueSearchers counts distinct user_id in search_events', async () => {
    let capturedSql = '';
    const env = {
      SEARCH_EVENTS: mockDb({
        first: (sql) => {
          capturedSql = sql;
          return { unique_count: 5 };
        },
      }),
    };

    const res = await searchMetricsApi(metricsRequest('uniqueSearchers'), env);
    const body = await res.json();

    expect(body.data).toEqual([{ unique_count: 5 }]);
    expect(capturedSql).toContain('COUNT(DISTINCT se.user_id)');
    expect(capturedSql).not.toContain('user_logins');
  });

  it('firstTimeSearchers uses HAVING MIN(occurred_at) for first search in range', async () => {
    let capturedSql = '';
    const env = {
      SEARCH_EVENTS: mockDb({
        first: (sql) => {
          capturedSql = sql;
          return { first_time_count: 2 };
        },
      }),
    };

    const res = await searchMetricsApi(metricsRequest('firstTimeSearchers'), env);
    const body = await res.json();

    expect(body.data).toEqual([{ first_time_count: 2 }]);
    expect(capturedSql).toContain('GROUP BY se.user_id');
    expect(capturedSql).toContain('HAVING MIN(se.occurred_at)');
    expect(capturedSql).not.toContain('user_logins');
  });

  it('rejects removed uniqueUsers metric type', async () => {
    const env = { SEARCH_EVENTS: mockDb({}) };
    const res = await searchMetricsApi(metricsRequest('uniqueUsers'), env);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('Unknown search metric type');
  });

  it('rejects removed firstTimeUsers metric type', async () => {
    const env = { SEARCH_EVENTS: mockDb({}) };
    const res = await searchMetricsApi(metricsRequest('firstTimeUsers'), env);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('Unknown search metric type');
  });
});
