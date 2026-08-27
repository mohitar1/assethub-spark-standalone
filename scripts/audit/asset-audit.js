import { ASSET_AUDIT_ACTION_VALUES, ASSET_ACTION_EVENT } from './asset-audit-constants.js';

/**
 * Dispatch an asset interaction event for audit tracking.
 * @param {string} action - one of ASSET_AUDIT_ACTIONS values
 * @param {string} assetId - the asset the action applies to
 * @param {Object} [extra] - optional extra detail merged into the event
 * @returns {boolean} true if an event was dispatched
 */
export function dispatchAssetAction(action, assetId, extra = {}) {
  if (!assetId) return false;
  document.dispatchEvent(new CustomEvent(ASSET_ACTION_EVENT, {
    detail: { action, assetId, ...extra },
  }));
  return true;
}

export default function initAssetAuditTracking() {
  document.addEventListener(ASSET_ACTION_EVENT, ({ detail }) => {
    const { action, assetId, ...extra } = detail;

    if (!action || !assetId) {
      console.warn('[asset-audit] asset:action event missing action or assetId', detail);
      return;
    }
    if (!ASSET_AUDIT_ACTION_VALUES.includes(action)) {
      console.warn('[asset-audit] unknown action type:', action);
      return;
    }

    fetch('/api/audit/event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, assetId, ...extra }),
    }).catch((err) => console.warn('[asset-audit] POST failed:', err));
  });
}
