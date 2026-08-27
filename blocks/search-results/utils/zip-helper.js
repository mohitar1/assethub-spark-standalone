/**
 * ZIP Asset Helper Utilities
 */

/** Original rendition name — used to filter ZIP renditions for download */
export const ORIGINAL_RENDITION_NAME = 'original';

/**
 * Check if an asset is a ZIP file
 * @param {Object} asset - The asset object
 * @returns {boolean} True if the asset is a ZIP file
 */
export function isZipAsset(asset) {
  if (!asset) return false;

  // Check MIME type
  if (asset.format === 'application/zip') {
    return true;
  }

  // Check file extension
  if (asset.name && asset.name.toLowerCase().endsWith('.zip')) {
    return true;
  }

  return false;
}

/**
 * For ZIP assets, return a clone of the asset whose `renditions.items` contains
 * only the "original" rendition. The download modal then offers a single,
 * sensible choice instead of listing internal ZIP-content renditions.
 * For non-ZIP assets, returns the asset unchanged.
 *
 * @param {Object} asset - The asset object (or populatedImage)
 * @param {{ items?: Array<{ name: string }> }} [renditions] - Renditions cache
 *   or `asset.renditions`. Used to find the existing original rendition; falls
 *   back to a stub `{ name: 'original' }` if not present.
 * @returns {Object} Asset suitable for `openDownloadRenditionsModal`.
 */
export function getAssetWithOriginalOnlyForZip(asset, renditions) {
  if (!asset || !isZipAsset(asset)) return asset;
  const items = renditions?.items || [];
  const originalRendition = items.find((r) => r.name?.toLowerCase() === ORIGINAL_RENDITION_NAME)
    || { name: ORIGINAL_RENDITION_NAME };
  return { ...asset, renditions: { items: [originalRendition] } };
}

export default isZipAsset;
