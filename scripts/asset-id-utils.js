/**
 * Shared asset ID utilities
 * Centralizes the AEM asset ID prefix, UUID validation, normalization, and display formatting.
 */

import { localizePath } from './locale-utils.js';

/** AEM asset ID URN prefix */
export const ASSET_ID_PREFIX = 'urn:aaid:aem:';

/** UUID v4 pattern (8-4-4-4-12 hex) */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Test whether a string is a bare UUID (without the URN prefix).
 * @param {string} value - The string to test
 * @returns {boolean}
 */
export function isBareUuid(value) {
  return UUID_PATTERN.test(value);
}

/**
 * Normalize an asset ID to the full URN format expected by the API.
 * Accepts either a full URN (`urn:aaid:aem:<uuid>`) or a bare UUID and
 * always returns the full URN form.  Returns falsy values as-is.
 * @param {string} id - Asset ID (full URN or bare UUID)
 * @returns {string} Full URN asset ID
 */
export function normalizeAssetId(id) {
  if (!id) return id;
  const trimmed = id.trim();
  if (!trimmed.startsWith(ASSET_ID_PREFIX) && isBareUuid(trimmed)) {
    return `${ASSET_ID_PREFIX}${trimmed}`;
  }
  return trimmed;
}

/**
 * Resolve a normalized asset ID from common asset payload shapes.
 * Supports direct `assetId`, nested `asset.assetExtId`, and legacy `id`.
 * @param {Object|string} value - Asset object or asset ID string
 * @returns {string} Normalized asset ID or empty string when unavailable
 */
export function resolveAssetId(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return normalizeAssetId(value);
  }

  if (typeof value !== 'object') {
    return '';
  }

  const directId = typeof value.assetId === 'string' ? value.assetId.trim() : '';
  if (directId) {
    return normalizeAssetId(directId);
  }

  const nestedId = typeof value?.asset?.assetExtId === 'string'
    ? value.asset.assetExtId.trim()
    : '';
  if (nestedId) {
    return normalizeAssetId(nestedId);
  }

  const fallbackId = typeof value.id === 'string' ? value.id.trim() : '';
  if (!fallbackId) {
    return '';
  }

  if (fallbackId.startsWith(ASSET_ID_PREFIX) || isBareUuid(fallbackId)) {
    return normalizeAssetId(fallbackId);
  }

  return '';
}

/**
 * Strip the `urn:aaid:aem:` prefix from an asset ID for display.
 * Returns just the UUID portion so IDs match what users see in AEM Author.
 * @param {string} assetId - Full asset ID (e.g. 'urn:aaid:aem:60d0936e-...')
 * @returns {string} UUID only (e.g. '60d0936e-...')
 */
export function getDisplayAssetId(assetId) {
  if (!assetId) return '';
  return assetId.startsWith(ASSET_ID_PREFIX)
    ? assetId.substring(ASSET_ID_PREFIX.length)
    : assetId;
}

/**
 * Build the asset-details page URL (localized) with optional filename.
 * Single place for share links, card links, and deep links.
 * @param {string} assetId - The asset ID
 * @param {string} [filename] - Optional filename to include in URL (e.g. for address bar)
 * @returns {string} The localized asset-details URL
 */
export function buildAssetDetailsUrl(assetId, filename) {
  let url = localizePath(
    `/asset-details?assetid=${encodeURIComponent(getDisplayAssetId(assetId))}`,
  );
  if (filename) {
    url += `&fn=${encodeURIComponent(filename)}`;
  }
  return url;
}
