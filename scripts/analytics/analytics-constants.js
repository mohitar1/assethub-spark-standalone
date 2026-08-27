/**
 * Analytics Constants (Shared Utilities)
 *
 * Shared constants for analytics tracking and reporting across the application.
 *
 * **Used by:**
 * - `blocks/search-results/` - Vanilla JavaScript search blocks
 * - `cloudflare/src/api/analytics.js` - Server-side API
 * - `blocks/report-downloads/` - Reporting UI
 *
 * **Purpose:**
 * Centralizes magic values to ensure consistency across client and server,
 * making them easy to update in one place.
 *
 * @module scripts/analytics/analytics-constants
 */

/**
 * Default value for missing or unknown data
 */
export const UNKNOWN_VALUE = 'unknown';

/**
 * Number of top campaigns to display in reports
 */
export const TOP_CAMPAIGNS_LIMIT = 10;

/**
 * Number of top assets to display in reports
 */
export const TOP_ASSETS_LIMIT = 10;

/**
 * Multiplier for percentage calculations (0.0-1.0 to 0-100)
 */
export const PERCENTAGE_MULTIPLIER = 100;

/**
 * Resource types for analytics tracking
 */
export const RESOURCE_TYPES = {
  ASSET: 'asset',
  TEMPLATE: 'template',
};

/**
 * Analytics event types
 */
export const EVENT_TYPES = {
  LOGIN: 'login',
  SEARCH: 'search',
  DOWNLOAD: 'download',
};

/**
 * Download types for analytics tracking
 * Based on asset rights status (readyToUse field)
 *
 * Values:
 * - READY_TO_USE: Asset has readyToUse = "yes" (rights-free)
 * - RESTRICTED: Asset has readyToUse = "no" (requires rights workflow)
 * - UNKNOWN: Asset has missing, empty, or unexpected readyToUse value (data quality issue)
 */
export const DOWNLOAD_TYPES = {
  READY_TO_USE: 'ready-to-use',
  RESTRICTED: 'restricted',
  UNKNOWN: 'unknown',
};

// =============================================================================
// ROLE CONFIGURATION FOR REPORTS
// =============================================================================
// NOTE: This role configuration is also duplicated in the Cloudflare Worker
// because it cannot import from frontend scripts.
// If you update role mappings, aliases, or colors, you MUST update BOTH:
//   1. This file (scripts/analytics/analytics-constants.js)
//   2. cloudflare/src/api/analytics.js
// =============================================================================

/**
 * Map of known primary role values (lowercase) to display names
 */
export const ROLE_DISPLAY_NAMES = {
  associate: 'Associate',
  agency: 'Agency',
  partner: 'Partner',
};

/**
 * Map of role aliases to their primary role
 * These roles should be treated as their mapped primary role
 */
export const ROLE_ALIASES = {
  employee: 'associate',
  'contingent-worker': 'associate',
};

/**
 * List of known role display names in display order
 */
export const KNOWN_ROLES = ['Associate', 'Agency', 'Partner'];

/**
 * Color scheme for roles in charts
 */
export const ROLE_COLORS = {
  Associate: '#00647D',
  Agency: '#EBA439',
  Partner: '#58181D',
  Other: '#b8b8b8',
};

/**
 * Fallback color for unknown role types
 */
export const FALLBACK_ROLE_COLOR = '#cccccc';

/**
 * Resolve a raw role string to a known display name
 * Handles:
 * - Direct matches (e.g., 'associate' -> 'Associate')
 * - Aliases (e.g., 'employee' -> 'Associate', 'contingent-worker' -> 'Associate')
 * - Comma-separated roles (e.g., 'employee,admin' -> 'Associate', 'agency,admin' -> 'Agency')
 *
 * @param {string} rawRole - Raw role string from API
 * @returns {string|null} Display name if resolved, null if should go to "Other"
 */
export function resolveRole(rawRole) {
  const role = (rawRole || '').toLowerCase().trim();
  if (!role) return null;

  // 1. Check for direct match with known roles
  if (ROLE_DISPLAY_NAMES[role]) {
    return ROLE_DISPLAY_NAMES[role];
  }

  // 2. Check for alias match (e.g., 'employee' -> 'Associate')
  if (ROLE_ALIASES[role]) {
    return ROLE_DISPLAY_NAMES[ROLE_ALIASES[role]];
  }

  // 3. Handle comma-separated roles (e.g., 'contingent-worker,admin')
  if (role.includes(',')) {
    const parts = role.split(',').map((p) => p.trim());

    // Find the first part that matches a known role or alias
    const matchedPart = parts.find((part) => ROLE_DISPLAY_NAMES[part] || ROLE_ALIASES[part]);

    if (matchedPart) {
      // Return direct match or resolve via alias
      return ROLE_DISPLAY_NAMES[matchedPart] || ROLE_DISPLAY_NAMES[ROLE_ALIASES[matchedPart]];
    }
  }

  // 4. No match found - will be bucketed into "Other"
  return null;
}

/**
 * Process role data for pie charts
 * Maps known roles to display names and buckets unmapped roles into "Other"
 *
 * @param {Array} roleData - Raw role data from API (array of objects with 'role' field)
 * @param {string} countField - Field to use for count (e.g., 'users', 'logins', 'searches')
 * @returns {Array} Processed role data array with { type, count } objects
 */
export function processRoleData(roleData, countField = 'users') {
  // Initialize with all known roles at 0 (including Other for unmapped roles)
  const roleCounts = {
    Associate: 0,
    Agency: 0,
    Partner: 0,
    Other: 0,
  };

  // Fill in data from query results
  roleData.forEach((item) => {
    const value = parseInt(item[countField], 10) || 0;
    if (value <= 0) return;

    const displayName = resolveRole(item.role);
    if (displayName) {
      roleCounts[displayName] += value;
    } else if (item.role) {
      // Unresolved role goes to Other
      roleCounts.Other += value;
    }
  });

  // Convert to array format expected by charts
  // Only include roles that have values
  const result = [];
  KNOWN_ROLES.forEach((roleName) => {
    if (roleCounts[roleName] > 0) {
      result.push({ type: roleName, count: roleCounts[roleName] });
    }
  });
  if (roleCounts.Other > 0) {
    result.push({ type: 'Other', count: roleCounts.Other });
  }

  return result;
}

/**
 * Get color for a role type
 * @param {string} roleType - Role type (e.g., 'Associate', 'Agency', 'Partner', 'Other')
 * @returns {string} Hex color code
 */
export function getRoleColor(roleType) {
  return ROLE_COLORS[roleType] || FALLBACK_ROLE_COLOR;
}

// =============================================================================
// CHART.JS CONFIGURATION
// =============================================================================

/**
 * Chart.js CDN URLs (shared across all reports)
 */
export const CHART_JS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
export const CHART_DATALABELS_CDN = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js';

/**
 * Chart initialization delay (ms) - gives time for DOM to settle
 */
export const CHART_INIT_DELAY = 100;

/**
 * Geography colors for charts (used across all reports)
 */
export const GEO_COLORS = [
  '#00647D',
  '#004d61',
  '#EBA439',
  '#DC6E52',
  '#58181D',
  '#666',
  '#8f8f8f',
  '#b8b8b8',
  '#d6d6d6',
];

/**
 * Geography codes used in reports (consistent across all reports)
 */
export const GEO_CODES = ['AFR', 'ASP', 'EME', 'EU', 'GCM', 'INSWA', 'JSK', 'LA', 'NA'];

/**
 * Month names (short)
 */
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Month names (full)
 */
export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Analytics date range constants
 */
export const ANALYTICS_START_YEAR = 2020;
export const ANALYTICS_MAX_YEAR = 2030; // Max year for validation (prevent invalid URL params)

/**
 * Search type colors for stacked charts
 */
export const SEARCH_TYPE_COLORS = {
  all: '#00647D',
  assets: '#EBA439',
  products: '#58181D',
  templates: '#b8b8b8',
};

/**
 * Resource type colors (for downloads)
 */
export const RESOURCE_TYPE_COLORS = {
  Asset: '#00647D',
  Template: '#EBA439',
};

/**
 * User type colors (matches role colors for consistency)
 */
export const USER_TYPE_COLORS = {
  Associate: '#00647D',
  Agency: '#EBA439',
  Partner: '#58181D',
  Other: '#b8b8b8',
};
