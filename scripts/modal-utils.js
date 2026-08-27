/**
 * Utility functions for handling modals with browser history (pushState/popstate)
 */
import { localizePath } from './locale-utils.js';
import { getDisplayAssetId } from './asset-id-utils.js';

/**
 * Pushes a state to the browser history to support back-button closing of modals
 * @param {string} historyKey - Key to store in history state (e.g., 'assetDetailsModal')
 * @param {string} [url] - Optional URL to set in the address bar
 */
export function pushModalState(historyKey, url) {
  window.history.pushState({ [historyKey]: true }, '', url || window.location.href);
}

/**
 * Handles closing a modal and cleaning up browser history
 * @param {Object} options - Options object
 * @param {string} options.historyKey - Key used in history state
 * @param {Function} options.closeFn - Function to close/cleanup the modal UI
 * @param {boolean} [options.isPopState=false] - Whether this was triggered by a popstate event
 * @param {Function} [options.onClose] - Optional callback for additional cleanup or state updates
 * @param {string} [options.restoreUrl] - Optional URL to restore when closing
 *   (removes modal params from URL)
 */
export function handleModalClose(options) {
  const {
    historyKey,
    closeFn,
    isPopState = false,
    onClose,
    restoreUrl,
  } = options;

  // Close the modal UI
  if (typeof closeFn === 'function') {
    closeFn();
  }

  // Additional cleanup/state updates
  if (typeof onClose === 'function') {
    onClose();
  }

  // If this wasn't triggered by back button, and we are on the modal's history state, go back
  if (!isPopState && window.history.state?.[historyKey]) {
    window.history.back();
  }

  // If a restore URL is provided and we came from popstate (back button),
  // update the URL without adding to history
  if (isPopState && restoreUrl) {
    window.history.replaceState({}, '', restoreUrl);
  }
}

/**
 * Build a URL for the asset-details page for deep linking.
 * Uses the same /asset-details?assetid= pattern as the standalone page
 * so that the modal URL and "Open in New Tab" URL are consistent.
 * @param {string} assetId - The asset ID to add to the URL
 * @returns {string} The localized asset-details URL
 */
export function buildAssetDetailUrl(assetId) {
  return localizePath(`/asset-details?assetid=${encodeURIComponent(getDisplayAssetId(assetId))}`);
}

/**
 * Remove the asset ID parameter from the current URL
 * Handles both 'assetId' (search page deep link) and 'assetid' (asset-details page) params
 * @returns {string} The URL without the asset ID parameter
 */
export function getUrlWithoutAssetId() {
  const url = new URL(window.location.href);
  url.searchParams.delete('assetId');
  url.searchParams.delete('assetid');
  return url.toString();
}
