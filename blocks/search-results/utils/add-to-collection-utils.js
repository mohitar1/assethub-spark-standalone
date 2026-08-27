/**
 * Collection utilities for add-to-collection functionality
 */

/**
 * Generate the HTML for the add-to-collection overlay
 * @param {Object} asset - The asset object
 * @returns {string} HTML string for the overlay
 */
export function getAddToCollectionOverlayHTML() {
  return `
    <div class="add-to-collection-overlay">
      <div class="add-to-collection-content">
        <i class="icon add circle"></i>
        <span>Add to Collection</span>
      </div>
    </div>
  `;
}

/**
 * Attach add-to-collection event listener to an overlay element
 * @param {HTMLElement} overlayElement - The overlay element to attach listener to
 * @param {Object} asset - The asset object
 * @param {Object} client - The dynamic media client for generating preview URLs
 */
export function attachAddToCollectionOverlayListener(overlayElement, asset, client) {
  if (!overlayElement) {
    return;
  }

  overlayElement.addEventListener('click', (e) => {
    e.stopPropagation();
    const previewUrl = client && asset.assetId && asset.name
      ? client.getOptimizedDeliveryPreviewUrl(asset.assetId, asset.name, 350)
      : undefined;
    window.dispatchEvent(new CustomEvent('openCollectionModal', {
      detail: {
        asset: { ...asset, previewUrl },
        assetPath: asset.repositoryPath || asset.assetId,
      },
    }));
  });
}
