/**
 * Share Assets Modal functionality
 * Listens for custom events from React components and shows email preview modal
 */

import { localizePath } from '../locale-utils.js';

// Configuration constants
const EMAIL_TEMPLATE = {
  GREETING: 'Hi,\n\nI\'ve shared some assets with you.\n',
  INTRO: '\nClick the links below to view the shared assets:\n\n',
  SIGNATURE: '\nThanks!',
};

const ASSET_DETAIL_CONFIG = {
  PATH: '/asset-details',
  PARAM: 'assetid',
};

const TOAST_CONFIG = {
  ANIMATION_DELAY: 10,
  DISPLAY_DURATION: 3000,
  FADE_OUT_DURATION: 300,
};

// Global state
let currentAssets = [];
let emailPreviewModal = null;

// Initialize the modal system
async function initShareAssetsModal() {
  // Listen for the custom event from React components
  window.addEventListener('openShareModal', handleOpenShareModal);

  // Create the modal structure if it doesn't exist
  if (!emailPreviewModal) {
    createEmailPreviewModal();
  }
}

// Handle the custom event from React components
function handleOpenShareModal(event) {
  const { asset, assets } = event.detail || {};
  if (Array.isArray(assets)) {
    currentAssets = assets.slice();
  } else if (asset) {
    currentAssets = [asset];
  } else {
    currentAssets = [];
  }

  // Show email preview modal directly
  showEmailPreviewModal();
}

/**
 * Generate asset detail page link
 * @param {Object} asset - Asset object containing assetId or id
 * @returns {string} Full URL to asset detail page
 */
function getAssetLink(asset) {
  const baseUrl = window.location.origin;
  const assetId = asset.assetId || asset.id;
  const localizedPath = localizePath(`${ASSET_DETAIL_CONFIG.PATH}?${ASSET_DETAIL_CONFIG.PARAM}=${encodeURIComponent(assetId)}`);
  return `${baseUrl}${localizedPath}`;
}

// Create email preview modal
function createEmailPreviewModal() {
  emailPreviewModal = document.createElement('div');
  emailPreviewModal.className = 'email-preview-modal';
  emailPreviewModal.style.display = 'none';

  emailPreviewModal.innerHTML = `
    <div class="email-preview-modal-content">
      <div class="email-preview-modal-header">
        <div class="email-preview-modal-title">Share Assets</div>
        <button class="email-preview-modal-close">&times;</button>
      </div>
      
      <div class="email-preview-modal-body">
        <div class="email-section">
          <div class="email-section-header">
            <span class="email-section-label">Email Body:</span>
            <button class="btn-copy-body">Copy to Clipboard</button>
          </div>
          <div class="email-content-box email-body-content" id="email-body-content">
            <!-- Body content will be populated here -->
          </div>
        </div>
      </div>
      
      <div class="email-preview-modal-footer">
        <button class="btn-close-preview">Close</button>
      </div>
    </div>
  `;

  // Add event listeners
  const closeBtn = emailPreviewModal.querySelector('.email-preview-modal-close');
  const closeFooterBtn = emailPreviewModal.querySelector('.btn-close-preview');
  const copyBodyBtn = emailPreviewModal.querySelector('.btn-copy-body');

  closeBtn.onclick = hideEmailPreviewModal;
  closeFooterBtn.onclick = hideEmailPreviewModal;
  copyBodyBtn.onclick = copyBodyToClipboard;

  // Close modal when clicking outside
  emailPreviewModal.onclick = (e) => {
    if (e.target === emailPreviewModal) {
      hideEmailPreviewModal();
    }
  };

  // Append to body
  document.body.appendChild(emailPreviewModal);
}

/**
 * Show email preview modal with generated content
 */
function showEmailPreviewModal() {
  if (!currentAssets || currentAssets.length === 0) {
    showToast('No assets selected to share', 'error');
    return;
  }

  // Generate email body using template
  let bodyText = EMAIL_TEMPLATE.GREETING;
  bodyText += EMAIL_TEMPLATE.INTRO;

  // Add asset links as plain text (email clients will auto-link URLs)
  currentAssets.forEach((asset) => {
    // Use title if available, otherwise fall back to filename (name), then IDs
    const assetName = asset.title || asset.name || asset.assetId || asset.id || 'Asset';
    const assetLink = getAssetLink(asset);
    // Format as plain text with asset name and link on same line
    bodyText += `${assetName} ${assetLink}\n`;
  });

  bodyText += EMAIL_TEMPLATE.SIGNATURE;

  // Update body content
  const bodyContent = emailPreviewModal.querySelector('#email-body-content');
  bodyContent.textContent = bodyText;

  // Store content for copying
  emailPreviewModal.dataset.body = bodyText;

  // Show modal
  emailPreviewModal.style.display = 'flex';
}

// Hide email preview modal
function hideEmailPreviewModal() {
  emailPreviewModal.style.display = 'none';
  // Clear the assets array now that we're done with the share flow
  currentAssets = [];
}

// Copy body to clipboard
function copyBodyToClipboard() {
  const { body } = emailPreviewModal.dataset;
  navigator.clipboard.writeText(body).then(() => {
    showToast('Email body copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy email body', 'error');
  });
}

// Toast notification function
function showToast(message, type = 'success') {
  // Check if toast already exists
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add to document
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, TOAST_CONFIG.ANIMATION_DELAY);

  // Remove after timeout
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, TOAST_CONFIG.FADE_OUT_DURATION);
  }, TOAST_CONFIG.DISPLAY_DURATION);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initShareAssetsModal);

// Export for module usage
export { initShareAssetsModal, handleOpenShareModal };
