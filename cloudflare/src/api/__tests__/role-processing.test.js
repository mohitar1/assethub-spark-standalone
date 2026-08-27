/**
 * Unit tests for role processing in analytics.js
 *
 * NOTE: The role resolution functions (resolveRole, processRoleData) are private
 * to the analytics module. These tests verify the expected behavior by testing
 * the data transformation logic separately.
 *
 * The equivalent frontend functions in scripts/analytics/analytics-constants.js
 * have comprehensive test coverage in analytics-constants.test.js.
 * These functions are intentionally duplicated and should be kept in sync.
 */

import { describe, expect, it } from 'vitest';

// =============================================================================
// ROLE CONFIGURATION (Copied from analytics.js for testing)
// Keep in sync with cloudflare/src/api/analytics.js
// =============================================================================

const ROLE_DISPLAY_NAMES = {
  associate: 'Associate',
  agency: 'Agency',
  partner: 'Partner',
};

const ROLE_ALIASES = {
  employee: 'associate',
  'contingent-worker': 'associate',
};

const KNOWN_ROLES = ['Associate', 'Agency', 'Partner'];

function resolveRole(rawRole) {
  const role = (rawRole || '').toLowerCase().trim();
  if (!role) return null;

  if (ROLE_DISPLAY_NAMES[role]) {
    return ROLE_DISPLAY_NAMES[role];
  }

  if (ROLE_ALIASES[role]) {
    return ROLE_DISPLAY_NAMES[ROLE_ALIASES[role]];
  }

  if (role.includes(',')) {
    const parts = role.split(',').map((p) => p.trim());
    const matchedPart = parts.find((part) => ROLE_DISPLAY_NAMES[part] || ROLE_ALIASES[part]);

    if (matchedPart) {
      return ROLE_DISPLAY_NAMES[matchedPart] || ROLE_DISPLAY_NAMES[ROLE_ALIASES[matchedPart]];
    }
  }

  return null;
}

function processRoleData(data, valueField) {
  const roleData = {
    Associate: 0,
    Agency: 0,
    Partner: 0,
    Other: 0,
  };

  data.forEach((row) => {
    const value = parseInt(row[valueField], 10) || 0;
    if (value <= 0) return;

    const displayName = resolveRole(row.role);
    if (displayName) {
      roleData[displayName] += value;
    } else if (row.role) {
      roleData.Other += value;
    }
  });

  const result = [];
  KNOWN_ROLES.forEach((roleName) => {
    if (roleData[roleName] > 0) {
      result.push({ type: roleName, count: roleData[roleName] });
    }
  });
  if (roleData.Other > 0) {
    result.push({ type: 'Other', count: roleData.Other });
  }

  return result;
}

// =============================================================================
// TESTS
// =============================================================================

describe('Cloudflare role-processing', () => {
  describe('resolveRole', () => {
    it('resolves direct known roles', () => {
      expect(resolveRole('associate')).toBe('Associate');
      expect(resolveRole('agency')).toBe('Agency');
      expect(resolveRole('partner')).toBe('Partner');
    });

    it('resolves aliased roles to Associate', () => {
      expect(resolveRole('employee')).toBe('Associate');
      expect(resolveRole('contingent-worker')).toBe('Associate');
    });

    it('resolves comma-separated roles with known role', () => {
      expect(resolveRole('agency,admin')).toBe('Agency');
      expect(resolveRole('partner,admin')).toBe('Partner');
    });

    it('resolves comma-separated roles with aliased role', () => {
      expect(resolveRole('employee,admin')).toBe('Associate');
      expect(resolveRole('contingent-worker,admin')).toBe('Associate');
    });

    it('returns null for unknown roles', () => {
      expect(resolveRole('unknown-role')).toBeNull();
      expect(resolveRole('')).toBeNull();
      expect(resolveRole(null)).toBeNull();
    });
  });

  describe('processRoleData', () => {
    it('processes known roles correctly', () => {
      const data = [
        { role: 'associate', downloaders: 10 },
        { role: 'agency', downloaders: 20 },
      ];
      const result = processRoleData(data, 'downloaders');
      expect(result).toEqual([
        { type: 'Associate', count: 10 },
        { type: 'Agency', count: 20 },
      ]);
    });

    it('maps aliased roles to Associate', () => {
      const data = [
        { role: 'employee', downloaders: 10 },
        { role: 'contingent-worker', downloaders: 5 },
      ];
      const result = processRoleData(data, 'downloaders');
      expect(result).toEqual([{ type: 'Associate', count: 15 }]);
    });

    it('handles comma-separated roles', () => {
      const data = [
        { role: 'agency,admin', downloaders: 10 },
        { role: 'employee,admin', downloaders: 5 },
      ];
      const result = processRoleData(data, 'downloaders');
      expect(result).toEqual([
        { type: 'Associate', count: 5 },
        { type: 'Agency', count: 10 },
      ]);
    });

    it('buckets truly unknown roles into Other', () => {
      const data = [
        { role: 'associate', downloaders: 10 },
        { role: 'unknown-role', downloaders: 3 },
      ];
      const result = processRoleData(data, 'downloaders');
      expect(result).toEqual([
        { type: 'Associate', count: 10 },
        { type: 'Other', count: 3 },
      ]);
    });

    it('returns empty array for empty input', () => {
      expect(processRoleData([], 'downloaders')).toEqual([]);
    });
  });
});
