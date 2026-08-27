import { describe, expect, it } from 'vitest';
import { defaultFrom } from '../../../../scripts/audit/asset-audit-constants.js';
import {
  bucketExpr,
  buildWhere,
  csvEscape,
  daysBetween,
  enumerateBuckets,
  parseDate,
  parseFilterParams,
  parseToBoundary,
  resolveAuditUserFields,
  validateFilterParams,
} from '../audit.js';

describe('parseDate', () => {
  it('returns ISO string for a valid date', () => {
    expect(parseDate('2026-01-15')).toBe('2026-01-15T00:00:00.000Z');
  });
  it('returns null for empty or invalid input', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate(null)).toBeNull();
    expect(parseDate('not-a-date')).toBeNull();
  });
});

describe('parseToBoundary', () => {
  it('pushes a date-only "to" to the last millisecond of that UTC day (inclusive)', () => {
    expect(parseToBoundary('2026-01-15')).toBe('2026-01-15T23:59:59.999Z');
  });
  it('honours a full timestamp as-is', () => {
    expect(parseToBoundary('2026-01-15T12:00:00.000Z')).toBe('2026-01-15T12:00:00.000Z');
  });
  it('returns null for empty or invalid input', () => {
    expect(parseToBoundary('')).toBeNull();
    expect(parseToBoundary('nope')).toBeNull();
  });
});

describe('parseFilterParams "to" is inclusive of the whole selected day', () => {
  it('expands a date-only to filter to end-of-day', () => {
    const p = parseFilterParams(new URL('https://x/?to=2026-01-15'));
    expect(p.to).toBe('2026-01-15T23:59:59.999Z');
  });
});

describe('defaultFrom', () => {
  it('returns the 1st of a month, one month back, as YYYY-MM-DD', () => {
    const out = defaultFrom();
    expect(out).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe('daysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-11')).toBe(10);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });
});

describe('bucketExpr', () => {
  it('uses day buckets for <= 31 days', () => {
    expect(bucketExpr('2026-01-01', '2026-01-20').bucket).toBe('day');
  });
  it('uses week buckets for 32–180 days', () => {
    expect(bucketExpr('2026-01-01', '2026-03-01').bucket).toBe('week');
  });
  it('uses month buckets beyond 180 days', () => {
    expect(bucketExpr('2026-01-01', '2026-12-31').bucket).toBe('month');
  });
});

describe('enumerateBuckets', () => {
  it('enumerates inclusive day labels', () => {
    expect(enumerateBuckets('2026-01-01', '2026-01-03', 'day')).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });
  it('enumerates month labels inclusively', () => {
    expect(enumerateBuckets('2026-01-15', '2026-03-02', 'month')).toEqual(['2026-01', '2026-02', '2026-03']);
  });
  it('enumerates Monday-aligned week labels 7 days apart', () => {
    const weeks = enumerateBuckets('2026-01-01', '2026-01-20', 'week');
    expect(weeks.length).toBeGreaterThan(0);
    // every label is a Monday and consecutive labels are 7 days apart
    weeks.forEach((w) => {
      expect(new Date(`${w}T00:00:00Z`).getUTCDay()).toBe(1);
    });
    for (let i = 1; i < weeks.length; i += 1) {
      const diff = (new Date(weeks[i]) - new Date(weeks[i - 1])) / 86_400_000;
      expect(diff).toBe(7);
    }
  });
});

describe('buildWhere', () => {
  it('returns an empty clause when no filters are set', () => {
    expect(buildWhere({})).toEqual({ clause: '', values: [] });
  });
  it('parameterises scalar filters', () => {
    expect(buildWhere({ user: 'a@b.com' })).toEqual({ clause: 'WHERE user_email = ?', values: ['a@b.com'] });
  });
  it('maps "unknown" to IS NULL without a bound value', () => {
    expect(buildWhere({ country: 'unknown' })).toEqual({ clause: 'WHERE user_country IS NULL', values: [] });
    expect(buildWhere({ userType: 'unknown' })).toEqual({ clause: 'WHERE user_type IS NULL', values: [] });
    expect(buildWhere({ role: 'unknown' })).toEqual({ clause: 'WHERE user_role IS NULL', values: [] });
  });
  it('expands associate role filter to employee aliases', () => {
    const { clause, values } = buildWhere({ role: 'associate' });
    expect(clause).toBe('WHERE (user_role = ? OR user_role = ? OR user_role = ?)');
    expect(values).toEqual(['associate', 'employee', 'contingent-worker']);
  });
  it('combines multiple conditions with AND', () => {
    const { clause, values } = buildWhere({ from: 'X', to: 'Y' });
    expect(clause).toBe('WHERE occurred_at >= ? AND occurred_at <= ?');
    expect(values).toEqual(['X', 'Y']);
  });
});

describe('csvEscape', () => {
  it('passes plain values through', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape(123)).toBe('123');
  });
  it('quotes and escapes commas, quotes, and newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('a"b')).toBe('"a""b"');
    expect(csvEscape('a\nb')).toBe('"a\nb"');
  });
  it('renders null/undefined as an empty string', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });
});

describe('validateFilterParams', () => {
  it('allows valid action and userType (including external)', () => {
    expect(validateFilterParams({ action: 'view', userType: 'external' })).toBeNull();
    expect(validateFilterParams({})).toBeNull();
  });
  it('rejects unknown action, userType, and role with a 400', () => {
    expect(validateFilterParams({ action: 'bogus' }).status).toBe(400);
    expect(validateFilterParams({ userType: 'bogus' }).status).toBe(400);
    expect(validateFilterParams({ role: 'bogus' }).status).toBe(400);
  });
});

describe('resolveAuditUserFields', () => {
  it('maps session fields to audit columns', () => {
    expect(
      resolveAuditUserFields({
        sub: 'sub-1',
        email: 'a@b.com',
        country: 'GB',
        userType: 'external',
        roles: ['agency'],
      }),
    ).toEqual({
      userId: 'sub-1',
      userEmail: 'a@b.com',
      userCountry: 'GB',
      userType: 'external',
      userRole: 'agency',
    });
  });
});

describe('parseFilterParams', () => {
  it('reads provided params and normalises dates', () => {
    const p = parseFilterParams(new URL('https://x/?user=a@b.com&country=US&from=2026-01-01'));
    expect(p.user).toBe('a@b.com');
    expect(p.country).toBe('US');
    expect(p.from).toBe('2026-01-01T00:00:00.000Z');
  });
  it('falls back to defaults when from/to are absent', () => {
    const p = parseFilterParams(new URL('https://x/'));
    expect(p.from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(p.to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
