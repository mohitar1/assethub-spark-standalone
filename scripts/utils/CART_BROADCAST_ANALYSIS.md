# Cart BroadcastChannel Analysis

## Overview

The Spark cart system uses the **BroadcastChannel API** to synchronize cart state across multiple browser tabs in real-time. When a user adds or removes items in one tab, all other open tabs immediately reflect those changes without requiring a page refresh.

## Architecture

### BroadcastChannel Setup

```
┌────────────────────────────────────────────────────────────┐
│                    Browser Context                          │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  Tab 1                Tab 2                Tab 3            │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐      │
│  │ Cart UI  │        │ Cart UI  │        │ Cart UI  │      │
│  └────┬─────┘        └────┬─────┘        └────┬─────┘      │
│       │                   │                   │             │
│       │ Listen            │ Listen            │ Listen      │
│       ▼                   ▼                   ▼             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          BroadcastChannel('cart-sync')               │  │
│  │                                                       │  │
│  │  • Messages broadcast to ALL tabs except sender     │  │
│  │  • No server required                               │  │
│  │  • Instant synchronization                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Initialization (`cart-state.js`)

The BroadcastChannel is initialized when the cart-state module loads:

```javascript
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

      // Listen for cart changes from other tabs
      cartBroadcastChannel.onmessage = (event) => {
        if (event.data.type === 'cartChanged') {
          const items = event.data.items || [];
          const cartType = event.data.cartType || 'asset';
          const storageKey = getStorageKey(cartType);
          const stateKey = getStateKey(cartType);

          // Update localStorage to stay in sync
          try {
            localStorage.setItem(storageKey, JSON.stringify(items));
          } catch (err) {
            console.warn('Failed to update localStorage from cross-tab sync:', err);
          }

          // Update cart badge counter (only for assets)
          if (cartType === 'asset' && window.updateCartBadge) {
            window.updateCartBadge(items.length);
          }

          // Update state via setState to trigger all subscribers
          // Set flag to prevent re-broadcasting
          isUpdatingFromCrossTab = true;
          setState({ [stateKey]: items });
          isUpdatingFromCrossTab = false;
        }
      };
    }
  } catch (error) {
    console.warn('BroadcastChannel not supported, cross-tab sync disabled:', error);
  }
}
```

**Key Points:**
- Channel name: `'cart-sync'`
- Graceful degradation: Falls back silently if BroadcastChannel is not supported
- Message type: `'cartChanged'`
- Supports both asset and template carts via `cartType` field

### 2. Broadcasting Changes (`cart-state.js`)

When cart state changes, the update is broadcast to other tabs:

```javascript
export function setState(updates) {
  const prevState = { ...state };
  Object.assign(state, updates);

  // Notify listeners
  listeners.forEach((listener) => {
    try {
      listener(state, prevState, updates);
    } catch (e) {
      console.error('Cart state listener error:', e);
    }
  });

  // Dispatch custom event for components
  window.dispatchEvent(new CustomEvent('cartStateChange', {
    detail: { state, prevState, updates },
  }));

  // Broadcast cart changes to other tabs (only if not already updating from cross-tab)
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
```

**Key Points:**
- Only broadcasts if not already syncing from another tab (prevents infinite loops)
- Separate messages for asset and template carts
- Messages include the full cart item array

## Message Protocol

### Message Structure

```typescript
interface CartChangedMessage {
  type: 'cartChanged';
  items: Array<CartItem>;
  cartType: 'asset' | 'template';
}
```

### Example Messages

**Asset Cart Update:**
```json
{
  "type": "cartChanged",
  "cartType": "asset",
  "items": [
    {
      "assetId": "urn:aaid:aem:...",
      "name": "image.jpg",
      "assetPath": "/content/dam/assets",
      "repositoryId": "delivery-xxx"
    }
  ]
}
```

**Template Cart Update:**
```json
{
  "type": "cartChanged",
  "cartType": "template",
  "items": [
    {
      "id": "template-123",
      "name": "Brand Template",
      "type": "template"
    }
  ]
}
```

## Synchronization Flow

### User Action in Tab 1

```
┌─────────────────────────────────────────────────────────────┐
│ Tab 1: User clicks "Add to Cart"                            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ cart.addItemsToCart(items)                                  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ cart-utils.js: Update localStorage                         │
│ localStorage.setItem('cartAssetItems', [...])              │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ setState({ cartAssetItems: [...] })                        │
└─────────────────────────────────────────────────────────────┘
        │
        ├──────────────────────────────────┬─────────────────┐
        ▼                                  ▼                 ▼
┌──────────────────┐  ┌──────────────────────────┐  ┌────────────────┐
│ Notify Listeners │  │ cartStateChange Event    │  │ BroadcastChannel│
│ (Tab 1 UI)       │  │ (Tab 1 Components)       │  │ postMessage()   │
└──────────────────┘  └──────────────────────────┘  └────────────────┘
                                                            │
                                                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Message sent to ALL other tabs (not Tab 1)                 │
└─────────────────────────────────────────────────────────────┘
        │
        ├───────────────────────────┬─────────────────────────┐
        ▼                           ▼                         ▼
┌───────────────┐          ┌───────────────┐        ┌───────────────┐
│ Tab 2         │          │ Tab 3         │        │ Tab N         │
│ onmessage()   │          │ onmessage()   │        │ onmessage()   │
└───────────────┘          └───────────────┘        └───────────────┘
        │                           │                         │
        ▼                           ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Update localStorage                                         │
│ Update cart badge                                           │
│ setState() with isUpdatingFromCrossTab = true              │
│ (UI automatically updates)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Infinite Loop Prevention

The `isUpdatingFromCrossTab` flag prevents infinite broadcast loops:

```javascript
// Tab 1: User action
isUpdatingFromCrossTab = false  // ✅ Broadcast enabled
setState({ cartAssetItems: [...] })
→ BroadcastChannel.postMessage()

// Tab 2: Receives message
isUpdatingFromCrossTab = true   // ❌ Broadcast disabled
setState({ cartAssetItems: [...] })
→ BroadcastChannel.postMessage() SKIPPED
isUpdatingFromCrossTab = false
```

**Without this flag:**
```
Tab 1 → Broadcast → Tab 2 → Broadcast → Tab 1 → Broadcast → Tab 2 → ... ∞
```

**With this flag:**
```
Tab 1 → Broadcast → Tab 2 (no broadcast) ✅
```

## UI Synchronization

### What Gets Synchronized

| Feature | Tab 1 Action | Other Tabs |
|---------|--------------|------------|
| **Cart Items** | Add/remove items | ✅ Instant update |
| **Cart Badge** | Count changes | ✅ Badge updates |
| **Cart Panel** | Open panel, view items | ✅ Item list updates |
| **Cart Buttons** | "Add to Cart" → "Remove from Cart" | ✅ Button text/state updates |
| **Background Jobs** | Large batch add | ✅ All tabs show progress |

### Component Integration

**Cart Buttons (`cart.syncButtons`):**

```javascript
const cleanup = cart.syncButtons({
  selector: '.add-to-cart-btn',
  getAssetIds: (btn) => [btn.dataset.assetId],
  labels: {
    add: 'Add to Cart',
    remove: 'Remove from Cart'
  }
});
```

The `syncButtons` utility:
1. Registers a listener for `cartStateChange` events
2. When cart changes (local or cross-tab), updates all matching buttons
3. Changes button text and CSS classes based on cart state

**State Subscribers:**

```javascript
import { subscribe } from '../scripts/cart-state.js';

subscribe((currentState, prevState, updates) => {
  if (updates.cartAssetItems) {
    // Cart changed (could be from another tab!)
    updateCartUI(currentState.cartAssetItems);
  }
});
```

## Browser Support

### BroadcastChannel Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ 54+ | Full support |
| Firefox | ✅ 38+ | Full support |
| Safari | ✅ 15.4+ | Added in 2022 |
| Edge | ✅ 79+ | Full support |
| IE 11 | ❌ | Not supported |

### Graceful Degradation

When BroadcastChannel is not supported:
- ✅ Cart operations still work normally
- ✅ Cart persists in localStorage
- ✅ Cart syncs on page refresh
- ❌ No real-time cross-tab sync

```javascript
try {
  if (typeof BroadcastChannel !== 'undefined') {
    cartBroadcastChannel = new BroadcastChannel('cart-sync');
    // ... setup
  }
} catch (error) {
  console.warn('BroadcastChannel not supported, cross-tab sync disabled:', error);
  // Continue without cross-tab sync
}
```

## Performance Considerations

### Advantages

✅ **No Server Required** - Purely client-side, no network overhead
✅ **Instant Updates** - Sub-millisecond latency
✅ **No Polling** - Event-driven, no unnecessary CPU usage
✅ **Battery Efficient** - Only fires when cart actually changes
✅ **Scalable** - Works with unlimited tabs

### Potential Issues

⚠️ **Large Cart Sizes**
- Each cart change broadcasts the entire cart array
- For very large carts (1000+ items), this could be slow
- **Mitigation:** Use background jobs for bulk operations

⚠️ **localStorage Quota**
- Cart is stored in localStorage (typically 5-10MB limit)
- Very large carts could exceed quota
- **Mitigation:** Cart is designed for typical use (< 100 items)

⚠️ **Race Conditions**
- Multiple tabs making simultaneous changes
- Last write wins (based on localStorage behavior)
- **Mitigation:** Unlikely in practice, as users typically work in one tab

## Testing Cross-Tab Sync

### Manual Testing

1. Open Spark in two browser tabs
2. In Tab 1: Add an asset to cart
3. In Tab 2: Observe cart badge and buttons update instantly
4. In Tab 2: Remove the asset from cart
5. In Tab 1: Observe cart badge and buttons update instantly

### Debug Logging

Add debug logging to trace broadcast messages:

```javascript
cartBroadcastChannel.onmessage = (event) => {
  console.log('[Cart Sync] Received:', event.data);
  // ... handle message
};

// In setState()
if (cartBroadcastChannel && !isUpdatingFromCrossTab) {
  console.log('[Cart Sync] Broadcasting:', updates);
  cartBroadcastChannel.postMessage({ ... });
}
```

### Browser DevTools

**View Active Channels:**
1. Open DevTools → Application → Storage → Session Storage
2. BroadcastChannel instances are shown in newer browsers

**Monitor Messages:**
```javascript
// In console of any tab
const channel = new BroadcastChannel('cart-sync');
channel.onmessage = (e) => console.log('Received:', e.data);
```

## Comparison with Alternative Approaches

### BroadcastChannel vs localStorage Events

| Feature | BroadcastChannel | localStorage Events |
|---------|------------------|---------------------|
| Setup | Simple | Simple |
| Message passing | Structured data | String-based (JSON) |
| Performance | Faster | Slower (parses JSON) |
| Reliability | High | Medium (can miss events) |
| Sender tab | Not notified | Not notified |
| Browser support | Modern | All browsers |

### BroadcastChannel vs SharedWorker

| Feature | BroadcastChannel | SharedWorker |
|---------|------------------|--------------|
| Setup | Simple | Complex |
| State management | Each tab | Centralized |
| Debugging | Easy | Harder |
| Browser support | Better | Limited |
| Use case | Sync messages | Shared computation |

### BroadcastChannel vs WebSockets

| Feature | BroadcastChannel | WebSockets |
|---------|------------------|------------|
| Server required | ❌ No | ✅ Yes |
| Latency | Sub-ms | Network dependent |
| Scalability | Unlimited tabs | Server limits |
| Cross-device | ❌ No | ✅ Yes |
| Cost | Free | Server costs |

## Future Enhancements

### Potential Improvements

1. **Delta Updates**
   - Instead of sending entire cart, send only changes
   - Reduces message size for large carts
   - Requires more complex merge logic

2. **Message Batching**
   - Batch rapid changes into single broadcast
   - Reduces message overhead for bulk operations
   - Improves performance during rapid add/remove cycles

3. **Conflict Resolution**
   - Handle simultaneous edits in multiple tabs
   - Implement last-write-wins with timestamps
   - Or use operational transformation (OT)

4. **Cross-Device Sync**
   - Combine BroadcastChannel (same device) with WebSockets (cross-device)
   - Sync cart across user's devices
   - Requires backend infrastructure

5. **Offline Support**
   - Queue cart operations when offline
   - Sync when connection restored
   - Requires Service Worker integration

## Troubleshooting

### Cart Not Syncing Between Tabs

**Check 1: BroadcastChannel Support**
```javascript
console.log('BroadcastChannel supported?', typeof BroadcastChannel !== 'undefined');
```

**Check 2: Channel Initialization**
```javascript
// In console
console.log('Channel:', window.cartBroadcastChannel);
```

**Check 3: Message Sending**
Add logging in `setState()` to verify messages are sent.

**Check 4: Message Receiving**
Add logging in `onmessage` handler to verify messages are received.

### Infinite Loop

**Symptom:** Cart rapidly updates, browser freezes

**Cause:** `isUpdatingFromCrossTab` flag not working

**Fix:** Ensure `isUpdatingFromCrossTab` is set correctly:
```javascript
isUpdatingFromCrossTab = true;
setState({ ... });
isUpdatingFromCrossTab = false;
```

### Cart Out of Sync

**Symptom:** Different tabs show different cart counts

**Cause:** localStorage not being updated

**Fix:** Verify `localStorage.setItem()` is called in both:
1. Local cart operations (`cart-utils.js`)
2. Cross-tab message handler (`cart-state.js`)

## Summary

The Spark cart system leverages the BroadcastChannel API for seamless, real-time synchronization across browser tabs. This provides a native, performant solution for keeping cart state consistent without server infrastructure or complex state management.

**Key Takeaways:**
- ✅ Zero-configuration cross-tab sync
- ✅ Instant UI updates across all tabs
- ✅ Infinite loop prevention with flags
- ✅ Graceful degradation for older browsers
- ✅ Works with both asset and template carts

---

**Related Documentation:**
- [Cart Service Documentation](./CART_SERVICE_DOCUMENTATION.md)
- [Template Cart Support](./CART_SERVICE_TEMPLATE_SUPPORT.md)

**Last Updated:** January 2026
