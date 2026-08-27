/* eslint-disable import/no-cycle, no-use-before-define */
/**
 * Download Renditions Modal Component
 * Modal wrapper for downloading renditions of a single asset
 */

import { createDownloadRenditionsContent } from './download-renditions-content.js';

// Module state
let modalOverlay = null;
let modalElement = null;

/**
 * Create the download renditions modal
 */
export function createDownloadRenditionsModal(options) {
  const {
    asset,
    onClose,
  } = options;

  if (!asset) return;

  // Close any existing modal
  closeDownloadRenditionsModal();

  // Add body class
  document.body.classList.add('download-renditions-modal-open');

  // Create overlay
  modalOverlay = document.createElement('div');
  modalOverlay.className = 'download-renditions-overlay portal-modal';
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeDownloadRenditionsModal();
      onClose?.();
    }
  });

  // Create modal
  modalElement = document.createElement('div');
  modalElement.className = 'download-renditions-modal';

  modalElement.innerHTML = `
    <div class="download-renditions-header">
      <div class="download-renditions-header-title">Download</div>
      <button class="download-renditions-close" aria-label="Close">×</button>
    </div>
    <div class="download-renditions-body"></div>
  `;

  modalOverlay.appendChild(modalElement);
  document.body.appendChild(modalOverlay);

  // Bind close button
  const closeBtn = modalElement.querySelector('.download-renditions-close');
  closeBtn?.addEventListener('click', () => {
    closeDownloadRenditionsModal();
    onClose?.();
  });

  // Handle escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      closeDownloadRenditionsModal();
      onClose?.();
    }
  };
  document.addEventListener('keydown', handleEscape, { capture: true });
  modalElement.escapeHandler = handleEscape;

  // Create content inside modal body
  const bodyContainer = modalElement.querySelector('.download-renditions-body');
  const assets = [{
    asset,
    renditionsLoading: false,
    renditionsError: null,
  }];

  createDownloadRenditionsContent(bodyContainer, {
    assets,
    onClose: () => {
      closeDownloadRenditionsModal();
      onClose?.();
    },
    showCancel: true,
  });
}

/**
 * Open download renditions modal (convenience function)
 */
export function openDownloadRenditionsModal(asset, onClose) {
  createDownloadRenditionsModal({ asset, onClose });
}

/**
 * Close download renditions modal
 */
export function closeDownloadRenditionsModal() {
  // Remove body class
  document.body.classList.remove('download-renditions-modal-open');

  // Remove escape handler
  if (modalElement?.escapeHandler) {
    document.removeEventListener('keydown', modalElement.escapeHandler, { capture: true });
  }

  // Remove elements
  if (modalOverlay) {
    modalOverlay.remove();
    modalOverlay = null;
  }
  modalElement = null;
}

export default {
  createDownloadRenditionsModal,
  openDownloadRenditionsModal,
  closeDownloadRenditionsModal,
};
