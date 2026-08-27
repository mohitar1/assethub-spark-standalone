/* eslint-disable import/no-cycle */
/**
 * Cart Utilities - Reusable functions for cart operations
 * Provides bulk operations for adding/removing assets and templates from cart
 *
 * Note: The import/no-cycle warning is disabled because:
 * - This module is used by cart-service.js
 * - cart-service.js is imported by image-gallery.js
 * - search-results.js imports image-gallery.js
 * - We use setState from cart-state.js (not search-results.js) to avoid direct cycles
 * This is a known architectural pattern in the cart system
 */

import { setState, getState } from '../cart-state.js';
import { fetchAssetById, saveCartItems } from '../asset-transformers.js';
import {
  getStorageKey as getStorageKeyHelper,
  getStateKey as getStateKeyHelper,
} from './cart-keys.js';

// Re-export for backward compatibility
export { getStorageKey, getStateKey } from './cart-keys.js';

// Constants for background job management
const CART_JOBS_KEY = 'spark-cart-background-jobs';
const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const JOB_CHECK_INTERVAL_MS = 2000; // Check every 2 seconds

// Track if job processor is running
let jobProcessorRunning = false;

// =============================================================================
// Helper Functions for Cart Type Management
// =============================================================================

/**
 * Internal helper to get storage key
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {string} localStorage key
 * @private
 */
function getStorageKey(type = 'asset') {
  return getStorageKeyHelper(type);
}

/**
 * Internal helper to get state key
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {string} State key
 * @private
 */
function getStateKey(type = 'asset') {
  return getStateKeyHelper(type);
}

/**
 * Get items from state (primary source) with localStorage fallback
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {Array} Cart items
 * @private
 */
function getCartItems(type = 'asset') {
  const stateKey = getStateKey(type);
  const state = getState();

  // Use state as primary source of truth if it has been initialized
  // (checking for undefined, not falsy, since empty array [] is valid)
  if (state[stateKey] !== undefined) {
    return state[stateKey];
  }

  // Fallback to localStorage if state is not initialized
  const storageKey = getStorageKey(type);
  return JSON.parse(localStorage.getItem(storageKey) || '[]');
}

/**
 * Save items to localStorage for a specific cart type
 * @param {Array} items - Cart items
 * @param {string} type - Cart type ('asset' or 'template')
 * @private
 */
function saveCartItemsToStorage(items, type = 'asset') {
  try {
    const storageKey = getStorageKey(type);
    localStorage.setItem(storageKey, JSON.stringify(items));

    // Badge update handled by saveCartItems / saveCartItemsToStorage
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error saving ${type} cart to localStorage:`, error);
  }
}

// =============================================================================
// Cart Check Functions
// =============================================================================

/**
 * Check if a single item is in cart
 * @param {string} itemId - Item ID to check
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {boolean} True if item is in cart
 */
export function isItemInCart(itemId, type = 'asset') {
  try {
    const stored = getCartItems(type);
    return stored.some((item) => (item.assetId || item.id) === itemId);
  } catch {
    return false;
  }
}

/**
 * Check if a single asset is in cart (backward compatibility)
 * @param {string} assetId - Asset ID to check
 * @returns {boolean} True if asset is in cart
 */
export function isAssetInCart(assetId) {
  return isItemInCart(assetId, 'asset');
}

/**
 * Check if all items are in cart
 * @param {Array<string>} itemIds - Array of item IDs to check
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {boolean} True if all items are in cart
 */
export function areAllItemsInCart(itemIds, type = 'asset') {
  try {
    const stored = getCartItems(type);
    const cartItemIds = new Set(stored.map((item) => item.assetId || item.id));
    return itemIds.every((itemId) => itemId && cartItemIds.has(itemId));
  } catch {
    return false;
  }
}

/**
 * Check if all assets are in cart (backward compatibility)
 * @param {Array<string>} assetIds - Array of asset IDs to check
 * @returns {boolean} True if all assets are in cart
 */
export function areAllAssetsInCart(assetIds) {
  return areAllItemsInCart(assetIds, 'asset');
}

// =============================================================================
// Cart Remove Functions
// =============================================================================

/**
 * Remove multiple items from cart
 * @param {Array<string>} itemIds - Array of item IDs to remove
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {Object} Result with success status and removed count
 */
export function removeItemsFromCart(itemIds, type = 'asset') {
  try {
    const stored = getCartItems(type);
    const itemIdsToRemove = new Set(itemIds.filter(Boolean));
    const next = stored.filter((item) => !itemIdsToRemove.has(item.assetId || item.id));
    const removedCount = stored.length - next.length;

    if (removedCount > 0) {
      const stateKey = getStateKey(type);

      // Update state first (source of truth)
      setState({ [stateKey]: next });

      // Then sync to localStorage
      if (type === 'asset') {
        saveCartItems(next);
      } else {
        saveCartItemsToStorage(next, type);
      }

      // Badge update handled by saveCartItems / saveCartItemsToStorage
    }

    return {
      success: true,
      removedCount,
      totalInCart: next.length,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error removing ${type}s from cart:`, error);
    return {
      success: false,
      removedCount: 0,
      error: error.message,
    };
  }
}

/**
 * Remove multiple assets from cart (backward compatibility)
 * @param {Array<string>} assetIds - Array of asset IDs to remove
 * @returns {Object} Result with success status and removed count
 */
export function removeAssetsFromCart(assetIds) {
  return removeItemsFromCart(assetIds, 'asset');
}

// =============================================================================
// Cart Add Functions
// =============================================================================

/**
 * Add multiple items to cart
 * @param {Array<Object>} items - Array of items to add
 * @param {Object} options - Options for adding items
 * @param {string} options.type - Cart type ('asset' or 'template')
 * @param {boolean} options.fetchDetails - Whether to fetch full details
 *   (default: true for assets, false for templates)
 * @param {boolean} options.useBackgroundJob - Use background job for large batches
 *   (default: true for assets, false for templates)
 * @param {number} options.backgroundJobThreshold - Min items for background job
 *   (default: 10)
 * @returns {Promise<Object>} Result with success status, added count, and failed count
 */
export async function addItemsToCart(items, options = {}) {
  const {
    type = 'asset',
    fetchDetails = (type === 'asset'),
    useBackgroundJob = (type === 'asset'),
    backgroundJobThreshold = 10,
  } = options;

  try {
    const stored = getCartItems(type);
    const cartItemIds = new Set(stored.map((item) => item.assetId || item.id));

    // Find items not already in cart
    const itemsToAdd = items.filter((item) => {
      const itemId = item.assetId || item.id;
      return itemId && !cartItemIds.has(itemId);
    });

    if (itemsToAdd.length === 0) {
      return {
        success: true,
        addedCount: 0,
        failedCount: 0,
        alreadyInCart: true,
        totalInCart: stored.length,
      };
    }

    // For large batches, use background job if enabled (only for assets)
    if (type === 'asset' && useBackgroundJob && itemsToAdd.length >= backgroundJobThreshold) {
      const jobId = createBackgroundJob(itemsToAdd, fetchDetails);
      startJobProcessor(); // Ensure processor is running
      return {
        success: true,
        addedCount: 0,
        failedCount: 0,
        isBackgroundJob: true,
        jobStarted: true,
        jobId,
        totalToAdd: itemsToAdd.length,
      };
    }

    // For small batches, process immediately
    let validItems = itemsToAdd;

    // Fetch full details if needed (only for assets)
    if (type === 'asset' && fetchDetails) {
      // Bulk fetch all assets in a single API call
      const itemIds = itemsToAdd.map((item) => item.assetId || item.id);
      const itemMap = await fetchAssetById(itemIds);
      // Map fetched assets back in the original order
      validItems = itemIds
        .map((id) => itemMap[id])
        .filter(Boolean);
    }

    // Add valid items to cart
    validItems.forEach((item) => stored.push(item));

    const stateKey = getStateKey(type);

    // Update state first (source of truth)
    setState({ [stateKey]: stored });

    // Then sync to localStorage
    if (type === 'asset') {
      saveCartItems(stored);
    } else {
      saveCartItemsToStorage(stored, type);
    }

    // Badge update handled by saveCartItems / saveCartItemsToStorage

    const addedCount = validItems.length;
    const failedCount = itemsToAdd.length - addedCount;

    return {
      success: true,
      addedCount,
      failedCount,
      alreadyInCart: false,
      totalInCart: stored.length,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error adding ${type}s to cart:`, error);
    return {
      success: false,
      addedCount: 0,
      failedCount: items.length,
      error: error.message,
    };
  }
}

/**
 * Add multiple assets to cart (backward compatibility)
 * @param {Array<Object>} assets - Array of assets (can be partial with just assetId)
 * @param {Object} options - Options for adding assets
 * @param {boolean} options.fetchDetails - Whether to fetch full details (default: true)
 * @param {boolean} options.useBackgroundJob - Use background job for large batches (default: true)
 * @param {number} options.backgroundJobThreshold - Min assets for background job (default: 10)
 * @returns {Promise<Object>} Result with success status, added count, and failed count
 */
export async function addAssetsToCart(assets, options = {}) {
  return addItemsToCart(assets, { ...options, type: 'asset' });
}

/**
 * Get all background jobs from localStorage
 * @returns {Array} Array of job objects
 * @private
 */
function getBackgroundJobs() {
  try {
    const stored = localStorage.getItem(CART_JOBS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error reading background jobs:', error);
    return [];
  }
}

/**
 * Save background jobs to localStorage
 * @param {Array} jobs - Array of job objects
 * @private
 */
function saveBackgroundJobs(jobs) {
  try {
    localStorage.setItem(CART_JOBS_KEY, JSON.stringify(jobs));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving background jobs:', error);
  }
}

/**
 * Create a new background job
 * @param {Array<Object>} assetsToAdd - Assets to add
 * @param {boolean} fetchDetails - Whether to fetch details
 * @returns {string} Job ID
 * @private
 */
function createBackgroundJob(assetsToAdd, fetchDetails) {
  const jobId = `cart-job-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  const job = {
    id: jobId,
    status: 'pending',
    createdAt: Date.now(),
    assets: assetsToAdd,
    fetchDetails,
    retries: 0,
  };

  const jobs = getBackgroundJobs();
  jobs.push(job);
  saveBackgroundJobs(jobs);

  return jobId;
}

/**
 * Start the background job processor
 * Processes pending jobs from localStorage
 * @private
 */
function startJobProcessor() {
  if (jobProcessorRunning) return;

  jobProcessorRunning = true;
  processNextJob();
}

/**
 * Process the next pending job
 * @private
 */
async function processNextJob() {
  if (!jobProcessorRunning) return;

  try {
    const jobs = getBackgroundJobs();
    const now = Date.now();

    // Clean up old/timed-out jobs
    const validJobs = jobs.filter((job) => {
      const age = now - job.createdAt;
      return age < JOB_TIMEOUT_MS;
    });

    if (validJobs.length !== jobs.length) {
      saveBackgroundJobs(validJobs);
    }

    // Find next pending job
    const pendingJob = validJobs.find((job) => job.status === 'pending');

    if (pendingJob) {
      // Mark as processing
      pendingJob.status = 'processing';
      saveBackgroundJobs(validJobs);

      // Process the job
      await executeCartJob(pendingJob);

      // Remove completed job
      const updatedJobs = getBackgroundJobs().filter((j) => j.id !== pendingJob.id);
      saveBackgroundJobs(updatedJobs);

      // Continue processing immediately if more jobs exist
      if (updatedJobs.some((j) => j.status === 'pending')) {
        setTimeout(() => processNextJob(), 100);
      } else {
        // No more jobs, check again later
        setTimeout(() => processNextJob(), JOB_CHECK_INTERVAL_MS);
      }
    } else {
      // No pending jobs, check again later
      setTimeout(() => processNextJob(), JOB_CHECK_INTERVAL_MS);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in job processor:', error);
    // Retry after interval
    setTimeout(() => processNextJob(), JOB_CHECK_INTERVAL_MS);
  }
}

/**
 * Execute a cart background job
 * @param {Object} job - Job object
 * @private
 */
async function executeCartJob(job) {
  const { assets: assetsToAdd, fetchDetails } = job;
  const type = 'asset'; // Background jobs are only for assets

  try {
    const startTime = Date.now();
    let validAssets = assetsToAdd;

    // Fetch full details if needed
    if (fetchDetails) {
      const assetIds = assetsToAdd.map((asset) => asset.assetId || asset.id);
      const assetMap = await fetchAssetById(assetIds);
      validAssets = assetIds
        .map((id) => assetMap[id])
        .filter(Boolean);
    }

    // Add to cart
    const stored = getCartItems(type);
    validAssets.forEach((asset) => stored.push(asset));

    const stateKey = getStateKey(type);

    // Update state first (source of truth)
    setState({ [stateKey]: stored });

    // Then sync to localStorage (background jobs only support assets)
    saveCartItems(stored);

    const addedCount = validAssets.length;
    const failedCount = assetsToAdd.length - addedCount;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Send success notification
    await sendCartNotification({
      success: true,
      addedCount,
      failedCount,
      duration,
      totalInCart: stored.length,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in background cart job:', error);

    // Send error notification
    await sendCartNotification({
      success: false,
      error: error.message,
      totalToAdd: assetsToAdd.length,
    });
  }
}

/**
 * Send notification about cart operation completion
 * @param {Object} result - Operation result
 * @private
 */
async function sendCartNotification(result) {
  try {
    // Lazy load notification client to avoid circular dependencies
    const { createMessagesClient } = await import('../notifications/notifications-client.js');
    const messagesClient = createMessagesClient();
    const userEmail = messagesClient.getUserEmail();

    if (!userEmail) return;

    let subject;
    let message;
    let priority = 'normal';

    if (result.success) {
      subject = 'Assets Added to Cart';
      const parts = [];
      if (result.addedCount > 0) {
        parts.push(`${result.addedCount} asset${result.addedCount !== 1 ? 's' : ''} added`);
      }
      if (result.failedCount > 0) {
        parts.push(`${result.failedCount} failed`);
      }
      message = `${parts.join(', ')}. Total in cart: ${result.totalInCart}. Completed in ${result.duration}s.`;
    } else {
      subject = 'Failed to Add Assets to Cart';
      message = `Unable to add ${result.totalToAdd} assets to cart. ${result.error || 'Please try again.'}`;
      priority = 'important';
    }

    await messagesClient.sendMessageToUser(userEmail, {
      subject,
      message,
      type: 'Notification',
      from: 'System',
      priority,
      expiresInXDays: 7,
    });

    // Trigger notification badge update
    window.dispatchEvent(new CustomEvent('notificationUpdate'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending cart notification:', error);
  }
}

/**
 * Initialize the cart background job system
 * Call this on page load to resume any pending jobs
 * @public
 */
export function initCartBackgroundJobs() {
  const jobs = getBackgroundJobs();
  const pendingJobs = jobs.filter((job) => job.status === 'pending' || job.status === 'processing');

  if (pendingJobs.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[Cart Jobs] Found ${pendingJobs.length} pending job(s), resuming...`);
    // Reset any stuck "processing" jobs back to "pending"
    const resetJobs = jobs.map((job) => ({
      ...job,
      status: job.status === 'processing' ? 'pending' : job.status,
    }));
    saveBackgroundJobs(resetJobs);
    startJobProcessor();
  }
}

/**
 * Get the status of background jobs
 * Useful for debugging or showing UI indicators
 * @returns {Object} Job status summary
 * @public
 */
export function getCartJobsStatus() {
  const jobs = getBackgroundJobs();
  return {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    jobs,
  };
}

/**
 * Register a cart button sync handler
 * Automatically updates cart buttons when cart state changes
 * @param {Object} config - Configuration object
 * @param {string} config.buttonSelector - CSS selector for cart buttons
 * @param {Function} config.getAssetIds - Function to extract item IDs from button element
 * @param {Function} config.getLabels - Function to get button labels (addText, removeText)
 * @param {string} config.type - Cart type ('asset' or 'template')
 * @returns {Function} Cleanup function to remove the listener
 */
export function registerCartButtonSync(config) {
  const {
    buttonSelector,
    getAssetIds,
    getLabels,
    type = 'asset',
  } = config;

  const updateAllButtons = () => {
    try {
      const cartItems = getCartItems(type);
      const cartItemIds = new Set(cartItems.map((item) => item.assetId || item.id));
      const buttons = document.querySelectorAll(buttonSelector);

      buttons.forEach((btn) => {
        const itemIds = getAssetIds(btn);
        if (!itemIds || itemIds.length === 0) return;

        const allInCart = itemIds.every((id) => id && cartItemIds.has(id));
        const labels = getLabels();

        btn.textContent = allInCart ? labels.removeText : labels.addText;
        btn.classList.toggle('remove-from-cart', allInCart);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating cart buttons:', error);
    }
  };

  // Listen to cart state changes
  window.addEventListener('cartStateChange', updateAllButtons);

  // Return cleanup function
  return () => {
    window.removeEventListener('cartStateChange', updateAllButtons);
  };
}
