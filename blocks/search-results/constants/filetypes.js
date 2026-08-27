/**
 * File type helper constants and functions
 */

// Image MIME types
const IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/tif',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/x-adobe-dng',
  'image/vnd.adobe.photoshop',
];

// Video MIME types
const VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/x-m4v',
  'application/x-mpegURL',
];

// Audio MIME types
const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/x-m4a',
  'audio/webm',
  'audio/mp3',
];

// Document MIME types
const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/rtf',
  'text/plain',
  'text/csv',
];

// PDF MIME types (for preview)
const PDF_TYPES = [
  'application/pdf',
];

/**
 * Check if MIME type is an image
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isImage(mimeType) {
  if (!mimeType) return false;
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return IMAGE_TYPES.includes(normalized) || normalized.startsWith('image/');
}

/**
 * Check if MIME type is a video
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isVideo(mimeType) {
  if (!mimeType) return false;
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return VIDEO_TYPES.includes(normalized) || normalized.startsWith('video/');
}

/**
 * Check if MIME type is audio
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isAudio(mimeType) {
  if (!mimeType) return false;
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return AUDIO_TYPES.includes(normalized) || normalized.startsWith('audio/');
}

/**
 * Check if MIME type is a document
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isDocument(mimeType) {
  if (!mimeType) return false;
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return DOCUMENT_TYPES.includes(normalized);
}

/**
 * Check if MIME type is PDF (for preview)
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isPdfPreview(mimeType) {
  if (!mimeType) return false;
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return PDF_TYPES.includes(normalized);
}

/**
 * Check if MIME type can be previewed in browser
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
export function isPreviewable(mimeType) {
  return isImage(mimeType) || isVideo(mimeType) || isPdfPreview(mimeType);
}

/**
 * Get file type category from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} Category: 'image', 'video', 'audio', 'document', 'pdf', 'other'
 */
export function getFileTypeCategory(mimeType) {
  if (isImage(mimeType)) return 'image';
  if (isVideo(mimeType)) return 'video';
  if (isAudio(mimeType)) return 'audio';
  if (isPdfPreview(mimeType)) return 'pdf';
  if (isDocument(mimeType)) return 'document';
  return 'other';
}

/**
 * Get human-readable format label from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} Format label
 */
export function getFormatLabel(mimeType) {
  if (!mimeType) return 'Unknown';

  const normalized = mimeType.toLowerCase().split(';')[0].trim();

  const labels = {
    'image/jpeg': 'JPEG Image',
    'image/jpg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'image/svg+xml': 'SVG Vector',
    'image/tiff': 'TIFF Image',
    'image/avif': 'AVIF Image',
    'image/heic': 'HEIC Image',
    'image/vnd.adobe.photoshop': 'Photoshop',
    'application/pdf': 'PDF Document',
    'video/mp4': 'MP4 Video',
    'video/quicktime': 'QuickTime Video',
    'video/webm': 'WebM Video',
    'audio/mpeg': 'MP3 Audio',
    'audio/wav': 'WAV Audio',
  };

  return labels[normalized] || mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
}
