/**
 * Display utilities for facet names and asset fields
 */

import { getCachedDaPlaceholders } from './placeholders.js';

/**
 * Maps facet values to user-friendly display names.
 * Priority order:
 * 1. DA placeholders (Tier 2 - metadata translations managed by authors in DA)
 * 2. External parameter mappings (hardcoded mappings for specific facets)
 * 3. Original facet name (fallback)
 *
 * Note: This function uses DA placeholders ONLY - it does not fall back to app labels.
 * App labels are for UI text (buttons, form labels), not metadata values.
 *
 * @param {string} facetTechId - The technical ID of the facet (e.g., 'custom-campaignName')
 * @param {string} facetName - The raw facet name to be mapped
 * @returns {string} The display name if a mapping exists, otherwise the original facet name
 */
export function getDisplayFacetName(facetTechId, facetName) {
  // Check DA placeholders (Tier 2 - author-managed metadata translations)
  // Authors can add translations using the exact facet value as the key
  const daPlaceholders = getCachedDaPlaceholders();
  if (daPlaceholders) {
    const daTranslation = daPlaceholders[facetName];
    if (daTranslation) {
      return daTranslation;
    }
  }

  return facetName;
}

/**
 * Gets a display name for a specific field from asset data
 * @param {string} fieldType - The field type (e.g., 'campaignName', 'agencyName', etc.)
 * @param {string} value - The field value to be mapped
 * @returns {string} The display name if a mapping exists, otherwise the original value
 */
export function getAssetFieldDisplayFacetName(fieldType, value) {
  const facetTechId = `custom-${fieldType}`;
  return getDisplayFacetName(facetTechId, value);
}
