/**
 * Analytics & data freshness tests (D1-backed search metrics).
 *
 * Queries /api/analytics/search-metrics for search events and asserts events
 * exist in the last 7 days and last 24 hours. A failure here is an early signal
 * that search event writes to SEARCH_EVENTS D1 may have broken.
 */

/* eslint-disable no-restricted-syntax, no-continue */
import {
  describe, it, expect, beforeAll,
} from 'vitest';
import { makeRequest } from './setup/auth.js';
import { getBaseUrl, getCurrentEnv } from './setup/env.js';

const cookie = process.env.TEST_SESSION_COOKIE;

const now = new Date();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
const oneDayAgo = new Date(now.getTime() - ONE_DAY_MS);
const today = now.toISOString().slice(0, 10);
const weekStart = sevenDaysAgo.toISOString().slice(0, 10);
const dayStart = oneDayAgo.toISOString().slice(0, 10);

function sumColumn(rows, col) {
  return (rows || []).reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
}

async function queryMetric(type, startDate, endDate) {
  const res = await makeRequest('/api/analytics/search-metrics', {
    method: 'GET',
    query: { type, startDate, endDate },
    redirect: 'manual',
  });

  expect(res.status, `search-metrics?type=${type} returned ${res.status}`).toBe(200);
  expect(res.body?.success, `search-metrics?type=${type} success flag`).toBe(true);
  return res.body?.data ?? [];
}

if (!cookie) {
  describe('analytics & data freshness', () => {
    it.skip('requires TEST_SESSION_COOKIE', () => {});
  });
} else {
  const baseUrl = getBaseUrl();
  const env = getCurrentEnv();

  // eslint-disable-next-line no-console
  console.log(`\n  Analytics & data freshness tests → ${baseUrl}  (env: ${env})\n`);

  describe('analytics & data freshness', () => {
    beforeAll(async () => {
      const res = await makeRequest('/api/user', { redirect: 'manual' });
      if (res.status === 302 || res.status === 401 || res.status === 403) {
        throw new Error(
          `Session cookie expired or invalid (GET /api/user → ${res.status}). `
          + 'Get a fresh cookie and re-export TEST_SESSION_COOKIE.',
        );
      }
    });

    describe('search events (D1)', () => {
      describe('last 7 days', () => {
        it('has search events', async () => {
          const rows = await queryMetric('searchesByMonth', weekStart, today);
          const total = sumColumn(rows, 'searches');
          expect(
            total,
            `Expected ≥1 search event in last 7 days (${weekStart} – ${today})`,
          ).toBeGreaterThan(0);
        });
      });

      describe('last 24 hours', () => {
        it('has search events', async () => {
          const rows = await queryMetric('searchesByMonth', dayStart, today);
          const total = sumColumn(rows, 'searches');
          expect(
            total,
            `Expected ≥1 search event in last 24h (${dayStart} – ${today})`,
          ).toBeGreaterThan(0);
        });
      });
    });

    const VALID_SEARCH_TYPES = ['all', 'assets', 'templates', 'products'];

    describe('search event searchType', () => {
      describe('last 7 days', () => {
        it('every searchType is assets, templates, or products', async () => {
          const rows = await queryMetric('searchesByMonth', weekStart, today);
          const invalid = rows.filter((r) => !VALID_SEARCH_TYPES.includes(r.searchType));
          const invalidTypes = [...new Set(invalid.map((r) => r.searchType))];
          expect(
            invalidTypes,
            `Unexpected searchType value(s) in last 7 days: ${invalidTypes.join(', ')}`,
          ).toHaveLength(0);
        });
      });

      describe('last 24 hours', () => {
        it('every searchType is assets, templates, or products', async () => {
          const rows = await queryMetric('searchesByMonth', dayStart, today);
          const invalid = rows.filter((r) => !VALID_SEARCH_TYPES.includes(r.searchType));
          const invalidTypes = [...new Set(invalid.map((r) => r.searchType))];
          expect(
            invalidTypes,
            `Unexpected searchType value(s) in last 24h: ${invalidTypes.join(', ')}`,
          ).toHaveLength(0);
        });
      });
    });
  });
}
