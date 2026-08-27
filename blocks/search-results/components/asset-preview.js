/* eslint-disable import/no-cycle, no-use-before-define */
/**
 * Asset Preview Component - Quick view modal for assets
 */

import { getState, subscribe } from '../search-results.js';
import { getDynamicMediaClient } from '../clients/dynamicmedia-client.js';
import { isPdfPreview, isVideo } from '../constants/filetypes.js';
import { createActionButton, BUTTON_CONFIGS } from './action-button.js';
import { createAdobePDFViewer } from './adobe-pdf-viewer.js';
import { createVideoPlayerHandler } from './video-player.js';
import { createShareAssetButton } from '../../../scripts/share/share-asset-button.js';
import { PREVIEW_SIZES } from '../constants/images.js';
import { renderPictureHTML } from './picture.js';
import { getAddToCollectionOverlayHTML, attachAddToCollectionOverlayListener } from '../utils/add-to-collection-utils.js';
import { getAssetWithOriginalOnlyForZip } from '../utils/zip-helper.js';
import { openDownloadRenditionsModal } from './download-renditions/download-renditions-modal.js';

let modalElement = null;
let overlayElement = null;

/**
 * Create the asset preview modal
 * @param {Object} options - Options
 */
export function createAssetPreview(options) {
  const {
    asset,
    onClose,
    fetchAssetRenditions,
    downloadLabel = 'Download',
  } = options;

  const client = getDynamicMediaClient();

  // Remove existing modal if any
  closeAssetPreview();

  // Add body class to prevent scroll and hide card buttons
  document.body.classList.add('asset-preview-modal-open');

  let watermarkRendition = null;
  // Action button instance
  let actionButton = null;

  const updateDownloadButtonVisibility = () => {
    if (actionButton) {
      actionButton.style.display = watermarkRendition ? '' : 'none';
    }
  };

  // Create overlay
  overlayElement = document.createElement('div');
  overlayElement.className = 'asset-preview-modal portal-modal';
  overlayElement.addEventListener('click', (e) => {
    if (e.target === overlayElement) {
      unsubscribe();
      closeAssetPreview();
      onClose?.();
    }
  });

  // Build content HTML
  const format = asset.format || '';
  const assetId = asset.assetId || '';
  const repoName = asset.name || '';

  const isPdf = isPdfPreview(format);
  const isPdfClickable = isPdf;

  // For videos, check if ready to use (display video player inline)
  const isAssetVideo = isVideo(format);
  const isVideoClickable = isAssetVideo;

  let previewContentHTML = '';

  if (assetId && repoName) {
    // Use picture.js for optimized image loading with WebP/JPG sources
    previewContentHTML = renderPictureHTML({
      asset,
      width: PREVIEW_SIZES.modal,
      className: 'modal-image',
      eager: true,
    });
  } else {
    previewContentHTML = `
      <img src="/icons/image-placeholder.svg" class="modal-image" alt="No preview available" />
    `;
  }

  // Create modal content
  modalElement = document.createElement('div');
  modalElement.className = 'asset-preview-modal-inner';
  modalElement.addEventListener('click', (e) => e.stopPropagation()); // Prevent closing when clicking content

  modalElement.innerHTML = `
    <button class="modal-close-button">
      ✕
    </button>

    <div class="asset-preview-modal-container">
      <div class="modal-header">
        <h3 class="modal-title">${asset.title || ''}</h3>
      </div>

      <div class="modal-image-container${isPdfClickable ? ' pdf-clickable' : ''}" 
          ${isPdfClickable ? 'style="cursor: pointer;"' : ''}>
        ${isVideoClickable ? '<div id="asset-preview-video-player" style="width: 100%; height:410px; display: flex; justify-content: center; align-items: center;"></div>' : previewContentHTML}
        ${getAddToCollectionOverlayHTML(asset)}
      </div>

      <div class="preview-modal-details">
        <div class="preview-modal-grid">
          <div class="preview-modal-group">
            <span class="preview-metadata-label custom-metadata-label">EXPIRATION DATE</span>
            <span class="preview-metadata-value custom-metadata-value">${asset.expirationDate || '—'}</span>
          </div>
          <div class="preview-modal-group">
            <span class="preview-metadata-label custom-metadata-label">TITLE</span>
            <span class="preview-metadata-value custom-metadata-value">${asset.title || '—'}</span>
          </div>
          <div class="preview-modal-group">
            <span class="preview-metadata-label custom-metadata-label">UPLOADED BY</span>
            <span class="preview-metadata-value custom-metadata-value">${asset.createdBy || '—'}</span>
          </div>
        </div>
      </div>

      <div class="product-actions">
        <div class="left-buttons-wrapper">
        </div>
        <div class="right-buttons-wrapper" id="action-button-wrapper">
          <!-- Action button will be injected here -->
        </div>
      </div>
    </div>
  `;

  overlayElement.appendChild(modalElement);
  document.body.appendChild(overlayElement);

  // Left: watermark icon + share; Right: Download primary
  const leftButtonsWrapper = modalElement.querySelector('.left-buttons-wrapper');
  const actionButtonWrapper = modalElement.querySelector('#action-button-wrapper');

  // Initialize watermark action button (left, hidden until watermark rendition confirmed)
  actionButton = createActionButton({
    config: BUTTON_CONFIGS.download,
    disabled: false,
    hasLoadingState: true,
    onClick: async () => {
      if (!asset || !client || !watermarkRendition) return;

      try {
        await client.downloadAsset(asset, watermarkRendition);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to download asset:', e);
      }
    },
  });
  actionButton.style.display = 'none';
  if (leftButtonsWrapper) leftButtonsWrapper.appendChild(actionButton);

  // Share button (left, beside watermark icon)
  const shareButton = createShareAssetButton({ assetId: asset.assetId });
  if (leftButtonsWrapper) leftButtonsWrapper.appendChild(shareButton);

  // Download primary button (right side) - opens the renditions modal
  if (actionButtonWrapper) {
    const downloadPrimaryBtn = document.createElement('button');
    downloadPrimaryBtn.type = 'button';
    downloadPrimaryBtn.className = 'primary-button';
    downloadPrimaryBtn.dataset.action = 'download-renditions';
    downloadPrimaryBtn.textContent = downloadLabel;
    downloadPrimaryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cachedRenditionsForDownload = getState().assetRenditionsCache?.[asset.assetId]
        || asset.renditions;
      const assetForDownload = getAssetWithOriginalOnlyForZip(asset, cachedRenditionsForDownload);
      openDownloadRenditionsModal(assetForDownload);
      unsubscribe();
      closeAssetPreview();
      onClose?.();
    });
    actionButtonWrapper.appendChild(downloadPrimaryBtn);
  }

  // Bind event listeners
  const closeBtn = modalElement.querySelector('.modal-close-button');
  closeBtn.addEventListener('click', () => {
    unsubscribe(); // Unsubscribe here too
    closeAssetPreview();
    onClose?.();
  });

  // Handle PDF preview click
  const imageContainer = modalElement.querySelector('.modal-image-container');
  if (isPdfClickable && imageContainer) {
    imageContainer.addEventListener('click', (e) => {
      e.stopPropagation();

      // Get renditions from cache or from asset object
      const currentState = getState();
      const renditions = (asset?.assetId
        ? currentState.assetRenditionsCache[asset.assetId]
        : undefined) || asset.renditions || {};

      // Find the PDF rendition (smallest one for preview)
      const pdfRendition = renditions?.items
        ?.filter((item) => isPdfPreview(item.format))
        ?.sort((a, b) => (a.size ?? 0) - (b.size ?? 0))?.[0];

      if (!pdfRendition || !client) {
        return;
      }

      // Get PDF URL
      const pdfUrl = client.getPreviewPdfUrl(assetId, repoName, pdfRendition.name);

      if (pdfUrl) {
        // Create PDF viewer modal overlay
        const pdfModalOverlay = document.createElement('div');
        pdfModalOverlay.className = 'pdf-modal-overlay';

        const pdfModalContent = document.createElement('div');
        pdfModalContent.className = 'pdf-modal-content';

        const pdfViewer = createAdobePDFViewer({
          pdfUrl,
          fileName: asset.title || 'document.pdf',
          showDownloadPDF: false,
          showPrintPDF: false,
          onClose: () => {
            if (pdfViewer.cleanup) pdfViewer.cleanup();
            pdfModalOverlay.remove();
          },
        });

        pdfModalContent.appendChild(pdfViewer);
        pdfModalOverlay.appendChild(pdfModalContent);
        document.body.appendChild(pdfModalOverlay);

        // Close on overlay click
        pdfModalOverlay.addEventListener('click', (ev) => {
          if (ev.target === pdfModalOverlay) {
            if (pdfViewer.cleanup) pdfViewer.cleanup();
            pdfModalOverlay.remove();
          }
        });
      }
    });
  }

  // Inject video player if asset is a video
  let videoPlayerHandler = null;
  if (isVideoClickable) {
    const videoPlayerContainer = modalElement.querySelector('#asset-preview-video-player');
    if (videoPlayerContainer) {
      videoPlayerHandler = createVideoPlayerHandler({
        container: videoPlayerContainer,
        asset,
        getRenditions: () => {
          const currentState = getState();
          return (asset?.assetId
            ? currentState.assetRenditionsCache[asset.assetId]
            : undefined) || asset?.renditions || {};
        },
        onRenditionFound: (foundRendition) => {
          // Update watermarkRendition for download button
          watermarkRendition = foundRendition;
          updateDownloadButtonVisibility();
        },
      });

      // Initial injection
      videoPlayerHandler.inject();
    }
  }

  // Add to collection overlay click handler
  const collectionOverlay = modalElement.querySelector('.add-to-collection-overlay');
  attachAddToCollectionOverlayListener(collectionOverlay, asset, client);

  // Subscribe to state changes (renditions)
  const unsubscribe = subscribe((newState, prevState) => {
    // Check if renditions cache changed for current asset
    // This is needed because fetchAssetRenditions updates the global state
    const currentAssetId = asset?.assetId;
    const newCache = newState.assetRenditionsCache || {};
    const prevCache = prevState.assetRenditionsCache || {};
    const newRenditions = currentAssetId ? newCache[currentAssetId] : undefined;
    const prevRenditions = currentAssetId ? prevCache[currentAssetId] : undefined;

    if (newRenditions !== prevRenditions
      || (newRenditions?.items && (!watermarkRendition || !watermarkRendition.name))) {
      const foundWatermark = newRenditions?.items?.find(
        (r) => r.name?.toLowerCase().startsWith('watermark'),
      );

      watermarkRendition = foundWatermark || null;
      updateDownloadButtonVisibility();

      // Re-inject video player if this is a video asset
      if (videoPlayerHandler) {
        videoPlayerHandler.update();
      }
    }
  });

  // Initial check (use asset.renditions if available from cache)
  if (asset.renditions?.items) {
    watermarkRendition = asset.renditions.items.find(
      (r) => r.name?.toLowerCase().startsWith('watermark'),
    );
    updateDownloadButtonVisibility();
  }

  // Fetch renditions in background and update state cache
  if (fetchAssetRenditions) {
    fetchAssetRenditions(asset).then(() => {
      // After fetching, update state cache to trigger re-render if needed
      const currentState = getState();
      const renditions = currentState.assetRenditionsCache[asset.assetId];
      if (renditions?.items && asset) {
        // Update asset object with renditions
        // eslint-disable-next-line no-param-reassign
        asset.renditions = renditions;
      }
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[AssetPreview] Failed to fetch renditions:', err);
    });
  }

  // Handle escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      unsubscribe();
      closeAssetPreview();
      onClose?.();
    }
  };
  document.addEventListener('keydown', handleEscape);
  overlayElement.escapeHandler = handleEscape;

  // Store unsubscribe functions on overlay for cleanup
  if (overlayElement) {
    overlayElement.unsubscribeHandler = unsubscribe;
  }
}

/**
 * Close the asset preview modal
 */
export function closeAssetPreview() {
  if (overlayElement) {
    if (overlayElement.unsubscribeHandler) {
      overlayElement.unsubscribeHandler();
    }
    if (overlayElement.escapeHandler) {
      document.removeEventListener('keydown', overlayElement.escapeHandler);
    }
    overlayElement.remove();
    overlayElement = null;
    modalElement = null;
  }

  // Remove body class
  document.body.classList.remove('asset-preview-modal-open');
}
