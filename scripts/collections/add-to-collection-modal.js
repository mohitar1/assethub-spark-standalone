/**
 * Global Add to Collection Modal functionality
 * Listens for custom events from React components and shows collection selection modal
 */

// Import the centralized JavaScript collections client with auth
import { CollectionListSegment } from './collection-search-constants.js';
import { DynamicMediaCollectionsClient } from './collections-api-client.js';
import { transformApiCollectionToInternal } from './collections-utils.js';
import { MAX_HITS_PER_PAGE } from '../../blocks/search-results/utils/config.js';
import { dispatchAssetAction } from '../audit/asset-audit.js';
import { ASSET_AUDIT_ACTIONS } from '../audit/asset-audit-constants.js';
import setButtonLoading from '../../blocks/search-results/utils/dom-utils.js';
import { localizePath } from '../locale-utils.js';

// Global state
let collectionsClient = null;
let allCollections = [];
let currentAsset = null; // legacy single asset support
let currentAssets = [];
let collectionsModal = null;

// Pagination state for ContentAI cursor-based pagination
// Two independent cursors: one per search segment (createdByMe + public).
let createdByMeCursor = null;
let publicCursor = null;
let hasMoreCollections = false;
let isLoadingCollections = false;

// Initialize the modal system
async function initAddToCollectionModal() {
  // Load user if not already available
  if (!window.user) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ [Collections Client Modal] Failed to load user, proceeding without user context');
  }

  // Initialize the Collections client
  try {
    collectionsClient = new DynamicMediaCollectionsClient({
      user: window.user,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Collections client for modal:', error);
  }

  // Listen for the custom event from React components
  window.addEventListener('openCollectionModal', handleOpenCollectionModal);

  // Create the modal structure if it doesn't exist
  if (!collectionsModal) {
    createCollectionsModal();
  }

  return undefined;
}

// Handle the custom event from React components
function handleOpenCollectionModal(event) {
  const { asset, assets, assetPath } = event.detail || {};
  if (Array.isArray(assets)) {
    currentAssets = assets.slice();
  } else if (asset) {
    currentAssets = [asset];
  } else {
    currentAssets = [];
  }
  if (currentAssets[0]) {
    currentAsset = { ...currentAssets[0], assetPath: assetPath || currentAssets[0].assetPath };
  } else {
    currentAsset = null;
  }
  try {
    // Log asset details when opening the modal to inspect available fields
    // Using JSON.stringify for readable formatting
    // eslint-disable-next-line no-console
    if (currentAssets.length > 1) {
      console.log('[Collections] openCollectionModal assets count:', currentAssets.length);
    } else {
      console.log('[Collections] openCollectionModal asset details:', JSON.stringify(currentAsset, null, 2));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[Collections] openCollectionModal assets (raw):', currentAssets);
  }
  showCollectionsModal();
}

// Create the modal HTML structure
function createCollectionsModal() {
  collectionsModal = document.createElement('div');
  collectionsModal.className = 'add-to-collection-modal';
  collectionsModal.style.display = 'none';

  collectionsModal.innerHTML = `
    <div class="add-to-collection-modal-content">
      <div class="add-to-collection-modal-header">
        <h2 class="add-to-collection-modal-title">Add to Collection</h2>
        <button class="add-to-collection-modal-close">&times;</button>
      </div>
      
      <div class="add-to-collection-modal-body">
        
        
        <div class="collections-section">
          <div class="collections-list">
            <!-- Collections will be populated here -->
          </div>
          <div class="load-more-button-container" style="display: none;">
            <button class="load-more-button">Load more</button>
          </div>
          <div class="no-collections-message" style="display: none;">
            <p>No collections found. <a href="${localizePath('/search-collections')}">Create your first collection</a>.</p>
          </div>
        </div>
      </div>
      
      <div class="add-to-collection-modal-footer">
        <button class="secondary-button pill-button btn-cancel">Cancel</button>
        <button class="primary-button pill-button btn-add">Add To Selected</button>
      </div>
    </div>
  `;

  // Add event listeners
  const closeBtn = collectionsModal.querySelector('.add-to-collection-modal-close');
  const cancelBtn = collectionsModal.querySelector('.btn-cancel');
  const addBtn = collectionsModal.querySelector('.btn-add');
  const loadMoreBtn = collectionsModal.querySelector('.load-more-button');

  closeBtn.onclick = hideCollectionsModal;
  cancelBtn.onclick = hideCollectionsModal;
  addBtn.onclick = handleAddToSelectedCollections;
  loadMoreBtn.onclick = () => loadCollectionsForSelection(true);

  // Close modal when clicking outside
  collectionsModal.onclick = (e) => {
    if (e.target === collectionsModal) {
      hideCollectionsModal();
    }
  };

  // Append to body
  document.body.appendChild(collectionsModal);
}

// Show the modal and populate with current asset and collections
function showCollectionsModal() {
  if (!currentAsset) return;

  // Reset pagination state when opening modal
  createdByMeCursor = null;
  publicCursor = null;
  hasMoreCollections = false;
  allCollections = [];

  // Load and display collections
  loadCollectionsForSelection(false);

  // Show modal
  collectionsModal.style.display = 'flex';
}

// Hide the modal
function hideCollectionsModal() {
  collectionsModal.style.display = 'none';
  currentAsset = null;
  currentAssets = [];
}

/**
 * Merge two raw API item arrays, transform each to internal format, and
 * deduplicate against an already-seen ID set. Own (createdByMe) items are
 * listed first so they take precedence when the same collection appears in
 * both segments.
 *
 * @param {Array} createdItems  Raw hits from the createdByMe segment.
 * @param {Array} publicItems   Raw hits from the public segment.
 * @param {Set<string>} seen    IDs already present in the current list (mutated in place).
 * @returns {Array} Transformed, deduplicated collection objects.
 */
export function mergeCollectionSegments(createdItems, publicItems, seen) {
  return [...createdItems, ...publicItems]
    .map(transformApiCollectionToInternal)
    .filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
}

// Load collections from API and create checkboxes
async function loadCollectionsForSelection(loadMore = false) {
  if (isLoadingCollections) return;

  const collectionsContainer = collectionsModal.querySelector('.collections-list');
  const noCollectionsMessage = collectionsModal.querySelector('.no-collections-message');

  if (!collectionsClient) {
    collectionsContainer.innerHTML = '<div class="error">Collections service not available</div>';
    return;
  }

  isLoadingCollections = true;
  updateLoadMoreButton();

  try {
    // Show loading state only on initial load
    if (!loadMore) {
      collectionsContainer.innerHTML = '<div class="loading">Loading collections...</div>';
    }
    const limit = MAX_HITS_PER_PAGE;

    // Fetch collections the user can write to:
    //   1. All collections they created (any access level)
    //   2. Public collections created by anyone (accessLevel=public → anyone can add assets)
    // Run both in parallel; on load-more, only fetch from segments that still have a cursor.
    // Use allSettled so a transient error on one segment doesn't suppress the other.
    const [createdResult, publicResult] = await Promise.allSettled([
      createdByMeCursor !== null || !loadMore
        ? collectionsClient.searchCollections({
          limit,
          relationship: CollectionListSegment.CREATED_BY_ME,
          ...(loadMore && createdByMeCursor ? { cursor: createdByMeCursor } : {}),
        })
        : Promise.resolve({ items: [], cursor: null }),
      publicCursor !== null || !loadMore
        ? collectionsClient.searchCollections({
          limit,
          relationship: CollectionListSegment.PUBLIC,
          ...(loadMore && publicCursor ? { cursor: publicCursor } : {}),
        })
        : Promise.resolve({ items: [], cursor: null }),
    ]);

    const createdResponse = createdResult.status === 'fulfilled'
      ? createdResult.value : { items: [], cursor: null };
    const publicResponse = publicResult.status === 'fulfilled'
      ? publicResult.value : { items: [], cursor: null };

    createdByMeCursor = createdResponse.cursor || null;
    publicCursor = publicResponse.cursor || null;
    hasMoreCollections = !!(createdByMeCursor || publicCursor);

    // Merge and deduplicate by id (own collections take precedence over public ones)
    const seen = new Set(allCollections.map((c) => c.id));
    const newCollections = mergeCollectionSegments(
      createdResponse.items,
      publicResponse.items,
      seen,
    );

    if (loadMore) {
      allCollections = [...allCollections, ...newCollections];
    } else {
      allCollections = newCollections;
    }

    if (allCollections.length === 0) {
      collectionsContainer.style.display = 'none';
      noCollectionsMessage.style.display = 'block';
      return;
    }

    collectionsContainer.style.display = 'block';
    noCollectionsMessage.style.display = 'none';

    // Clear existing content only on initial load
    if (!loadMore) {
      collectionsContainer.innerHTML = '';
    }

    // Create checkbox for each new collection
    const collectionsToRender = loadMore ? newCollections : allCollections;
    collectionsToRender.forEach((collection) => {
      const collectionItem = document.createElement('div');
      collectionItem.className = 'collection-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `collection-${collection.id}`;
      checkbox.value = collection.id;
      checkbox.className = 'collection-checkbox';

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.className = 'collection-label';

      const labelContent = document.createElement('div');
      labelContent.className = 'collection-label-content';

      // Collection name
      const name = document.createElement('div');
      name.className = 'collection-name';
      name.textContent = collection.name;

      labelContent.appendChild(name);

      // Second row: description (if exists)
      if (collection.description && collection.description.trim()) {
        const description = document.createElement('div');
        description.className = 'collection-description';
        description.textContent = collection.description;
        labelContent.appendChild(description);
      }

      label.appendChild(labelContent);

      collectionItem.appendChild(checkbox);
      collectionItem.appendChild(label);

      collectionsContainer.appendChild(collectionItem);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading collections for modal:', error);
    if (!loadMore) {
      collectionsContainer.innerHTML = '<div class="error">Error loading collections</div>';
    }
  } finally {
    isLoadingCollections = false;
    updateLoadMoreButton();
  }
}

/**
 * Update the "Load More" button visibility based on pagination state
 */
function updateLoadMoreButton() {
  const loadMoreContainer = collectionsModal?.querySelector('.load-more-button-container');
  if (!loadMoreContainer) return;

  // Show load more when there are more pages
  const showLoadMore = hasMoreCollections;

  loadMoreContainer.style.display = showLoadMore ? 'block' : 'none';
  const loadMoreBtn = loadMoreContainer.querySelector('.load-more-button');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = isLoadingCollections;
    loadMoreBtn.textContent = isLoadingCollections ? 'Loading...' : 'Load more';
  }
}

// Handle adding asset to selected collections
async function handleAddToSelectedCollections(event) {
  // Dump the full currentAsset JSON at the time of add for debugging
  try {
    // eslint-disable-next-line no-console
    if (currentAssets.length > 1) {
      console.log('[Collections] handleAddToSelectedCollections assets count:', currentAssets.length);
    } else {
      console.log('[Collections] handleAddToSelectedCollections currentAsset:', JSON.stringify(currentAsset, null, 2));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[Collections] handleAddToSelectedCollections assets (raw):', currentAssets);
  }
  const checkboxes = collectionsModal.querySelectorAll('.collection-checkbox:checked');

  if (checkboxes.length === 0) {
    showToast('Please select at least one collection', 'info');
    return;
  }

  if (!collectionsClient) {
    showToast('Collections service not available', 'error');
    return;
  }

  const selectedCollectionIds = Array.from(checkboxes).map((cb) => cb.value);

  const addBtnRef = event.currentTarget;
  setButtonLoading(addBtnRef, true);

  try {
    let updatedCount = 0;
    // Prepare assets to add
    let assets;
    if (currentAssets.length > 0) {
      assets = currentAssets;
    } else if (currentAsset) {
      assets = [currentAsset];
    } else {
      assets = [];
    }

    // Add assets to each selected collection using API
    const addPromises = selectedCollectionIds.map(async (collectionId) => {
      try {
        // Prepare add operations for all assets (API expects array format)
        const addOperations = assets.map((asset) => ({
          op: 'add',
          id: asset.assetId || asset.id,
          type: 'asset',
        }));

        // eslint-disable-next-line no-console
        console.log('➕ [Add to Collection] Adding assets to collection:', { collectionId, operations: addOperations });

        // Add assets to collection via API
        await collectionsClient.updateCollectionItems(collectionId, addOperations);

        return assets.length;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to add assets to collection ${collectionId}:`, error);
        // Continue with other collections even if one fails
        return 0;
      }
    });

    const results = await Promise.all(addPromises);
    setButtonLoading(addBtnRef, false);
    updatedCount = results.reduce((sum, count) => sum + count, 0);

    // Hide modal and show success
    hideCollectionsModal();

    if (updatedCount > 0) {
      assets.forEach((asset) => {
        dispatchAssetAction(ASSET_AUDIT_ACTIONS.COLLECTION_ADD, asset.assetId || asset.id);
      });
      showToast('ASSETS ADDED TO COLLECTIONS SUCCESSFULLY', 'success');
    } else {
      showToast('Failed to add assets to collections', 'error');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error adding asset to collections:', error);
    showToast('Error adding asset to collections', 'error');
    setButtonLoading(addBtnRef, false);
  }
}

function showToast(message, type = 'success') {
  // Check if toast already exists
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add to document
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove after timeout
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Initialize when DOM is loaded (guard allows importing this module in Node/test environments)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initAddToCollectionModal);
}

// Export for module usage
export { initAddToCollectionModal, handleOpenCollectionModal };
