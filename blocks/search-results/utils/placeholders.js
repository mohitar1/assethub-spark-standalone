import { getAppLabel, localizePath } from '../../../scripts/locale-utils.js';

// Cache for app labels (Tier 1 - code-managed UI text)
let appLabelsCache = null;
let appLabelsLoading = null;

// Cache for DA placeholders (Tier 2 - author-managed metadata)
// Note: Cache is module-scoped and persists for the page session.
// It's invalidated on page refresh or locale change (different URL = different module instance).
let daPlaceholdersCache = null;
let daPlaceholdersLoading = null;

/**
 * Fetch DA placeholders from placeholders.json.
 * DA placeholders are for author-managed metadata translations (brand names, facet values, etc.)
 *
 * Note: We intentionally don't use fetchSpreadsheetData from scripts.js here to avoid
 * a circular dependency (scripts.js -> ... -> placeholders.js -> scripts.js).
 * Instead, we use localizePath directly from locale-utils.js.
 *
 * @returns {Promise<Object>} DA placeholders object
 */
async function fetchDAPlaceholders() {
  if (daPlaceholdersCache) {
    return daPlaceholdersCache;
  }

  try {
    // Make path locale-aware (e.g., /placeholders -> /ja/placeholders for Japanese pages)
    const localizedPath = localizePath('/placeholders');
    const response = await fetch(`${localizedPath}.json`);
    if (response.ok) {
      const json = await response.json();
      // Convert array format [{Key, Text}] to object {key: value}
      // Note: DA placeholders.json uses "Text" field, not "Value"
      daPlaceholdersCache = {};
      if (json.data && Array.isArray(json.data)) {
        json.data.forEach((item) => {
          if (item.Key) {
            daPlaceholdersCache[item.Key] = item.Text || '';
          }
        });
      }
      return daPlaceholdersCache;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Could not fetch DA placeholders:', error.message);
  }

  daPlaceholdersCache = {};
  return daPlaceholdersCache;
}

/**
 * Get DA placeholders for metadata translations.
 * This is Tier 2 (author-managed) - for dynamic metadata like brand names, facet values, etc.
 * Should NOT be used for UI text - use getSearchPlaceholders() for that.
 * @returns {Promise<Object>} DA placeholders object
 */
export async function getDaPlaceholders() {
  if (daPlaceholdersCache) {
    return daPlaceholdersCache;
  }

  if (daPlaceholdersLoading) {
    return daPlaceholdersLoading;
  }

  daPlaceholdersLoading = fetchDAPlaceholders();
  return daPlaceholdersLoading;
}

/**
 * Get cached DA placeholders synchronously.
 * This should only be called after getDaPlaceholders() has been awaited at least once.
 * Use this for metadata translations (brand names, facet values, etc.)
 * @returns {Object|null} Cached DA placeholders or null if not yet loaded
 */
export function getCachedDaPlaceholders() {
  return daPlaceholdersCache;
}

/**
 * Get localized app labels for search components.
 * This is Tier 1 (code-managed) - for static UI text like buttons, form labels, messages.
 * Should NOT be used for metadata - use getDaPlaceholders() for that.
 * @returns {Promise<Object>} App labels object (proxy to getAppLabel function)
 */
export async function getSearchPlaceholders() {
  // Return cached app labels if available
  if (appLabelsCache) {
    return appLabelsCache;
  }

  // If already loading, wait for that promise
  if (appLabelsLoading) {
    return appLabelsLoading;
  }

  // Start loading app labels only (no DA mixing)
  appLabelsLoading = (async () => {
    const appLabelFn = await getAppLabel();

    // Create a proxy that only uses app labels.
    // Return undefined for missing keys so ph()'s fallback parameter works.
    const labelsObject = new Proxy({}, {
      get: (target, prop) => {
        const value = appLabelFn(prop, undefined);
        return value !== undefined && value !== prop ? value : undefined;
      },
    });

    appLabelsCache = labelsObject;
    return appLabelsCache;
  })();

  return appLabelsLoading;
}

/**
 * Get a placeholder value with fallback.
 * @param {Object} placeholders - Placeholders object (or a proxy to the getAppLabel function)
 * @param {string} key - Placeholder key (camelCase)
 * @param {string} fallback - Fallback value if key not found
 * @returns {string} The placeholder value or fallback
 */
export function ph(placeholders, key, fallback) {
  // If placeholders is a function (from getAppLabel), call it directly
  if (typeof placeholders === 'function') {
    return placeholders(key, fallback);
  }
  // Otherwise, treat it as an object (for backward compatibility or direct object usage)
  return placeholders?.[key] || fallback;
}

/**
 * Get cached app labels synchronously.
 * This should only be called after getSearchPlaceholders() has been awaited at least once.
 * @returns {Object|null} Cached app labels or null if not yet loaded
 */
export function getCachedPlaceholders() {
  return appLabelsCache;
}

/**
 * Clear all caches.
 * Useful for testing or when locale changes.
 */
export function clearPlaceholdersCache() {
  appLabelsCache = null;
  appLabelsLoading = null;
  daPlaceholdersCache = null;
  daPlaceholdersLoading = null;
}
