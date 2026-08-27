/**
 * Utility module for managing toggle state persistence in local storage
 */

// Local storage keys
const STORAGE_KEYS = {
  SEARCH_EXPAND_ALL_DETAILS: 'search-results_search_expandAllDetails',
  DETAILS_COLLAPSE_ALL: 'search-results_details_collapseAll',
  SEARCH_MOBILE_FILTER_OPEN: 'search-results_search_isMobileFilterOpen',
};

/**
 * Save the search page "Show full details" toggle state
 * @param {boolean} expandAllDetails - Whether full details should be expanded
 */
export function saveSearchExpandAllDetailsState(expandAllDetails) {
  try {
    localStorage.setItem(STORAGE_KEYS.SEARCH_EXPAND_ALL_DETAILS, JSON.stringify(expandAllDetails));
  } catch (error) {
    console.warn('Failed to save search expandAllDetails state to localStorage:', error);
  }
}

/**
 * Load the search page "Show full details" toggle state
 * @param {boolean} [defaultValue=true] - Default value if nothing is stored
 * @returns {boolean} The stored state or the default value
 */
export function loadSearchExpandAllDetailsState(defaultValue = true) {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_EXPAND_ALL_DETAILS);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load search expandAllDetails state from localStorage:', error);
  }
  return defaultValue;
}

/**
 * Save the details page "Collapse All" toggle state
 * @param {boolean} collapseAll - Whether all sections should be collapsed
 */
export function saveDetailsCollapseAllState(collapseAll) {
  try {
    localStorage.setItem(STORAGE_KEYS.DETAILS_COLLAPSE_ALL, JSON.stringify(collapseAll));
  } catch (error) {
    console.warn('Failed to save details collapseAll state to localStorage:', error);
  }
}

/**
 * Load the details page "Collapse All" toggle state
 * @param {boolean} [defaultValue=false] - Default value if nothing is stored
 * @returns {boolean} The stored state or the default value
 */
export function loadDetailsCollapseAllState(defaultValue = false) {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DETAILS_COLLAPSE_ALL);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load details collapseAll state from localStorage:', error);
  }
  return defaultValue;
}

/**
 * Save the search page mobile filter panel open/closed state
 * @param {boolean} isMobileFilterOpen - Whether the mobile filter panel is open
 */
export function saveSearchMobileFilterOpenState(isMobileFilterOpen) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.SEARCH_MOBILE_FILTER_OPEN,
      JSON.stringify(isMobileFilterOpen),
    );
  } catch (error) {
    console.warn('Failed to save search isMobileFilterOpen state to localStorage:', error);
  }
}

/**
 * Load the search page mobile filter panel open/closed state
 * @param {boolean} [defaultValue=false] - Default value if nothing is stored
 * @returns {boolean} The stored state or the default value
 */
export function loadSearchMobileFilterOpenState(defaultValue = false) {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_MOBILE_FILTER_OPEN);
    if (stored !== null) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load search isMobileFilterOpen state from localStorage:', error);
  }
  return defaultValue;
}
