/* eslint-disable import/no-cycle */
/**
 * Shared Cart/Download State Module
 * Provides state management for cart and download panels on standalone pages.
 */

import { loadCSS } from './aem.js';
import { getStorageKey, getStateKey } from './utils/cart-keys.js';

// Cross-tab communication channel
let cartBroadcastChannel = null;

// Flag to prevent re-broadcasting when updating from cross-tab sync
let isUpdatingFromCrossTab = false;

/**
 * Initialize BroadcastChannel for cross-tab cart synchronization
 */
function initCartBroadcastChannel() {
  if (cartBroadcastChannel) return;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      cartBroadcastChannel = new BroadcastChannel('cart-sync');

      cartBroadcastChannel.onmessage = (event) => {
        if (event.data.type === 'cartChanged') {
          const items = event.data.items || [];
          const cartType = event.data.cartType || 'asset';
          const storageKey = getStorageKey(cartType);
          const stateKey = getStateKey(cartType);

          try {
            localStorage.setItem(storageKey, JSON.stringify(items));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to update localStorage from cross-tab sync:', err);
          }

          updateCartBadgeTotal();

          isUpdatingFromCrossTab = true;
          setState({ [stateKey]: items });
          isUpdatingFromCrossTab = false;
        }
      };
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('BroadcastChannel not supported, cross-tab sync disabled:', error);
  }
}

initCartBroadcastChannel();

const state = {
  cartAssetItems: [],
  cartTemplateItems: [],
  isCartPanelOpen: false,
  isDownloadPanelOpen: false,
  selectedCards: new Set(),
  authenticated: false,
  dynamicMediaClient: null,
  externalParams: {},
  imagePresets: {},
  assetRenditionsCache: {},
};

const listeners = new Set();
let isFullStateActive = false;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(updates) {
  const prevState = { ...state };
  Object.assign(state, updates);

  listeners.forEach((listener) => {
    try {
      listener(state, prevState, updates);
    } catch (e) {
      console.error('Cart state listener error:', e);
    }
  });

  window.dispatchEvent(new CustomEvent('cartStateChange', {
    detail: { state, prevState, updates },
  }));

  if (cartBroadcastChannel && !isUpdatingFromCrossTab) {
    if (updates.cartAssetItems) {
      cartBroadcastChannel.postMessage({
        type: 'cartChanged',
        items: updates.cartAssetItems,
        cartType: 'asset',
      });
    }
    if (updates.cartTemplateItems) {
      cartBroadcastChannel.postMessage({
        type: 'cartChanged',
        items: updates.cartTemplateItems,
        cartType: 'template',
      });
    }
  }
}

export function getState() {
  return state;
}

export function extendState(additionalState) {
  Object.assign(state, additionalState);
  isFullStateActive = true;
}

export function isFullState() {
  return isFullStateActive;
}

export function loadCartFromStorage() {
  try {
    const storedAssets = localStorage.getItem('cartAssetItems');
    if (storedAssets) {
      state.cartAssetItems = JSON.parse(storedAssets);
    }

    const storedTemplates = localStorage.getItem('cartTemplateItems');
    if (storedTemplates) {
      state.cartTemplateItems = JSON.parse(storedTemplates);
    }
  } catch (err) {
    console.warn('Failed to load cart from localStorage:', err);
  }
}

export function loadCartTemplateFromStorage() {
  try {
    const stored = localStorage.getItem('cartTemplateItems');
    if (stored) {
      state.cartTemplateItems = JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Failed to load template cart from localStorage:', err);
  }
}

function updateCartBadgeTotal() {
  if (window.updateCartBadge) {
    const totalCount = state.cartAssetItems.length + state.cartTemplateItems.length;
    window.updateCartBadge(totalCount);
  }
}

export function saveCartItems(items, type = 'asset') {
  try {
    const storageKey = getStorageKey(type);
    const stateKey = getStateKey(type);
    localStorage.setItem(storageKey, JSON.stringify(items));
    state[stateKey] = items;
    updateCartBadgeTotal();
  } catch (err) {
    console.warn(`Failed to save ${type} cart to localStorage:`, err);
  }
}

export function saveCartTemplateItems(items) {
  try {
    localStorage.setItem('cartTemplateItems', JSON.stringify(items));
    updateCartBadgeTotal();
  } catch (err) {
    console.warn('Failed to save template cart to localStorage:', err);
  }
}

let cssLoaded = false;

export function loadPanelCSS() {
  if (cssLoaded) return;
  cssLoaded = true;

  loadCSS('/blocks/search-results/styles/checkbox.css');
  loadCSS('/blocks/search-results/styles/download-renditions.css');
  loadCSS('/blocks/search-results/styles/cart-panel.css');
  loadCSS('/blocks/search-results/styles/date-picker.css');
  loadCSS('/blocks/search-results/styles/facets.css');
}

export function setupGlobalFunctions() {
  if (!window.openCart) {
    window.openCart = async () => {
      loadPanelCSS();
      await initDynamicMediaClient();
      setState({ isCartPanelOpen: true });

      const { createCartPanel } = await import('../blocks/search-results/components/cart/cart-panel.js');
      createCartPanel({
        onRemoveItem: (item) => {
          const newItems = state.cartAssetItems.filter((i) => i.assetId !== item.assetId);
          setState({ cartAssetItems: newItems });
          saveCartItems(newItems);
        },
      });
    };
  }

  if (!window.closeCart) {
    window.closeCart = async () => {
      const { closeCartPanel } = await import('../blocks/search-results/components/cart/cart-panel.js');
      closeCartPanel();
    };
  }

  if (!window.toggleCart) {
    window.toggleCart = () => {
      if (state.isCartPanelOpen) {
        window.closeCart();
      } else {
        window.openCart();
      }
    };
  }

  if (!window.openDownloadPanel) {
    window.openDownloadPanel = async () => {
      loadPanelCSS();
      setState({ isDownloadPanelOpen: true });

      const { createDownloadPanel } = await import('../blocks/search-results/components/cart/download-panel.js');
      createDownloadPanel();
    };
  }

  if (!window.closeDownloadPanel) {
    window.closeDownloadPanel = async () => {
      const { closeDownloadPanel } = await import('../blocks/search-results/components/cart/download-panel.js');
      closeDownloadPanel();
    };
  }

  if (!window.toggleDownloadPanel) {
    window.toggleDownloadPanel = () => {
      if (state.isDownloadPanelOpen) {
        window.closeDownloadPanel();
      } else {
        window.openDownloadPanel();
      }
    };
  }
}

let dmClientInitPromise = null;

function initDynamicMediaClient() {
  if (isFullStateActive) return Promise.resolve();
  if (dmClientInitPromise) return dmClientInitPromise;

  dmClientInitPromise = (async () => {
    try {
      const [{ getDynamicMediaClient }, { initRenditionsFetcher }] = await Promise.all([
        import('../blocks/search-results/clients/dynamicmedia-client.js'),
        import('../blocks/search-results/utils/renditions-fetcher.js'),
      ]);
      const client = getDynamicMediaClient();
      state.dynamicMediaClient = client;
      initRenditionsFetcher(getState, setState);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize Dynamic Media client:', err);
    }
  })();

  return dmClientInitPromise;
}

export function ensureDMClientReady() {
  if (isFullStateActive) return Promise.resolve();
  return initDynamicMediaClient();
}

export function initCartState() {
  loadCartFromStorage();
  loadCartTemplateFromStorage();
  setupGlobalFunctions();
  updateCartBadgeTotal();

  subscribe((currentState, prevState, updates) => {
    if (updates.cartAssetItems !== undefined) {
      saveCartItems(currentState.cartAssetItems, 'asset');
    }
    if (updates.cartTemplateItems !== undefined) {
      saveCartItems(currentState.cartTemplateItems, 'template');
    }
  });

  initDynamicMediaClient();
}
