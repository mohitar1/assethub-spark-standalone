/**
 * MIME Type Mapper - Maps MIME types and file extensions to display types
 * Configuration loaded from configs.xlsx 'mime-type-mappings' sheet
 */

/**
 * Get MIME type mappings from configuration
 * @returns {Array} Array of mapping objects with type and values from spreadsheet
 */
function getMimeTypeMappings() {
  // Check if window exists (browser environment)
  if (typeof window === 'undefined') {
    return [];
  }

  // Get from window.SearchResultsConfig (loaded from configs['mime-type-mappings'].data)
  const mappings = window.SearchResultsConfig?.externalParams?.mimeTypeMappings;
  if (mappings && Array.isArray(mappings) && mappings.length > 0) {
    return mappings;
  }

  // Return empty array if no configuration (will use fallback formatting)
  return [];
}

/**
 * Extract file extension from filename or path
 * @param {string} filename - Filename or path
 * @returns {string} File extension (lowercase, without dot) or empty string
 */
function getFileExtension(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Normalize value for comparison (lowercase, trim, remove special chars)
 * @param {string} value - Value to normalize
 * @returns {string} Normalized value
 */
function normalizeValue(value) {
  if (!value) return '';
  return value.toLowerCase().trim();
}

/**
 * Check if a MIME type or extension matches any value in the list
 * @param {string} mimeType - MIME type to check (e.g., 'video/quicktime')
 * @param {string} extension - File extension to check (e.g., 'mov')
 * @param {Array<string>} values - Array of values to match against
 * @returns {boolean} True if match found
 */
function matchesValues(mimeType, extension, values) {
  if (!values || !Array.isArray(values)) return false;

  const normalizedMimeType = normalizeValue(mimeType);
  const normalizedExtension = normalizeValue(extension);

  return values.some((value) => {
    const normalizedValue = normalizeValue(value);

    // Check exact MIME type match
    if (normalizedMimeType && normalizedValue === normalizedMimeType) {
      return true;
    }

    // Check extension match
    if (normalizedExtension && normalizedValue === normalizedExtension) {
      return true;
    }

    // Check if MIME type starts with the value (e.g., 'image/' matches 'image/jpeg')
    if (normalizedMimeType && normalizedValue.endsWith('/')
        && normalizedMimeType.startsWith(normalizedValue)) {
      return true;
    }

    return false;
  });
}

/**
 * Map MIME type and filename to display type
 * @param {string} mimeType - MIME type (e.g., 'video/quicktime', 'image/jpeg')
 * @param {string} filename - Filename (e.g., 'video.mov', 'image.jpg')
 * @returns {string} Display type (e.g., 'QUICKTIME', 'IMAGE') or formatted MIME type as fallback
 */
export default function mapMimeTypeToDisplayType(mimeType, filename) {
  if (!mimeType && !filename) return 'Unknown';

  const extension = filename ? getFileExtension(filename) : '';
  const mappings = getMimeTypeMappings();

  // Find first matching mapping
  const match = mappings.find((mapping) => matchesValues(mimeType, extension, mapping.values));
  if (match) {
    return match.type;
  }

  // Fallback: use file extension if available (preferred for long MIME types)
  if (extension) {
    return extension.toUpperCase();
  }

  // Format the MIME type nicely if no extension and no mapping match
  if (mimeType) {
    const parts = mimeType.split('/');
    const subtype = parts.length > 1 ? parts[1] : parts[0];
    return subtype.toUpperCase()
      .replace(/^VND\.OPENXMLFORMATS-OFFICEDOCUMENT\.\w+\./, '')
      .replace(/^VND\.MS-/, '')
      .replace('VND.ADOBE.', '')
      .replace('X-', '');
  }

  return 'Unknown';
}
