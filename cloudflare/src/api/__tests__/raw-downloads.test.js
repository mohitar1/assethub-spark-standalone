/**
 * Unit tests for raw downloads CSV export in analytics.js
 *
 * Tests the escapeCSV utility function and raw downloads export behavior.
 * The actual getRawDownloads function requires environment bindings,
 * so we test the core logic in isolation here.
 *
 * Note: maskEmail was removed when we switched from email to userId for user identification.
 */

import { describe, expect, it } from 'vitest';
import { ASSET_URN_PREFIX, stripAssetUrn } from '../../util/constants.js';

/**
 * Escape a value for CSV output
 * Wraps in quotes and escapes internal quotes
 *
 * @param {*} value - Value to escape
 * @returns {string} CSV-safe string
 */
function escapeCSV(value) {
  const str = String(value ?? '');
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// =============================================================================
// TESTS
// =============================================================================

describe('escapeCSV', () => {
  describe('simple values', () => {
    it('returns simple strings unchanged', () => {
      expect(escapeCSV('hello')).toBe('hello');
      expect(escapeCSV('test123')).toBe('test123');
    });

    it('converts numbers to strings', () => {
      expect(escapeCSV(42)).toBe('42');
      expect(escapeCSV(3.14)).toBe('3.14');
    });

    it('handles null and undefined', () => {
      expect(escapeCSV(null)).toBe('');
      expect(escapeCSV(undefined)).toBe('');
    });
  });

  describe('special characters', () => {
    it('wraps values with commas in quotes', () => {
      expect(escapeCSV('hello, world')).toBe('"hello, world"');
    });

    it('wraps values with quotes and escapes them', () => {
      expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
    });

    it('wraps values with newlines in quotes', () => {
      expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCSV('line1\rline2')).toBe('"line1\rline2"');
    });

    it('handles multiple special characters', () => {
      expect(escapeCSV('a,b"c\nd')).toBe('"a,b""c\nd"');
    });
  });
});

describe('raw downloads CSV generation', () => {
  // NOTE: generateCSVRow mirrors the column order and stripping logic in
  // analytics.js getRawDownloads(). If that function changes, this helper
  // must be updated to match. ASSET_URN_PREFIX and stripAssetUrn are imported
  // from constants to avoid duplicating those definitions.
  const generateCSVRow = (row) => {
    const isTemplate = row.resourceType === 'template';
    return [
      escapeCSV(row.timestamp),
      escapeCSV(row.userId),
      escapeCSV(row.country),
      escapeCSV(row.employeeType),
      escapeCSV(row.company),
      escapeCSV(row.roles),
      escapeCSV(row.downloadId), // Download ID
      escapeCSV(row.resourceType), // Resource Type
      escapeCSV(isTemplate ? '' : stripAssetUrn(row.downloadItemId)), // Asset ID
      escapeCSV(isTemplate ? stripAssetUrn(row.downloadItemId) : ''), // Template ID
      escapeCSV(stripAssetUrn(row.publicationId)), // Publication ID
      escapeCSV(row.campaign), // Campaign
      escapeCSV(row.brand), // Brand
      escapeCSV(row.downloadType), // Download Type
      escapeCSV(row.rendition), // Rendition
    ].join(',');
  };

  it('generates correct CSV row with userId (not email)', () => {
    const row = {
      timestamp: '2026-01-20T14:30:22Z',
      userId: 'U700855',
      country: 'US',
      employeeType: 'employee',
      company: 'Adobe',
      roles: 'associate',
      resourceType: 'asset',
      campaign: 'Christmas 2025',
      brand: 'Acme Corp',
      downloadId: '550e8400-e29b-41d4-a716-446655440000',
      downloadItemId: 'abc123-def4-5678-9abc-def012345678',
      downloadType: 'ready-to-use',
      rendition: 'original',
      publicationId: '',
    };

    const csvRow = generateCSVRow(row);
    // asset: Asset ID = downloadItemId, Template ID empty, campaign/brand after IDs
    expect(csvRow).toBe(
      '2026-01-20T14:30:22Z,U700855,US,employee,Adobe,associate,550e8400-e29b-41d4-a716-446655440000,asset,abc123-def4-5678-9abc-def012345678,,,Christmas 2025,Acme Corp,ready-to-use,original',
    );
  });

  it('strips urn:aaid:aem: prefix from asset downloadItemId', () => {
    const row = {
      timestamp: '2026-01-20T14:30:22Z',
      userId: 'U700855',
      country: 'US',
      employeeType: 'employee',
      company: 'Adobe',
      roles: 'associate',
      resourceType: 'asset',
      campaign: 'Test',
      brand: 'Acme Corp',
      downloadId: 'dl-uuid',
      downloadItemId: 'urn:aaid:aem:c086ecad-3eab-40da-8580-37b0a18523dc',
      downloadType: 'ready-to-use',
      rendition: 'original',
      publicationId: '',
    };
    const csvRow = generateCSVRow(row);
    expect(csvRow).toContain('c086ecad-3eab-40da-8580-37b0a18523dc');
    expect(csvRow).not.toContain('urn:aaid:aem:');
  });

  it('handles values with special characters', () => {
    const row = {
      timestamp: '2026-01-20T14:30:22Z',
      userId: 'U123456',
      country: 'US',
      employeeType: 'employee',
      company: 'Company, Inc.',
      roles: 'associate,admin',
      resourceType: 'asset',
      campaign: 'Campaign "Special"',
      brand: 'Brand Name',
      downloadId: 'abc-123',
      downloadItemId: 'xyz-456',
      downloadType: 'restricted',
      rendition: 'HighResPDF',
      publicationId: '',
    };

    const csvRow = generateCSVRow(row);
    expect(csvRow).toContain('"Company, Inc."');
    expect(csvRow).toContain('"associate,admin"');
    expect(csvRow).toContain('"Campaign ""Special"""');
  });

  it('handles missing/null values including new fields', () => {
    const row = {
      timestamp: '2026-01-20T14:30:22Z',
      userId: null,
      country: '',
      employeeType: undefined,
      company: 'Adobe',
      roles: 'associate',
      resourceType: 'asset',
      campaign: '',
      brand: 'Acme Corp',
      downloadId: '',
      downloadItemId: '',
      downloadType: '',
      rendition: '',
      publicationId: '',
    };

    const csvRow = generateCSVRow(row);
    // 15 fields: timestamp, userId, country, employeeType, company, roles,
    // downloadId, resourceType, assetId, templateId, publicationId,
    // campaign, brand, downloadType, rendition
    // null/undefined/empty all become empty strings; resourceType=asset so templateId is empty
    expect(csvRow).toBe('2026-01-20T14:30:22Z,,,,Adobe,associate,,asset,,,,,Acme Corp,,');
  });

  it('does not mask userId (unlike old email masking)', () => {
    const row = {
      timestamp: '2026-01-20T14:30:22Z',
      userId: 'U700855',
      country: 'US',
      employeeType: 'employee',
      company: 'Adobe',
      roles: 'associate',
      resourceType: 'asset',
      campaign: 'Test',
      brand: 'Acme Corp',
      downloadId: 'abc',
      downloadItemId: 'xyz',
      downloadType: 'ready-to-use',
      rendition: 'original',
      publicationId: '',
    };

    const csvRow = generateCSVRow(row);
    // userId should appear as-is, not masked
    expect(csvRow).toContain('U700855');
    expect(csvRow).not.toContain('***');
  });

  it('includes publicationId for customized template downloads', () => {
    const row = {
      timestamp: '2026-02-26T10:00:00Z',
      userId: 'U700855',
      country: 'US',
      employeeType: 'employee',
      company: 'Adobe',
      roles: 'associate',
      resourceType: 'template',
      campaign: 'Acme Corp',
      brand: 'Acme Corp - Always On Soccer',
      downloadId: 'dl-uuid-123',
      downloadItemId: '7c2eb8e8-7c55-4484-b236-bc9ccdb7117a',
      downloadType: 'ready-to-use',
      rendition: 'original',
      publicationId: 'e43f9480-2920-44d7-a17d-c96dbab99dbb',
    };

    const csvRow = generateCSVRow(row);
    // template: Asset ID empty, downloadItemId in Template ID, publicationId is copy
    expect(csvRow).toContain('e43f9480-2920-44d7-a17d-c96dbab99dbb');
    // Download ID, resource type, Asset ID (empty), Template ID, Publication ID, then campaign/brand
    expect(csvRow).toContain(
      'dl-uuid-123,template,,7c2eb8e8-7c55-4484-b236-bc9ccdb7117a,e43f9480-2920-44d7-a17d-c96dbab99dbb',
    );
    // Download type and rendition at the end
    expect(csvRow).toContain('ready-to-use,original');
  });

  it('non-customized template: Template ID set, Publication ID empty', () => {
    const row = {
      timestamp: '2026-02-26T10:00:00Z',
      userId: 'U700855',
      country: 'US',
      employeeType: 'employee',
      company: 'Adobe',
      roles: 'associate',
      resourceType: 'template',
      campaign: 'Always On',
      brand: 'Acme Corp',
      downloadId: 'dl-uuid-456',
      downloadItemId: 'urn:aaid:aem:3d8c06a8-3615-4604-9590-e6a57c415043',
      downloadType: 'ready-to-use',
      rendition: 'original',
      publicationId: '',
    };

    const csvRow = generateCSVRow(row);
    // Asset ID empty, Template ID populated (prefix stripped), Publication ID empty
    expect(csvRow).toContain('dl-uuid-456,template,,3d8c06a8-3615-4604-9590-e6a57c415043,');
    expect(csvRow).not.toContain(ASSET_URN_PREFIX);
    expect(csvRow).not.toContain('urn:aaid:aem:');
  });

  it('handles missing/null values for template resource type', () => {
    const row = {
      timestamp: '2026-01-20T14:30:22Z',
      userId: null,
      country: '',
      employeeType: undefined,
      company: 'Adobe',
      roles: 'associate',
      resourceType: 'template',
      campaign: '',
      brand: 'Acme Corp',
      downloadId: '',
      downloadItemId: '',
      downloadType: '',
      rendition: '',
      publicationId: '',
    };

    const csvRow = generateCSVRow(row);
    // 15 fields; resourceType=template so Asset ID empty, Template ID empty (no downloadItemId)
    expect(csvRow).toBe('2026-01-20T14:30:22Z,,,,Adobe,associate,,template,,,,,Acme Corp,,');
  });
});

describe('permission check', () => {
  // Test permission checking logic (the actual API check is integration-level)
  const PERMISSION_ADMIN_REPORTS = 'admin-reports';

  const hasPermission = (user, permission) => user?.permissions?.includes(permission);

  it('grants access when user has admin-reports permission', () => {
    const user = { permissions: ['admin-reports', 'other-perm'] };
    expect(hasPermission(user, PERMISSION_ADMIN_REPORTS)).toBe(true);
  });

  it('denies access when user lacks admin-reports permission', () => {
    const user = { permissions: ['other-perm'] };
    expect(hasPermission(user, PERMISSION_ADMIN_REPORTS)).toBe(false);
  });

  it('denies access when user has no permissions', () => {
    const user = { permissions: [] };
    expect(hasPermission(user, PERMISSION_ADMIN_REPORTS)).toBe(false);
  });

  it('denies access when user is null/undefined', () => {
    expect(hasPermission(null, PERMISSION_ADMIN_REPORTS)).toBe(undefined);
    expect(hasPermission(undefined, PERMISSION_ADMIN_REPORTS)).toBe(undefined);
  });

  it('denies access when permissions array is missing', () => {
    const user = {};
    expect(hasPermission(user, PERMISSION_ADMIN_REPORTS)).toBe(undefined);
  });
});
