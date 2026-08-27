/* eslint-disable import/no-cycle */
/**
 * Asset Details Component - Full details modal with collapsible sections
 * Converted from React AssetDetails component
 */

import { getState, setState, subscribe } from '../../search-results.js';
import { initRenditionsFetcher } from '../../utils/renditions-fetcher.js';
import { getDynamicMediaClient } from '../../clients/dynamicmedia-client.js';
import { createPicture } from '../picture.js';
import { isPdfPreview, isVideo } from '../../constants/filetypes.js';
import { openDownloadRenditionsModal } from '../download-renditions/index.js';
import { createActionButton, BUTTON_CONFIGS } from '../action-button.js';
import { createShareAssetButton } from '../../../../scripts/share/share-asset-button.js';
import { getDisplayAssetId } from '../../../../scripts/asset-id-utils.js';
import { createAdobePDFViewer } from '../adobe-pdf-viewer.js';
import { createVideoPlayerHandler } from '../video-player.js';
import {
  selectPrioritizedRendition,
  getMediaType,
  getRenditionUrl,
  renderMediaContent,
} from './zip-media-handler.js';

import { populateAssetFromMetadata } from '../../../../scripts/asset-transformers.js';
// Import ZIP contents section
import { loadZipContents, bindTreeToggleEvents } from './zip-contents-section.js';
import { isZipAsset, getAssetWithOriginalOnlyForZip } from '../../utils/zip-helper.js';
import { getCachedPlaceholders, getSearchPlaceholders, ph } from '../../utils/placeholders.js';
import showToast from '../../../../scripts/toast/toast.js';
import {
  fetchMetadataWithDisclaimer,
  isDisclaimerRequiredResponse,
} from './disclaimer-modal.js';

// Module state
let modalRoot = null;
let modalOverlay = null;
let unsubscribe = null;
let escapeHandler = null;

// Local state for the modal
let showDownloadRenditionsModal = false;
let watermarkRendition = null;
let videoPlayerHandler = null;
let populatedImage = null;
let pdfModalOpen = false;
let pdfUrl = '';
let inlinePdfViewerInstance = null; // PDF viewer mounted inside asset-details-image-container
let cachedPictureElement = null; // Cache picture element to prevent flashing on re-render
let cachedZipRenditionElement = null; // Cache ZIP rendition element
let zipContentsLoaded = false; // Track if ZIP contents have been loaded
let originalAssetId = null; // Store original asset ID for cache lookups
let cachedZipStructure = null; // Cache ZIP structure data to persist across re-renders

// Popup/details flow can initialize Adobe viewer before surrounding UI settles.
// This delay avoids intermittent blank iframe on first paint.
const ASSET_DETAILS_PDF_LOAD_DELAY_MS = 1500;

/**
 * Translation helper that uses cached placeholders
 * @param {string} key - Translation key
 * @param {string} fallback - Fallback value if key not found
 * @returns {string} Translated string
 */
function t(key, fallback) {
  return ph(getCachedPlaceholders(), key, fallback);
}

/**
 * Append asset picture to container: reuse cached picture if same asset, else create and cache.
 * @param {HTMLElement} container - Parent (e.g. #asset-details-image-placeholder)
 * @param {Object} asset - Asset for picture (uses module cachedPictureElement)
 */
function appendAssetPictureToContainer(container, asset) {
  const currentAssetId = asset?.assetId;
  if (cachedPictureElement && cachedPictureElement.dataset.assetId === currentAssetId) {
    container.appendChild(cachedPictureElement);
    return;
  }
  const picture = createPicture({
    asset,
    width: 1200,
    className: 'asset-details-main-image',
    eager: true,
    fetchPriority: 'high',
  });
  picture.dataset.assetId = currentAssetId;
  const img = picture.querySelector('img');
  if (img) {
    img.onload = () => img.classList.add('loaded');
    if (img.complete && img.naturalWidth > 0) img.classList.add('loaded');
  }
  cachedPictureElement = picture;
  container.appendChild(picture);
}

// ============================================================================
// Helper render functions (defined first to avoid "used before defined" warnings)
// ============================================================================

/**
 * Render a metadata group
 */
function renderMetadataGroup(label, value) {
  return `
    <div class="details-modal-group">
      <span class="details-metadata-label custom-metadata-label">${label}</span>
      <span class="details-metadata-value custom-metadata-value">${value || ''}</span>
      </div>
    `;
}

/**
 * Render PDF modal placeholder (actual content is created dynamically)
 */
function renderPdfModal() {
  return '<div class="pdf-modal-placeholder"></div>';
}

/**
 * Get PDF preview URL for the current asset (from renditions cache or asset).
 * @param {Object} client - Dynamic Media client
 * @param {Object} asset - populatedImage
 * @returns {string|null} PDF URL or null
 */
function getPdfPreviewUrl(client, asset) {
  if (!client || !asset?.assetId || !isPdfPreview(asset.format)) return null;
  const pdfState = getState();
  const pdfRenditions = (asset.assetId
    ? pdfState.assetRenditionsCache?.[asset.assetId]
    : undefined) || asset?.renditions || {};
  const pdfRendition = pdfRenditions.items
    ?.filter((item) => isPdfPreview(item.format))
    ?.sort((a, b) => (a.size ?? 0) - (b.size ?? 0))?.[0];
  if (!pdfRendition) return null;
  return client.getPreviewPdfUrl(asset.assetId, asset.name, pdfRendition.name) || null;
}

/**
 * Open Adobe PDF Viewer modal
 */
function openPdfViewerModal() {
  // Create PDF modal overlay
  const pdfOverlay = document.createElement('div');
  pdfOverlay.className = 'pdf-modal-overlay';

  const pdfModalContent = document.createElement('div');
  pdfModalContent.className = 'pdf-modal-content';

  const pdfViewer = createAdobePDFViewer({
    pdfUrl,
    fileName: populatedImage?.title || 'document.pdf',
    showDownloadPDF: false,
    showPrintPDF: false,
    initialLoadDelayMs: ASSET_DETAILS_PDF_LOAD_DELAY_MS,
    onClose: () => {
      if (pdfViewer.cleanup) pdfViewer.cleanup();
      pdfOverlay.remove();
      pdfModalOpen = false;
    },
  });

  pdfModalContent.appendChild(pdfViewer);
  pdfOverlay.appendChild(pdfModalContent);

  // Append to document.body so the overlay escapes the modal-root stacking context
  // (modal-root has z-index: 2, header has z-index: 3, so nested overlays can't cover the header)
  document.body.appendChild(pdfOverlay);

  // Close on overlay click
  pdfOverlay.addEventListener('click', (ev) => {
    if (ev.target === pdfOverlay) {
      if (pdfViewer.cleanup) pdfViewer.cleanup();
      pdfOverlay.remove();
      pdfModalOpen = false;
    }
  });
}

/**
 * Render image section
 */
function renderImageSection() {
  const isPdf = isPdfPreview(populatedImage?.format);
  const isAssetVideo = isVideo(populatedImage?.format);
  const showPdfOverlay = isPdf;

  return `
      <div class="asset-details-main-image-section ${isAssetVideo ? 'is-video' : ''} ${showPdfOverlay ? 'is-pdf' : ''}">
      <div class="asset-details-image-wrapper">
        <div class="add-to-collection-overlay" data-action="add-to-collection">
          <div class="add-to-collection-content">
            <i class="icon add circle"></i>
            <span>Add to Collection</span>
          </div>
        </div>
        <div
          class="asset-details-image-container"
        >
          <div class="asset-details-main-image-placeholder" id="asset-details-image-placeholder"></div>
          ${showPdfOverlay ? `
            <div id="asset-details-pdf-viewer-container" class="asset-details-pdf-viewer-inline"></div>
          ` : ''}
          ${isAssetVideo ? `
            <div class="video-player-container" id="asset-details-video-player">
              <!-- Video element will be injected here -->
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render info section (right side header)
 */
function renderInfoSection(actionButtonEnable, isDeepLinkAsset) {
  const keywords = populatedImage?.xcmKeywords?.split(',')
    .map((k) => k.trim())
    .filter(Boolean) || [];

  return `
    <div class="asset-details-main-info-section">
      <div class="asset-details-main-info-section-inner">
        <div class="asset-details-main-header">
          ${isDeepLinkAsset ? '' : `
            <button class="asset-details-main-close-button" data-action="close">×</button>
          `}
          ${keywords.length > 0 ? `
            <div class="asset-details-main-tags">
              ${keywords.map((keyword) => `
                <span class="asset-details-main-tag custom-tag">${keyword}</span>
              `).join('')}
            </div>
          ` : ''}
          <div class="modal-title">${populatedImage?.title || ''}</div>
          ${populatedImage?.description && populatedImage.description !== '—' ? `<div class="modal-description">${populatedImage.description}</div>` : ''}
        </div>

        <div class="details-modal-details">
          <div class="details-modal-grid">
            ${renderMetadataGroup(t('title', 'TITLE'), populatedImage?.title)}
            ${renderMetadataGroup(t('expirationDate', 'EXPIRATION DATE'), populatedImage?.expirationDate)}
            ${renderMetadataGroup(t('uploadedBy', 'UPLOADED BY'), populatedImage?.createdBy)}
            ${renderMetadataGroup(t('size', 'SIZE'), populatedImage?.formattedSize)}
            ${renderMetadataGroup(t('width', 'WIDTH'), populatedImage?.imageWidth)}
            ${renderMetadataGroup(t('smartTags', 'SMART TAGS'), populatedImage?.smartTags)}
            ${renderMetadataGroup(t('keywords', 'KEYWORDS'), populatedImage?.xcmKeywords)}
          </div>
        </div>

        <div class="product-actions">
          <div class="left-buttons-wrapper" id="details-left-buttons">
            <!-- Watermark download button injected here -->
            <!-- Share button injected here -->
          </div>
          <div class="right-buttons-wrapper">
              <button
                class="primary-button"
                data-action="download-renditions"
              >
                ${t('download', 'Download')}
              </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Core functions
// ============================================================================

/**
 * Get or create the modal root container
 */
function getModalRoot() {
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    root.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
      pointer-events: none;
    `;
    const header = document.querySelector('header');
    if (header) {
      document.body.insertBefore(root, header);
    } else {
      document.body.appendChild(root);
    }
  }
  return root;
}

/**
 * Close asset details modal
 */
export function closeAssetDetails() {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  // Clean up PDF overlay (now on document.body, not inside modalOverlay)
  const pdfOverlay = document.querySelector('.pdf-modal-overlay');
  if (pdfOverlay) pdfOverlay.remove();

  if (modalOverlay) {
    modalOverlay.remove();
    modalOverlay = null;
  }

  // Remove body class
  document.body.classList.remove('asset-details-modal-open');

  // Reset local state
  showDownloadRenditionsModal = false;
  watermarkRendition = null;
  videoPlayerHandler = null;
  populatedImage = null;
  pdfModalOpen = false;
  pdfUrl = '';
  if (inlinePdfViewerInstance?.cleanup) inlinePdfViewerInstance.cleanup();
  inlinePdfViewerInstance = null;
  cachedPictureElement = null;
  zipContentsLoaded = false;
  originalAssetId = null;
  cachedZipStructure = null;
}

/**
 * Close PDF modal
 */
function closePdfModal() {
  pdfModalOpen = false;
  // PDF overlay is appended to document.body, not inside modalOverlay
  const pdfOverlay = document.querySelector('.pdf-modal-overlay');
  if (pdfOverlay) {
    pdfOverlay.remove();
  }
}

/**
 * Fetch full metadata for asset.
 * If `prefetchedMetadata` is provided (e.g. from the sponsorship disclaimer
 * pre-check), it is used directly and no additional network request is made.
 */
async function fetchMetadata(asset, render, onAccessDenied, prefetchedMetadata) {
  let metadata = prefetchedMetadata;

  if (!metadata) {
    const client = getDynamicMediaClient();
    if (!client) return;

    try {
      metadata = await client.getMetadata(asset.assetId);
    } catch (error) {
      if (error?.message?.includes('Forbidden')) {
        onAccessDenied?.();
        return;
      }
      populatedImage = { ...asset };
      render();
      return;
    }
  }

  // Defensive: if the worker returned the sponsorship disclaimer signal in
  // this fallback path (because the pre-fetch failed), the body is not real
  // metadata. Don't try to populate from it — leave the basic asset visible.
  if (isDisclaimerRequiredResponse(metadata)) {
    populatedImage = { ...asset };
    render();
    return;
  }

  try {
    const baseAsset = populateAssetFromMetadata(metadata);
    populatedImage = {
      ...baseAsset,
      assetId: asset.assetId,
    };
    render();
  } catch (_error) {
    populatedImage = { ...asset };
    render();
  }
}

/**
 * Bind event handlers
 */
function bindEvents(onClose, client) {
  const imagePlaceholder = modalOverlay?.querySelector('#asset-details-image-placeholder');
  const videoPlayerContainer = modalOverlay?.querySelector('#asset-details-video-player');
  const state = getState();
  const renditions = (originalAssetId
    ? state.assetRenditionsCache?.[originalAssetId]
    : undefined) || populatedImage?.renditions || {};

  if (imagePlaceholder && populatedImage) {
    const showPdfInline = isPdfPreview(populatedImage.format);
    if (!showPdfInline) {
      imagePlaceholder.innerHTML = '';

      if (isZipAsset(populatedImage)) {
        // Reuse cached ZIP rendition element to prevent flash on re-render
        if (cachedZipRenditionElement
          && cachedZipRenditionElement.dataset.assetId === populatedImage.assetId) {
          imagePlaceholder.appendChild(cachedZipRenditionElement);
        } else {
          const selectedRendition = selectPrioritizedRendition(renditions);
          if (selectedRendition) {
            const mediaType = getMediaType(selectedRendition);
            const mediaContent = renderMediaContent(
              selectedRendition,
              mediaType,
              populatedImage,
            );
            if (mediaContent) {
              // Create a wrapper so we can cache the DOM element
              const wrapper = document.createElement('div');
              wrapper.innerHTML = mediaContent;
              wrapper.dataset.assetId = populatedImage.assetId;
              cachedZipRenditionElement = wrapper;
              imagePlaceholder.appendChild(wrapper);
              watermarkRendition = selectedRendition;
            } else {
              appendAssetPictureToContainer(imagePlaceholder, populatedImage);
            }
          } else {
            appendAssetPictureToContainer(imagePlaceholder, populatedImage);
          }
        }
      } else {
        appendAssetPictureToContainer(imagePlaceholder, populatedImage);
      }
    }
  }

  if (populatedImage && isPdfPreview(populatedImage.format) && client) {
    const pdfContainer = modalOverlay?.querySelector('#asset-details-pdf-viewer-container');
    if (pdfContainer && !inlinePdfViewerInstance) {
      const url = getPdfPreviewUrl(client, populatedImage);
      if (url) {
        pdfUrl = url;
        inlinePdfViewerInstance = createAdobePDFViewer({
          pdfUrl: url,
          fileName: populatedImage?.title || 'document.pdf',
          showDownloadPDF: false,
          showPrintPDF: false,
          initialLoadDelayMs: ASSET_DETAILS_PDF_LOAD_DELAY_MS,
          onClose: null, // no close button when inline
        });
        inlinePdfViewerInstance.classList.add('asset-details-inline-pdf-viewer');
        pdfContainer.appendChild(inlinePdfViewerInstance);
      }
    }
  }

  // Inject video player - prioritize watermark rendition, fallback to original
  if (videoPlayerContainer && populatedImage && isVideo(populatedImage.format)) {
    // Always create a new video player handler for each modal open
    // (The container is a new DOM element each time the modal is rendered)
    videoPlayerHandler = createVideoPlayerHandler({
      container: videoPlayerContainer,
      asset: populatedImage,
      getRenditions: () => {
        const currentState = getState();
        return (originalAssetId
          ? currentState.assetRenditionsCache[originalAssetId]
          : undefined) || populatedImage?.renditions || {};
      },
      onRenditionFound: (foundRendition) => {
        watermarkRendition = foundRendition;
      },
      playerOptions: {
        autoplay: true,
        loop: true,
        muted: true,
        showPoster: true,
        className: 'asset-details-video-player',
      },
    });

    // Inject or update video
    videoPlayerHandler.inject();
  }

  // Close button
  modalOverlay?.querySelectorAll('[data-action="close"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeAssetDetails();
      onClose?.();
    });
  });

  // Add to Collection
  modalOverlay?.querySelectorAll('[data-action="add-to-collection"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!populatedImage) return;

      const previewUrl = client?.getOptimizedDeliveryPreviewUrl?.(
        populatedImage.assetId || '',
        populatedImage.name || '',
        350,
      );
      const assetForModal = previewUrl ? { ...populatedImage, previewUrl } : populatedImage;
      window.dispatchEvent(new CustomEvent('openCollectionModal', {
        detail: { asset: assetForModal, assetPath: populatedImage.assetId },
      }));
    });
  });

  // PDF preview
  modalOverlay?.querySelectorAll('[data-action="pdf-preview"]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!populatedImage || !client) return;
      if (!isPdfPreview(populatedImage.format)) return;

      const pdfState = getState();
      const pdfRenditions = (populatedImage?.assetId
        ? pdfState.assetRenditionsCache[populatedImage.assetId]
        : undefined) || populatedImage?.renditions || {};

      const pdfRendition = pdfRenditions.items
        ?.filter((item) => isPdfPreview(item.format))
        ?.sort((a, b) => (a.size ?? 0) - (b.size ?? 0))?.[0];

      if (!pdfRendition) return;

      const url = client.getPreviewPdfUrl(
        populatedImage.assetId,
        populatedImage.name,
        pdfRendition.name,
      );

      if (url) {
        pdfUrl = url;
        pdfModalOpen = true;
        openPdfViewerModal();
      }
    });
  });

  // Download Preview
  const downloadPreviewBtn = modalOverlay?.querySelector('[data-action="download-preview"]');
  downloadPreviewBtn?.addEventListener('click', async () => {
    if (!populatedImage || !client || !watermarkRendition) return;
    try {
      await client.downloadAsset(populatedImage, watermarkRendition);
    } catch (_error) {
      // Download failed
    }
  });

  // Share button
  const shareBtn = modalOverlay?.querySelector('[data-action="share"]');
  shareBtn?.addEventListener('click', () => {
    if (!populatedImage) return;
    const assetId = populatedImage.assetId || '';
    const shareUrl = `${window.location.origin}/search/all?assetId=${encodeURIComponent(getDisplayAssetId(assetId))}`;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Link copied to clipboard!', type: 'success' },
      }));
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: { message: 'Failed to copy link', type: 'error' },
      }));
    });
  });

  // Download Renditions
  const downloadRenditionsBtn = modalOverlay?.querySelector('[data-action="download-renditions"]');
  downloadRenditionsBtn?.addEventListener('click', () => {
    if (!populatedImage) return;
    showDownloadRenditionsModal = true;
    const assetForDownload = getAssetWithOriginalOnlyForZip(populatedImage, renditions);
    openDownloadRenditionsModal(assetForDownload, () => {
      showDownloadRenditionsModal = false;
    });
  });

  // Close PDF modal buttons
  modalOverlay?.querySelectorAll('[data-action="close-pdf"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('pdf-modal-overlay')
        || e.target.closest('[data-action="close-pdf"]')) {
        closePdfModal();
      }
    });
  });
}

/**
 * Open asset details modal
 */
export async function openAssetDetails(options) {
  const {
    asset,
    onClose,
    fetchAssetRenditions,
    isDeepLinkAsset = false,
    disableEscapeClose = false,
  } = options;

  // Ensure placeholders (en/ja labels) are loaded so tooltips and labels render
  await getSearchPlaceholders();

  // Fetch metadata up-front, going through the worker's sponsorship disclaimer
  // handshake if needed. If the asset already carries `assetMetadata` (e.g.
  // opened from a deep link that already cleared the gate), reuse it as-is.
  //
  // Sentinel values for `prefetchedMetadata`:
  //   - undefined  → not fetched yet (or fetch threw); fetchMetadata will retry.
  //   - null       → user denied/dismissed the disclaimer; bail out.
  //   - object     → metadata available; reuse to avoid a duplicate worker call.
  let prefetchedMetadata;
  if (asset?.assetMetadata) {
    prefetchedMetadata = {
      assetMetadata: asset.assetMetadata,
      repositoryMetadata: asset.repositoryMetadata,
    };
  } else if (asset?.assetId) {
    const dmClient = getDynamicMediaClient();
    if (dmClient) {
      const declinedToastMessage = t(
        'disclaimerDeclinedToast',
        "You've declined the disclaimer for this asset.",
      );
      try {
        prefetchedMetadata = await fetchMetadataWithDisclaimer({
          assetId: asset.assetId,
          dmClient,
          onDeclined: () => {
            showToast(declinedToastMessage, 'info');
            onClose?.();
          },
          onCancelled: () => {
            onClose?.();
          },
          modalOptions: {
            title: t('sponsorshipDisclaimerTitle', 'Sponsorship Asset Disclaimer'),
            message: t(
              'sponsorshipDisclaimerMessage',
              'This asset is associated with a sponsorship and may be subject to '
                + 'usage restrictions. By accepting, you confirm that you understand '
                + 'and agree to the terms governing the use of sponsorship assets.',
            ),
            acceptLabel: t('accept', 'Accept'),
            declineLabel: t('decline', 'Decline'),
          },
        });
      } catch (_e) {
        // Network/parse error — leave prefetchedMetadata as `undefined` so that
        // fetchMetadata inside the modal can retry and surface real errors
        // (e.g. 403) through its own onAccessDenied path.
      }

      // The user denied or dismissed the disclaimer — do not open the modal.
      if (prefetchedMetadata === null) {
        return;
      }
    }
  }

  // Close any existing modal
  closeAssetDetails();

  // Ensure renditions fetcher is initialized (required when opening from standalone asset-details
  // or collections page where search-results decorate() never ran)
  const currentState = getState();
  if (!currentState.dynamicMediaClient) {
    setState({ dynamicMediaClient: getDynamicMediaClient() });
  }
  initRenditionsFetcher(getState, setState);

  // Initialize local state
  showDownloadRenditionsModal = false;
  watermarkRendition = null;
  cachedZipRenditionElement = null;
  populatedImage = { ...asset };
  pdfModalOpen = false;
  pdfUrl = '';
  originalAssetId = asset.assetId; // Store for cache lookups

  // Get modal root
  modalRoot = getModalRoot();

  // Add body class to hide card buttons
  document.body.classList.add('asset-details-modal-open');

  // Create modal overlay
  modalOverlay = document.createElement('div');
  modalOverlay.className = 'asset-details-modal portal-modal';
  modalOverlay.style.pointerEvents = 'auto';

  // Escape key handler (skip for standalone pages)
  if (!disableEscapeClose) {
    escapeHandler = (e) => {
      if (e.key === 'Escape') {
        if (pdfModalOpen) {
          closePdfModal();
        } else if (!showDownloadRenditionsModal) {
          closeAssetDetails();
          onClose?.();
        }
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Click on overlay to close (only when escape is enabled)
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay && !showDownloadRenditionsModal) {
        closeAssetDetails();
        onClose?.();
      }
    });
  }

  // Render the modal
  const render = (stateOverride) => {
    const state = stateOverride || getState();
    const client = getDynamicMediaClient();
    // Get renditions from cache or from asset object (matches React implementation)
    // Use originalAssetId for cache lookup to ensure consistency with fetchAssetRenditions
    const renditions = (originalAssetId
      ? state.assetRenditionsCache?.[originalAssetId]
      : undefined) || populatedImage?.renditions || {};

    // Check for watermark rendition
    const foundWatermark = renditions.items?.find(
      (r) => r.name?.toLowerCase().startsWith('watermark'),
    );
    watermarkRendition = foundWatermark;
    const hasWatermark = !!watermarkRendition;

    // Preserve video element across re-renders to prevent blinking
    const existingVideoContainer = modalOverlay.querySelector('#asset-details-video-player');
    const existingVideo = existingVideoContainer?.querySelector('video');
    const preserveVideo = existingVideo && existingVideoContainer?.style.display === 'flex';
    let savedVideoElement = null;
    if (preserveVideo) {
      // Detach video element to preserve it during innerHTML replacement
      savedVideoElement = existingVideo;
      existingVideo.remove();
    }

    // Detach inline PDF viewer so it survives innerHTML replacement
    if (inlinePdfViewerInstance) {
      inlinePdfViewerInstance.remove();
    }

    modalOverlay.innerHTML = `
      ${pdfModalOpen ? renderPdfModal() : ''}
      <div class="asset-details-modal-inner">
        <div class="asset-details-main-main-section">
          ${renderImageSection()}
          ${renderInfoSection(hasWatermark, isDeepLinkAsset)}
        </div>
      </div>
    `;

    // Bind events
    bindEvents(onClose, client);

    // Restore video element if it was preserved
    if (savedVideoElement) {
      const newVideoContainer = modalOverlay.querySelector('#asset-details-video-player');
      if (newVideoContainer) {
        newVideoContainer.innerHTML = '';
        newVideoContainer.appendChild(savedVideoElement);
        newVideoContainer.style.display = 'flex';
      }
    }

    // Re-attach inline PDF viewer if it was preserved
    if (inlinePdfViewerInstance) {
      const pdfContainer = modalOverlay.querySelector('#asset-details-pdf-viewer-container');
      if (pdfContainer) pdfContainer.appendChild(inlinePdfViewerInstance);
    }

    // Inject buttons
    const leftButtonsContainer = modalOverlay.querySelector('#details-left-buttons');
    if (leftButtonsContainer) {
      leftButtonsContainer.innerHTML = '';

      const downloadBtn = createActionButton({
        config: BUTTON_CONFIGS.download,
        disabled: false,
        hasLoadingState: true,
        onClick: async () => {
          if (!populatedImage || !client || !watermarkRendition) return;
          try {
            await client.downloadAsset(populatedImage, watermarkRendition);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to download asset:', error);
          }
        },
      });
      downloadBtn.style.display = hasWatermark ? '' : 'none';
      leftButtonsContainer.appendChild(downloadBtn);

      // Share Button
      const shareBtn = createShareAssetButton({
        assetId: populatedImage?.assetId,
      });
      leftButtonsContainer.appendChild(shareBtn);
    }

    // Load ZIP contents asynchronously if this is a ZIP asset
    // Only fetch if we don't have cached data yet
    if (isZipAsset(populatedImage)) {
      if (!zipContentsLoaded && !cachedZipStructure) {
        zipContentsLoaded = true;
        loadZipContents(modalOverlay, populatedImage, (structureData) => {
          cachedZipStructure = structureData;
        });
      } else if (cachedZipStructure?.children) {
        // Bind toggle events when rendering from cache
        const zipTreeContent = modalOverlay?.querySelector('.zip-tree-content');
        bindTreeToggleEvents(zipTreeContent);
      }
    }
  };

  // Initial render
  render();
  modalRoot.appendChild(modalOverlay);

  // Subscribe to state changes
  unsubscribe = subscribe((state, prevState, updates) => {
    // Check if renditions became available (compare current vs previous state)
    const prevRenditions = prevState?.assetRenditionsCache?.[originalAssetId];
    const currRenditions = state?.assetRenditionsCache?.[originalAssetId];
    const renditionsNowAvailable = !prevRenditions?.items?.length && currRenditions?.items?.length;

    // If only renditions updated, try to patch the DOM in-place instead of a
    // full re-render. This prevents blinking caused by DOM destruction/recreation.
    if (updates.assetRenditionsCache !== undefined && Object.keys(updates).length === 1) {
      // Video assets — inject/update player without full re-render
      if (videoPlayerHandler && populatedImage && isVideo(populatedImage.format)) {
        const foundRendition = videoPlayerHandler.update();

        watermarkRendition = foundRendition;

        const downloadBtnContainer = modalOverlay?.querySelector('#details-left-buttons .action-button-container');
        if (downloadBtnContainer) {
          downloadBtnContainer.style.display = foundRendition ? '' : 'none';
        }
        return; // Skip full re-render
      }

      // ZIP assets — swap image src in-place without full re-render
      if (populatedImage && isZipAsset(populatedImage) && currRenditions) {
        const selectedRendition = selectPrioritizedRendition(currRenditions);
        if (selectedRendition && getMediaType(selectedRendition) === 'image') {
          const imagePlaceholder = modalOverlay?.querySelector('#asset-details-image-placeholder');
          const existingImg = imagePlaceholder?.querySelector('img');
          if (existingImg) {
            const src = getRenditionUrl(populatedImage.assetId, selectedRendition.name);
            if (existingImg.src !== src && !existingImg.src.endsWith(src)) {
              existingImg.src = src;
            }
          }
        }

        // Update watermark rendition for download button
        const foundWatermark = currRenditions.items?.find(
          (r) => r.name?.toLowerCase().startsWith('watermark'),
        );
        watermarkRendition = foundWatermark;
        const downloadBtnContainer = modalOverlay?.querySelector('#details-left-buttons .action-button-container');
        if (downloadBtnContainer) {
          downloadBtnContainer.style.display = foundWatermark ? '' : 'none';
        }
        return; // Skip full re-render
      }
    }

    const shouldRender = updates.assetRenditionsCache !== undefined
      || renditionsNowAvailable;

    if (shouldRender) {
      render(state);
    }
  });

  // Fetch metadata and renditions
  fetchMetadata(asset, render, () => {
    // Access denied (restricted brand or partner country) - close modal and show 403
    closeAssetDetails();
    window.location.href = '/403';
  }, prefetchedMetadata);
  fetchAssetRenditions?.(asset);
}

// Alias for compatibility
export const createAssetDetails = openAssetDetails;

export default {
  openAssetDetails,
  closeAssetDetails,
  createAssetDetails,
};
