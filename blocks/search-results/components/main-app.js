/* eslint-disable import/no-cycle */
/**
 * Main App Component - Orchestrates the entire search UI
 */

import {
  subscribe,
  search,
  handleLoadMoreResults,
  handleFacetCheckbox,
  handleClearAllFacets,
  fetchAssetRenditions,
  handleAddToCart,
  handleRemoveFromCart,
  handleBulkAddToCart,
  getState,
} from '../search-results.js';
import { createImageGallery } from './image-gallery.js';
import { createFacetsPanel } from './facets/index.js';
import { getSearchPlaceholders, getDaPlaceholders } from '../utils/placeholders.js';

/**
 * Create the main app structure
 * @param {HTMLElement} container - Container element
 */
export async function createMainApp(container) {
  await Promise.all([
    getSearchPlaceholders(),
    getDaPlaceholders(),
  ]);

  // Build the main structure (no extra container wrapper needed - block element is the container)
  container.innerHTML = `
    <div class="main-content">
      <div class="images-container">
        <div class="images-content-wrapper">
          <div class="images-content-row">
            <div class="facet-filter-panel${getState().isMobileFilterOpen ? ' mobile-open' : ''}" id="facet-filter-panel">
              <!-- Facets will be rendered here -->
            </div>
            <div class="images-main">
              <div class="image-gallery" id="image-gallery">
                <!-- Gallery will be rendered here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Get container elements
  const galleryContainer = container.querySelector('#image-gallery');
  const facetsContainer = container.querySelector('#facet-filter-panel');

  // Create gallery
  createImageGallery(galleryContainer, {
    onLoadMoreResults: handleLoadMoreResults,
    onFacetCheckbox: handleFacetCheckbox,
    onClearAllFacets: handleClearAllFacets,
    fetchAssetRenditions,
    onAddToCart: handleAddToCart,
    onRemoveFromCart: handleRemoveFromCart,
    onBulkAddToCart: handleBulkAddToCart,
  });

  // Create facets panel
  createFacetsPanel(facetsContainer, {
    search,
    onFacetCheckbox: handleFacetCheckbox,
    onClearAllFacets: handleClearAllFacets,
  });

  // Subscribe to state changes for panels and mobile filter
  subscribe((currentState, prevState, updates) => {
    // Handle mobile filter toggle
    if (updates.isMobileFilterOpen !== undefined) {
      const facetPanel = container.querySelector('.facet-filter-panel');
      if (facetPanel) {
        facetPanel.classList.toggle('mobile-open', currentState.isMobileFilterOpen);
      }
    }
  });
}

export default createMainApp;
