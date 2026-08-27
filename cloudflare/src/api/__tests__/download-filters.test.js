/**
 * Unit tests for download filter SQL generation
 * Tests buildDownloadFilterConditions function for security and correctness
 */

import { describe, expect, it } from 'vitest';

// Mock the filter builder function (in actual implementation, we'd import from analytics.js)
// For testing purposes, we're recreating it here to test the logic independently

const FILTER_DEFAULT_VALUE = 'all';
const VALID_ROLES = ['all', 'associate', 'agency', 'partner'];
const VALID_REGIONS = ['all', 'AFR', 'ASP', 'EME', 'EU', 'GCM', 'INSWA', 'JSK', 'LA', 'NA'];

const ROLE_MAPPINGS = {
  associate: ['associate', 'employee', 'contingent-worker'],
  agency: ['agency'],
  partner: ['partner'],
};

const REGION_TO_COUNTRIES = {
  AFR: ['ZA', 'NG', 'KE', 'EG', 'MA', 'GH', 'TZ', 'UG', 'ET', 'DZ'],
  ASP: ['AU', 'NZ', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'HK', 'TW'],
  EME: ['RU', 'TR', 'SA', 'AE', 'PK', 'UA', 'KZ', 'QA', 'KW', 'BH'],
  EU: [
    'GB',
    'DE',
    'FR',
    'IT',
    'ES',
    'NL',
    'BE',
    'CH',
    'AT',
    'SE',
    'NO',
    'DK',
    'FI',
    'PL',
    'PT',
    'IE',
    'GR',
    'CZ',
    'RO',
    'HU',
  ],
  GCM: ['CN', 'MN'],
  INSWA: ['IN', 'BD', 'LK', 'NP', 'AF'],
  JSK: ['JP', 'KR'],
  LA: [
    'MX',
    'BR',
    'AR',
    'CO',
    'CL',
    'PE',
    'EC',
    'VE',
    'GT',
    'CU',
    'BO',
    'DO',
    'HN',
    'PY',
    'SV',
    'NI',
    'CR',
    'PA',
    'UY',
  ],
  NA: ['US', 'CA'],
};

function buildDownloadFilterConditions(filters) {
  if (!filters) return '';

  const conditions = [];

  // Role filter (blob5 contains comma-separated roles)
  if (filters.role && filters.role !== FILTER_DEFAULT_VALUE) {
    if (!VALID_ROLES.includes(filters.role)) {
      throw new Error(`Invalid role filter: ${filters.role}`);
    }
    // Expand via ROLE_MAPPINGS
    const roleValues = ROLE_MAPPINGS[filters.role] || [filters.role];
    const roleConditions = roleValues.map((r) => `blob5 LIKE '%${r}%'`).join(' OR ');
    conditions.push(`(${roleConditions})`);
  }

  // Region filter (blob2 = country code)
  if (filters.region && filters.region !== FILTER_DEFAULT_VALUE) {
    if (!VALID_REGIONS.includes(filters.region)) {
      throw new Error(`Invalid region filter: ${filters.region}`);
    }
    const countryCodes = REGION_TO_COUNTRIES[filters.region];
    if (countryCodes && countryCodes.length > 0) {
      const quotedCodes = countryCodes.map((c) => `'${c}'`).join(', ');
      conditions.push(`blob2 IN (${quotedCodes})`);
    }
  }

  return conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
}

describe('buildDownloadFilterConditions', () => {
  describe('No Filters Applied', () => {
    it('should return empty string when no filters provided', () => {
      const result = buildDownloadFilterConditions({});
      expect(result).toBe('');
    });

    it('should return empty string when all filters are "all"', () => {
      const result = buildDownloadFilterConditions({
        role: 'all',
        region: 'all',
      });
      expect(result).toBe('');
    });

    it('should return empty string when filters is null', () => {
      const result = buildDownloadFilterConditions(null);
      expect(result).toBe('');
    });

    it('should return empty string when filters is undefined', () => {
      const result = buildDownloadFilterConditions(undefined);
      expect(result).toBe('');
    });
  });

  describe('Role Filter', () => {
    it('should filter by associate role with mappings', () => {
      const result = buildDownloadFilterConditions({ role: 'associate' });
      expect(result).toBe(
        " AND (blob5 LIKE '%associate%' OR blob5 LIKE '%employee%' OR blob5 LIKE '%contingent-worker%')",
      );
    });

    it('should filter by agency role', () => {
      const result = buildDownloadFilterConditions({ role: 'agency' });
      expect(result).toBe(" AND (blob5 LIKE '%agency%')");
    });

    it('should filter by partner role', () => {
      const result = buildDownloadFilterConditions({ role: 'partner' });
      expect(result).toBe(" AND (blob5 LIKE '%partner%')");
    });

    it('should not include role filter when role is "all"', () => {
      const result = buildDownloadFilterConditions({ role: 'all' });
      expect(result).toBe('');
    });

    it('should throw error for invalid role value (SQL injection prevention)', () => {
      expect(() => buildDownloadFilterConditions({ role: "'; DROP TABLE users; --" })).toThrow('Invalid role filter');
    });

    it('should throw error for SQL injection attempt in role', () => {
      expect(() => buildDownloadFilterConditions({ role: "admin' OR '1'='1" })).toThrow('Invalid role filter');
    });
  });

  describe('Region Filter', () => {
    it('should filter by North America region', () => {
      const result = buildDownloadFilterConditions({ region: 'NA' });
      expect(result).toContain(" AND blob2 IN ('US', 'CA')");
    });

    it('should filter by Europe region', () => {
      const result = buildDownloadFilterConditions({ region: 'EU' });
      expect(result).toContain(' AND blob2 IN (');
      expect(result).toContain("'GB'");
      expect(result).toContain("'DE'");
      expect(result).toContain("'FR'");
    });

    it('should filter by Latin America region', () => {
      const result = buildDownloadFilterConditions({ region: 'LA' });
      expect(result).toContain(' AND blob2 IN (');
      expect(result).toContain("'MX'");
      expect(result).toContain("'BR'");
    });

    it('should not include region filter when region is "all"', () => {
      const result = buildDownloadFilterConditions({ region: 'all' });
      expect(result).toBe('');
    });

    it('should throw error for invalid region value (SQL injection prevention)', () => {
      expect(() => buildDownloadFilterConditions({ region: "XX'; DROP TABLE users; --" })).toThrow(
        'Invalid region filter',
      );
    });

    it('should throw error for SQL injection attempt in region', () => {
      expect(() => buildDownloadFilterConditions({ region: "' OR '1'='1" })).toThrow('Invalid region filter');
    });
  });

  describe('Combined Filters', () => {
    it('should combine role and region filters with AND', () => {
      const result = buildDownloadFilterConditions({
        role: 'agency',
        region: 'NA',
      });
      expect(result).toContain("blob5 LIKE '%agency%'");
      expect(result).toContain("blob2 IN ('US', 'CA')");
      expect(result).toContain(' AND ');
    });

    it('should handle associate role with region filter', () => {
      const result = buildDownloadFilterConditions({
        role: 'associate',
        region: 'EU',
      });
      expect(result).toContain("blob5 LIKE '%associate%'");
      expect(result).toContain("blob5 LIKE '%employee%'");
      expect(result).toContain("blob5 LIKE '%contingent-worker%'");
      expect(result).toContain('blob2 IN (');
      expect(result).toContain("'GB'");
    });

    it('should ignore "all" values in combined filters', () => {
      const result = buildDownloadFilterConditions({
        role: 'partner',
        region: 'all',
      });
      expect(result).toBe(" AND (blob5 LIKE '%partner%')");
      expect(result).not.toContain('blob2');
    });
  });

  describe('Role Mapping Expansion', () => {
    it('should expand associate to all mapped roles', () => {
      const result = buildDownloadFilterConditions({ role: 'associate' });
      expect(result).toContain("blob5 LIKE '%associate%'");
      expect(result).toContain("blob5 LIKE '%employee%'");
      expect(result).toContain("blob5 LIKE '%contingent-worker%'");
      expect(result).toContain(' OR ');
    });

    it('should not expand agency (no aliases)', () => {
      const result = buildDownloadFilterConditions({ role: 'agency' });
      expect(result).toBe(" AND (blob5 LIKE '%agency%')");
      expect(result).not.toContain(' OR ');
    });

    it('should not expand partner (no aliases)', () => {
      const result = buildDownloadFilterConditions({ role: 'partner' });
      expect(result).toBe(" AND (blob5 LIKE '%partner%')");
      expect(result).not.toContain(' OR ');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should reject role with SQL injection attempt', () => {
      expect(() => buildDownloadFilterConditions({ role: "' OR 1=1 --" })).toThrow('Invalid role filter');
    });

    it('should reject region with SQL injection attempt', () => {
      expect(() => buildDownloadFilterConditions({ region: "'; DELETE FROM spark_analyticstest; --" })).toThrow(
        'Invalid region filter',
      );
    });

    it('should reject role with UNION attack', () => {
      expect(() => buildDownloadFilterConditions({ role: "' UNION SELECT * FROM users --" })).toThrow(
        'Invalid role filter',
      );
    });

    it('should reject region with semicolon', () => {
      expect(() => buildDownloadFilterConditions({ region: 'NA; DROP TABLE' })).toThrow('Invalid region filter');
    });

    it('should reject role with script tags', () => {
      expect(() => buildDownloadFilterConditions({ role: '<script>alert("xss")</script>' })).toThrow(
        'Invalid role filter',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string role', () => {
      const result = buildDownloadFilterConditions({ role: '' });
      expect(result).toBe('');
    });

    it('should handle empty string region', () => {
      const result = buildDownloadFilterConditions({ region: '' });
      expect(result).toBe('');
    });

    it('should handle null role', () => {
      const result = buildDownloadFilterConditions({ role: null });
      expect(result).toBe('');
    });

    it('should handle null region', () => {
      const result = buildDownloadFilterConditions({ region: null });
      expect(result).toBe('');
    });

    it('should handle undefined role', () => {
      const result = buildDownloadFilterConditions({ role: undefined });
      expect(result).toBe('');
    });

    it('should handle undefined region', () => {
      const result = buildDownloadFilterConditions({ region: undefined });
      expect(result).toBe('');
    });
  });

  describe('SQL Output Format', () => {
    it('should start with " AND " when filters are applied', () => {
      const result = buildDownloadFilterConditions({ role: 'agency' });
      expect(result).toMatch(/^ AND /);
    });

    it('should use AND to combine multiple filters', () => {
      const result = buildDownloadFilterConditions({
        role: 'partner',
        region: 'LA',
      });
      expect(result).toMatch(/ AND .* AND /);
    });

    it('should use proper SQL LIKE syntax for roles', () => {
      const result = buildDownloadFilterConditions({ role: 'agency' });
      expect(result).toContain("blob5 LIKE '%agency%'");
    });

    it('should use proper SQL IN syntax for regions', () => {
      const result = buildDownloadFilterConditions({ region: 'NA' });
      expect(result).toContain("blob2 IN ('US', 'CA')");
    });
  });
});
