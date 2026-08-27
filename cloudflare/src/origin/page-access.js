/**
 * Page-level access control based on exclude-roles metadata.
 *
 * Pages are visible to all authenticated users by default.
 * Authors can add an "exclude-roles" metadata field to restrict access.
 *
 * Supported formats:
 * - "agency"           → excludes all agency users
 * - "partner"          → excludes all users with the "partner" role
 * - "partner:us"       → excludes "partner" users from US only
 * - "agency, partner:us, partner:ca" → combined exclusions
 *
 * Any role may be country-scoped with the "role:country" syntax; there is no
 * hard-coded role, so the set of roles is fully driven by authored content.
 */

/**
 * Parse page exclusion metadata from HTML response.
 * Reads <meta name="exclude-roles" content="..."> from <head>.
 *
 * @param {string} html - The raw HTML string
 * @returns {{ roles: string[], scopedRoles: Object<string, string[]> }}
 *   `roles` excludes the whole role; `scopedRoles` maps a role to the list of
 *   countries it is excluded in.
 */
export function parsePageExclusions(html) {
  const exclusions = {
    roles: [],
    scopedRoles: {},
  };

  const match = html.match(/<meta\s+name="exclude-roles"\s+content="([^"]*)"[^>]*>/i);
  if (!match) return exclusions;

  const entries = match[1]
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  for (const entry of entries) {
    const [role, country] = entry.split(':');
    if (country) {
      if (!exclusions.scopedRoles[role]) exclusions.scopedRoles[role] = [];
      exclusions.scopedRoles[role].push(country);
    } else {
      exclusions.roles.push(role);
    }
  }

  return exclusions;
}

/**
 * Check whether a user is excluded from a page.
 *
 * @param {Object} user - The user object (roles, countries, etc.)
 * @param {{ roles: string[], scopedRoles: Object<string, string[]> }} exclusions
 * @returns {boolean} true if user is EXCLUDED (should be denied)
 */
export function isUserExcluded(user, exclusions) {
  if (user.roles?.includes('admin')) return false;

  const scopedRoles = exclusions.scopedRoles || {};
  const hasExclusions = exclusions.roles.length > 0 || Object.keys(scopedRoles).length > 0;
  if (!hasExclusions) return false;

  const userRoles = user.roles || [];

  // check full-role exclusions (agency, employee, contingent-worker, ...)
  if (userRoles.some((role) => exclusions.roles.includes(role))) return true;

  // check country-scoped role exclusions
  const userCountries = (user.countries || []).map((c) => c.toLowerCase());
  return userRoles.some((role) => {
    const countries = scopedRoles[role];
    return countries && userCountries.some((c) => countries.includes(c));
  });
}
