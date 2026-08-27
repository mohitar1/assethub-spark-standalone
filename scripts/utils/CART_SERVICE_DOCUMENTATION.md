# Cart Service Documentation

## Overview

The Cart Service is a centralized API for managing cart operations across the Spark application. It provides a singleton instance that handles both asset and template carts with automatic state synchronization, cross-tab communication, and UI button management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cart Service (API)                      │
│  Public interface for all cart operations                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─► cart-utils.js (Core Logic)
                              ├─► cart-state.js (State Management & Sync)
                              └─► cart-keys.js (Storage Keys)
```

### Module Structure

- **`cart-service.js`** - Public API (singleton instance exported as `cart`)
- **`cart-utils.js`** - Core cart operations (add, remove, check, sync buttons)
- **`cart-state.js`** - Global state management and cross-tab synchronization
- **`cart-keys.js`** - Storage and state key mappings

## Core Features

✅ **Dual Cart Support** - Separate carts for assets and templates
✅ **State Synchronization** - Automatic UI updates across components
✅ **Cross-Tab Sync** - Changes reflect across browser tabs via BroadcastChannel
✅ **Button Auto-Sync** - Automatic "Add to Cart" / "Remove from Cart" button state management
✅ **Background Jobs** - Support for download/archive operations
✅ **Backward Compatible** - Maintains compatibility with existing asset cart code

## Storage Architecture

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `cartAssetItems` | Array | Asset cart items (default) |
| `cartTemplateItems` | Array | Template cart items |

### Cart Item Structure

```javascript
{
  assetId: "urn:aaid:aem:...",      // Unique asset ID
  name: "asset-name.jpg",            // Asset filename
  assetPath: "/path/to/asset",       // Asset path
  repositoryId: "delivery-xxx",      // Repository ID
  // ... additional asset metadata
}
```

## API Reference

### Import

```javascript
import { cart } from '../../../scripts/utils/cart-service.js';
```

### Methods

#### `cart.isItemInCart(assetIds, options)`

Check if item(s) are in the cart.

**Parameters:**
- `assetIds` (string | string[]) - Single asset ID or array of IDs
- `options` (Object, optional)
  - `type` (string) - Cart type: `'asset'` (default) or `'template'`

**Returns:** `boolean`

**Examples:**
```javascript
// Check single asset
const isInCart = cart.isItemInCart('urn:aaid:aem:123');

// Check multiple assets (all must be in cart)
const allInCart = cart.isItemInCart(['id1', 'id2', 'id3']);

// Check template cart
const isTemplateInCart = cart.isItemInCart('template-123', { type: 'template' });
```

---

#### `cart.addItemsToCart(items, options)`

Add item(s) to the cart.

**Parameters:**
- `items` (Object | Object[]) - Single item or array of items
- `options` (Object, optional)
  - `type` (string) - Cart type: `'asset'` (default) or `'template'`

**Returns:** `Promise<void>`

**Examples:**
```javascript
// Add single asset
await cart.addItemsToCart({
  assetId: 'urn:aaid:aem:123',
  name: 'image.jpg',
  assetPath: '/content/dam/assets'
});

// Add multiple assets
await cart.addItemsToCart([
  { assetId: 'id1', name: 'file1.jpg' },
  { assetId: 'id2', name: 'file2.jpg' }
]);

// Add to template cart
await cart.addItemsToCart(templateItems, { type: 'template' });
```

---

#### `cart.removeItemsFromCart(assetIds, options)`

Remove item(s) from the cart.

**Parameters:**
- `assetIds` (string | string[]) - Single asset ID or array of IDs
- `options` (Object, optional)
  - `type` (string) - Cart type: `'asset'` (default) or `'template'`

**Returns:** `Promise<void>`

**Examples:**
```javascript
// Remove single asset
await cart.removeItemsFromCart('urn:aaid:aem:123');

// Remove multiple assets
await cart.removeItemsFromCart(['id1', 'id2', 'id3']);

// Remove from template cart
await cart.removeItemsFromCart('template-123', { type: 'template' });
```

---

#### `cart.getItems(options)`

Get all items from the cart.

**Parameters:**
- `options` (Object, optional)
  - `type` (string) - Cart type: `'asset'` (default) or `'template'`

**Returns:** `Array<Object>`

**Examples:**
```javascript
// Get asset cart items
const assetItems = cart.getItems();

// Get template cart items
const templateItems = cart.getItems({ type: 'template' });
```

---

#### `cart.syncButtons(config)`

Register automatic button state synchronization for cart buttons.

**Parameters:**
- `config` (Object)
  - `selector` (string) - CSS selector for cart buttons
  - `getAssetIds` (function) - Function to extract asset IDs from button element
  - `labels` (Object) - Button text labels
    - `add` (string) - Text for "Add to Cart" state
    - `remove` (string) - Text for "Remove from Cart" state
  - `type` (string, optional) - Cart type: `'asset'` (default) or `'template'`

**Returns:** `function` - Cleanup function to unregister the sync

**Example:**
```javascript
// Register cart button sync
const cleanup = cart.syncButtons({
  selector: '.add-to-cart-btn',
  getAssetIds: (btn) => {
    const card = btn.closest('.asset-card');
    return card ? [card.dataset.assetId] : [];
  },
  labels: {
    add: 'Add to Cart',
    remove: 'Remove from Cart'
  }
});

// Later, cleanup when component unmounts
cleanup();
```

---

#### `cart.initCartBackgroundJobs()`

Initialize background job polling for downloads/archives.

**Returns:** `Promise<void>`

**Example:**
```javascript
await cart.initCartBackgroundJobs();
```

---

#### `cart.getCartJobsStatus()`

Get the status of all cart background jobs.

**Returns:** `Object` - Status object with job information

**Example:**
```javascript
const status = cart.getCartJobsStatus();
console.log('Active jobs:', status.activeJobs);
```

---

## Usage Patterns

### 1. Simple Add/Remove Operations

```javascript
import { cart } from '../../scripts/utils/cart-service.js';

// Add to cart
async function handleAddToCart(asset) {
  try {
    await cart.addItemsToCart(asset);
    showToast('Added to cart', 'success');
  } catch (error) {
    showToast('Failed to add to cart', 'error');
  }
}

// Remove from cart
async function handleRemoveFromCart(assetId) {
  try {
    await cart.removeItemsFromCart(assetId);
    showToast('Removed from cart', 'success');
  } catch (error) {
    showToast('Failed to remove from cart', 'error');
  }
}
```

### 2. Button State Management (Automatic Sync)

**For simple asset cards:**

```javascript
import { cart } from '../../../scripts/utils/cart-service.js';

let cartSyncCleanup = null;

function initializeCartButtons() {
  // Clean up previous sync if exists
  if (cartSyncCleanup) {
    cartSyncCleanup();
  }

  // Register cart button sync
  cartSyncCleanup = cart.syncButtons({
    selector: '.add-to-cart-btn',
    getAssetIds: (btn) => {
      const card = btn.closest('.asset-card');
      return card ? [card.dataset.assetId] : [];
    },
    labels: {
      add: 'Add to Cart',
      remove: 'Remove from Cart'
    }
  });
}

// Cleanup when component unmounts
function cleanup() {
  if (cartSyncCleanup) {
    cartSyncCleanup();
    cartSyncCleanup = null;
  }
}
```

**For complex structures (e.g., rights requests with multiple assets):**

```javascript
import { cart } from '../../scripts/utils/cart-service.js';

let cartSyncCleanup = null;

function initializeRightsRequestCartSync() {
  cartSyncCleanup = cart.syncButtons({
    selector: '.request-row .primary-button',
    getAssetIds: (btn) => {
      // Find the parent row
      const row = btn.closest('.request-row');
      if (!row) return [];

      // Get the request ID from the row
      const requestId = row.querySelector('.request-id')?.textContent.trim();
      
      // Find the request in your data
      const request = allRequests.find((r) => r.id === requestId);
      if (!request?.assets) return [];

      // Extract all asset IDs from the request
      return request.assets
        .map((asset) => asset.assetId || asset.id)
        .filter(Boolean);
    },
    labels: {
      add: 'Add To Cart',
      remove: 'Remove From Cart'
    }
  });
}
```

### 3. Loading States with Button Sync

```javascript
import { cart } from '../../scripts/utils/cart-service.js';
import setButtonLoading from '../utils/dom-utils.js';

async function handleAddToCart(button, asset) {
  try {
    setButtonLoading(button, true);
    await cart.addItemsToCart(asset);
    // Button state will be updated automatically by cart.syncButtons
  } catch (error) {
    showToast('Failed to add to cart', 'error');
  } finally {
    setButtonLoading(button, false);
  }
}
```

### 4. Cross-Tab Synchronization (Automatic)

Cross-tab synchronization is **automatic** via `BroadcastChannel`. No additional code needed!

```javascript
// Tab 1: Add to cart
await cart.addItemsToCart(asset);

// Tab 2: Button state automatically updates ✅
// Tab 2: Cart badge automatically updates ✅
```

### 5. Template Cart Usage

```javascript
import { cart } from '../../scripts/utils/cart-service.js';

// Add templates
await cart.addItemsToCart(templates, { type: 'template' });

// Check if template is in cart
const isInCart = cart.isItemInCart(templateId, { type: 'template' });

// Get all templates
const templates = cart.getItems({ type: 'template' });

// Remove templates
await cart.removeItemsFromCart(templateIds, { type: 'template' });
```

## Button Loading States

### Global Button Classes

The cart service works seamlessly with the global button system:

```css
/* Primary Button */
button.primary-button { }

/* Primary Button Disabled State */
button.primary-button:disabled {
  background-color: #ff8c80;  /* Lighter red */
  color: #f8f8f8;             /* Off-white */
  cursor: not-allowed;
}

/* Primary Button Loading State (spinner) */
button.primary-button.primary-is-loading::before {
  content: "\f110";           /* FontAwesome spinner */
  font-family: FontAwesome, sans-serif;
  display: inline-block;
  margin-right: 8px;
  animation: spinner-rotate 2s linear infinite;
}
```

### Using Loading States

```javascript
import setButtonLoading from '../utils/dom-utils.js';

// Set loading state (disables button + shows spinner)
setButtonLoading(button, true);

// Remove loading state (re-enables button)
setButtonLoading(button, false);
```

## State Management

### How State Updates Work

```
User Action
    ↓
cart.addItemsToCart()
    ↓
cart-utils.js (updates localStorage)
    ↓
cart-state.js (triggers setState)
    ↓
┌────────────────────────────────────────┐
│  State Update Propagation              │
├────────────────────────────────────────┤
│  1. BroadcastChannel → Other Tabs     │
│  2. Subscribe Listeners → UI Updates   │
│  3. cart.syncButtons → Button States   │
└────────────────────────────────────────┘
```

### Subscribe to Cart Changes

```javascript
import { subscribe } from '../search-results/search-results.js';

subscribe((currentState, prevState, updates) => {
  if (updates.cartAssetItems) {
    console.log('Cart updated:', currentState.cartAssetItems);
    updateCartBadge(currentState.cartAssetItems.length);
  }
});
```

## Best Practices

### ✅ DO

- **Use the singleton instance** - Always import and use `cart` (not `CartService` class)
- **Use cart.syncButtons** - For automatic button state management
- **Clean up syncButtons** - Call the cleanup function when component unmounts
- **Use setButtonLoading** - For consistent loading states
- **Handle errors** - Always wrap cart operations in try-catch
- **Use type parameter** - When working with templates

### ❌ DON'T

- **Don't import cart-utils directly** - Use cart-service API instead
- **Don't manually update localStorage** - Use cart service methods
- **Don't manually update button states** - Let cart.syncButtons handle it
- **Don't create new CartService instances** - Use the singleton
- **Don't forget cleanup** - Always cleanup cart.syncButtons when done

## Migration Guide

### Before (Manual Cart Operations)

```javascript
// ❌ Old way - manual operations
const cartItems = JSON.parse(localStorage.getItem('cartAssetItems') || '[]');
cartItems.push(newAsset);
localStorage.setItem('cartAssetItems', JSON.stringify(cartItems));
window.dispatchEvent(new CustomEvent('cartStateChange'));

// Manual button state update
button.textContent = 'Remove from Cart';
button.classList.add('remove-from-cart');
```

### After (Using Cart Service)

```javascript
// ✅ New way - use cart service
import { cart } from '../../scripts/utils/cart-service.js';

await cart.addItemsToCart(newAsset);
// Button state automatically updated via cart.syncButtons ✨
```

## Troubleshooting

### Buttons Not Updating

**Problem:** Cart buttons don't update after adding/removing items.

**Solution:** Ensure `cart.syncButtons()` is registered:

```javascript
const cleanup = cart.syncButtons({
  selector: '.add-to-cart-btn',
  getAssetIds: (btn) => {
    // Make sure this returns correct asset IDs
    return [btn.dataset.assetId];
  },
  labels: { add: 'Add to Cart', remove: 'Remove from Cart' }
});
```

### Buttons Not Syncing After View Change

**Problem:** Buttons don't sync after switching views (grid ↔ list).

**Solution:** Re-register cart sync when DOM is recreated:

```javascript
if (updates.viewType !== undefined) {
  if (cartSyncCleanup) cartSyncCleanup();
  cartSyncCleanup = cart.syncButtons({ /* config */ });
}
```

### Cross-Tab Not Working

**Problem:** Changes in one tab don't reflect in another tab.

**Solution:** Ensure you're using the cart service methods (not direct localStorage):

```javascript
// ✅ Correct - triggers cross-tab sync
await cart.addItemsToCart(asset);

// ❌ Wrong - no cross-tab sync
localStorage.setItem('cartAssetItems', JSON.stringify(items));
```

### Loading State Issues

**Problem:** Button shows square instead of spinner icon.

**Solution:** Ensure FontAwesome is loaded and CSS has `display: inline-block`:

```css
button.primary-button.primary-is-loading::before {
  display: inline-block;  /* Required for FontAwesome */
  font-family: FontAwesome, sans-serif;
}
```

## Performance Considerations

- **Button Sync is Efficient** - Uses event delegation and MutationObserver
- **Cross-Tab Sync** - Uses BroadcastChannel (lightweight)
- **No Re-renders** - Button updates happen in-place without re-rendering
- **Cleanup Required** - Always cleanup syncButtons to prevent memory leaks

## Related Documentation

- [Button System Documentation](./BUTTON_SYSTEM_DOCUMENTATION.md)
- [Cart Broadcast Analysis](./CART_BROADCAST_ANALYSIS.md)
- [Template Cart Support](./CART_SERVICE_TEMPLATE_SUPPORT.md)

## Examples in Codebase

### Components Using Cart Service

| Component | Location | Usage |
|-----------|----------|-------|
| Asset Cards | `blocks/search-results/components/asset-card.js` | Simple add/remove |
| Image Gallery | `blocks/search-results/components/image-gallery.js` | Button sync with view switching |
| Cart Panel | `blocks/search-results/components/cart/cart-panel.js` | Get items, remove items |
| Rights Requests | `blocks/my-rights-requests/my-rights-requests.js` | Complex multi-asset button sync |
| Collection Details | `blocks/collection-details/collection-details.js` | Button sync for collection assets |
| Asset Details | `blocks/asset-details/asset-details.js` | Add/remove with modal |
| Add to Collection | `scripts/collections/add-to-collection-modal.js` | Loading states with cart service |

## Future Enhancements

- [ ] Bulk operations optimization
- [ ] Cart item metadata enrichment
- [ ] Undo/redo operations
- [ ] Cart persistence across sessions
- [ ] Cart analytics integration

---

**Last Updated:** January 2026
**Maintained By:** Spark Development Team
