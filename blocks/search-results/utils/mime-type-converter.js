/**
 * MIME type to file extension converter
 */

const MIME_TO_EXTENSION = {
  // Images
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/tif': 'tif',
  'image/x-icon': 'ico',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',

  // Documents
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/rtf': 'rtf',
  'text/plain': 'txt',
  'text/csv': 'csv',

  // Videos
  'video/mp4': 'mp4',
  'video/mpeg': 'mpeg',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/webm': 'webm',
  'video/x-ms-wmv': 'wmv',
  'video/x-flv': 'flv',
  'video/x-m4v': 'm4v',
  'application/x-mpegURL': 'm3u8',

  // Audio
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'weba',

  // Archives
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
  'application/x-tar': 'tar',
  'application/gzip': 'gz',

  // Code / Data
  'application/json': 'json',
  'application/xml': 'xml',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',

  // Design files
  'application/postscript': 'eps',
  'image/vnd.adobe.photoshop': 'psd',
  'application/illustrator': 'ai',
  'image/x-adobe-dng': 'dng',
};

const EXTENSION_TO_MIME = Object.entries(MIME_TO_EXTENSION).reduce((acc, [mime, ext]) => {
  acc[ext] = mime;
  return acc;
}, {});

/**
 * Convert MIME type to file extension
 * @param {string} mimeType - MIME type
 * @returns {string} File extension (without dot) or empty string
 */
export function mimeTypeToExtension(mimeType) {
  if (!mimeType) return '';

  // Normalize MIME type
  const normalized = mimeType.toLowerCase().split(';')[0].trim();

  return MIME_TO_EXTENSION[normalized] || '';
}

/**
 * Convert file extension to MIME type
 * @param {string} extension - File extension (with or without dot)
 * @returns {string} MIME type or empty string
 */
export function extensionToMimeType(extension) {
  if (!extension) return '';

  // Remove leading dot if present
  const ext = extension.toLowerCase().replace(/^\./, '');

  return EXTENSION_TO_MIME[ext] || '';
}

/**
 * Get MIME type from filename
 * @param {string} filename - Filename
 * @returns {string} MIME type or empty string
 */
export function getMimeTypeFromFilename(filename) {
  if (!filename) return '';

  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';

  const ext = filename.substring(lastDot + 1).toLowerCase();
  return EXTENSION_TO_MIME[ext] || '';
}

/**
 * Check if MIME type is an image type
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isImageMimeType(mimeType) {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith('image/');
}

/**
 * Check if MIME type is a video type
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isVideoMimeType(mimeType) {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith('video/');
}

/**
 * Check if MIME type is an audio type
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isAudioMimeType(mimeType) {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith('audio/');
}

/**
 * Check if MIME type is a document type
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isDocumentMimeType(mimeType) {
  if (!mimeType) return false;
  const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats'];
  return docTypes.some((type) => mimeType.toLowerCase().startsWith(type));
}
