/**
 * Sponsorship Asset Disclaimer Modal
 *
 * Sponsorship detection lives in the Cloudflare worker. When the UI requests
 * metadata for a sponsorship asset without `x-disclaimer-accepted: true`, the
 * worker withholds the real payload and instead responds with
 * `{ requiresDisclaimer: true, reason: 'sponsorship' }`.
 *
 * This module provides:
 *   - A simple Accept / Decline disclaimer modal.
 *   - Per-asset `accepted` / `declined` decisions persisted in `sessionStorage`.
 *   - A `fetchMetadataWithDisclaimer()` helper that performs the full handshake:
 *     short-circuit on a previous decline, send the acceptance header on a
 *     prior accept, prompt + retry when the worker signals a sponsorship.
 */

const STORAGE_KEY = 'sponsorship-disclaimer-decisions';

/**
 * Read the per-asset decision map from sessionStorage.
 * @returns {Record<string, 'accepted'|'declined'>}
 */
function readDecisions() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_e) {
    return {};
  }
}

/**
 * Get the saved disclaimer decision for an asset, if any.
 * @param {string} assetId
 * @returns {'accepted'|'declined'|null}
 */
export function getDisclaimerDecision(assetId) {
  if (!assetId) return null;
  const decisions = readDecisions();
  const value = decisions[assetId];
  return value === 'accepted' || value === 'declined' ? value : null;
}

/**
 * Persist a disclaimer decision for a single asset.
 * @param {string} assetId
 * @param {'accepted'|'declined'} decision
 */
export function setDisclaimerDecision(assetId, decision) {
  if (!assetId || (decision !== 'accepted' && decision !== 'declined')) return;
  try {
    const decisions = readDecisions();
    decisions[assetId] = decision;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  } catch (_e) {
    // sessionStorage unavailable (e.g. private mode) — silently ignore
  }
}

/**
 * True when the metadata response carries the worker's
 * `requiresDisclaimer` signal in place of real metadata.
 * @param {Object|null|undefined} metadata
 * @returns {boolean}
 */
export function isDisclaimerRequiredResponse(metadata) {
  return !!(metadata && metadata.requiresDisclaimer === true);
}

/**
 * Display the sponsorship disclaimer modal.
 *
 * Resolves with `'accepted'` if the user clicks Accept, `'declined'` if they
 * click Decline, or `'cancelled'` if they dismiss the modal (Escape / overlay
 * click) without making a choice.
 *
 * @param {Object} [options]
 * @param {string} [options.title]
 * @param {string} [options.message]
 * @param {string} [options.acceptLabel]
 * @param {string} [options.declineLabel]
 * @returns {Promise<'accepted'|'declined'|'cancelled'>}
 */
export function showDisclaimerModal({
  title = 'Sponsorship Asset Disclaimer',
  message = 'This asset is associated with a sponsorship and may be subject to '
    + 'usage restrictions. By accepting, you confirm that you understand and '
    + 'agree to the terms governing the use of sponsorship assets.',
  acceptLabel = 'Accept',
  declineLabel = 'Decline',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'disclaimer-modal-overlay';

    const container = document.createElement('div');
    container.className = 'disclaimer-modal-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-labelledby', 'disclaimer-modal-title');
    container.innerHTML = `
      <div class="disclaimer-modal-header">
        <h2 id="disclaimer-modal-title" class="disclaimer-modal-title"></h2>
      </div>
      <div class="disclaimer-modal-content">
        <p></p>
      </div>
      <div class="disclaimer-modal-actions">
        <button type="button" class="secondary-button" data-action="decline"></button>
        <button type="button" class="primary-button" data-action="accept"></button>
      </div>
    `;

    container.querySelector('.disclaimer-modal-title').textContent = title;
    container.querySelector('.disclaimer-modal-content p').textContent = message;
    const declineBtn = container.querySelector('[data-action="decline"]');
    const acceptBtn = container.querySelector('[data-action="accept"]');
    declineBtn.textContent = declineLabel;
    acceptBtn.textContent = acceptLabel;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    let settled = false;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // eslint-disable-next-line no-use-before-define
        settle('cancelled');
      }
    };
    const settle = (result) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      resolve(result);
    };
    document.addEventListener('keydown', onKeyDown, true);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) settle('cancelled');
    });
    acceptBtn.addEventListener('click', () => settle('accepted'));
    declineBtn.addEventListener('click', () => settle('declined'));

    requestAnimationFrame(() => acceptBtn.focus());
  });
}

/**
 * Fetch asset metadata from the worker, handling the sponsorship disclaimer
 * handshake transparently.
 *
 * Resolution rules:
 *   - If the asset was previously declined this session, returns `null` and
 *     invokes `onDeclined()` (no network call is made).
 *   - If the asset was previously accepted this session, the request is sent
 *     with `disclaimerAccepted: true` so the worker returns metadata directly.
 *   - Otherwise we send a normal request. If the worker replies with
 *     `{ requiresDisclaimer: true }`, the modal is shown:
 *       * Accept  → save decision, refetch with the accepted header, return metadata.
 *       * Decline → save decision, invoke `onDeclined()`, return `null`.
 *       * Cancel  → invoke `onCancelled()`, return `null` (no decision saved).
 *
 * Network errors propagate to the caller; this helper never swallows them.
 *
 * @param {Object} params
 * @param {string} params.assetId
 * @param {{ getMetadata: Function }} params.dmClient
 * @param {() => void} [params.onDeclined]   Invoked when access is denied (prior
 *   decline or new decline). Useful for showing a toast.
 * @param {() => void} [params.onCancelled]  Invoked when the user dismisses the
 *   disclaimer without making a choice (Escape / overlay click).
 * @param {Object} [params.modalOptions]     Forwarded to `showDisclaimerModal`.
 * @returns {Promise<Object|null>} Metadata object, or `null` when access is denied.
 */
export async function fetchMetadataWithDisclaimer({
  assetId,
  dmClient,
  onDeclined,
  onCancelled,
  modalOptions,
}) {
  if (!assetId || !dmClient) return null;

  // Short-circuit: previously declined this session — never call the worker.
  if (getDisclaimerDecision(assetId) === 'declined') {
    onDeclined?.();
    return null;
  }

  const previouslyAccepted = getDisclaimerDecision(assetId) === 'accepted';

  let metadata = await dmClient.getMetadata(assetId, {
    disclaimerAccepted: previouslyAccepted,
  });

  if (!isDisclaimerRequiredResponse(metadata)) {
    return metadata;
  }

  const result = await showDisclaimerModal(modalOptions);
  if (result === 'accepted') {
    setDisclaimerDecision(assetId, 'accepted');
    metadata = await dmClient.getMetadata(assetId, { disclaimerAccepted: true });
    return metadata;
  }
  if (result === 'declined') {
    setDisclaimerDecision(assetId, 'declined');
    onDeclined?.();
    return null;
  }
  // cancelled (Escape / overlay click) — no decision saved
  onCancelled?.();
  return null;
}

export default {
  getDisclaimerDecision,
  setDisclaimerDecision,
  isDisclaimerRequiredResponse,
  showDisclaimerModal,
  fetchMetadataWithDisclaimer,
};
