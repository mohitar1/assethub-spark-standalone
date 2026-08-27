/**
 * Shared constants for Cloudflare worker
 */

/**
 * Download types for analytics tracking
 * Based on asset rights status (readyToUse field)
 * Keep in sync with scripts/analytics/analytics-constants.js
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

/**
 * Valid download types array for validation
 */
export const VALID_DOWNLOAD_TYPES = Object.values(DOWNLOAD_TYPES);

/**
 * Number of top campaigns to display in reports
 * Keep in sync with scripts/analytics/analytics-constants.js
 */
export const TOP_CAMPAIGNS_LIMIT = 10;

/**
 * Number of top assets to display in reports
 * Keep in sync with scripts/analytics/analytics-constants.js
 */
export const TOP_ASSETS_LIMIT = 10;

/**
 * Month name constants
 */
export const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * AEM asset URN prefix used in Content Hub asset IDs.
 * IDs may arrive as full URNs (urn:aaid:aem:<uuid>) from URL paths or
 * as bare UUIDs when already stripped client-side.
 */
export const ASSET_URN_PREFIX = 'urn:aaid:aem:';

/**
 * Strip the AEM asset URN prefix to normalize IDs to bare UUIDs.
 * Used at both Analytics Engine write time and CSV export time to ensure
 * consistent ID format regardless of origin (URL path, JCR metadata, client header).
 * Returns an empty string for falsy input.
 *
 * @param {string} id - Asset ID, possibly with URN prefix
 * @returns {string} Bare UUID, or original value if not a URN, or '' for falsy input
 */
export function stripAssetUrn(id) {
  const str = String(id ?? '');
  return str.startsWith(ASSET_URN_PREFIX) ? str.slice(ASSET_URN_PREFIX.length) : str;
}

/**
 * Saved Searches Report constants
 */
export const SAVED_SEARCHES_REPORT = {
  // KV scanning configuration
  KV_USER_PREFIX: 'user:',
  KV_BATCH_LIMIT: 1000,

  // Distribution bucket configuration
  DISTRIBUTION_BUCKETS: {
    labels: ['0', '1-5', '6-10', '11-25', '26-50', '50+'],
    boundaries: [0, 5, 10, 25, 50], // Upper bounds for each bucket (50+ is implicit)
  },

  // Cache TTL (8 hours in seconds)
  CACHE_TTL: 28800,
};

/**
 * Helper function to get distribution bucket for a count
 * @param {number} count - Number of saved searches
 * @returns {string} Bucket label
 */
export function getDistributionBucket(count) {
  if (count === 0) return '0';
  if (count <= 5) return '1-5';
  if (count <= 10) return '6-10';
  if (count <= 25) return '11-25';
  if (count <= 50) return '26-50';
  return '50+';
}
