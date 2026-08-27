/**
 * ZIP Media Handler for Asset Details
 * Handles media rendition selection and rendering for ZIP assets
 */

/**
 * Get rendition URL in the correct format
 * @param {string} assetId - Asset ID
 * @param {string} renditionName - Name of the rendition
 * @returns {string} URL for the rendition
 */
export function getRenditionUrl(assetId, renditionName) {
  return `/api/adobe/assets/${assetId}/renditions/${renditionName}/as/${renditionName}`;
}

/**
 * Select the appropriate rendition based on priority order
 * @param {Array} renditions - Array of renditions
 * @returns {Object} Selected rendition based on priority
 */
export function selectPrioritizedRendition(renditions) {
  if (!renditions?.items?.length) return null;

  // Filter out original and structure.json renditions
  const filteredRenditions = renditions.items.filter((r) => !r.name?.toLowerCase().includes('original')
    && !r.name?.toLowerCase().endsWith('structure.json'));

  // Priority order
  const watermarkVideo = filteredRenditions.find((r) => r.name?.toLowerCase() === 'watermark-video.mp4');
  if (watermarkVideo) return watermarkVideo;

  const webRendition = filteredRenditions.find((r) => r.name?.toLowerCase() === 'cq5dam.web.1280.1280');
  if (webRendition) return webRendition;

  const zipPreview = filteredRenditions.find((r) => r.name?.toLowerCase() === 'zip-preview');
  if (zipPreview) return zipPreview;

  // Return first available rendition if none of the prioritized ones found
  return filteredRenditions[0] || null;
}

/**
 * Determine media type from rendition format/mimeType
 * @param {Object} rendition - The rendition object
 * @returns {string} Media type ('audio', 'video', 'image', or 'other')
 */
export function getMediaType(rendition) {
  if (!rendition?.format) return 'other';

  const format = rendition.format.toLowerCase();

  // Check mimeType first
  if (format.startsWith('audio/')) {
    return 'audio';
  }
  if (format.startsWith('video/')) {
    return 'video';
  }
  if (format.startsWith('image/')) {
    return 'image';
  }

  return 'other';
}

/**
 * Render media content based on type
 * @param {Object} rendition - The selected rendition
 * @param {string} mediaType - Type of media ('audio', 'video', 'image', 'other')
 * @param {Object} asset - The asset object
 * @param {Object} properties - Additional properties (e.g., height)
 * @returns {string} HTML string for media content
 */
export function renderMediaContent(rendition, mediaType, asset, properties = {}) {
  if (!rendition || !asset?.assetId) return '';

  const src = getRenditionUrl(asset.assetId, rendition.name);
  const mimeType = rendition.format;

  switch (mediaType) {
    case 'audio':
      return `
        <div class="audio-container" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
          <audio controls controlsList="nodownload">
            <source src="${src}" type="${mimeType}">
          </audio>
        </div>
      `;
    case 'video': {
      const height = properties.videoHeight;
      if (height) {
        return `
          <video class="ui centered image cmp-image cmp-image--max-height"
                 style="width: 100%; height: 100%; object-fit: contain;"
                 autoplay muted loop controls controlsList="nodownload">
            <source src="${src}" type="video/webm"/>
            <source src="${src}" type="video/mp4"/>
          </video>
        `;
      }
      return `
        <video class="ui centered image cmp-image"
               style="width: 100%; height: 100%; object-fit: contain;"
               autoplay muted loop controls controlsList="nodownload">
          <source src="${src}" type="video/webm"/>
          <source src="${src}" type="video/mp4"/>
        </video>
      `;
    }
    case 'image': {
      const maxHeight = properties.imageMaxHeight;
      if (maxHeight) {
        return `
          <img class="ui centered image cmp-image
                      cmp-image--max-height
                      cmp-details-image__image
                      cmp-details-image__image--max-height"
               src="${src}"
               alt="zip-file-img"
               style="width: 100%; height: 100%; object-fit: contain;"/>
        `;
      }
      return `
        <img class="ui centered image cmp-image
                    cmp-details-image__image"
             src="${src}"
             alt="zip-file-img"
             style="width: 100%; height: 100%; object-fit: contain;"/>
      `;
    }
    default:
      // For default case, return empty string since we'll use the existing picture tag logic
      return '';
  }
}
