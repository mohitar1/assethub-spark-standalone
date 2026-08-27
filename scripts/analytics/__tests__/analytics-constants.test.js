/**
 * Unit tests for analytics-constants.js
 */

import { describe, it, expect } from 'vitest';
import {
  UNKNOWN_VALUE,
  TOP_CAMPAIGNS_LIMIT,
  TOP_ASSETS_LIMIT,
  PERCENTAGE_MULTIPLIER,
  RESOURCE_TYPES,
  EVENT_TYPES,
  DOWNLOAD_TYPES,
  ROLE_DISPLAY_NAMES,
  ROLE_ALIASES,
  KNOWN_ROLES,
  ROLE_COLORS,
  FALLBACK_ROLE_COLOR,
  resolveRole,
  processRoleData,
  getRoleColor,
} from '../analytics-constants.js';

describe('analytics-constants', () => {
  describe('UNKNOWN_VALUE', () => {
    it('is defined as "unknown"', () => {
      expect(UNKNOWN_VALUE).toBe('unknown');
    });

    it('is a string type', () => {
      expect(typeof UNKNOWN_VALUE).toBe('string');
    });
  });

  describe('TOP_CAMPAIGNS_LIMIT', () => {
    it('is defined as 10', () => {
      expect(TOP_CAMPAIGNS_LIMIT).toBe(10);
    });

    it('is a number type', () => {
      expect(typeof TOP_CAMPAIGNS_LIMIT).toBe('number');
    });

    it('is a positive integer', () => {
      expect(TOP_CAMPAIGNS_LIMIT).toBeGreaterThan(0);
      expect(Number.isInteger(TOP_CAMPAIGNS_LIMIT)).toBe(true);
    });
  });

  describe('TOP_ASSETS_LIMIT', () => {
    it('is defined as 10', () => {
      expect(TOP_ASSETS_LIMIT).toBe(10);
    });

    it('is a number type', () => {
      expect(typeof TOP_ASSETS_LIMIT).toBe('number');
    });

    it('is a positive integer', () => {
      expect(TOP_ASSETS_LIMIT).toBeGreaterThan(0);
      expect(Number.isInteger(TOP_ASSETS_LIMIT)).toBe(true);
    });

    it('can be used for array slicing', () => {
      const assets = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Asset ${i}` }));
      const topAssets = assets.slice(0, TOP_ASSETS_LIMIT);
      expect(topAssets).toHaveLength(10);
    });
  });

  describe('PERCENTAGE_MULTIPLIER', () => {
    it('is defined as 100', () => {
      expect(PERCENTAGE_MULTIPLIER).toBe(100);
    });

    it('is a number type', () => {
      expect(typeof PERCENTAGE_MULTIPLIER).toBe('number');
    });

    it('converts decimal to percentage correctly', () => {
      const decimal = 0.75;
      const percentage = decimal * PERCENTAGE_MULTIPLIER;
      expect(percentage).toBe(75);
    });
  });

  describe('RESOURCE_TYPES', () => {
    it('has ASSET property', () => {
      expect(RESOURCE_TYPES).toHaveProperty('ASSET');
      expect(RESOURCE_TYPES.ASSET).toBe('asset');
    });

    it('has TEMPLATE property', () => {
      expect(RESOURCE_TYPES).toHaveProperty('TEMPLATE');
      expect(RESOURCE_TYPES.TEMPLATE).toBe('template');
    });

    it('has exactly 2 resource types', () => {
      expect(Object.keys(RESOURCE_TYPES)).toHaveLength(2);
    });

    it('all values are strings', () => {
      Object.values(RESOURCE_TYPES).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('EVENT_TYPES', () => {
    it('has LOGIN property', () => {
      expect(EVENT_TYPES).toHaveProperty('LOGIN');
      expect(EVENT_TYPES.LOGIN).toBe('login');
    });

    it('has SEARCH property', () => {
      expect(EVENT_TYPES).toHaveProperty('SEARCH');
      expect(EVENT_TYPES.SEARCH).toBe('search');
    });

    it('has DOWNLOAD property', () => {
      expect(EVENT_TYPES).toHaveProperty('DOWNLOAD');
      expect(EVENT_TYPES.DOWNLOAD).toBe('download');
    });

    it('has exactly 3 event types', () => {
      expect(Object.keys(EVENT_TYPES)).toHaveLength(3);
    });

    it('all values are strings', () => {
      Object.values(EVENT_TYPES).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('DOWNLOAD_TYPES', () => {
    it('has READY_TO_USE property', () => {
      expect(DOWNLOAD_TYPES).toHaveProperty('READY_TO_USE');
      expect(DOWNLOAD_TYPES.READY_TO_USE).toBe('ready-to-use');
    });

    it('has RESTRICTED property', () => {
      expect(DOWNLOAD_TYPES).toHaveProperty('RESTRICTED');
      expect(DOWNLOAD_TYPES.RESTRICTED).toBe('restricted');
    });

    it('has UNKNOWN property for data quality tracking', () => {
      expect(DOWNLOAD_TYPES).toHaveProperty('UNKNOWN');
      expect(DOWNLOAD_TYPES.UNKNOWN).toBe('unknown');
    });

    it('has exactly 3 download types', () => {
      expect(Object.keys(DOWNLOAD_TYPES)).toHaveLength(3);
    });

    it('all values are strings', () => {
      Object.values(DOWNLOAD_TYPES).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });

    it('values use kebab-case or simple format', () => {
      Object.values(DOWNLOAD_TYPES).forEach((value) => {
        expect(value).toMatch(/^[a-z]+(-[a-z]+)*$/);
      });
    });
  });

  describe('integration scenarios', () => {
    it('can be used together for percentage calculation', () => {
      const uniqueSearchers = 180;
      const uniqueVisitors = 1636;
      const percentage = Math.round((uniqueSearchers / uniqueVisitors) * PERCENTAGE_MULTIPLIER);
      expect(percentage).toBe(11);
    });

    it('can be used to validate resource types', () => {
      const validTypes = Object.values(RESOURCE_TYPES);
      expect(validTypes).toContain('asset');
      expect(validTypes).toContain('template');
      expect(validTypes).not.toContain('unknown');
    });

    it('can be used to validate event types', () => {
      const validEvents = Object.values(EVENT_TYPES);
      expect(validEvents).toContain('login');
      expect(validEvents).toContain('search');
      expect(validEvents).toContain('download');
    });

    it('can use TOP_CAMPAIGNS_LIMIT for array slicing', () => {
      const campaigns = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Campaign ${i}` }));
      const topCampaigns = campaigns.slice(0, TOP_CAMPAIGNS_LIMIT);
      expect(topCampaigns).toHaveLength(10);
    });
  });

  // ==========================================================================
  // ROLE CONFIGURATION TESTS
  // ==========================================================================

  describe('ROLE_DISPLAY_NAMES', () => {
    it('has all primary roles defined', () => {
      expect(ROLE_DISPLAY_NAMES.associate).toBe('Associate');
      expect(ROLE_DISPLAY_NAMES.agency).toBe('Agency');
      expect(ROLE_DISPLAY_NAMES.partner).toBe('Partner');
    });
  });

  describe('ROLE_ALIASES', () => {
    it('maps employee to associate', () => {
      expect(ROLE_ALIASES.employee).toBe('associate');
    });

    it('maps contingent-worker to associate', () => {
      expect(ROLE_ALIASES['contingent-worker']).toBe('associate');
    });
  });

  describe('KNOWN_ROLES', () => {
    it('has roles in correct order', () => {
      expect(KNOWN_ROLES).toEqual(['Associate', 'Agency', 'Partner']);
    });
  });

  describe('ROLE_COLORS', () => {
    it('has colors for all known roles and Other', () => {
      expect(ROLE_COLORS.Associate).toBe('#00647D');
      expect(ROLE_COLORS.Agency).toBe('#EBA439');
      expect(ROLE_COLORS.Partner).toBe('#58181D');
      expect(ROLE_COLORS.Other).toBe('#b8b8b8');
    });
  });

  describe('FALLBACK_ROLE_COLOR', () => {
    it('is defined as a valid hex color', () => {
      expect(FALLBACK_ROLE_COLOR).toBe('#cccccc');
      expect(FALLBACK_ROLE_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('resolveRole', () => {
    it('resolves direct known roles', () => {
      expect(resolveRole('associate')).toBe('Associate');
      expect(resolveRole('agency')).toBe('Agency');
      expect(resolveRole('partner')).toBe('Partner');
    });

    it('resolves known roles case-insensitively', () => {
      expect(resolveRole('ASSOCIATE')).toBe('Associate');
      expect(resolveRole('Agency')).toBe('Agency');
      expect(resolveRole('PARTNER')).toBe('Partner');
    });

    it('resolves aliased roles to Associate', () => {
      expect(resolveRole('employee')).toBe('Associate');
      expect(resolveRole('contingent-worker')).toBe('Associate');
    });

    it('resolves comma-separated roles with known role', () => {
      expect(resolveRole('agency,admin')).toBe('Agency');
      expect(resolveRole('partner,admin')).toBe('Partner');
      expect(resolveRole('associate,admin')).toBe('Associate');
    });

    it('resolves comma-separated roles with aliased role', () => {
      expect(resolveRole('employee,admin')).toBe('Associate');
      expect(resolveRole('contingent-worker,admin')).toBe('Associate');
    });

    it('handles whitespace in comma-separated roles', () => {
      expect(resolveRole('agency, admin')).toBe('Agency');
      expect(resolveRole('employee , admin')).toBe('Associate');
    });

    it('returns null for unknown roles', () => {
      expect(resolveRole('unknown-role')).toBeNull();
      expect(resolveRole('random')).toBeNull();
    });

    it('returns null for empty/null input', () => {
      expect(resolveRole('')).toBeNull();
      expect(resolveRole(null)).toBeNull();
      expect(resolveRole(undefined)).toBeNull();
    });

    it('returns null for comma-separated unknown roles', () => {
      expect(resolveRole('unknown,admin')).toBeNull();
      expect(resolveRole('random,other')).toBeNull();
    });
  });

  describe('processRoleData', () => {
    it('processes known roles correctly', () => {
      const data = [
        { role: 'associate', users: 10 },
        { role: 'agency', users: 20 },
        { role: 'partner', users: 5 },
      ];
      const result = processRoleData(data, 'users');
      expect(result).toEqual([
        { type: 'Associate', count: 10 },
        { type: 'Agency', count: 20 },
        { type: 'Partner', count: 5 },
      ]);
    });

    it('maps aliased roles to Associate', () => {
      const data = [
        { role: 'employee', users: 10 },
        { role: 'contingent-worker', users: 5 },
      ];
      const result = processRoleData(data, 'users');
      expect(result).toEqual([
        { type: 'Associate', count: 15 },
      ]);
    });

    it('handles comma-separated roles', () => {
      const data = [
        { role: 'agency,admin', users: 10 },
        { role: 'employee,admin', users: 5 },
      ];
      const result = processRoleData(data, 'users');
      expect(result).toEqual([
        { type: 'Associate', count: 5 },
        { type: 'Agency', count: 10 },
      ]);
    });

    it('buckets truly unknown roles into Other', () => {
      const data = [
        { role: 'associate', users: 10 },
        { role: 'unknown-role', users: 3 },
      ];
      const result = processRoleData(data, 'users');
      expect(result).toEqual([
        { type: 'Associate', count: 10 },
        { type: 'Other', count: 3 },
      ]);
    });

    it('omits roles with zero count', () => {
      const data = [
        { role: 'associate', users: 10 },
        { role: 'agency', users: 0 },
      ];
      const result = processRoleData(data, 'users');
      expect(result).toEqual([
        { type: 'Associate', count: 10 },
      ]);
    });

    it('aggregates multiple entries for same resolved role', () => {
      const data = [
        { role: 'employee', users: 10 },
        { role: 'associate', users: 5 },
        { role: 'contingent-worker,admin', users: 3 },
      ];
      const result = processRoleData(data, 'users');
      expect(result).toEqual([
        { type: 'Associate', count: 18 },
      ]);
    });

    it('uses correct count field', () => {
      const data = [
        { role: 'agency', logins: 100, users: 10 },
      ];
      expect(processRoleData(data, 'logins')).toEqual([
        { type: 'Agency', count: 100 },
      ]);
      expect(processRoleData(data, 'users')).toEqual([
        { type: 'Agency', count: 10 },
      ]);
    });

    it('returns empty array for empty input', () => {
      expect(processRoleData([])).toEqual([]);
    });
  });

  describe('getRoleColor', () => {
    it('returns correct colors for known roles', () => {
      expect(getRoleColor('Associate')).toBe('#00647D');
      expect(getRoleColor('Agency')).toBe('#EBA439');
      expect(getRoleColor('Partner')).toBe('#58181D');
      expect(getRoleColor('Other')).toBe('#b8b8b8');
    });

    it('returns fallback color for unknown roles', () => {
      expect(getRoleColor('Unknown')).toBe('#cccccc');
      expect(getRoleColor('Random')).toBe('#cccccc');
    });
  });
});
