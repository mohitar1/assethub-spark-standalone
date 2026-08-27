/* eslint-disable import/no-cycle */
/**
 * Cart Service - High-level API for cart operations
 * Provides a simple, intuitive interface for managing shopping cart
 * Supports both asset and template carts with separate storage
 *
 * Note: The import/no-cycle warning is disabled because:
 * - image-gallery.js imports cart-service.js for cart operations
 * - search-results.js imports image-gallery.js for UI rendering
 * - cart-utils.js updates state via cart-state.js (not search-results.js)
 * This is a known architectural limitation that will be resolved in future refactoring
 */

import {
  isItemInCart,
  areAllItemsInCart,
  removeItemsFromCart,
  addItemsToCart,
  initCartBackgroundJobs,
  getCartJobsStatus,
  registerCartButtonSync,
} from './cart-utils.js';
import { getStorageKey } from './cart-keys.js';

/**
 * Cart Service Configuration
 */
const DEFAULT_CONFIG = {
  // Background job settings
  backgroundThreshold: 10, // Assets count to trigger background processing
  enableBackgroundJobs: true,

  // Notification settings
  enableNotifications: true,
  notificationDuration: 5000, // Toast duration in ms

  // Retry settings
  maxRetries: 3,
  retryDelay: 1000,

  // Fetch settings
  fetchFullDetails: true, // Always fetch full asset details
};

let config = { ...DEFAULT_CONFIG };

/**
 * Cart Service - Main API
 */
class CartService {
  /**
   * Add items to cart (supports both assets and templates)
   * Automatically handles small/large batches, background jobs, and notifications
   *
   * @param {Array<Object>|Object} items - Single item or array of items
   * @param {Object} [options] - Optional configuration
   * @param {string} [options.type] - Cart type ('asset' or 'template', default: 'asset')
   * @param {Function} [options.onStart] - Called when operation starts
   * @param {Function} [options.onProgress] - Called with progress updates
   * @param {Function} [options.onComplete] - Called when operation completes
   * @param {Function} [options.onError] - Called if operation fails
   * @returns {Promise<Object>} Operation result
   *
   * @example
   * // Add assets (default)
   * await cart.add(assets);
   *
   * @example
   * // Add templates
   * await cart.add(templates, { type: 'template' });
   *
   * @example
   * // With callbacks
   * await cart.add(assets, {
   *   onStart: () => showLoader(),
   *   onComplete: (result) => {
   *     hideLoader();
   *     showSuccess(`${result.addedCount} assets added!`);
   *   }
   * });
   */
  // eslint-disable-next-line class-methods-use-this
  async add(items, options = {}) {
    const itemsArray = Array.isArray(items) ? items : [items];
    const type = options.type || 'asset';

    // Trigger onStart callback
    if (options.onStart) {
      options.onStart({ total: itemsArray.length });
    }

    try {
      // Determine fetchDetails value
      let fetchDetails;
      if (options.fetchDetails !== undefined) {
        fetchDetails = options.fetchDetails;
      } else {
        fetchDetails = type === 'asset' ? config.fetchFullDetails : false;
      }

      const result = await addItemsToCart(itemsArray, {
        type,
        fetchDetails,
        useBackgroundJob: type === 'asset' ? config.enableBackgroundJobs : false,
        backgroundJobThreshold: config.backgroundThreshold,
      });

      // Trigger onComplete callback
      if (options.onComplete) {
        options.onComplete(result);
      }

      return result;
    } catch (error) {
      // Trigger onError callback
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  /**
   * Remove items from cart
   *
   * @param {Array<string>|string} itemIds - Single item ID or array of item IDs
   * @param {Object} [options] - Optional configuration
   * @param {string} [options.type] - Cart type ('asset' or 'template', default: 'asset')
   * @returns {Object} Operation result
   *
   * @example
   * await cart.remove(['asset-1', 'asset-2']);
   * await cart.remove('template-1', { type: 'template' });
   */
  // eslint-disable-next-line class-methods-use-this
  remove(itemIds, options = {}) {
    const idsArray = Array.isArray(itemIds) ? itemIds : [itemIds];
    const type = options.type || 'asset';

    try {
      const result = removeItemsFromCart(idsArray, type);

      if (options.onComplete) {
        options.onComplete(result);
      }

      return result;
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    }
  }

  /**
   * Check if item(s) are in cart
   *
   * @param {string|Array<string>} itemIds - Single ID or array of IDs
   * @param {Object} [options] - Optional configuration
   * @param {string} [options.type] - Cart type ('asset' or 'template', default: 'asset')
   * @returns {boolean} True if all items are in cart
   *
   * @example
   * if (cart.contains('asset-1')) { ... }
   * if (cart.contains(['asset-1', 'asset-2'])) { ... }
   * if (cart.contains('template-1', { type: 'template' })) { ... }
   */
  // eslint-disable-next-line class-methods-use-this
  contains(itemIds, options = {}) {
    const type = options.type || 'asset';
    if (Array.isArray(itemIds)) {
      return areAllItemsInCart(itemIds, type);
    }
    return isItemInCart(itemIds, type);
  }

  /**
   * Get cart items from localStorage
   *
   * @param {Object} [options] - Optional configuration
   * @param {string} [options.type] - Cart type ('asset' or 'template', default: 'asset')
   * @returns {Array<Object>} Array of cart items
   *
   * @example
   * const assets = cart.getItems();
   * const templates = cart.getItems({ type: 'template' });
   */
  // eslint-disable-next-line class-methods-use-this
  getItems(options = {}) {
    const type = options.type || 'asset';
    const storageKey = getStorageKey(type);
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Get cart count
   *
   * @param {Object} [options] - Optional configuration
   * @param {string} [options.type] - Cart type ('asset' or 'template', default: 'asset')
   * @returns {number} Number of items in cart
   *
   * @example
   * const assetCount = cart.count();
   * const templateCount = cart.count({ type: 'template' });
   */
  count(options = {}) {
    return this.getItems(options).length;
  }

  /**
   * Clear all items from cart
   *
   * @param {Object} [options] - Optional configuration
   * @param {string} [options.type] - Cart type ('asset' or 'template', default: 'asset')
   * @example
   * await cart.clear();
   * await cart.clear({ type: 'template' });
   */
  clear(options = {}) {
    const type = options.type || 'asset';
    const items = this.getItems({ type });
    return this.remove(items.map((item) => item.assetId || item.id), { type });
  }

  /**
   * Check if cart is empty
   *
   * @param {Object} [options] - Optional configuration
   * @param {string} [options.type] - Cart type ('asset' or 'template', default: 'asset')
   * @returns {boolean} True if cart is empty
   *
   * @example
   * if (cart.isEmpty()) { ... }
   * if (cart.isEmpty({ type: 'template' })) { ... }
   */
  isEmpty(options = {}) {
    return this.count(options) === 0;
  }

  /**
   * Get status of background jobs
   * Useful for showing progress indicators
   *
   * @returns {Object} Job status
   *
   * @example
   * const status = cart.getJobStatus();
   * if (status.pending > 0) {
   *   showSpinner(`Processing ${status.pending} job(s)...`);
   * }
   */
  // eslint-disable-next-line class-methods-use-this
  getJobStatus() {
    return getCartJobsStatus();
  }

  /**
   * Configure cart service
   *
   * @param {Object} options - Configuration options
   *
   * @example
   * cart.configure({
   *   backgroundThreshold: 20,
   *   enableNotifications: false,
   * });
   */
  configure(options) {
    config = { ...config, ...options };
    return this;
  }

  /**
   * Get current configuration
   *
   * @returns {Object} Current configuration
   */
  // eslint-disable-next-line class-methods-use-this
  getConfig() {
    return { ...config };
  }

  /**
   * Sync cart buttons with cart state
   * Automatically updates button text and state when cart changes
   *
   * @param {Object} buttonConfig - Button configuration
   * @param {string} [buttonConfig.type] - Cart type ('asset' or 'template', default: 'asset')
   * @returns {Function} Cleanup function
   *
   * @example
   * const cleanup = cart.syncButtons({
   *   selector: '.add-to-cart-btn',
   *   getAssetIds: (btn) => [btn.dataset.assetId],
   *   labels: { add: 'Add', remove: 'Remove' }
   * });
   *
   * @example
   * const cleanup = cart.syncButtons({
   *   selector: '.add-template-btn',
   *   getAssetIds: (btn) => [btn.dataset.templateId],
   *   labels: { add: 'Add Template', remove: 'Remove Template' },
   *   type: 'template'
   * });
   */
  // eslint-disable-next-line class-methods-use-this
  syncButtons(buttonConfig) {
    return registerCartButtonSync({
      buttonSelector: buttonConfig.selector,
      getAssetIds: buttonConfig.getAssetIds,
      getLabels: () => ({
        addText: buttonConfig.labels.add,
        removeText: buttonConfig.labels.remove,
      }),
      type: buttonConfig.type || 'asset',
    });
  }
}

// Create singleton instance
const cart = new CartService();

// Initialize background job processor on module load
initCartBackgroundJobs();

// Export singleton instance as default
export default cart;

// Also export class for testing
export { CartService };
