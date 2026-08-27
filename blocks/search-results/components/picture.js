/**
 * Picture Component - Optimized image loading
 * Aligned with React Picture.tsx component
 */

/**
 * Create an optimized picture element
 * @param {Object} options - Picture options
 * @returns {HTMLElement} Picture element
 */
export function createPicture(options) {
  const {
    asset,
    width = 350,
    className = '',
    eager = false,
    fetchPriority = 'auto',
    sizes = null,
  } = options;

  const picture = document.createElement('picture');

  // Get asset info
  const { assetId } = asset;
  const name = asset.name || '';
  const fileName = encodeURIComponent(name.replace(/\.[^/.]+$/, '') || 'thumbnail');

  // Calculate display dimensions (matching React Picture component)
  const displayWidth = Math.min(width, 1200); // Allow up to 1200px for modal/large previews
  const sizes2x = Math.min(displayWidth * 2, 1200); // 2x for retina, cap at 1200px
  const displayHeight = Math.round(displayWidth / 1.65);

  // Default sizes based on typical layout if not provided
  let imageSizes = sizes;
  if (!imageSizes) {
    if (width <= 350) {
      imageSizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 350px'; // Grid cards
    } else if (width <= 700) {
      imageSizes = '(max-width: 768px) 100vw, 700px'; // List/detail view
    } else {
      imageSizes = '(max-width: 1200px) 100vw, 1200px'; // Full-width display
    }
  }

  // Create webp source with 1x/2x srcSet
  const sourceWebp = document.createElement('source');
  sourceWebp.type = 'image/webp';
  sourceWebp.srcset = `/api/adobe/assets/${assetId}/as/${fileName}.webp?width=${displayWidth} 1x, /api/adobe/assets/${assetId}/as/${fileName}.webp?width=${sizes2x} 2x`;
  sourceWebp.sizes = imageSizes;

  // Create jpg source with 1x/2x srcSet
  const sourceJpg = document.createElement('source');
  sourceJpg.type = 'image/jpg';
  sourceJpg.srcset = `/api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${displayWidth} 1x, /api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${sizes2x} 2x`;
  sourceJpg.sizes = imageSizes;

  // Create img element
  const img = document.createElement('img');
  img.className = className;
  img.loading = eager ? 'eager' : 'lazy';
  img.fetchPriority = fetchPriority;
  img.src = `/api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${displayWidth}`;
  img.alt = asset.alt || asset.name || '';
  img.width = displayWidth;
  img.height = displayHeight;

  img.onerror = () => {
    picture.classList.add('missing');
  };

  picture.appendChild(sourceWebp);
  picture.appendChild(sourceJpg);
  picture.appendChild(img);

  return picture;
}

/**
 * Render picture HTML string (for use in template literals)
 * @param {Object} options - Picture options
 * @returns {string} HTML string
 */
export function renderPictureHTML(options) {
  const {
    asset,
    width = 350,
    className = '',
    eager = false,
    fetchPriority = 'auto',
    sizes = null,
  } = options;

  // Get asset info
  const { assetId } = asset;
  const name = asset.name || '';
  const fileName = encodeURIComponent(name.replace(/\.[^/.]+$/, '') || 'thumbnail');

  // Calculate display dimensions (matching React Picture component)
  const displayWidth = Math.min(width, 1200);
  const sizes2x = Math.min(displayWidth * 2, 1200);
  const displayHeight = Math.round(displayWidth / 1.65);

  // Default sizes based on typical layout if not provided
  let imageSizes = sizes;
  if (!imageSizes) {
    if (width <= 350) {
      imageSizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 350px';
    } else if (width <= 700) {
      imageSizes = '(max-width: 768px) 100vw, 700px';
    } else {
      imageSizes = '(max-width: 1200px) 100vw, 1200px';
    }
  }

  const altText = asset.alt || asset.name || '';

  return `<picture>
    <source
      type="image/webp"
      srcset="/api/adobe/assets/${assetId}/as/${fileName}.webp?width=${displayWidth} 1x, /api/adobe/assets/${assetId}/as/${fileName}.webp?width=${sizes2x} 2x"
      sizes="${imageSizes}"
    >
    <source
      type="image/jpg"
      srcset="/api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${displayWidth} 1x, /api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${sizes2x} 2x"
      sizes="${imageSizes}"
    >
    <img
      class="${className}"
      loading="${eager ? 'eager' : 'lazy'}"
      fetchpriority="${fetchPriority}"
      alt="${altText}"
      width="${displayWidth}"
      height="${displayHeight}"
      src="/api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${displayWidth}"
      onerror="this.parentElement.classList.add('missing')"
    >
  </picture>`;
}

/**
 * Create a simple image element (not picture)
 * @param {Object} options - Image options
 * @returns {HTMLImageElement} Image element
 */
export function createImage(options) {
  const {
    asset,
    width = 350,
    className = '',
    eager = false,
  } = options;

  const img = document.createElement('img');
  img.className = className;

  // Get asset info
  const { assetId } = asset;
  const name = asset.name || '';
  const fileName = encodeURIComponent(name.replace(/\.[^/.]+$/, '') || 'thumbnail');

  // Calculate display width (matching React Picture component)
  const displayWidth = Math.min(width, 1200);

  img.src = `/api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${displayWidth}`;
  img.alt = asset.alt || asset.name || '';
  img.loading = eager ? 'eager' : 'lazy';

  img.onerror = () => {
    img.classList.add('missing');
  };

  return img;
}
