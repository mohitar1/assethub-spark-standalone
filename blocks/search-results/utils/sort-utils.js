/**
 * Sort utilities for ContentAI search (constants, orderBy, and per-page preference storage).
 * Extracted to avoid circular dependencies.
 */

// Sort type constants (keys match state values)
export const SORT_TYPE = {
  TOP_RESULTS: 'topResults',
  DATE_CREATED: 'dateCreated',
  LAST_MODIFIED: 'lastModified',
  SIZE: 'size',
};

// Sort direction constants (keys match state values)
export const SORT_DIRECTION = {
  ASCENDING: 'ascending',
  DESCENDING: 'descending',
};

// ContentAI field mappings for sorting
export const SORT_TYPE_FIELD_MAP = {
  [SORT_TYPE.DATE_CREATED]: 'repositoryMetadata.repo:createDate',
  [SORT_TYPE.LAST_MODIFIED]: 'repositoryMetadata.repo:modifyDate',
  [SORT_TYPE.SIZE]: 'repositoryMetadata.repo:size',
};

export const DEFAULT_SORT_TYPE = SORT_TYPE.TOP_RESULTS;
export const DEFAULT_SORT_DIRECTION = SORT_DIRECTION.DESCENDING;

const VALID_SORT_TYPES = Object.values(SORT_TYPE);
const VALID_SORT_DIRECTIONS = Object.values(SORT_DIRECTION);

/**
 * Build orderBy string for ContentAI from sort type and direction
 * @param {string} sortType - Sort type ('dateCreated', 'lastModified', 'size')
 * @param {string} sortDirection - Sort direction ('ascending' or 'descending')
 * @returns {string} orderBy string (e.g. 'repositoryMetadata.repo:modifyDate desc')
 */
export function buildOrderBy(sortType, sortDirection) {
  const field = SORT_TYPE_FIELD_MAP[sortType] || SORT_TYPE_FIELD_MAP[SORT_TYPE.LAST_MODIFIED];
  const direction = sortDirection === SORT_DIRECTION.ASCENDING ? 'asc' : 'desc';
  return `${field} ${direction}`;
}

// --- Per-page sort preference (session storage) ---
// Single key stores { [pathname]: { sortType, sortDirection } }
// Pathname defaults to window.location.pathname.

const SORT_PREFERENCE_KEY = 'search-results_search_sortPreference';

/**
 * Normalize path for storage key (consistent across trailing slash).
 * @param {string} pathname - Full pathname (e.g. from window.location.pathname)
 * @returns {string}
 */
function normalizePathKey(pathname) {
  let path = '';
  if (typeof pathname === 'string' && pathname.length > 0) {
    path = pathname;
  } else if (typeof window !== 'undefined') {
    path = window.location.pathname;
  }
  return path.replace(/\/$/, '') || '/';
}

/**
 * Get the normalized path key used for the given page (for object lookup).
 * @param {string} [pathname] - Page pathname; defaults to window.location.pathname
 * @returns {string}
 */
export function getSortPreferenceKey(pathname) {
  return pathname !== undefined ? normalizePathKey(pathname) : normalizePathKey('');
}

/**
 * @returns {Record<string, { sortType: string, sortDirection: string }>}
 */
function loadAllPreferences() {
  try {
    const raw = sessionStorage.getItem(SORT_PREFERENCE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load sort preferences from sessionStorage:', error);
    return {};
  }
}

/**
 * Save sort preference for the given page. Only saves if values are valid.
 * @param {string} sortType - Sort type key (e.g. 'topResults', 'dateCreated')
 * @param {string} sortDirection - Sort direction key ('ascending' | 'descending')
 * @param {string} [pathname] - Page pathname; defaults to window.location.pathname
 */
export function saveSortPreference(sortType, sortDirection, pathname) {
  if (!VALID_SORT_TYPES.includes(sortType) || !VALID_SORT_DIRECTIONS.includes(sortDirection)) {
    return;
  }
  try {
    const pathKey = getSortPreferenceKey(pathname);
    const all = loadAllPreferences();
    all[pathKey] = { sortType, sortDirection };
    sessionStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(all));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to save sort preference to sessionStorage:', error);
  }
}

/**
 * Load sort preference for the given page. Returns null if missing or invalid.
 * @param {string} [pathname] - Page pathname; defaults to window.location.pathname
 * @returns {{ sortType: string, sortDirection: string } | null}
 */
export function loadSortPreference(pathname) {
  try {
    const pathKey = getSortPreferenceKey(pathname);
    const all = loadAllPreferences();
    const entry = all[pathKey];
    if (entry == null) return null;
    const { sortType, sortDirection } = entry;
    if (
      VALID_SORT_TYPES.includes(sortType)
      && VALID_SORT_DIRECTIONS.includes(sortDirection)
    ) {
      return { sortType, sortDirection };
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load sort preference from sessionStorage:', error);
  }
  return null;
}
