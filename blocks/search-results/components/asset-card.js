/* eslint-disable import/no-cycle, import/prefer-default-export */
/**
 * Asset Card Component - Individual asset display in grid or list view
 */

import { getDynamicMediaClient } from '../clients/dynamicmedia-client.js';
import { formatMetadataValueUc, getFileExtension } from '../utils/formatters.js';
import { EAGER_LOAD_IMAGE_COUNT } from '../constants/images.js';
import { createPicture } from './picture.js';
import { createActionButton, BUTTON_CONFIGS } from './action-button.js';
import { createShareAssetButton } from '../../../scripts/share/share-asset-button.js';
import { getAddToCollectionOverlayHTML, attachAddToCollectionOverlayListener } from '../utils/add-to-collection-utils.js';
import { buildAssetDetailsUrl } from '../../../scripts/asset-id-utils.js';
import { getState, subscribe } from '../search-results.js';
import { isZipAsset, getAssetWithOriginalOnlyForZip } from '../utils/zip-helper.js';
import {
  selectPrioritizedRendition, getMediaType, getRenditionUrl,
} from './asset-details/zip-media-handler.js';
import { openDownloadRenditionsModal } from './download-renditions/download-renditions-modal.js';

/**
 * Create an asset card element
 * @param {Object} options - Card options
 * @returns {HTMLElement} Card element
 */
export function createAssetCard(options) {
  const {
    image,
    viewMode,
    isSelected,
    expandAllDetails = true,
    index = 0,
    // Metadata labels for localization
    sizeLabel = 'SIZE',
    typeLabel = 'TYPE',
    fileExtLabel = 'FILE EXT',
    viewLargerImageLabel = 'Preview',
    downloadLabel = 'Download',
    addToCartLabel = 'Add To Cart',
    removeFromCartLabel = 'Remove From Cart',
    cartAssetItems = [],
    onAddToCart,
    onRemoveFromCart,
    onCardDetailClick,
    onPreviewClick,
    onCheckboxChange,
    fetchAssetRenditions,
  } = options;

  const client = getDynamicMediaClient();
  const containerClass = `asset-card-view-${viewMode}`;
  const innerClass = `asset-card-view-${viewMode}-inner`;
  const isInCart = cartAssetItems.some((item) => item.assetId === image.assetId);

  // Build the asset details URL for real link support (enables "Open in New Tab")
  // Include filename in URL for identification in browser address bar
  const assetDetailsUrl = buildAssetDetailsUrl(image.assetId, image.name);

  // Create card element
  const card = document.createElement('div');
  card.className = containerClass;
  card.id = image.assetId;

  // Build metadata grid (always include, visibility controlled by CSS class)
  const metadataGridHTML = `
    <div class="product-meta-grid${expandAllDetails ? '' : ' hidden'}">
      <div class="product-meta-item">
        <span class="product-meta-label custom-metadata-label">${sizeLabel}</span>
        <span class="product-meta-value custom-metadata-value">${image.formattedSize || ''}</span>
      </div>
      <div class="product-meta-item">
        <span class="product-meta-label custom-metadata-label">${typeLabel}</span>
        <span class="product-meta-value custom-metadata-value">${formatMetadataValueUc(image.formatLabel)}</span>
      </div>
      <div class="product-meta-item">
        <span class="product-meta-label custom-metadata-label">${fileExtLabel}</span>
        <span class="product-meta-value custom-metadata-value">${formatMetadataValueUc(getFileExtension(image.name))}</span>
      </div>
    </div>
  `;

  // Title container tag (h3 for grid, div for list - the <a> goes inside)
  const titleContainerTag = viewMode === 'grid' ? 'h3' : 'div';

  // Button wrappers
  const firstWrapper = viewMode === 'grid' ? 'left-buttons-wrapper' : 'top-buttons-wrapper';
  const secondWrapper = viewMode === 'grid' ? 'right-buttons-wrapper' : 'bottom-buttons-wrapper';

  // Build card HTML
  card.innerHTML = `
    <div class="${innerClass}">
      <div class="image-wrapper">
        <input type="checkbox" class="search-results-checkbox" ${isSelected ? 'checked' : ''} />
        <button class="image-preview-button" data-tooltip="${viewLargerImageLabel}" data-tooltip-position="left" aria-label="${viewLargerImageLabel}">
          <svg viewBox="0 0 256.001 256.001" xmlns="http://www.w3.org/2000/svg">
            <path d="M159.997 116a12 12 0 0 1-12 12h-20v20a12 12 0 0 1-24 0v-20h-20a12 12 0 0 1 0-24h20V84a12 12 0 0 1 24 0v20h20a12 12 0 0 1 12 12Zm72.48 116.482a12 12 0 0 1-16.971 0l-40.679-40.678a96.105 96.105 0 1 1 16.972-16.97l40.678 40.678a12 12 0 0 1 0 16.97Zm-116.48-44.486a72 72 0 1 0-72-72 72.081 72.081 0 0 0 72 72Z" />
          </svg>
        </button>

        ${getAddToCollectionOverlayHTML(image)}
      </div>

        <div class="product-info-container">
          <div class="product-info">
            <div class="product-title-section">
              <${titleContainerTag} class="product-title">
                <a href="${assetDetailsUrl}" class="product-title-link">${image.title || ''}</a>
              </${titleContainerTag}>
            </div>
            ${metadataGridHTML}
          </div>
        </div>

      <div class="product-actions">
        <div class="${firstWrapper}">
        </div>
        <div class="${secondWrapper}">
        </div>
      </div>
    </div>
  `;

  // Get image wrapper
  const imageWrapper = card.querySelector('.image-wrapper');

  // Add picture wrapped in anchor for "Open in New Tab" support
  if (imageWrapper && client) {
    const pictureElement = createPicture({
      asset: image,
      width: 350,
      className: 'image-container',
      eager: index < EAGER_LOAD_IMAGE_COUNT,
      fetchPriority: index < EAGER_LOAD_IMAGE_COUNT ? 'high' : 'auto',
    });

    // Wrap picture in anchor tag to enable native "Open in New Tab" context menu
    const imageLink = document.createElement('a');
    imageLink.href = assetDetailsUrl;
    imageLink.className = 'image-link';
    imageLink.appendChild(pictureElement);
    imageWrapper.appendChild(imageLink);

    // For ZIP assets, update the <picture> sources to use the rendition image
    // once renditions are available (mirrors the asset details view behavior).
    // We keep the <picture> wrapper intact so CSS sizing rules still apply.
    if (isZipAsset(image)) {
      const swapToRenditionImage = (renditions) => {
        const selectedRendition = selectPrioritizedRendition(renditions);
        if (selectedRendition && getMediaType(selectedRendition) === 'image') {
          const src = getRenditionUrl(image.assetId, selectedRendition.name);
          const picture = imageLink.querySelector('picture');
          if (picture) {
            // Remove <source> elements so the browser uses the <img> src directly
            picture.querySelectorAll('source').forEach((s) => s.remove());
            // Clear 'missing' class that may have been set by the original
            // optimized-delivery onerror (ZIP assets typically lack that rendition)
            picture.classList.remove('missing');
            const img = picture.querySelector('img');
            if (img) {
              img.onerror = () => picture.classList.add('missing');
              img.onload = () => picture.classList.remove('missing');
              img.srcset = '';
              img.src = src;
              img.alt = image.title || image.name || 'zip-file-img';
            }
          }
        }
      };

      // Check if renditions are already cached
      const cachedZipRenditions = getState().assetRenditionsCache?.[image.assetId];
      if (cachedZipRenditions) {
        swapToRenditionImage(cachedZipRenditions);
      } else {
        // Subscribe and swap once renditions arrive
        const unsubZip = subscribe((newState, prevState) => {
          const newRenditions = (newState.assetRenditionsCache || {})[image.assetId];
          const prevRenditions = (prevState.assetRenditionsCache || {})[image.assetId];
          if (newRenditions && newRenditions !== prevRenditions) {
            swapToRenditionImage(newRenditions);
            unsubZip();
          }
        });
      }
    }

    // Handle clicks - normal click opens modal, middle-click/ctrl+click uses native link
    imageLink.addEventListener('click', (e) => {
      // Allow middle-click and ctrl/cmd+click to use native link behavior
      if (e.button === 1 || e.ctrlKey || e.metaKey) {
        return;
      }
      e.preventDefault();
      onCardDetailClick(image, e);
    });
  }

  // Title link - allow middle-click/right-click for native "Open in New Tab" behavior
  const titleLink = card.querySelector('.product-title-link');
  titleLink.addEventListener('click', (e) => {
    // Allow middle-click (button 1) and ctrl/cmd+click to use native link behavior
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      return; // Let the browser handle it (opens in new tab)
    }
    e.preventDefault();
    onCardDetailClick(image, e);
  });

  const previewBtn = card.querySelector('.image-preview-button');
  previewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onPreviewClick(image, e);
  });

  const checkbox = card.querySelector('.search-results-checkbox');
  checkbox.addEventListener('click', (e) => e.stopPropagation());
  checkbox.addEventListener('change', (e) => {
    onCheckboxChange(image.assetId, e.target.checked);
  });

  // Add to collection overlay
  const collectionOverlay = card.querySelector('.add-to-collection-overlay');
  attachAddToCollectionOverlayListener(collectionOverlay, image, client);

  const createCartBtn = () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `add-to-cart-btn ${isInCart ? 'remove-from-cart' : ''}`;
    btn.textContent = isInCart ? removeFromCartLabel : addToCartLabel;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('remove-from-cart')) {
        onRemoveFromCart?.(image);
      } else {
        onAddToCart?.(image, e);
      }
    });
    return btn;
  };

  // Download primary button (grid: left-buttons-wrapper, list: bottom-buttons-wrapper below share)
  const createDownloadPrimaryBtn = () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'primary-button';
    btn.dataset.action = 'download-renditions';
    btn.textContent = downloadLabel;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cachedRenditionsForDownload = getState().assetRenditionsCache?.[image.assetId]
        || image.renditions;
      const assetForDownload = getAssetWithOriginalOnlyForZip(
        image,
        cachedRenditionsForDownload,
      );
      openDownloadRenditionsModal(assetForDownload);
    });
    return btn;
  };

  const secondWrapperEl = card.querySelector(`.${secondWrapper}`);
  if (secondWrapperEl) {
    let watermarkRendition = null;

    // Create download preview action button (hidden until watermark rendition is confirmed)
    const downloadBtn = createActionButton({
      config: BUTTON_CONFIGS.download,
      disabled: false,
      hasLoadingState: true,
      onClick: async () => {
        if (!image || !client || !watermarkRendition) return;

        try {
          await client.downloadAsset(image, watermarkRendition);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to download asset:', error);
        }
      },
    });
    downloadBtn.style.display = 'none';

    // Show/hide button based on watermark rendition availability
    const updateDownloadButtonVisibility = (renditions) => {
      watermarkRendition = renditions?.items?.find(
        (r) => r.name?.toLowerCase().startsWith('watermark'),
      );
      downloadBtn.style.display = watermarkRendition ? '' : 'none';
    };

    // Check if renditions are already cached
    const currentState = getState();
    const cachedRenditions = currentState.assetRenditionsCache?.[image.assetId];
    if (cachedRenditions) {
      updateDownloadButtonVisibility(cachedRenditions);
    }

    // Subscribe to state changes to show button when renditions arrive.
    // Self-unsubscribes once renditions are received — they won't change after
    // caching, so a one-shot listener avoids leaking subscriptions as cards are
    // created and destroyed during search/scroll.
    let unsubscribe;
    if (!cachedRenditions) {
      unsubscribe = subscribe((newState, prevState) => {
        const newRenditions = (newState.assetRenditionsCache || {})[image.assetId];
        const prevRenditions = (prevState.assetRenditionsCache || {})[image.assetId];

        if (newRenditions && newRenditions !== prevRenditions) {
          updateDownloadButtonVisibility(newRenditions);
          unsubscribe();
        }
      });
    }

    // Lazy-load renditions: only fetch when the card scrolls into view.
    // This avoids firing requests for off-screen cards and eliminates
    // redundant calls caused by rapid re-renders during search.
    if (!cachedRenditions && fetchAssetRenditions) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            obs.disconnect();
            // Re-check cache — another card may have triggered the fetch
            // while this card was waiting to enter the viewport.
            const latest = getState().assetRenditionsCache?.[image.assetId];
            if (!latest) {
              fetchAssetRenditions(image);
            } else {
              updateDownloadButtonVisibility(latest);
              if (unsubscribe) unsubscribe();
            }
          }
        });
      }, { rootMargin: '200px' }); // start fetching slightly before visible
      observer.observe(card);
    }

    const shareBtn = createShareAssetButton({ assetId: image.assetId });

    if (viewMode === 'grid') {
      const firstWrapperEl = card.querySelector(`.${firstWrapper}`);
      if (firstWrapperEl) {
        firstWrapperEl.appendChild(createCartBtn());
        firstWrapperEl.appendChild(downloadBtn);
        firstWrapperEl.appendChild(shareBtn);
      }
      secondWrapperEl.appendChild(createDownloadPrimaryBtn());
    } else {
      secondWrapperEl.insertBefore(createCartBtn(), secondWrapperEl.firstChild);
      secondWrapperEl.insertBefore(downloadBtn, secondWrapperEl.firstChild.nextSibling);
      secondWrapperEl.insertBefore(shareBtn, downloadBtn.nextSibling);
      secondWrapperEl.appendChild(createDownloadPrimaryBtn());
    }
  }

  return card;
}
