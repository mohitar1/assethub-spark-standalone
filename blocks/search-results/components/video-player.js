/**
 * Video Player Component - Shared video injection logic
 */

import { getDynamicMediaClient } from '../clients/dynamicmedia-client.js';

/**
 * Inject video player into a container element
 * @param {HTMLElement} container - The container element to inject video into
 * @param {Object} asset - The asset object
 * @param {Object} renditions - The renditions object with items array
 * @param {Object} options - Optional configuration
 * @param {boolean} options.autoplay - Auto-play the video (default: false)
 * @param {boolean} options.loop - Loop the video (default: false)
 * @param {boolean} options.muted - Mute the video (default: false)
 * @param {boolean} options.showPoster - Show poster image (default: false)
 * @param {string} options.className - CSS class for video element
 * @returns {Object|null} - The video rendition that was injected, or null if none
 */
export function injectVideoPlayer(container, asset, renditions, options = {}) {
  if (!container || !asset || !renditions?.items) {
    return null;
  }

  const {
    autoplay = true,
    loop = false,
    muted = false,
    showPoster = false,
    className = '',
  } = options;

  // Only play watermark video
  const videoRendition = renditions.items.find(
    (r) => r.name?.toLowerCase().includes('watermark'),
  );

  if (!videoRendition) {
    // No watermark - hide container
    container.style.display = 'none';
    return null;
  }

  // Show video container
  container.style.display = 'flex';

  const assetName = asset.name || 'video.mp4';
  const videoUrl = `/api/adobe/assets/${asset.assetId}/renditions/${videoRendition.name}/as/${assetName}`;

  // Check if video already exists with same source
  const existingVideo = container.querySelector('video');
  const existingSource = existingVideo?.querySelector('source')?.src || '';

  if (existingVideo && existingSource.endsWith(videoUrl)) {
    return videoRendition;
  }

  // Determine MIME type
  let mimeType = videoRendition.format || asset.format || 'video/mp4';
  if (mimeType === '—' || !mimeType.includes('/')) {
    mimeType = 'video/mp4';
  }
  if (!mimeType.startsWith('video/')) {
    mimeType = `video/${mimeType}`;
  }

  // Get poster URL if requested
  let posterUrl = '';
  if (showPoster) {
    const dmClient = getDynamicMediaClient();
    posterUrl = dmClient?.getOptimizedDeliveryPreviewUrl?.(
      asset.assetId,
      asset.name,
      800,
    ) || '';
  }

  // Build video attributes
  const attrs = [];
  attrs.push('controls');
  attrs.push('playsinline');
  if (autoplay) attrs.push('autoplay');
  if (loop) attrs.push('loop');
  if (muted) attrs.push('muted');
  if (className) attrs.push(`class="${className}"`);
  if (posterUrl) attrs.push(`poster="${posterUrl}"`);

  // Inject video player
  container.innerHTML = `
    <video ${attrs.join(' ')} style="width: 100%; height: 100%; border-radius: 8px;">
      <source src="${videoUrl}" type="${mimeType}">
      Your browser does not support the video tag.
    </video>
  `;

  return videoRendition;
}

/**
 * Create a video player handler that manages injection and state updates
 * @param {Object} options - Configuration options
 * @param {HTMLElement} options.container - The container element for video
 * @param {Object} options.asset - The asset object
 * @param {Function} options.getRenditions - Function that returns current renditions from state
 * @param {Function} options.onRenditionFound - Optional callback when rendition is found
 * @param {Object} options.playerOptions - Options to pass to injectVideoPlayer
 * @returns {Object} - Handler object with inject and update methods
 */
export function createVideoPlayerHandler({
  container,
  asset,
  getRenditions,
  onRenditionFound,
  playerOptions = {},
}) {
  let currentRendition = null;

  const inject = () => {
    const renditions = getRenditions();
    const foundRendition = injectVideoPlayer(container, asset, renditions, playerOptions);

    if (foundRendition && foundRendition !== currentRendition) {
      currentRendition = foundRendition;
      if (onRenditionFound) {
        onRenditionFound(foundRendition);
      }
    }

    return foundRendition;
  };

  return {
    inject,
    update: inject, // Alias for clarity
    getCurrentRendition: () => currentRendition,
  };
}
