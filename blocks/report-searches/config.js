/**
 * Configuration constants for the Searches Report
 */

// Re-export shared configuration from analytics-constants
export {
  // Role configuration
  ROLE_COLORS,
  FALLBACK_ROLE_COLOR,
  getRoleColor,
  processRoleData,
  // Chart configuration
  CHART_JS_CDN,
  CHART_DATALABELS_CDN,
  CHART_INIT_DELAY,
  // Chart colors
  GEO_COLORS,
  // Date configuration
  MONTH_NAMES,
  MONTH_NAMES_FULL,
  ANALYTICS_START_YEAR,
  ANALYTICS_MAX_YEAR,
  // Search type colors
  SEARCH_TYPE_COLORS,
} from '../../scripts/analytics/analytics-constants.js';

// =============================================================================
// FILTER OPTIONS FOR SEARCH REPORT
// =============================================================================

/**
 * Role filter options
 */
export const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'associate', label: 'Associate' },
  { value: 'agency', label: 'Agency' },
  { value: 'partner', label: 'Partner' },
];

/**
 * Search type filter options
 */
export const SEARCH_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'assets', label: 'Assets' },
  { value: 'products', label: 'Products' },
  { value: 'templates', label: 'Templates' },
];

/**
 * Search term filter options
 */
export const SEARCH_TERM_OPTIONS = [
  { value: 'all', label: 'All Searches' },
  { value: 'empty', label: 'Empty only' },
  { value: 'non-empty', label: 'Non-empty only' },
];

/** Default market filter option — dynamic markets loaded from API */
export const ALL_MARKETS_OPTION = { value: 'all', label: 'All Markets' };

/** Safe token pattern for assetMetadata.allowedCountries values in URL params */
export const MARKET_TOKEN_PATTERN = /^[A-Za-z0-9 _-]{1,64}$/;

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidMarketToken(value) {
  return typeof value === 'string' && MARKET_TOKEN_PATTERN.test(value);
}

/**
 * Element IDs for filter controls
 */
export const FILTER_ELEMENT_IDS = {
  ROLE: 'role-select',
  MARKET: 'market-select',
  SEARCH_TYPE: 'search-type-select',
  SEARCH_TERM: 'search-term-select',
};

/**
 * UI text strings
 */
export const UI_TEXT = {
  ADDITIONAL_FILTERS_LABEL: 'Additional Filters',
  RESET_FILTERS_BUTTON: 'Reset Filters',
};
