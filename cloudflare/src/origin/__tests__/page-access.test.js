import { describe, expect, it } from 'vitest';
import { isUserExcluded, parsePageExclusions } from '../page-access.js';

describe('parsePageExclusions', () => {
  it('returns empty exclusions when no meta tag exists', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: [], scopedRoles: {} });
  });

  it('parses a single role exclusion', () => {
    const html = '<html><head><meta name="exclude-roles" content="agency"></head></html>';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: ['agency'], scopedRoles: {} });
  });

  it('parses multiple role exclusions', () => {
    const html = '<meta name="exclude-roles" content="agency, contingent-worker">';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: ['agency', 'contingent-worker'], scopedRoles: {} });
  });

  it('parses a scoped role without country as a full-role exclusion', () => {
    const html = '<meta name="exclude-roles" content="partner">';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: ['partner'], scopedRoles: {} });
  });

  it('parses country-specific scoped-role exclusions', () => {
    const html = '<meta name="exclude-roles" content="partner:us, partner:ca">';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: [], scopedRoles: { partner: ['us', 'ca'] } });
  });

  it('parses mixed exclusions (roles + scoped-role countries)', () => {
    const html = '<meta name="exclude-roles" content="agency, partner:us, partner:ca">';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: ['agency'], scopedRoles: { partner: ['us', 'ca'] } });
  });

  it('handles empty content attribute', () => {
    const html = '<meta name="exclude-roles" content="">';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: [], scopedRoles: {} });
  });

  it('normalizes values to lowercase', () => {
    const html = '<meta name="exclude-roles" content="Agency, Partner:US">';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: ['agency'], scopedRoles: { partner: ['us'] } });
  });

  it('handles extra whitespace', () => {
    const html = '<meta name="exclude-roles" content="  agency ,  partner:us  ">';
    const result = parsePageExclusions(html);
    expect(result).toEqual({ roles: ['agency'], scopedRoles: { partner: ['us'] } });
  });
});

describe('isUserExcluded', () => {
  const noExclusions = { roles: [], scopedRoles: {} };

  it('returns false for admin users regardless of exclusions', () => {
    const user = { roles: ['admin', 'agency'] };
    const exclusions = { roles: ['agency'], scopedRoles: {} };
    expect(isUserExcluded(user, exclusions)).toBe(false);
  });

  it('returns false when there are no exclusions', () => {
    const user = { roles: ['employee'] };
    expect(isUserExcluded(user, noExclusions)).toBe(false);
  });

  it('excludes user by role', () => {
    const user = { roles: ['agency'] };
    const exclusions = { roles: ['agency'], scopedRoles: {} };
    expect(isUserExcluded(user, exclusions)).toBe(true);
  });

  it('does not exclude user with different role', () => {
    const user = { roles: ['employee'] };
    const exclusions = { roles: ['agency'], scopedRoles: {} };
    expect(isUserExcluded(user, exclusions)).toBe(false);
  });

  it('excludes user if any of their roles matches', () => {
    const user = { roles: ['employee', 'agency'] };
    const exclusions = { roles: ['agency'], scopedRoles: {} };
    expect(isUserExcluded(user, exclusions)).toBe(true);
  });

  it('excludes all users with a role when that role is excluded outright', () => {
    const user = { roles: ['partner'], countries: ['mx'] };
    const exclusions = { roles: ['partner'], scopedRoles: {} };
    expect(isUserExcluded(user, exclusions)).toBe(true);
  });

  it('excludes scoped role from matching country', () => {
    const user = { roles: ['partner'], countries: ['us'] };
    const exclusions = { roles: [], scopedRoles: { partner: ['us', 'ca'] } };
    expect(isUserExcluded(user, exclusions)).toBe(true);
  });

  it('does not exclude scoped role from non-matching country', () => {
    const user = { roles: ['partner'], countries: ['mx'] };
    const exclusions = { roles: [], scopedRoles: { partner: ['us', 'ca'] } };
    expect(isUserExcluded(user, exclusions)).toBe(false);
  });

  it('excludes scoped role if any of their countries matches', () => {
    const user = { roles: ['partner'], countries: ['mx', 'us'] };
    const exclusions = { roles: [], scopedRoles: { partner: ['us'] } };
    expect(isUserExcluded(user, exclusions)).toBe(true);
  });

  it('does not exclude a different role by scoped-role country exclusions', () => {
    const user = { roles: ['employee'], countries: ['us'] };
    const exclusions = { roles: [], scopedRoles: { partner: ['us'] } };
    expect(isUserExcluded(user, exclusions)).toBe(false);
  });

  it('handles user with no roles', () => {
    const user = { roles: [] };
    const exclusions = { roles: ['agency'], scopedRoles: {} };
    expect(isUserExcluded(user, exclusions)).toBe(false);
  });

  it('handles user with undefined roles', () => {
    const user = {};
    const exclusions = { roles: ['agency'], scopedRoles: {} };
    expect(isUserExcluded(user, exclusions)).toBe(false);
  });

  it('handles scoped role with undefined countries', () => {
    const user = { roles: ['partner'] };
    const exclusions = { roles: [], scopedRoles: { partner: ['us'] } };
    expect(isUserExcluded(user, exclusions)).toBe(false);
  });

  it('handles combined role + scoped-role country exclusion', () => {
    const agencyUser = { roles: ['agency'] };
    const usPartner = { roles: ['partner'], countries: ['us'] };
    const mxPartner = { roles: ['partner'], countries: ['mx'] };
    const employee = { roles: ['employee'] };

    const exclusions = { roles: ['agency'], scopedRoles: { partner: ['us'] } };

    expect(isUserExcluded(agencyUser, exclusions)).toBe(true);
    expect(isUserExcluded(usPartner, exclusions)).toBe(true);
    expect(isUserExcluded(mxPartner, exclusions)).toBe(false);
    expect(isUserExcluded(employee, exclusions)).toBe(false);
  });
});
