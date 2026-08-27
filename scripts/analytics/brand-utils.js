/**
 * Brand Utilities for Analytics (Shared Utilities)
 *
 * Handles brand name cleaning and normalization for analytics tracking.
 *
 * **Used by:**
 * - `blocks/search-results/clients/dynamicmedia-client.js` - Download tracking
 *
 * **Purpose:**
 * Asset metadata often includes "Brand / " prefixes (e.g., "Brand / Acme Brand").
 * This utility strips those prefixes to normalize brand names for reporting,
 * ensuring consistent data in analytics and cleaner display in reports.
 *
 * **Behavior:**
 * - Removes "Brand / " prefix (case-insensitive, flexible whitespace)
 * - Handles comma-separated multi-value brands
 * - Returns 'unknown' for missing/empty values
 *
 * @module scripts/analytics/brand-utils
 */

import { UNKNOWN_VALUE } from './analytics-constants.js';

/**
 * Pattern to match "Brand / " prefix (case-insensitive, flexible whitespace)
 * Matches variations like:
 * - "Brand / Acme Brand" → "Acme Brand"
 * - "Brand / Kist-KO, Brand / Fanta" → "Kist-KO, Fanta"
 * - "brand/Sprite" → "Sprite"
 */
export const BRAND_PREFIX_PATTERN = /^Brand\s*\/\s*/i;

/**
 * Clean brand names by removing "Brand / " prefix from all comma-separated values
 *
 * @param {string|undefined} brand - Raw brand string from asset metadata
 * @returns {string} Cleaned brand string or 'unknown' if empty
 *
 * @example
 * cleanBrandName('Brand / Acme Brand')
 * // Returns: 'Acme Brand'
 *
 * @example
 * cleanBrandName('Brand / Kist-KO, Brand / Fanta')
 * // Returns: 'Kist-KO, Fanta'
 *
 * @example
 * cleanBrandName(null)
 * // Returns: 'unknown'
 */
export function cleanBrandName(brand) {
  if (!brand) return UNKNOWN_VALUE;

  // Split by comma, trim first, then clean prefix, filter empties, rejoin
  return brand
    .split(',')
    .map((b) => b.trim().replace(BRAND_PREFIX_PATTERN, ''))
    .filter((b) => b)
    .join(', ') || UNKNOWN_VALUE;
}
