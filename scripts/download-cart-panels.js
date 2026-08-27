/* eslint-disable import/no-cycle */
/**
 * Download/Cart Panels Initialization Module
 *
 * Initializes shared cart state and global functions for all pages.
 * Panel UI is provided by blocks/search-results/components/cart/.
 */

import { initCartState } from './cart-state.js';

// Initialize cart state and global functions
initCartState();
