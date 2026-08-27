/**
 * Unit tests for data-utils.js
 * Tests all data processing, aggregation, and transformation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  COUNTRY_TO_REGION,
  mapCountryToRegion,
  buildDateRange,
  buildQueryParams,
  initializeMonthlyData,
  normalizeMonthlyData,
  processMonthlyData,
  aggregateBy,
  aggregateByRegion,
  calculateTotal,
  monthlyDataToArray,
  objectToArray,
  sortByValueDesc,
  safeGetNumber,
  ensureArray,
  deepClone,
} from '../data-utils.js';

// =============================================================================
// COUNTRY TO REGION MAPPING
// =============================================================================

describe('data-utils: COUNTRY_TO_REGION', () => {
  it('maps North America countries', () => {
    expect(COUNTRY_TO_REGION.US).toBe('NA');
    expect(COUNTRY_TO_REGION.CA).toBe('NA');
    expect(COUNTRY_TO_REGION['UNITED STATES']).toBe('NA');
    expect(COUNTRY_TO_REGION.CANADA).toBe('NA');
  });

  it('maps Europe countries', () => {
    expect(COUNTRY_TO_REGION.GB).toBe('EU');
    expect(COUNTRY_TO_REGION.DE).toBe('EU');
    expect(COUNTRY_TO_REGION.FR).toBe('EU');
    expect(COUNTRY_TO_REGION.GERMANY).toBe('EU');
  });

  it('maps Latin America countries', () => {
    expect(COUNTRY_TO_REGION.MX).toBe('LA');
    expect(COUNTRY_TO_REGION.BR).toBe('LA');
    expect(COUNTRY_TO_REGION.MEXICO).toBe('LA');
  });

  it('maps Asia Pacific countries', () => {
    expect(COUNTRY_TO_REGION.AU).toBe('ASP');
    expect(COUNTRY_TO_REGION.SG).toBe('ASP');
    expect(COUNTRY_TO_REGION.AUSTRALIA).toBe('ASP');
  });

  it('maps Africa countries', () => {
    expect(COUNTRY_TO_REGION.ZA).toBe('AFR');
    expect(COUNTRY_TO_REGION['SOUTH AFRICA']).toBe('AFR');
  });

  it('maps Greater China & Mongolia countries', () => {
    expect(COUNTRY_TO_REGION.CN).toBe('GCM');
    expect(COUNTRY_TO_REGION.CHINA).toBe('GCM');
  });

  it('maps Japan & South Korea countries', () => {
    expect(COUNTRY_TO_REGION.JP).toBe('JSK');
    expect(COUNTRY_TO_REGION.JAPAN).toBe('JSK');
    expect(COUNTRY_TO_REGION.KR).toBe('JSK');
  });

  it('maps India, South West Asia countries', () => {
    expect(COUNTRY_TO_REGION.IN).toBe('INSWA');
    expect(COUNTRY_TO_REGION.INDIA).toBe('INSWA');
  });

  it('maps Eurasia & Middle East countries', () => {
    expect(COUNTRY_TO_REGION.RU).toBe('EME');
    expect(COUNTRY_TO_REGION.TR).toBe('EME');
    expect(COUNTRY_TO_REGION.RUSSIA).toBe('EME');
  });
});

describe('data-utils: mapCountryToRegion', () => {
  it('maps country codes to regions', () => {
    expect(mapCountryToRegion('US')).toBe('NA');
    expect(mapCountryToRegion('GB')).toBe('EU');
    expect(mapCountryToRegion('MX')).toBe('LA');
    expect(mapCountryToRegion('JP')).toBe('JSK');
  });

  it('maps country names to regions', () => {
    expect(mapCountryToRegion('United States')).toBe('NA');
    expect(mapCountryToRegion('GERMANY')).toBe('EU');
    expect(mapCountryToRegion('mexico')).toBe('LA');
  });

  it('is case-insensitive', () => {
    expect(mapCountryToRegion('us')).toBe('NA');
    expect(mapCountryToRegion('US')).toBe('NA');
    expect(mapCountryToRegion('Us')).toBe('NA');
  });

  it('trims whitespace', () => {
    expect(mapCountryToRegion('  US  ')).toBe('NA');
    expect(mapCountryToRegion('\tGB\n')).toBe('EU');
  });

  it('returns null for unknown countries', () => {
    expect(mapCountryToRegion('UNKNOWN')).toBeNull();
    expect(mapCountryToRegion('XX')).toBeNull();
  });

  it('returns null for empty/null input', () => {
    expect(mapCountryToRegion('')).toBeNull();
    expect(mapCountryToRegion(null)).toBeNull();
    expect(mapCountryToRegion(undefined)).toBeNull();
  });

  it('handles numeric input by converting to string', () => {
    // Should not crash with number input
    expect(mapCountryToRegion(123)).toBeNull();
  });
});

// =============================================================================
// DATE RANGE BUILDERS
// =============================================================================

describe('data-utils: buildDateRange', () => {
  describe('year view', () => {
    it('builds full year range', () => {
      const result = buildDateRange('year', 2026);
      expect(result).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
    });

    it('works for different years', () => {
      const result = buildDateRange('year', 2025);
      expect(result).toEqual({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });
    });

    it('ignores selectedMonth parameter for year view', () => {
      const result = buildDateRange('year', 2026, 5);
      expect(result).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
    });
  });

  describe('month view', () => {
    it('builds range for January (month 0)', () => {
      const result = buildDateRange('month', 2026, 0);
      expect(result).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
    });

    it('builds range for February non-leap year', () => {
      const result = buildDateRange('month', 2026, 1);
      expect(result).toEqual({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      });
    });

    it('builds range for February leap year', () => {
      const result = buildDateRange('month', 2024, 1);
      expect(result).toEqual({
        startDate: '2024-02-01',
        endDate: '2024-02-29',
      });
    });

    it('builds range for April (30 days)', () => {
      const result = buildDateRange('month', 2026, 3);
      expect(result).toEqual({
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });
    });

    it('builds range for December (month 11)', () => {
      const result = buildDateRange('month', 2026, 11);
      expect(result).toEqual({
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });
    });

    it('pads single-digit months with zero', () => {
      const result = buildDateRange('month', 2026, 5);
      expect(result.startDate).toBe('2026-06-01');
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('data-utils: buildQueryParams', () => {
  it('builds params with year only', () => {
    const filters = { selectedYear: 2026, viewType: 'year' };
    const params = buildQueryParams(filters);
    expect(params.get('year')).toBe('2026');
    expect(params.get('month')).toBeNull();
  });

  it('builds params with year and month', () => {
    const filters = { selectedYear: 2026, selectedMonth: 1, viewType: 'month' };
    const params = buildQueryParams(filters);
    expect(params.get('year')).toBe('2026');
    expect(params.get('month')).toBe('2'); // Converts 0-11 to 1-12
  });

  it('converts month index 0-11 to 1-12 for API', () => {
    const filters = { selectedYear: 2026, selectedMonth: 0, viewType: 'month' };
    const params = buildQueryParams(filters);
    expect(params.get('month')).toBe('1');
  });

  it('adds additional filters when provided', () => {
    const filters = {
      selectedYear: 2026,
      viewType: 'year',
      role: 'associate',
      region: 'NA',
    };
    const params = buildQueryParams(filters, ['role', 'region']);
    expect(params.get('role')).toBe('associate');
    expect(params.get('region')).toBe('NA');
  });

  it('excludes filters with value "all"', () => {
    const filters = {
      selectedYear: 2026,
      viewType: 'year',
      role: 'all',
      region: 'NA',
    };
    const params = buildQueryParams(filters, ['role', 'region']);
    expect(params.get('role')).toBeNull();
    expect(params.get('region')).toBe('NA');
  });

  it('excludes filters with undefined value', () => {
    const filters = {
      selectedYear: 2026,
      viewType: 'year',
      region: 'NA',
    };
    const params = buildQueryParams(filters, ['role', 'region']);
    expect(params.get('role')).toBeNull();
    expect(params.get('region')).toBe('NA');
  });

  it('returns URLSearchParams instance', () => {
    const filters = { selectedYear: 2026, viewType: 'year' };
    const params = buildQueryParams(filters);
    expect(params).toBeInstanceOf(URLSearchParams);
  });
});

// =============================================================================
// MONTHLY DATA NORMALIZATION
// =============================================================================

describe('data-utils: initializeMonthlyData', () => {
  it('creates object with 12 months (0-11)', () => {
    const result = initializeMonthlyData(2026);
    expect(Object.keys(result)).toHaveLength(12);
    expect(result).toHaveProperty('0');
    expect(result).toHaveProperty('11');
  });

  it('initializes with 0 by default', () => {
    const result = initializeMonthlyData(2026);
    expect(result[0]).toBe(0);
    expect(result[5]).toBe(0);
    expect(result[11]).toBe(0);
  });

  it('initializes with custom default value', () => {
    const result = initializeMonthlyData(2026, 100);
    expect(result[0]).toBe(100);
    expect(result[11]).toBe(100);
  });

  it('initializes with empty arrays when defaultValue is array', () => {
    const result = initializeMonthlyData(2026, []);
    expect(Array.isArray(result[0])).toBe(true);
    expect(result[0]).toHaveLength(0);
    // Each month should have its own array instance
    expect(result[0]).not.toBe(result[1]);
  });

  it('initializes with object copies when defaultValue is object', () => {
    const result = initializeMonthlyData(2026, { count: 0 });
    expect(result[0]).toEqual({ count: 0 });
    // Each month should have its own object instance
    expect(result[0]).not.toBe(result[1]);
  });

  it('handles null defaultValue as literal null', () => {
    const result = initializeMonthlyData(2026, null);
    // null is an object, so it gets treated as an object and cloned (resulting in null)
    expect(result[0]).toBeNull();
  });
});

describe('data-utils: normalizeMonthlyData', () => {
  it('fills missing months with default value', () => {
    const data = { 0: 100, 5: 200 };
    const result = normalizeMonthlyData(data, 2026, 0);
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(0);
    expect(result[5]).toBe(200);
    expect(result[11]).toBe(0);
  });

  it('preserves existing data', () => {
    const data = { 0: 100, 5: 200, 11: 300 };
    const result = normalizeMonthlyData(data, 2026);
    expect(result[0]).toBe(100);
    expect(result[5]).toBe(200);
    expect(result[11]).toBe(300);
  });

  it('always returns all 12 months', () => {
    const data = { 0: 100 };
    const result = normalizeMonthlyData(data, 2026);
    expect(Object.keys(result)).toHaveLength(12);
  });

  it('handles empty input object', () => {
    const result = normalizeMonthlyData({}, 2026);
    expect(Object.keys(result)).toHaveLength(12);
    expect(result[0]).toBe(0);
  });

  it('uses custom default value for missing months', () => {
    const data = { 0: 100 };
    const result = normalizeMonthlyData(data, 2026, -1);
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(-1);
  });

  it('ignores invalid month indices', () => {
    const data = { 0: 100, 15: 999, '-1': 888 };
    const result = normalizeMonthlyData(data, 2026);
    expect(result[0]).toBe(100);
    expect(result[15]).toBeUndefined();
  });
});

describe('data-utils: processMonthlyData', () => {
  it('processes API data for year view', () => {
    const apiData = [
      { year: 2026, month: 1, count: 100 },
      { year: 2026, month: 2, count: 150 },
    ];
    const result = processMonthlyData(apiData, 'year', 2026, 'count');
    expect(result[0]).toBe(100); // month 1 -> index 0
    expect(result[1]).toBe(150); // month 2 -> index 1
    expect(result[2]).toBe(0); // missing months filled with 0
  });

  it('converts API month (1-12) to index (0-11)', () => {
    const apiData = [{ year: 2026, month: 12, count: 100 }];
    const result = processMonthlyData(apiData, 'year', 2026, 'count');
    expect(result[11]).toBe(100); // December (month 12) -> index 11
  });

  it('fills all 12 months for year view', () => {
    const apiData = [{ year: 2026, month: 1, count: 100 }];
    const result = processMonthlyData(apiData, 'year', 2026, 'count');
    expect(Object.keys(result)).toHaveLength(12);
  });

  it('handles month view without filling all months', () => {
    const apiData = [{ year: 2026, month: 6, count: 100 }];
    const result = processMonthlyData(apiData, 'month', 2026, 'count');
    expect(result[5]).toBe(100);
    // Month view doesn't fill other months
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('handles missing count field', () => {
    const apiData = [{ year: 2026, month: 1 }];
    const result = processMonthlyData(apiData, 'year', 2026, 'count');
    expect(result[0]).toBe(0);
  });

  it('handles empty array', () => {
    const result = processMonthlyData([], 'year', 2026, 'count');
    expect(Object.keys(result)).toHaveLength(12);
    expect(result[0]).toBe(0);
  });

  it('handles null/undefined input', () => {
    const result = processMonthlyData(null, 'year', 2026, 'count');
    expect(Object.keys(result)).toHaveLength(12);
  });

  it('uses specified count field', () => {
    const apiData = [
      {
        year: 2026, month: 1, users: 50, logins: 100,
      },
    ];
    const resultUsers = processMonthlyData(apiData, 'year', 2026, 'users');
    const resultLogins = processMonthlyData(apiData, 'year', 2026, 'logins');
    expect(resultUsers[0]).toBe(50);
    expect(resultLogins[0]).toBe(100);
  });
});

// =============================================================================
// DATA AGGREGATION
// =============================================================================

describe('data-utils: aggregateBy', () => {
  it('aggregates data by field', () => {
    const data = [
      { role: 'associate', count: 10 },
      { role: 'associate', count: 5 },
      { role: 'agency', count: 8 },
    ];
    const result = aggregateBy(data, 'role', 'count');
    expect(result).toEqual({
      associate: 15,
      agency: 8,
    });
  });

  it('uses default count field', () => {
    const data = [
      { role: 'associate', count: 10 },
      { role: 'agency', count: 8 },
    ];
    const result = aggregateBy(data, 'role');
    expect(result.associate).toBe(10);
    expect(result.agency).toBe(8);
  });

  it('handles missing count values as 0', () => {
    const data = [
      { role: 'associate', count: 10 },
      { role: 'agency' }, // Missing count
    ];
    const result = aggregateBy(data, 'role', 'count');
    expect(result.associate).toBe(10);
    expect(result.agency).toBe(0);
  });

  it('skips entries with missing groupBy field', () => {
    const data = [
      { role: 'associate', count: 10 },
      { count: 5 }, // Missing role
    ];
    const result = aggregateBy(data, 'role', 'count');
    expect(result).toEqual({ associate: 10 });
  });

  it('handles empty array', () => {
    const result = aggregateBy([], 'role', 'count');
    expect(result).toEqual({});
  });

  it('handles null/undefined input', () => {
    expect(aggregateBy(null, 'role')).toEqual({});
    expect(aggregateBy(undefined, 'role')).toEqual({});
  });

  it('handles non-array input', () => {
    expect(aggregateBy('not-array', 'role')).toEqual({});
    expect(aggregateBy(123, 'role')).toEqual({});
  });
});

describe('data-utils: aggregateByRegion', () => {
  it('aggregates countries into regions', () => {
    const data = [
      { country: 'US', count: 100 },
      { country: 'CA', count: 50 },
      { country: 'GB', count: 75 },
    ];
    const result = aggregateByRegion(data);
    expect(result.NA).toBe(150); // US + CA
    expect(result.EU).toBe(75); // GB
  });

  it('initializes all regions to 0', () => {
    const result = aggregateByRegion([]);
    expect(result).toHaveProperty('NA');
    expect(result).toHaveProperty('EU');
    expect(result).toHaveProperty('LA');
    expect(result).toHaveProperty('ASP');
    expect(result).toHaveProperty('AFR');
    expect(result.NA).toBe(0);
  });

  it('uses specified count field', () => {
    const data = [
      { country: 'US', users: 50, downloads: 100 },
    ];
    const resultUsers = aggregateByRegion(data, 'users');
    const resultDownloads = aggregateByRegion(data, 'downloads');
    expect(resultUsers.NA).toBe(50);
    expect(resultDownloads.NA).toBe(100);
  });

  it('uses custom country field name', () => {
    const data = [
      { countryCode: 'US', count: 100 },
    ];
    const result = aggregateByRegion(data, 'count', 'countryCode');
    expect(result.NA).toBe(100);
  });

  it('handles unknown countries gracefully', () => {
    const data = [
      { country: 'US', count: 100 },
      { country: 'UNKNOWN', count: 50 },
    ];
    const result = aggregateByRegion(data);
    expect(result.NA).toBe(100);
    // Unknown country should not crash, just ignored
  });

  it('handles missing count as 0', () => {
    const data = [{ country: 'US' }];
    const result = aggregateByRegion(data);
    expect(result.NA).toBe(0);
  });

  it('handles null/undefined input', () => {
    const result = aggregateByRegion(null);
    expect(result).toHaveProperty('NA');
    expect(result.NA).toBe(0);
  });
});

describe('data-utils: calculateTotal', () => {
  it('calculates sum of object values', () => {
    const data = { jan: 100, feb: 150, mar: 200 };
    expect(calculateTotal(data)).toBe(450);
  });

  it('handles empty object', () => {
    expect(calculateTotal({})).toBe(0);
  });

  it('handles null/undefined input', () => {
    expect(calculateTotal(null)).toBe(0);
    expect(calculateTotal(undefined)).toBe(0);
  });

  it('ignores non-numeric values', () => {
    const data = { jan: 100, feb: 'invalid', mar: 200 };
    expect(calculateTotal(data)).toBe(300);
  });

  it('handles zero values', () => {
    const data = { jan: 0, feb: 0, mar: 100 };
    expect(calculateTotal(data)).toBe(100);
  });

  it('handles negative values', () => {
    const data = { jan: 100, feb: -50, mar: 150 };
    expect(calculateTotal(data)).toBe(200);
  });

  it('handles mixed numeric types', () => {
    const data = { jan: 100, feb: 50, mar: 0 };
    expect(calculateTotal(data)).toBe(150);
  });
});

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

describe('data-utils: monthlyDataToArray', () => {
  it('converts monthly object to array', () => {
    const data = {
      0: 100, 1: 150, 2: 200, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0,
    };
    const result = monthlyDataToArray(data);
    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({ label: 'Jan', value: 100 });
    expect(result[1]).toEqual({ label: 'Feb', value: 150 });
    expect(result[2]).toEqual({ label: 'Mar', value: 200 });
  });

  it('uses 0 for missing values', () => {
    const data = { 0: 100 };
    const result = monthlyDataToArray(data);
    expect(result[1].value).toBe(0);
  });

  it('accepts custom month names', () => {
    const data = {
      0: 100, 1: 150, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0,
    };
    const customNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const result = monthlyDataToArray(data, customNames);
    expect(result[0].label).toBe('January');
    expect(result[1].label).toBe('February');
  });
});

describe('data-utils: objectToArray', () => {
  it('converts object to array of label/value pairs', () => {
    const data = { associate: 100, agency: 50 };
    const result = objectToArray(data);
    expect(result).toEqual([
      { label: 'associate', value: 100 },
      { label: 'agency', value: 50 },
    ]);
  });

  it('uses label map when provided', () => {
    const data = { associate: 100, agency: 50 };
    const labels = { associate: 'Associate', agency: 'Agency' };
    const result = objectToArray(data, labels);
    expect(result).toEqual([
      { label: 'Associate', value: 100 },
      { label: 'Agency', value: 50 },
    ]);
  });

  it('uses key as label when not in label map', () => {
    const data = { associate: 100, agency: 50 };
    const labels = { associate: 'Associate' }; // agency not in map
    const result = objectToArray(data, labels);
    expect(result[0].label).toBe('Associate');
    expect(result[1].label).toBe('agency'); // Falls back to key
  });

  it('handles empty object', () => {
    const result = objectToArray({});
    expect(result).toEqual([]);
  });

  it('handles null/undefined input', () => {
    expect(objectToArray(null)).toEqual([]);
    expect(objectToArray(undefined)).toEqual([]);
  });

  it('handles non-numeric values as 0', () => {
    const data = { associate: 'invalid', agency: 50 };
    const result = objectToArray(data);
    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(50);
  });
});

describe('data-utils: sortByValueDesc', () => {
  it('sorts array by value descending', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 50 },
      { label: 'C', value: 30 },
    ];
    const result = sortByValueDesc(data);
    expect(result[0].label).toBe('B');
    expect(result[1].label).toBe('C');
    expect(result[2].label).toBe('A');
  });

  it('does not modify original array', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 50 },
    ];
    const original = [...data];
    sortByValueDesc(data);
    expect(data).toEqual(original);
  });

  it('handles missing values as 0', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B' }, // No value
      { label: 'C', value: 30 },
    ];
    const result = sortByValueDesc(data);
    expect(result[0].label).toBe('C');
    expect(result[1].label).toBe('A');
    expect(result[2].label).toBe('B');
  });

  it('handles empty array', () => {
    const result = sortByValueDesc([]);
    expect(result).toEqual([]);
  });

  it('handles single item', () => {
    const data = [{ label: 'A', value: 10 }];
    const result = sortByValueDesc(data);
    expect(result).toEqual(data);
  });
});

// =============================================================================
// VALIDATION AND SAFETY
// =============================================================================

describe('data-utils: safeGetNumber', () => {
  it('returns numeric values', () => {
    const obj = { count: 100 };
    expect(safeGetNumber(obj, 'count')).toBe(100);
  });

  it('returns default for missing keys', () => {
    const obj = { count: 100 };
    expect(safeGetNumber(obj, 'missing')).toBe(0);
  });

  it('returns default for non-numeric values', () => {
    const obj = { count: 'abc' };
    expect(safeGetNumber(obj, 'count')).toBe(0);
  });

  it('returns default for null values', () => {
    const obj = { count: null };
    expect(safeGetNumber(obj, 'count')).toBe(0);
  });

  it('returns default for undefined values', () => {
    const obj = { count: undefined };
    expect(safeGetNumber(obj, 'count')).toBe(0);
  });

  it('returns default for NaN values', () => {
    const obj = { count: NaN };
    expect(safeGetNumber(obj, 'count')).toBe(0);
  });

  it('uses custom default value', () => {
    const obj = { count: null };
    expect(safeGetNumber(obj, 'count', 999)).toBe(999);
  });

  it('handles null/undefined object', () => {
    expect(safeGetNumber(null, 'count')).toBe(0);
    expect(safeGetNumber(undefined, 'count')).toBe(0);
  });

  it('handles zero as valid number', () => {
    const obj = { count: 0 };
    expect(safeGetNumber(obj, 'count')).toBe(0);
  });

  it('handles negative numbers', () => {
    const obj = { count: -50 };
    expect(safeGetNumber(obj, 'count')).toBe(-50);
  });
});

describe('data-utils: ensureArray', () => {
  it('returns array as-is', () => {
    const arr = [1, 2, 3];
    expect(ensureArray(arr)).toBe(arr);
  });

  it('returns empty array for null', () => {
    expect(ensureArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  it('returns empty array for non-array values', () => {
    expect(ensureArray('string')).toEqual([]);
    expect(ensureArray(123)).toEqual([]);
    expect(ensureArray({})).toEqual([]);
  });

  it('handles empty array', () => {
    expect(ensureArray([])).toEqual([]);
  });
});

describe('data-utils: deepClone', () => {
  it('clones simple objects', () => {
    const obj = { a: 1, b: 2 };
    const clone = deepClone(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
  });

  it('clones nested objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = deepClone(obj);
    clone.b.c = 3;
    expect(obj.b.c).toBe(2); // Original unchanged
  });

  it('clones arrays', () => {
    const arr = [1, 2, 3];
    const clone = deepClone(arr);
    expect(clone).toEqual(arr);
    expect(clone).not.toBe(arr);
  });

  it('clones nested arrays', () => {
    const arr = [1, [2, 3], 4];
    const clone = deepClone(arr);
    clone[1][0] = 999;
    expect(arr[1][0]).toBe(2); // Original unchanged
  });

  it('returns original for non-cloneable values', () => {
    const fn = () => {};
    expect(deepClone(fn)).toBe(fn);
  });

  it('handles null', () => {
    expect(deepClone(null)).toBeNull();
  });

  it('handles primitives', () => {
    expect(deepClone(123)).toBe(123);
    expect(deepClone('string')).toBe('string');
  });
});
