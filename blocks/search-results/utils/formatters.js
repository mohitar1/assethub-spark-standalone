/**
 * Formatting utility functions
 */

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === undefined || bytes === null) return '';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format file size (alias for formatBytes)
 * @param {number} bytes - Number of bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} Formatted string
 */
export const formatFileSize = formatBytes;

/**
 * Format date to locale string
 * @param {Date|string|number} date - Date to format
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    };

    return d.toLocaleDateString('en-US', defaultOptions);
  } catch {
    return '';
  }
}

/**
 * Format date as relative time (e.g. "3 days ago", "1 month ago")
 * @param {Date|string|number} date - Date to format
 * @param {string} [locale] - Locale for Intl.RelativeTimeFormat (default: document locale or 'en')
 * @returns {string} Relative time string or empty if invalid
 */
export function formatRelativeDate(date, locale) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);

    const loc = locale || (typeof document !== 'undefined' && document.documentElement?.lang) || 'en';
    const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });

    if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, 'second');
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
    if (Math.abs(diffHr) < 24) return rtf.format(-diffHr, 'hour');
    if (Math.abs(diffDay) < 30) return rtf.format(-diffDay, 'day');
    if (Math.abs(diffYear) < 1) return rtf.format(-diffMonth, 'month');
    return rtf.format(-diffYear, 'year');
  } catch {
    return '';
  }
}

/**
 * Format date with time
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date time string
 */
export function formatDateTime(date) {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Convert date to Unix epoch (seconds)
 * @param {Date|string} date - Date to convert
 * @returns {number|null} Epoch timestamp in seconds
 */
export function dateToEpoch(date) {
  if (!date) return null;

  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  } catch {
    return null;
  }
}

/**
 * Convert Unix epoch (seconds) to Date object
 * @param {number} epoch - Epoch timestamp in seconds
 * @returns {Date|null} Date object
 */
export function epochToDate(epoch) {
  if (!epoch) return null;

  try {
    return new Date(epoch * 1000);
  } catch {
    return null;
  }
}

/**
 * Convert epoch to Date object (alias)
 * @param {number} epoch - Epoch timestamp
 * @returns {Date|null} Date object
 */
export function epochToDateObject(epoch) {
  return epochToDate(epoch);
}

/**
 * Format category string (capitalize first letter of each word)
 * @param {string} category - Category string
 * @returns {string} Formatted category
 */
export function formatCategory(category) {
  if (!category) return '';

  return category
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format metadata value for display in uppercase
 * @param {string} value - Display value
 * @returns {string} Value as uppercase string, or empty string if falsy
 */
export function formatMetadataValueUc(value) {
  if (value === undefined || value === null) return '';
  const str = String(value).trim();
  return str ? str.toUpperCase() : '';
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension (without dot)
 */
export function getFileExtension(filename) {
  if (!filename) return '';

  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';

  return filename.substring(lastDot + 1);
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} [suffix='...'] - Suffix to add if truncated
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength, suffix = '...') {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (num === undefined || num === null) return '';
  return num.toLocaleString('en-US');
}

/**
 * Format duration in seconds to human readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format dimensions to human readable string
 * @param {{ width: number, height: number }} dimensions - Dimensions object
 * @returns {string} Formatted dimensions string
 */
export function formatDimensions(dimensions) {
  if (!dimensions || dimensions.width === 0 || dimensions.height === 0) return '';
  return `W: ${dimensions.width}  H: ${dimensions.height}`;
}

/**
 * Format format name (strip image/ and vnd.adobe. prefixes)
 * @param {string} format - Format string
 * @returns {string} Formatted format name
 */
export function formatFormatName(format) {
  if (!format) return '';
  return format.toUpperCase().replace('IMAGE/', '').replace('VND.ADOBE.', '');
}
