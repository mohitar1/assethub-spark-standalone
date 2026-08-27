/**
 * Renditions Fetcher Utility
 * Extracted to break circular dependency between
 * search-results.js and download-renditions-content.js
 */

// Module-level state for image presets fetching
let fetchingImagePresets = false;

// Track in-flight rendition requests to avoid duplicate API calls.
// Maps assetId → Promise so concurrent callers reuse the same request.
const pendingRequests = new Map();

// State accessors - will be set by init()
let getState = null;
let setStateFn = null;

/**
 * Initialize the renditions fetcher with state accessors
 * @param {Function} stateFn - Function that returns current state
 * @param {Function} setState - Function to update state
 */
export function initRenditionsFetcher(stateFn, setState) {
  getState = stateFn;
  setStateFn = setState;
}

/**
 * Fetch renditions for an asset
 * @param {Object} asset - Asset object
 */
export async function fetchAssetRenditions(asset) {
  if (!getState || !setStateFn) {
    // eslint-disable-next-line no-console
    console.warn('Renditions fetcher not initialized. Call initRenditionsFetcher first.');
    return;
  }

  const state = getState();

  if (!state.dynamicMediaClient || !asset.assetId) return;

  // Fetch image presets once (for image assets)
  const isImageAsset = asset.format && asset.format.startsWith('image/');
  if (isImageAsset && !state.imagePresets.items && !fetchingImagePresets) {
    fetchingImagePresets = true;
    try {
      const presets = await state.dynamicMediaClient.getImagePresets();
      setStateFn({ imagePresets: presets });
      asset.imagePresets = presets;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch image presets:', error);
    } finally {
      fetchingImagePresets = false;
    }
  } else if (isImageAsset && state.imagePresets.items) {
    asset.imagePresets = state.imagePresets;
  }

  // Check cache first for asset-specific renditions
  const currentState = getState();
  if (currentState.assetRenditionsCache[asset.assetId]) {
    // Copy cached renditions to asset object
    asset.renditions = currentState.assetRenditionsCache[asset.assetId];
    return;
  }

  // Deduplicate in-flight requests — if a fetch for this asset is already
  // pending, reuse its promise instead of firing another API call.
  if (pendingRequests.has(asset.assetId)) {
    try {
      const renditions = await pendingRequests.get(asset.assetId);
      asset.renditions = renditions;
    } catch {
      // Error already logged by the original caller
    }
    return;
  }

  const request = currentState.dynamicMediaClient.getAssetRenditions(asset)
    .then((renditions) => {
      // Update cache
      setStateFn({
        assetRenditionsCache: {
          ...getState().assetRenditionsCache,
          [asset.assetId]: renditions,
        },
      });
      return renditions;
    })
    .finally(() => {
      pendingRequests.delete(asset.assetId);
    });

  pendingRequests.set(asset.assetId, request);

  try {
    const renditions = await request;
    // Also update the asset object directly so components can access it
    // API returns { items: [...] }, so asset.renditions.items will work
    asset.renditions = renditions;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch asset renditions:', error);
  }
}

export default fetchAssetRenditions;
