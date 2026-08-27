/**
 * Cart Keys Utility
 * Provides helper functions for cart localStorage and state key mappings
 * This is a standalone module with no dependencies to avoid circular imports
 */

/**
 * Get the localStorage key for a cart type
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {string} localStorage key
 * @example
 * getStorageKey('asset')     // Returns: 'cartAssetItems'
 * getStorageKey('template')  // Returns: 'cartTemplateItems'
 */
export function getStorageKey(type = 'asset') {
  return type === 'template' ? 'cartTemplateItems' : 'cartAssetItems';
}

/**
 * Get the state key for a cart type
 * @param {string} type - Cart type ('asset' or 'template')
 * @returns {string} State key
 * @example
 * getStateKey('asset')     // Returns: 'cartAssetItems'
 * getStateKey('template')  // Returns: 'cartTemplateItems'
 */
export function getStateKey(type = 'asset') {
  return type === 'template' ? 'cartTemplateItems' : 'cartAssetItems';
}
