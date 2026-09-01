/**
 * Shared asset transformation utilities for both React and EDS blocks
 * Includes ContentAI response parsing and asset transformation
 *
 * NOTE: This maps the Adobe-internal Content Hub schema (standard namespaces
 * dc:, repo:, xcm:, pur:, tiff:, exif:, illustrator:). It intentionally does
 * NOT reference any customer-proprietary metadata namespace.
 */

import mapMimeTypeToDisplayType from '../blocks/search-results/utils/mime-type-mapper.js';
import { normalizeAssetId } from './asset-id-utils.js';

// ============================================================
// ContentAI Response Parser
// ============================================================

// Session storage key for hidden value mappings
const HIDDEN_MAPPINGS_STORAGE_KEY = 'spark-hidden-value-mappings';

// Expiration time for hidden mappings cache (1 hour in milliseconds)
const HIDDEN_MAPPINGS_EXPIRATION_MS = 60 * 60 * 1000;

// In-memory cache for performance (avoids repeated JSON.parse)
let cachedHiddenMappings = null;

/**
 * Get hidden value mappings from sessionStorage (with in-memory caching and expiration)
 * @returns {Object} Mapping of { facetKey: { rawValue: displayName } }
 */
function getHiddenMappingsFromStorage() {
  if (cachedHiddenMappings !== null) {
    return cachedHiddenMappings;
  }

  try {
    const data = sessionStorage.getItem(HIDDEN_MAPPINGS_STORAGE_KEY);
    if (!data) {
      cachedHiddenMappings = {};
      return cachedHiddenMappings;
    }

    const parsed = JSON.parse(data);

    // Check if data has expired
    // eslint-disable-next-line no-underscore-dangle
    if (parsed._timestamp) {
      // eslint-disable-next-line no-underscore-dangle
      const age = Date.now() - parsed._timestamp;
      if (age > HIDDEN_MAPPINGS_EXPIRATION_MS) {
        // eslint-disable-next-line no-console
        console.log('[AssetTransformers] Hidden mappings cache expired, clearing...');
        sessionStorage.removeItem(HIDDEN_MAPPINGS_STORAGE_KEY);
        cachedHiddenMappings = {};
        return cachedHiddenMappings;
      }
    }

    // Remove internal _timestamp key from returned mappings
    // eslint-disable-next-line no-underscore-dangle
    const { _timestamp, ...mappings } = parsed;
    cachedHiddenMappings = mappings;
    return cachedHiddenMappings;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[AssetTransformers] Failed to read hidden mappings from sessionStorage:', e);
    cachedHiddenMappings = {};
    return cachedHiddenMappings;
  }
}

/**
 * Save hidden value mappings to sessionStorage and update cache
 * @param {Object} mappings - Hidden value mappings
 */
function saveHiddenMappingsToStorage(mappings) {
  try {
    // Add timestamp for expiration check
    const dataToStore = {
      ...mappings,
      _timestamp: Date.now(),
    };
    sessionStorage.setItem(HIDDEN_MAPPINGS_STORAGE_KEY, JSON.stringify(dataToStore));
    cachedHiddenMappings = mappings;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[AssetTransformers] Failed to save hidden mappings to sessionStorage:', e);
  }
}

/**
 * Clear hidden value mappings from sessionStorage and cache
 * Call this when you need to force a refresh of the mappings
 */
export function clearHiddenValueMappings() {
  try {
    sessionStorage.removeItem(HIDDEN_MAPPINGS_STORAGE_KEY);
    cachedHiddenMappings = null;
    // eslint-disable-next-line no-console
    console.log('[AssetTransformers] Hidden value mappings cleared');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[AssetTransformers] Failed to clear hidden mappings:', e);
  }
}

/**
 * Get the hidden value mappings lookup
 * @returns {Object} Mapping of { facetKey: { rawValue: displayName } }
 */
export function getHiddenValueMappings() {
  return getHiddenMappingsFromStorage();
}

/**
 * Look up display name for a facet value
 * @param {string} facetKey - Facet key
 * @param {string} rawValue - Raw value
 * @returns {string|null} Display name or null if not found
 */
export function lookupHiddenDisplayName(facetKey, rawValue) {
  const mappings = getHiddenMappingsFromStorage();
  return mappings[facetKey]?.[rawValue] || null;
}

/**
 * Convert ISO date string to formatted date string
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date string
 */
function formatDateFromISO(isoDate) {
  if (!isoDate) return 'N/A';
  try {
    const date = new Date(isoDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return 'N/A';
  }
}

// Helper function to format file size
function formatFileSize(bytes, decimalPoint = 2) {
  if (bytes === undefined || bytes === null) return 'N/A';

  let numericBytes;
  if (typeof bytes === 'string') {
    const cleaned = bytes.trim();
    if (cleaned === '') return 'N/A';
    const parsed = Number(cleaned);
    if (Number.isNaN(parsed)) return 'N/A';
    numericBytes = parsed;
  } else {
    numericBytes = bytes;
  }

  if (!Number.isFinite(numericBytes) || numericBytes < 0) return 'N/A';
  if (numericBytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimalPoint < 0 ? 0 : decimalPoint;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(numericBytes) / Math.log(k));
  const scaled = numericBytes / (k ** i);
  return `${parseFloat(scaled.toFixed(dm))} ${sizes[i]}`;
}

// Helper function to format date from epoch time
function formatDate(epochTime) {
  if (!epochTime) return '';

  // Convert epoch time to milliseconds if it's in seconds
  const timestamp = typeof epochTime === 'string' ? parseInt(epochTime, 10) : epochTime;
  // eslint-disable-next-line no-nested-ternary
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);

  // Check if date is valid
  if (Number.isNaN(date.getTime())) return '';

  const months = [
    'Jan.',
    'Feb.',
    'Mar.',
    'Apr.',
    'May',
    'Jun.',
    'Jul.',
    'Aug.',
    'Sep.',
    'Oct.',
    'Nov.',
    'Dec.',
  ];

  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

// Safe extraction helpers
function safeStringField(dataJson, key, fallback = 'N/A') {
  if (!dataJson) return fallback;
  const value = dataJson[key];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  if (value && typeof value === 'object') return 'ERROR';
  return fallback;
}

/**
 * Extract value from keywords array (ContentAI format)
 * Applies two transformations:
 * 1. Split by ':' and take the part after colon (if exists)
 * 2. Split by ' / ' and take the last part
 * @param {Array} keywords - Array of keyword objects or plain strings
 * @returns {string}
 */
export function extractKeywords(keywords) {
  if (!Array.isArray(keywords)) return '';
  const values = keywords
    .filter((item) => {
      // Allow plain strings
      if (typeof item === 'string') return true;
      // Allow objects with value property, filtering by language
      if (!item || typeof item !== 'object' || !('value' in item)) return false;
      const lang = item['@lang'];
      return !lang || lang === 'en';
    })
    .map((item) => {
      let value;
      if (typeof item === 'object' && item.value) {
        value = item.value;
      } else if (typeof item === 'string') {
        value = item;
      } else {
        return null;
      }

      // Step 1: Split by ':' and take the part after colon (if exists)
      const colonParts = value.split(':');
      const afterColon = colonParts.length > 1 ? colonParts.slice(1).join(':') : value;

      // Step 2: Split by ' / ' and take the last part
      const slashParts = afterColon.split(' / ');
      return slashParts[slashParts.length - 1].trim();
    })
    .filter(Boolean);
  return values.length > 0 ? values.join(', ') : '';
}

// Helper functions for populateAssetFromMetadata
function safeMetadataStringField(
  repositoryMetadata,
  assetMetadata,
  key,
  fallback = 'N/A',
) {
  // Try assetMetadata first, then repositoryMetadata
  const assetValue = assetMetadata?.[key];
  if (typeof assetValue === 'string') return assetValue;

  const repoValue = repositoryMetadata?.[key];
  if (typeof repoValue === 'string') return repoValue;

  return fallback;
}

function safeMetadataDateField(
  repositoryMetadata,
  assetMetadata,
  key,
) {
  const assetValue = assetMetadata?.[key];
  const repoValue = repositoryMetadata?.[key];

  const value = assetValue || repoValue;
  if (typeof value === 'number') {
    return formatDate(value);
  }
  if (typeof value === 'string') {
    // Numeric string (epoch in seconds or ms)
    if (/^\d+$/.test(value)) {
      return formatDate(parseInt(value, 10));
    }
    // ISO string -> parse to ms
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) {
      return formatDate(ms);
    }
  }
  return 'N/A';
}

/**
 * Transforms metadata into an Asset object.
 * Maps only standard Content Hub namespaces (dc:, repo:, xcm:, pur:, tiff:,
 * exif:, illustrator:). Custom business-taxonomy fields are not mapped and are
 * no longer surfaced in the UI.
 * @param metadata - The metadata object from Dynamic Media
 * @returns Asset object with populated properties from metadata
 */
export function populateAssetFromMetadata(metadata) {
  const { repositoryMetadata, assetMetadata } = metadata;

  // Convert metadata objects to generic records for helper functions
  const repoMeta = repositoryMetadata;
  const assetMeta = assetMetadata;

  const name = safeMetadataStringField(repoMeta, assetMeta, 'repo:name');

  // Technical info (standard exif/tiff namespaces)
  const imageHeight = assetMeta?.['exif:PixelYDimension'] || 'N/A';
  const imageWidth = assetMeta?.['exif:PixelXDimension'] || 'N/A';
  const orientation = assetMeta?.['tiff:Orientation'] || 'N/A';
  const resolution = imageWidth && imageHeight && imageWidth !== 'N/A' && imageHeight !== 'N/A'
    ? `${imageWidth} x ${imageHeight}` : 'N/A';

  // File size formatting
  const formattedSize = repoMeta?.['repo:size'] ? formatFileSize(repoMeta['repo:size']) : 'N/A';

  // Keywords (standard xcm namespace)
  const xcmKeywords = extractKeywords(assetMeta?.['xcm:keywords']);

  const isExpired = new Date(
    safeMetadataStringField(repoMeta, assetMeta, 'pur:expirationDate'),
  ).getTime() < Date.now();
  const expired = isExpired.toString();

  return {
    alt: safeMetadataStringField(repoMeta, assetMeta, 'dc:title') || name,
    createDate: safeMetadataDateField(repoMeta, assetMeta, 'repo:createDate'),
    createdBy: safeMetadataStringField(repoMeta, assetMeta, 'repo:createdBy'),
    description: safeMetadataStringField(repoMeta, assetMeta, 'dc:description'),
    expirationDate: safeMetadataDateField(repoMeta, assetMeta, 'pur:expirationDate'),
    expired,
    format: safeMetadataStringField(repoMeta, assetMeta, 'dc:format'),
    formatType: safeMetadataStringField(repoMeta, assetMeta, 'dc:format:type'),
    formatLabel: mapMimeTypeToDisplayType(
      safeMetadataStringField(repoMeta, assetMeta, 'dc:format'),
      name,
    ),
    formattedSize,
    illustratorType: safeMetadataStringField(repoMeta, assetMeta, 'illustrator:Type'),
    imageHeight,
    imageWidth,
    japaneseTitle: safeMetadataStringField(
      repoMeta,
      assetMeta,
      'dc:title_ja',
      safeMetadataStringField(repoMeta, assetMeta, 'dc:title'),
    ),
    lastModified: safeMetadataDateField(repoMeta, assetMeta, 'repo:modifyDate'),
    modifyDate: safeMetadataDateField(repoMeta, assetMeta, 'repo:modifyDate'),
    name,
    orientation,
    originalCreateDate: safeMetadataDateField(repoMeta, assetMeta, 'repo:createDate'),
    resolution,
    smartTags: extractKeywords(assetMeta?.['xcm:machineKeywords']) || 'N/A',
    tags: xcmKeywords,
    title: safeMetadataStringField(repoMeta, assetMeta, 'dc:title'),
    url: '', // Loaded lazily
    xcmKeywords,
    // Include all original metadata for any additional fields needed
    ...metadata,
  };
}

// ============================================================
// ContentAI-specific Transformations
// ============================================================

/**
 * Transform ContentAI hit to Asset object.
 * Maps only standard Content Hub namespaces (dc:, repo:, xcm:, pur:, tiff:,
 * illustrator:). Business-taxonomy fields shown by the UI are intentionally
 * left unmapped until the Content Hub schema for them is defined.
 * @param {Object} contentAIHit - ContentAI hit object from search response
 * @returns {Object} Asset object compatible with UI components
 */
export function populateAssetFromContentAIHit(contentAIHit) {
  const { assetId, repositoryMetadata = {}, assetMetadata = {} } = contentAIHit;

  // Repository metadata fields
  const repoName = safeStringField(repositoryMetadata, 'repo:name');
  const repoCreateDate = repositoryMetadata['repo:createDate'];
  const repoModifyDate = repositoryMetadata['repo:modifyDate'];
  const dcFormat = safeStringField(repositoryMetadata, 'dc:format');
  const repoSize = repositoryMetadata['repo:size'] || 0;

  // Asset metadata fields
  const dcTitle = safeStringField(assetMetadata, 'dc:title');
  const dcDescription = safeStringField(assetMetadata, 'dc:description');
  const purExpirationDate = assetMetadata['pur:expirationDate'];

  // Dimensions
  const tiffImageWidth = assetMetadata['tiff:ImageWidth']
    || assetMetadata['tiff:imageWidth']
    || repositoryMetadata['tiff:imageWidth'];
  const tiffImageLength = assetMetadata['tiff:ImageLength']
    || assetMetadata['tiff:imageLength']
    || repositoryMetadata['tiff:imageLength'];

  // Keywords (standard xcm namespace)
  const xcmKeywords = extractKeywords(assetMetadata['xcm:keywords']);
  const xcmMachineKeywords = extractKeywords(assetMetadata['xcm:machineKeywords']);

  return {
    // Core identifiers
    assetId,
    name: repoName,
    title: dcTitle,
    alt: dcTitle || repoName,
    description: dcDescription,

    // Dates
    createDate: formatDateFromISO(repoCreateDate),
    modifyDate: formatDateFromISO(repoModifyDate),
    lastModified: formatDateFromISO(repoModifyDate),
    originalCreateDate: formatDateFromISO(repoCreateDate),
    expirationDate: formatDateFromISO(purExpirationDate),
    expired: purExpirationDate ? '1' : '0',

    // File info
    format: dcFormat,
    formatType: dcFormat, // ContentAI uses flat dc:format, not nested
    formatLabel: mapMimeTypeToDisplayType(dcFormat, repoName),
    formattedSize: formatFileSize(repoSize),
    imageWidth: tiffImageWidth ? String(tiffImageWidth) : 'N/A',
    imageHeight: tiffImageLength ? String(tiffImageLength) : 'N/A',
    illustratorType: safeStringField(assetMetadata, 'illustrator:Type'),
    orientation: safeStringField(assetMetadata, 'tiff:Orientation'),

    // User tracking fields
    createdBy: safeStringField(repositoryMetadata, 'repo:createdBy'),

    // Keywords
    xcmKeywords,
    xcmMachineKeywords,
    smartTags: xcmMachineKeywords || 'N/A',
    tags: xcmKeywords,

    // Localization
    japaneseTitle: safeStringField(assetMetadata, 'dc:title_ja'),

    // URL placeholder - loaded lazily
    url: '',
  };
}

/**
 * Parse ContentAI search response
 * @param {Object} contentAIResponse - Raw ContentAI response
 * @returns {Object} Parsed response with hits, facets, and metadata
 */
export function parseContentAIResponse(contentAIResponse) {
  if (!contentAIResponse) {
    return {
      hits: [],
      facets: {},
      facetStats: {},
      totalCount: 0,
      cursor: null,
    };
  }

  const {
    hits = {},
    search_metadata: searchMetadata = {},
    facets: contentAIFacets = [],
    cursor,
  } = contentAIResponse;

  const results = hits.results || [];
  const totalCount = searchMetadata.totalCount?.total || 0;

  // Parse facets into a simpler format
  const facets = {};
  const facetStats = {};

  // Build hidden value mappings from _hidden facets
  // Format: "DisplayName|rawValue" -> extract mapping
  // Get existing mappings from storage (persisted across page refreshes)
  const hiddenMappings = getHiddenMappingsFromStorage();
  let hiddenMappingsUpdated = false;

  if (Array.isArray(contentAIFacets)) {
    contentAIFacets.forEach((facet) => {
      if (facet.type === 'CATEGORY' && facet.values && Array.isArray(facet.values)) {
        // Check if this is a hidden facet
        if (facet.id.endsWith('_hidden')) {
          // Extract base facet key (remove _hidden suffix)
          const baseFacetKey = facet.id.replace(/_hidden$/, '');

          // Initialize if needed (don't replace existing mappings)
          if (!hiddenMappings[baseFacetKey]) {
            hiddenMappings[baseFacetKey] = {};
          }

          // Merge new values into existing mappings (accumulate, don't replace)
          facet.values.forEach((item) => {
            if (item.value && item.value.includes('|')) {
              // Parse "DisplayName|rawValue" format
              const pipeIndex = item.value.lastIndexOf('|');
              const displayName = item.value.substring(0, pipeIndex);
              const rawValue = item.value.substring(pipeIndex + 1);
              // Only update if not already present (preserve existing)
              if (!hiddenMappings[baseFacetKey][rawValue]) {
                hiddenMappings[baseFacetKey][rawValue] = displayName;
                hiddenMappingsUpdated = true;
              }
            }
          });
        } else {
          // Regular facet - add to facets map
          facets[facet.id] = {};
          facet.values.forEach((item) => {
            if (item.value !== undefined && item.count !== undefined) {
              facets[facet.id][item.value] = item.count;
            }
          });
        }
      } else if (facet.type === 'STAT' && facet.values) {
        facetStats[facet.id] = {
          min: facet.values.min,
          max: facet.values.max,
        };
      }
    });
  }

  // Save updated mappings back to storage if changed
  if (hiddenMappingsUpdated) {
    saveHiddenMappingsToStorage(hiddenMappings);
  }

  return {
    hits: results,
    facets,
    facetStats,
    totalCount,
    cursor,
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Save cart items to localStorage and update cart badge
 * @param {Array} items - The array of cart items to save
 * @returns {void}
 */
export function saveCartItems(items) {
  localStorage.setItem('cartAssetItems', JSON.stringify(items));
  if (window.updateCartBadge && typeof window.updateCartBadge === 'function') {
    window.updateCartBadge(items.length);
  }
}

/**
 * Fetch full asset details from ContentAI search API by asset ID(s)
 * @param {string|Array<string>} assetId - Single asset ID or array of asset IDs
 * @returns {Promise<Object|null>} For single ID: asset object or null.
 *                                  For array: object mapping assetId -> asset
 */
export async function fetchAssetById(assetId) {
  const isArray = Array.isArray(assetId);
  try {
    // Normalize asset IDs: ensure full URN format for API, accept bare UUIDs
    const assetIds = isArray
      ? assetId.filter((id) => id).map(normalizeAssetId)
      : [normalizeAssetId(assetId)].filter((id) => id);

    if (assetIds.length === 0) {
      return isArray ? {} : null;
    }

    // Build ContentAI search query with term filter for assetIds
    const searchQuery = {
      query: [{
        term: {
          assetId: assetIds,
        },
      }],
      limit: assetIds.length,
    };

    const response = await fetch('/api/adobe/assets/contentai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchQuery),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('[Asset Utils] Failed to fetch asset details:', response.status);
      return isArray ? {} : null;
    }

    const data = await response.json();
    const hits = data.hits?.results || [];

    // For single ID, return the asset or null
    if (!isArray) {
      if (hits.length > 0) {
        return populateAssetFromContentAIHit(hits[0]);
      }
      return null;
    }

    // For array, return a map of assetId -> asset object
    const assetMap = {};
    hits.forEach((hit) => {
      const asset = populateAssetFromContentAIHit(hit);
      if (asset?.assetId) {
        assetMap[asset.assetId] = asset;
      }
    });

    return assetMap;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Asset Utils] Error fetching asset by ID:', error);
    return isArray ? {} : null;
  }
}
