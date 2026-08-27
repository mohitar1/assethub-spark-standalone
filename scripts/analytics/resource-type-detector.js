/* eslint-disable import/prefer-default-export */
/**
 * Resource Type Detector for Analytics (Shared Utilities)
 *
 * Determines if an asset is a template or regular asset for analytics tracking.
 *
 * **Used by:**
 * - `blocks/search-results/clients/dynamicmedia-client.js` - Download tracking
 *
 * **Purpose:**
 * Downloads are tracked separately for assets vs. templates. This utility
 * analyzes asset metadata to correctly classify resources using multiple
 * detection methods.
 *
 * **Detection Methods (in order):**
 * 1. **XML filename** - Chili templates use `.xml` extension
 * 2. **contentType metadata** - `custom:contentType` field contains "template"
 * 3. **category** - Legacy fallback, checks if category includes "template"
 *
 * **Returns:**
 * Object with `type` ('asset' or 'template') and `reasons` array explaining
 * which detection method(s) matched.
 *
 * @module scripts/analytics/resource-type-detector
 */

import { RESOURCE_TYPES } from './analytics-constants.js';

/**
 * Detect if an asset is a template based on multiple criteria
 *
 * Checks performed:
 * 1. File extension (.xml files are Chili templates)
 * 2. custom:contentType metadata field
 * 3. Asset category (legacy fallback)
 *
 * @param {Object} asset - Asset object with metadata
 * @param {string} [asset.name] - Asset filename
 * @param {string} [asset.contentType] - Asset content type metadata
 * @param {string} [asset.category] - Asset category metadata
 * @returns {Object} Detection result with type and reasons
 * @returns {string} returns.type - 'template' or 'asset'
 * @returns {string[]} returns.reasons - Array of detection reasons
 *
 * @example
 * detectResourceType({ name: 'template.xml' })
 * // Returns: { type: 'template', reasons: ['XML filename'] }
 *
 * @example
 * detectResourceType({ name: 'image.jpg', category: 'Asset' })
 * // Returns: { type: 'asset', reasons: [] }
 */
export function detectResourceType(asset) {
  const templateChecks = [];

  // Check 1: XML filename (Chili templates)
  if (asset?.name?.toLowerCase().endsWith('.xml')) {
    templateChecks.push('XML filename');
  }

  // Check 2: custom:contentType metadata
  const contentType = asset?.contentType;
  if (contentType && String(contentType).toLowerCase().includes('template')) {
    templateChecks.push('contentType metadata');
  }

  // Check 3: category (legacy fallback)
  if (asset?.category?.toLowerCase().includes('template')) {
    templateChecks.push('category');
  }

  return {
    type: templateChecks.length > 0 ? RESOURCE_TYPES.TEMPLATE : RESOURCE_TYPES.ASSET,
    reasons: templateChecks,
  };
}
