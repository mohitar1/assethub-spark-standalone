/* eslint-env node */
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import {
  isAssetInCart,
  areAllAssetsInCart,
  removeAssetsFromCart,
  addAssetsToCart,
  registerCartButtonSync,
} from '../cart-utils.js';

// Mock dependencies
vi.mock('../../cart-state.js', () => ({
  setState: vi.fn(),
  getState: vi.fn(() => ({
    // Return undefined for cart items so it falls back to localStorage in tests
    cartAssetItems: undefined,
    cartTemplateItems: undefined,
  })),
  subscribe: vi.fn(),
}));

vi.mock('../../asset-transformers.js', () => ({
  fetchAssetById: vi.fn(),
  saveCartItems: vi.fn(),
}));

describe('Cart Utils', () => {
  let localStorageMock;
  let setStateMock;
  let saveCartItemsMock;
  let fetchAssetByIdMock;

  beforeEach(async () => {
    // Setup localStorage mock with key-aware getItem
    // Stores a map of key → value, getItem returns by key
    const storageData = {};
    localStorageMock = {
      getItem: vi.fn((key) => storageData[key] ?? null),
      setItem: vi.fn((key, value) => { storageData[key] = value; }),
      removeItem: vi.fn((key) => { delete storageData[key]; }),
      clear: vi.fn(),
      store: storageData,
    };
    global.localStorage = localStorageMock;

    // Setup window mock
    global.window = {
      updateCartBadge: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      CustomEvent: class CustomEvent {
        constructor(type, options) {
          this.type = type;
          this.detail = options?.detail;
        }
      },
    };
    global.CustomEvent = global.window.CustomEvent;

    // Import mocked modules
    const cartState = await import('../../cart-state.js');
    const assetTransformers = await import('../../asset-transformers.js');

    setStateMock = cartState.setState;
    saveCartItemsMock = assetTransformers.saveCartItems;
    fetchAssetByIdMock = assetTransformers.fetchAssetById;
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isAssetInCart', () => {
    it('should return true if asset is in cart', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
        { assetId: 'asset-2', name: 'Asset 2' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = isAssetInCart('asset-1');

      expect(result).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('cartAssetItems');
    });

    it('should return false if asset is not in cart', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = isAssetInCart('asset-999');

      expect(result).toBe(false);
    });

    it('should return false if cart is empty', () => {
      localStorageMock.store.cartAssetItems = '[]';

      const result = isAssetInCart('asset-1');

      expect(result).toBe(false);
    });

    it('should return false if localStorage throws error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = isAssetInCart('asset-1');

      expect(result).toBe(false);
    });

    it('should handle assets with id property instead of assetId', () => {
      const cartItems = [
        { id: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = isAssetInCart('asset-1');

      expect(result).toBe(true);
    });
  });

  describe('areAllAssetsInCart', () => {
    it('should return true if all assets are in cart', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
        { assetId: 'asset-2', name: 'Asset 2' },
        { assetId: 'asset-3', name: 'Asset 3' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = areAllAssetsInCart(['asset-1', 'asset-2']);

      expect(result).toBe(true);
    });

    it('should return false if some assets are not in cart', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = areAllAssetsInCart(['asset-1', 'asset-999']);

      expect(result).toBe(false);
    });

    it('should return false if no assets are in cart', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = areAllAssetsInCart(['asset-999', 'asset-888']);

      expect(result).toBe(false);
    });

    it('should return true for empty array', () => {
      localStorageMock.store.cartAssetItems = '[]';

      const result = areAllAssetsInCart([]);

      expect(result).toBe(true);
    });

    it('should return false when array contains null/undefined values', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      // null/undefined fail the check: assetId && cartAssetIds.has(assetId)
      // Since .every() requires ALL elements to pass, this returns false
      const result = areAllAssetsInCart(['asset-1', null, undefined]);

      expect(result).toBe(false);
    });

    it('should return false if localStorage throws error', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = areAllAssetsInCart(['asset-1']);

      expect(result).toBe(false);
    });
  });

  describe('removeAssetsFromCart', () => {
    it('should remove assets from cart successfully', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
        { assetId: 'asset-2', name: 'Asset 2' },
        { assetId: 'asset-3', name: 'Asset 3' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = removeAssetsFromCart(['asset-1', 'asset-3']);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(2);
      expect(result.totalInCart).toBe(1);
      expect(saveCartItemsMock).toHaveBeenCalledTimes(1);
      expect(setStateMock).toHaveBeenCalledWith({
        cartAssetItems: [
          { assetId: 'asset-2', name: 'Asset 2' },
        ],
      });
      // Badge update is now handled by saveCartItems (mocked here)
    });

    it('should handle removing non-existent assets', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = removeAssetsFromCart(['asset-999']);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(0);
      expect(saveCartItemsMock).not.toHaveBeenCalled();
      expect(setStateMock).not.toHaveBeenCalled();
    });

    it('should filter out null/undefined values', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
        { assetId: 'asset-2', name: 'Asset 2' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = removeAssetsFromCart(['asset-1', null, undefined, '']);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1);
      expect(result.totalInCart).toBe(1);
    });

    it('should remove all assets when emptying cart', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = removeAssetsFromCart(['asset-1']);

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1);
      expect(result.totalInCart).toBe(0);
      // Badge update is now handled by saveCartItems (mocked here)
    });

    it('should handle localStorage errors', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = removeAssetsFromCart(['asset-1']);

      expect(result.success).toBe(false);
      expect(result.removedCount).toBe(0);
      expect(result.error).toBe('Storage error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('addAssetsToCart', () => {
    it('should add assets to cart with full details fetched', async () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      const assetsToAdd = [
        { assetId: 'asset-2' },
        { assetId: 'asset-3' },
      ];
      const assetMap = {
        'asset-2': { assetId: 'asset-2', name: 'Asset 2', details: 'full' },
        'asset-3': { assetId: 'asset-3', name: 'Asset 3', details: 'full' },
      };

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);
      fetchAssetByIdMock.mockResolvedValue(assetMap);

      const result = await addAssetsToCart(assetsToAdd);

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.totalInCart).toBe(3);
      expect(fetchAssetByIdMock).toHaveBeenCalledTimes(1);
      expect(fetchAssetByIdMock).toHaveBeenCalledWith(['asset-2', 'asset-3']);
      expect(saveCartItemsMock).toHaveBeenCalledTimes(1);
      expect(setStateMock).toHaveBeenCalledWith({
        cartAssetItems: expect.arrayContaining([
          expect.objectContaining({ assetId: 'asset-1' }),
          expect.objectContaining({ assetId: 'asset-2', details: 'full' }),
          expect.objectContaining({ assetId: 'asset-3', details: 'full' }),
        ]),
      });
      // Badge update is now handled by saveCartItems (mocked here)
    });

    it('should add assets without fetching details when fetchDetails is false', async () => {
      const cartItems = [];
      const assetsToAdd = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = await addAssetsToCart(assetsToAdd, { fetchDetails: false });

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(fetchAssetByIdMock).not.toHaveBeenCalled();
      expect(saveCartItemsMock).toHaveBeenCalledTimes(1);
    });

    it('should skip assets already in cart', async () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      const assetsToAdd = [
        { assetId: 'asset-1' },
      ];

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const result = await addAssetsToCart(assetsToAdd);

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(0);
      expect(result.alreadyInCart).toBe(true);
      expect(fetchAssetByIdMock).not.toHaveBeenCalled();
      expect(saveCartItemsMock).not.toHaveBeenCalled();
    });

    it('should handle failed asset fetches', async () => {
      const cartItems = [];
      const assetsToAdd = [
        { assetId: 'asset-1' },
        { assetId: 'asset-2' },
      ];

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);
      // Mock bulk fetch - only asset-1 found, asset-2 not found
      fetchAssetByIdMock.mockResolvedValue({
        'asset-1': { assetId: 'asset-1', name: 'Asset 1' },
        // asset-2 not in map = failed fetch
      });

      const result = await addAssetsToCart(assetsToAdd);

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.totalInCart).toBe(1);
    });

    it('should filter out assets without valid IDs', async () => {
      const cartItems = [];
      const assetsToAdd = [
        { assetId: 'asset-1' },
        { assetId: null },
        { assetId: '' },
        {},
      ];

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);
      fetchAssetByIdMock.mockResolvedValue({
        'asset-1': { assetId: 'asset-1', name: 'Asset 1' },
      });

      const result = await addAssetsToCart(assetsToAdd);

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(fetchAssetByIdMock).toHaveBeenCalledTimes(1);
      expect(fetchAssetByIdMock).toHaveBeenCalledWith(['asset-1']);
    });

    it('should handle localStorage errors', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await addAssetsToCart([{ assetId: 'asset-1' }]);

      expect(result.success).toBe(false);
      expect(result.addedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.error).toBe('Storage error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle assets with id property instead of assetId', async () => {
      const cartItems = [];
      const assetsToAdd = [
        { id: 'asset-1' },
      ];

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);
      fetchAssetByIdMock.mockResolvedValue({
        'asset-1': { id: 'asset-1', name: 'Asset 1' },
      });

      const result = await addAssetsToCart(assetsToAdd);

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(fetchAssetByIdMock).toHaveBeenCalledWith(['asset-1']);
    });

    it('should use background job for large batches', async () => {
      const cartItems = [];
      const assetsToAdd = Array.from({ length: 15 }, (_, i) => ({
        assetId: `asset-${i + 1}`,
      }));

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'cartAssetItems') {
          return JSON.stringify(cartItems);
        }
        if (key === 'spark-cart-background-jobs') {
          return null; // No existing jobs
        }
        return null;
      });

      const result = await addAssetsToCart(assetsToAdd, {
        fetchDetails: true,
        useBackgroundJob: true,
        backgroundJobThreshold: 10,
      });

      // Should return immediately with background job info
      expect(result.success).toBe(true);
      expect(result.isBackgroundJob).toBe(true);
      expect(result.jobStarted).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.totalToAdd).toBe(15);
      expect(result.addedCount).toBe(0); // Not added yet - will be added in background

      // Verify job was saved to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'spark-cart-background-jobs',
        expect.stringContaining(result.jobId),
      );
    });

    it('should process immediately when below background job threshold', async () => {
      const cartItems = [];
      const assetsToAdd = Array.from({ length: 5 }, (_, i) => ({
        assetId: `asset-${i + 1}`,
      }));

      const assetMap = {};
      assetsToAdd.forEach((a) => {
        assetMap[a.assetId] = { assetId: a.assetId, name: a.assetId };
      });

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);
      fetchAssetByIdMock.mockResolvedValue(assetMap);

      const result = await addAssetsToCart(assetsToAdd, {
        fetchDetails: true,
        useBackgroundJob: true,
        backgroundJobThreshold: 10,
      });

      expect(result.success).toBe(true);
      expect(result.isBackgroundJob).toBeUndefined();
      expect(result.addedCount).toBe(5);
      expect(fetchAssetByIdMock).toHaveBeenCalled();
      expect(saveCartItemsMock).toHaveBeenCalled();
    });

    it('should disable background job when useBackgroundJob is false', async () => {
      const cartItems = [];
      const assetsToAdd = Array.from({ length: 15 }, (_, i) => ({
        assetId: `asset-${i + 1}`,
      }));

      const assetMap = {};
      assetsToAdd.forEach((a) => {
        assetMap[a.assetId] = { assetId: a.assetId, name: a.assetId };
      });

      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);
      fetchAssetByIdMock.mockResolvedValue(assetMap);

      const result = await addAssetsToCart(assetsToAdd, {
        fetchDetails: true,
        useBackgroundJob: false,
      });

      expect(result.success).toBe(true);
      expect(result.isBackgroundJob).toBeUndefined();
      expect(result.addedCount).toBe(15);
      expect(fetchAssetByIdMock).toHaveBeenCalled();
      expect(saveCartItemsMock).toHaveBeenCalled();
    });
  });

  describe('registerCartButtonSync', () => {
    let mockButtons;
    let mockConfig;

    beforeEach(() => {
      // Setup DOM mock
      mockButtons = [
        {
          textContent: '',
          classList: {
            toggle: vi.fn(),
          },
          dataset: { assetId: 'asset-1' },
        },
        {
          textContent: '',
          classList: {
            toggle: vi.fn(),
          },
          dataset: { assetId: 'asset-2' },
        },
      ];

      global.document = {
        querySelectorAll: vi.fn(() => mockButtons),
      };

      mockConfig = {
        buttonSelector: '.add-to-cart-button',
        getAssetIds: vi.fn((btn) => [btn.dataset.assetId]),
        getLabels: vi.fn(() => ({
          addText: 'Add To Cart',
          removeText: 'Remove From Cart',
        })),
      };
    });

    it('should register cart button sync and update buttons on cartStateChange', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      const cleanup = registerCartButtonSync(mockConfig);

      expect(window.addEventListener).toHaveBeenCalledWith(
        'cartStateChange',
        expect.any(Function),
      );

      // Simulate cartStateChange event
      const eventHandler = window.addEventListener.mock.calls[0][1];
      eventHandler();

      expect(document.querySelectorAll).toHaveBeenCalledWith('.add-to-cart-button');
      expect(mockButtons[0].textContent).toBe('Remove From Cart');
      expect(mockButtons[0].classList.toggle).toHaveBeenCalledWith('remove-from-cart', true);
      expect(mockButtons[1].textContent).toBe('Add To Cart');
      expect(mockButtons[1].classList.toggle).toHaveBeenCalledWith('remove-from-cart', false);

      expect(typeof cleanup).toBe('function');
    });

    it('should cleanup event listener when cleanup function is called', () => {
      const cleanup = registerCartButtonSync(mockConfig);

      cleanup();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'cartStateChange',
        expect.any(Function),
      );
    });

    it('should handle multiple assets per button', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
        { assetId: 'asset-2', name: 'Asset 2' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      mockConfig.getAssetIds = vi.fn(() => ['asset-1', 'asset-2']);

      registerCartButtonSync(mockConfig);

      const eventHandler = window.addEventListener.mock.calls[0][1];
      eventHandler();

      expect(mockButtons[0].textContent).toBe('Remove From Cart');
      expect(mockButtons[0].classList.toggle).toHaveBeenCalledWith('remove-from-cart', true);
    });

    it('should show add button if not all assets are in cart', () => {
      const cartItems = [
        { assetId: 'asset-1', name: 'Asset 1' },
      ];
      localStorageMock.store.cartAssetItems = JSON.stringify(cartItems);

      mockConfig.getAssetIds = vi.fn(() => ['asset-1', 'asset-999']);

      registerCartButtonSync(mockConfig);

      const eventHandler = window.addEventListener.mock.calls[0][1];
      eventHandler();

      expect(mockButtons[0].textContent).toBe('Add To Cart');
      expect(mockButtons[0].classList.toggle).toHaveBeenCalledWith('remove-from-cart', false);
    });

    it('should skip buttons with no asset IDs', () => {
      localStorageMock.store.cartAssetItems = '[]';
      mockConfig.getAssetIds = vi.fn(() => []);

      registerCartButtonSync(mockConfig);

      const eventHandler = window.addEventListener.mock.calls[0][1];
      eventHandler();

      expect(mockButtons[0].textContent).toBe('');
      expect(mockButtons[0].classList.toggle).not.toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      registerCartButtonSync(mockConfig);

      const eventHandler = window.addEventListener.mock.calls[0][1];
      eventHandler();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
