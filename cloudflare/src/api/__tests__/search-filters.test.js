/**
 * Unit tests for search D1 filter SQL generation (market filters)
 */

import { describe, expect, it } from 'vitest';
import { buildSearchD1Conditions, isValidMarketToken } from '../analytics.js';

describe('isValidMarketToken', () => {
  it('accepts asset market tags', () => {
    expect(isValidMarketToken('USA')).toBe(true);
    expect(isValidMarketToken('Global')).toBe(true);
    expect(isValidMarketToken('EMEA')).toBe(true);
  });

  it('rejects unsafe tokens', () => {
    expect(isValidMarketToken("'; DROP TABLE--")).toBe(false);
    expect(isValidMarketToken('')).toBe(false);
  });
});

describe('buildSearchD1Conditions', () => {
  it('returns date-only conditions by default', () => {
    const { whereClause, bindings } = buildSearchD1Conditions('2026-01-01', '2026-12-31', {});
    expect(whereClause).toContain('se.occurred_at >= ?');
    expect(whereClause).toContain('se.occurred_at <= ?');
    expect(bindings).toEqual(['2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59.999Z']);
  });

  it('adds market EXISTS clause for region filter', () => {
    const { whereClause, bindings } = buildSearchD1Conditions('2026-01-01', '2026-12-31', {
      region: 'USA',
    });
    expect(whereClause).toContain('search_event_markets');
    expect(whereClause).toContain('sem.market = ?');
    expect(bindings).toContain('USA');
  });

  it('throws for invalid market token', () => {
    expect(() => buildSearchD1Conditions('2026-01-01', '2026-12-31', { region: 'bad/token' }))
      .toThrow('Invalid region filter');
  });

  it('does not use user_country for region filter', () => {
    const { whereClause } = buildSearchD1Conditions('2026-01-01', '2026-12-31', { region: 'EMEA' });
    expect(whereClause).not.toContain('user_country');
  });
});
