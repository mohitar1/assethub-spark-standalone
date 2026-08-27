import showToast from '../toast/toast.js';
import { getAppLabel } from '../locale-utils.js';
import { buildAssetDetailsUrl } from '../asset-id-utils.js';
import { dispatchAssetAction } from '../audit/asset-audit.js';
import { ASSET_AUDIT_ACTIONS } from '../audit/asset-audit-constants.js';

/**
 * Creates a share asset button DOM element
 * @param {Object} options - Button configuration
 * @param {string} options.assetId - The asset ID to share
 * @param {string} [options.filename] - Optional filename to include in share URL
 * @param {boolean} [options.disabled=false] - Whether the button is disabled
 * @returns {HTMLButtonElement} The button element
 */
// eslint-disable-next-line import/prefer-default-export
export function createShareAssetButton({ assetId, filename, disabled = false }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'share-asset-tooltip';
  wrapper.setAttribute('data-tooltip-position', 'left');

  const button = document.createElement('button');
  button.className = 'share-asset-button';
  button.disabled = disabled;
  button.removeAttribute('aria-label');

  const icon = document.createElement('span');
  icon.className = 'icon-mask icon-mask-share';
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);
  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      // eslint-disable-next-line no-console
      console.debug('Share link copied to clipboard (fallback):', text);
      showToast('Asset link copied to clipboard', 'success');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Fallback: Could not copy text:', err);
      showToast('Failed to copy link to clipboard', 'error');
    }

    document.body.removeChild(textArea);
  };

  const handleShare = async (e) => {
    // eslint-disable-next-line no-console
    console.debug('[ShareButton] handleShare called with assetId:', assetId);
    e.stopPropagation();

    if (!assetId) {
      // eslint-disable-next-line no-console
      console.warn('No assetId provided for sharing');
      return;
    }

    // Build the share URL with locale prefix; include filename when provided (like asset-card)
    const path = buildAssetDetailsUrl(assetId, filename);
    const shareUrl = `${window.location.protocol}//${window.location.host}${path}`;

    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      // eslint-disable-next-line no-console
      console.debug('Share link copied to clipboard:', shareUrl);
      dispatchAssetAction(ASSET_AUDIT_ACTIONS.SHARE_LINK_COPY, assetId);
      showToast('Asset link copied to clipboard', 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy share link to clipboard:', error);
      // Fallback for older browsers
      fallbackCopyToClipboard(shareUrl);
    }
  };

  button.onclick = handleShare;

  getAppLabel().then((t) => {
    const label = t('shareAsset', 'Share Asset');
    if (!label) return;
    wrapper.setAttribute('data-tooltip', label);
    button.setAttribute('aria-label', label);
  });

  wrapper.appendChild(button);

  return wrapper;
}
