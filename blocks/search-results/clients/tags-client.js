/* eslint-disable import/no-cycle */
/**
 * Tags Client
 *
 * Builds a tag display-name lookup from the `config/tags` spreadsheet (DA),
 * one sheet fetch uses `limit=20000` via
 * {@link fetchSpreadsheetData} instead of many small paginated requests.
 *
 * Sheet name = first path segment (e.g. `custom:brand/acme` → sheet `custom:brand`).
 * Rows use `tagPath` and `titlePath` columns.
 *
 * Tag search in the facet modal still uses the Dynamic Media Tags Search API.
 *
 * Lookup format (in-memory, refreshed each page load):
 *   { tagPath: { default: titlePath } }
 *
 * @module clients/tags-client
 */

import { fetchSpreadsheetData } from '../../../scripts/scripts.js';

const SPREADSHEET_PATH = 'config/tags';
const DM_TAGS_SEARCH_PATH = '/api/adobe/assets/contentai/tags/search';

/** In-memory lookup — lives for the current page load only */
const cachedTagsLookup = {};

/** Tracks which sheets have been fully loaded */
const loadedSheets = new Set();

/** Per-sheet fetch promises for deduplication */
const sheetPromises = {};

/**
 * @param {string} tagPath
 * @returns {boolean}
 */
function isTagPath(tagPath) {
  return typeof tagPath === 'string'
    && tagPath.startsWith('custom:')
    && tagPath.includes('/');
}

/**
 * Ensure a single spreadsheet sheet is loaded into the lookup.
 * @param {string} sheetName - Sheet name (e.g. "custom:brand")
 */
async function ensureSheetLoaded(sheetName) {
  if (!sheetName || loadedSheets.has(sheetName)) return;

  if (!sheetPromises[sheetName]) {
    sheetPromises[sheetName] = (async () => {
      try {
        const sheet = await fetchSpreadsheetData(SPREADSHEET_PATH, sheetName, 20000);
        if (sheet?.data && Array.isArray(sheet.data)) {
          sheet.data.forEach((row) => {
            if (row.tagPath && row.titlePath) {
              cachedTagsLookup[row.tagPath] = { default: row.titlePath };
            }
          });
        }
        loadedSheets.add(sheetName);
      } finally {
        delete sheetPromises[sheetName];
      }
    })();
  }

  await sheetPromises[sheetName];
}

// ==========================================
// Public API (spreadsheet)
// ==========================================

export function clearFetchedPaths() {
  Object.keys(cachedTagsLookup).forEach((k) => { delete cachedTagsLookup[k]; });
  loadedSheets.clear();
  Object.keys(sheetPromises).forEach((k) => { delete sheetPromises[k]; });
}

export function getTagsLookupMap() {
  return cachedTagsLookup;
}

export function lookupTitlePath(tagPath, locale = 'default') {
  const entry = cachedTagsLookup[tagPath];
  if (!entry) return null;

  if (entry[locale]) return entry[locale];
  if (entry.default) return entry.default;

  const localePrefix = locale.split(/[-_]/)[0];
  const matchingKey = Object.keys(entry).find(
    (key) => key !== 'id' && key.startsWith(localePrefix),
  );
  if (matchingKey) return entry[matchingKey];

  const firstKey = Object.keys(entry).find((key) => key !== 'id');
  return firstKey ? entry[firstKey] : null;
}

/**
 * Fetch one tag's title from the spreadsheet (loads its sheet if needed).
 * @param {string} tagPath
 * @returns {Promise<string|null>}
 */
export async function fetchMissingTag(tagPath) {
  if (!tagPath) return null;
  if (cachedTagsLookup[tagPath]) return lookupTitlePath(tagPath);
  if (!isTagPath(tagPath)) return null;

  await ensureSheetLoaded(tagPath.split('/')[0]);
  return lookupTitlePath(tagPath);
}

/**
 * Batch used by facets: load all sheets needed for the given tag paths.
 * @param {Array<{tagPath: string, facetId?: string}>} tags
 * @returns {Promise<void>}
 */
export async function fetchMissingTagsBatch(tags) {
  if (!tags || tags.length === 0) return;

  const sheets = new Set();
  tags.forEach(({ tagPath }) => {
    if (!tagPath || lookupTitlePath(tagPath)) return;
    if (!isTagPath(tagPath)) return;
    sheets.add(tagPath.split('/')[0]);
  });

  await Promise.all([...sheets].map((name) => ensureSheetLoaded(name)));
}

/**
 * Prefetch tag sheets from facet response (array or parsed object).
 * @param {Array|Object} facets
 * @param {Object} excFacets
 * @returns {Promise<Object>}
 */
export async function fetchTagsFromResponse(facets, excFacets) {
  if (!facets || !excFacets) return cachedTagsLookup;

  const tagsFacetIds = new Set(
    Object.entries(excFacets)
      .filter(([, config]) => config.type === 'tags')
      .map(([key]) => key),
  );

  const sheetNames = new Set();

  if (Array.isArray(facets)) {
    facets.forEach((facet) => {
      if (!tagsFacetIds.has(facet.id)) return;
      (facet.values || []).forEach((item) => {
        if (isTagPath(item.value)) sheetNames.add(item.value.split('/')[0]);
      });
    });
  } else {
    tagsFacetIds.forEach((key) => {
      const facetData = facets[key];
      if (!facetData) return;
      Object.keys(facetData).forEach((tagPath) => {
        if (isTagPath(tagPath)) sheetNames.add(tagPath.split('/')[0]);
      });
    });
  }

  await Promise.all([...sheetNames].map((name) => ensureSheetLoaded(name)));
  return cachedTagsLookup;
}

/** @deprecated No sessionStorage; kept for test hooks */
export function resetTagsClientForTesting() {
  clearFetchedPaths();
}

// ==========================================
// DM Tags Search (facet modal)
// ==========================================

/**
 * Search tags via DM Tags Search API (proxied by worker).
 * @param {string} query
 * @param {AbortSignal} [signal]
 * @returns {Promise<{items: Array}>}
 */
export async function searchTags(query, signal) {
  const url = new URL(DM_TAGS_SEARCH_PATH, window.location.href);
  url.searchParams.set('query', query);

  const response = await fetch(url.toString(), { signal, credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Tags search failed: ${response.status}`);
  }
  return response.json();
}
