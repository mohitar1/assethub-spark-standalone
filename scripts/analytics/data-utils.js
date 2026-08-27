/**
 * Shared Data Utilities for Analytics Reports
 *
 * Provides reusable data processing functions to eliminate duplication across reports.
 * All functions are pure - they take data as input and return calculated results.
 *
 * @module scripts/analytics/data-utils
 */

import { GEO_CODES, MONTH_NAMES } from './analytics-constants.js';

// =============================================================================
// COUNTRY TO REGION MAPPING
// =============================================================================

/**
 * Country to Region mapping
 * Maps country codes AND country names to region codes used in reports
 * Shared across all analytics reports for consistent geography grouping
 */
export const COUNTRY_TO_REGION = {
  // Africa (AFR) - codes and names
  ZA: 'AFR',
  NG: 'AFR',
  KE: 'AFR',
  EG: 'AFR',
  MA: 'AFR',
  GH: 'AFR',
  TZ: 'AFR',
  UG: 'AFR',
  ET: 'AFR',
  DZ: 'AFR',
  'SOUTH AFRICA': 'AFR',
  NIGERIA: 'AFR',
  KENYA: 'AFR',
  EGYPT: 'AFR',
  MOROCCO: 'AFR',
  GHANA: 'AFR',

  // Asia Pacific (ASP)
  AU: 'ASP',
  NZ: 'ASP',
  SG: 'ASP',
  MY: 'ASP',
  TH: 'ASP',
  VN: 'ASP',
  PH: 'ASP',
  ID: 'ASP',
  HK: 'ASP',
  TW: 'ASP',
  AUSTRALIA: 'ASP',
  'NEW ZEALAND': 'ASP',
  SINGAPORE: 'ASP',
  MALAYSIA: 'ASP',
  THAILAND: 'ASP',
  VIETNAM: 'ASP',
  PHILIPPINES: 'ASP',
  INDONESIA: 'ASP',
  'HONG KONG': 'ASP',
  TAIWAN: 'ASP',

  // Eurasia & Middle East (EME)
  RU: 'EME',
  TR: 'EME',
  SA: 'EME',
  AE: 'EME',
  PK: 'EME',
  UA: 'EME',
  KZ: 'EME',
  QA: 'EME',
  KW: 'EME',
  BH: 'EME',
  RUSSIA: 'EME',
  TURKEY: 'EME',
  'SAUDI ARABIA': 'EME',
  UAE: 'EME',
  'UNITED ARAB EMIRATES': 'EME',
  PAKISTAN: 'EME',
  UKRAINE: 'EME',

  // Europe (EU)
  GB: 'EU',
  DE: 'EU',
  FR: 'EU',
  IT: 'EU',
  ES: 'EU',
  NL: 'EU',
  BE: 'EU',
  CH: 'EU',
  AT: 'EU',
  SE: 'EU',
  NO: 'EU',
  DK: 'EU',
  FI: 'EU',
  PL: 'EU',
  PT: 'EU',
  IE: 'EU',
  GR: 'EU',
  CZ: 'EU',
  RO: 'EU',
  HU: 'EU',
  'UNITED KINGDOM': 'EU',
  UK: 'EU',
  GERMANY: 'EU',
  FRANCE: 'EU',
  ITALY: 'EU',
  SPAIN: 'EU',
  NETHERLANDS: 'EU',
  BELGIUM: 'EU',
  SWITZERLAND: 'EU',
  AUSTRIA: 'EU',
  SWEDEN: 'EU',
  NORWAY: 'EU',
  DENMARK: 'EU',
  FINLAND: 'EU',
  POLAND: 'EU',
  PORTUGAL: 'EU',
  IRELAND: 'EU',
  GREECE: 'EU',

  // Greater China & Mongolia (GCM)
  CN: 'GCM',
  MN: 'GCM',
  CHINA: 'GCM',
  MONGOLIA: 'GCM',

  // India, South West Asia (INSWA)
  IN: 'INSWA',
  BD: 'INSWA',
  LK: 'INSWA',
  NP: 'INSWA',
  AF: 'INSWA',
  INDIA: 'INSWA',
  BANGLADESH: 'INSWA',
  'SRI LANKA': 'INSWA',
  NEPAL: 'INSWA',
  AFGHANISTAN: 'INSWA',

  // Japan & South Korea (JSK)
  JP: 'JSK',
  KR: 'JSK',
  JAPAN: 'JSK',
  'SOUTH KOREA': 'JSK',
  KOREA: 'JSK',

  // Latin America (LA)
  MX: 'LA',
  BR: 'LA',
  AR: 'LA',
  CO: 'LA',
  CL: 'LA',
  PE: 'LA',
  EC: 'LA',
  VE: 'LA',
  GT: 'LA',
  CU: 'LA',
  BO: 'LA',
  DO: 'LA',
  HN: 'LA',
  PY: 'LA',
  SV: 'LA',
  NI: 'LA',
  CR: 'LA',
  PA: 'LA',
  UY: 'LA',
  MEXICO: 'LA',
  BRAZIL: 'LA',
  ARGENTINA: 'LA',
  COLOMBIA: 'LA',
  CHILE: 'LA',
  PERU: 'LA',
  'COSTA RICA': 'LA',
  PANAMA: 'LA',

  // North America (NA)
  US: 'NA',
  CA: 'NA',
  'UNITED STATES': 'NA',
  CANADA: 'NA',
  USA: 'NA',
};

/**
 * Map a country code or name to its region
 *
 * @param {string} country - Country code (e.g., 'US') or name (e.g., 'United States')
 * @returns {string|null} Region code (e.g., 'NA') or null if not found
 *
 * @example
 * mapCountryToRegion('US'); // 'NA'
 * mapCountryToRegion('United States'); // 'NA'
 * mapCountryToRegion('UNKNOWN'); // null
 */
export function mapCountryToRegion(country) {
  if (!country) return null;
  const upperCountry = country.toString().toUpperCase().trim();
  return COUNTRY_TO_REGION[upperCountry] || null;
}

// =============================================================================
// DATE RANGE BUILDERS
// =============================================================================

/**
 * Build date range parameters for API queries
 *
 * @param {string} viewType - 'year' or 'month'
 * @param {number} selectedYear - Selected year (e.g., 2026)
 * @param {number} selectedMonth - Selected month (0-11, only used if viewType is 'month')
 * @returns {Object} Date range with startDate and endDate
 *
 * @example
 * buildDateRange('year', 2026); // { startDate: '2026-01-01', endDate: '2026-12-31' }
 * buildDateRange('month', 2026, 1); // { startDate: '2026-02-01', endDate: '2026-02-29' }
 */
export function buildDateRange(viewType, selectedYear, selectedMonth) {
  if (viewType === 'month') {
    // Single month view
    const month = selectedMonth + 1; // Convert 0-11 to 1-12
    const monthStr = month.toString().padStart(2, '0');
    const startDate = `${selectedYear}-${monthStr}-01`;

    // Calculate last day of month
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const endDate = `${selectedYear}-${monthStr}-${lastDay}`;

    return { startDate, endDate };
  }

  // Full year view
  return {
    startDate: `${selectedYear}-01-01`,
    endDate: `${selectedYear}-12-31`,
  };
}

/**
 * Build API query parameters from filters
 *
 * @param {Object} filters - Filter object with year, month, viewType, etc.
 * @param {Array<string>} [additionalFilters=[]] - Additional filter keys to include
 * @returns {URLSearchParams} Query parameters ready for API call
 *
 * @example
 * const filters = {
 *   selectedYear: 2026,
 *   selectedMonth: 1,
 *   viewType: 'month',
 *   role: 'associate',
 *   region: 'NA'
 * };
 * const params = buildQueryParams(filters, ['role', 'region']);
 * // Returns URLSearchParams with: year=2026&month=2&role=associate&region=NA
 */
export function buildQueryParams(filters, additionalFilters = []) {
  const params = new URLSearchParams();
  params.set('year', filters.selectedYear);

  if (filters.viewType === 'month') {
    // API expects 1-12 for months, filters.selectedMonth is 0-11
    params.set('month', filters.selectedMonth + 1);
  }

  // Add additional filters if provided and not 'all'
  additionalFilters.forEach((filterKey) => {
    if (filters[filterKey] && filters[filterKey] !== 'all') {
      params.set(filterKey, filters[filterKey]);
    }
  });

  return params;
}

// =============================================================================
// MONTHLY DATA NORMALIZATION
// =============================================================================

/**
 * Initialize empty monthly data structure for a full year
 *
 * @param {number} year - Year to initialize (e.g., 2026)
 * @param {number} [defaultValue=0] - Default value for each month
 * @returns {Object} Object with month keys (0-11) and default values
 *
 * @example
 * initializeMonthlyData(2026);
 * // Returns: { 0: 0, 1: 0, ..., 11: 0 }
 *
 * initializeMonthlyData(2026, []);
 * // Returns: { 0: [], 1: [], ..., 11: [] }
 */
export function initializeMonthlyData(year, defaultValue = 0) {
  const monthlyData = {};
  for (let month = 0; month < 12; month += 1) {
    // Handle object default values (array or object)
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      monthlyData[month] = Array.isArray(defaultValue) ? [] : { ...defaultValue };
    } else {
      monthlyData[month] = defaultValue;
    }
  }
  return monthlyData;
}

/**
 * Normalize monthly data to ensure all 12 months are present
 * Fills missing months with 0 or specified default value
 *
 * @param {Object} monthlyData - Monthly data object (keys are month indices 0-11)
 * @param {number} year - Year for the data
 * @param {number} [defaultValue=0] - Default value for missing months
 * @returns {Object} Normalized monthly data with all 12 months
 *
 * @example
 * const data = { 0: 100, 5: 200 }; // Only Jan and Jun have data
 * normalizeMonthlyData(data, 2026);
 * // Returns: { 0: 100, 1: 0, 2: 0, ..., 5: 200, ..., 11: 0 }
 */
export function normalizeMonthlyData(monthlyData, year, defaultValue = 0) {
  const normalized = initializeMonthlyData(year, defaultValue);

  // Copy existing data
  Object.keys(monthlyData).forEach((monthKey) => {
    const monthIndex = parseInt(monthKey, 10);
    if (monthIndex >= 0 && monthIndex < 12) {
      normalized[monthIndex] = monthlyData[monthKey];
    }
  });

  return normalized;
}

/**
 * Process monthly data from API response
 * Converts API format to normalized monthly object with proper month indices
 *
 * @param {Array<Object>} monthlyData - Array of monthly data from API
 * @param {string} viewType - 'year' or 'month'
 * @param {number} selectedYear - Selected year
 * @param {string} countField - Field name containing the count value
 * @returns {Object} Normalized monthly data object
 *
 * @example
 * const apiData = [
 *   { year: 2026, month: 1, count: 100 },
 *   { year: 2026, month: 2, count: 150 }
 * ];
 * processMonthlyData(apiData, 'year', 2026, 'count');
 * // Returns: { 0: 100, 1: 150, 2: 0, ..., 11: 0 }
 */
export function processMonthlyData(monthlyData, viewType, selectedYear, countField) {
  // Create map of existing data
  const monthMap = {};
  if (monthlyData && Array.isArray(monthlyData)) {
    monthlyData.forEach((item) => {
      // API uses 1-12 for months, convert to 0-11
      const monthIndex = item.month - 1;
      monthMap[monthIndex] = item[countField] || 0;
    });
  }

  // For year view, fill all 12 months with 0 if missing
  if (viewType === 'year') {
    return normalizeMonthlyData(monthMap, selectedYear, 0);
  }

  // For month view, just return the single month's data
  return monthMap;
}

// =============================================================================
// DATA AGGREGATION
// =============================================================================

/**
 * Aggregate data by a specific field
 * Groups array of objects by a field and sums a count field
 *
 * @param {Array<Object>} data - Array of data objects
 * @param {string} groupByField - Field to group by
 * @param {string} [countField='count'] - Field to sum (default: 'count')
 * @returns {Object} Object with grouped data { key: totalCount }
 *
 * @example
 * const data = [
 *   { role: 'associate', count: 10 },
 *   { role: 'associate', count: 5 },
 *   { role: 'agency', count: 8 }
 * ];
 * aggregateBy(data, 'role', 'count');
 * // Returns: { associate: 15, agency: 8 }
 */
export function aggregateBy(data, groupByField, countField = 'count') {
  const aggregated = {};

  if (!data || !Array.isArray(data)) {
    return aggregated;
  }

  data.forEach((item) => {
    const key = item[groupByField];
    const value = item[countField] || 0;

    if (key) {
      aggregated[key] = (aggregated[key] || 0) + value;
    }
  });

  return aggregated;
}

/**
 * Aggregate data by geographic region
 * Uses COUNTRY_TO_REGION mapping to group by region
 *
 * @param {Array<Object>} data - Array of data with country field
 * @param {string} [countField='count'] - Field to sum
 * @param {string} [countryField='country'] - Field containing country code/name
 * @returns {Object} Object with region totals { AFR: 100, ASP: 200, ... }
 *
 * @example
 * const data = [
 *   { country: 'US', count: 100 },
 *   { country: 'CA', count: 50 },
 *   { country: 'GB', count: 75 }
 * ];
 * aggregateByRegion(data);
 * // Returns: { NA: 150, EU: 75, ... }
 */
export function aggregateByRegion(data, countField = 'count', countryField = 'country') {
  const regionTotals = {};

  // Initialize all regions to 0
  GEO_CODES.forEach((region) => {
    regionTotals[region] = 0;
  });

  if (!data || !Array.isArray(data)) {
    return regionTotals;
  }

  data.forEach((item) => {
    const country = item[countryField];
    const region = mapCountryToRegion(country);
    const value = item[countField] || 0;

    if (region && regionTotals[region] !== undefined) {
      regionTotals[region] += value;
    }
  });

  return regionTotals;
}

/**
 * Calculate total from an object of values
 *
 * @param {Object} data - Object with numeric values
 * @returns {number} Sum of all values
 *
 * @example
 * calculateTotal({ jan: 100, feb: 150, mar: 200 }); // 450
 */
export function calculateTotal(data) {
  if (!data || typeof data !== 'object') {
    return 0;
  }

  return Object.values(data).reduce((sum, value) => {
    const num = typeof value === 'number' ? value : 0;
    return sum + num;
  }, 0);
}

// =============================================================================
// DATA TRANSFORMATION
// =============================================================================

/**
 * Convert monthly data object to array format for charts
 *
 * @param {Object} monthlyData - Monthly data object (keys 0-11)
 * @param {Array<string>} [monthNames=MONTH_NAMES] - Month names array
 * @returns {Array<Object>} Array of {label, value} objects
 *
 * @example
 * const data = { 0: 100, 1: 150, 2: 200, ..., 11: 120 };
 * monthlyDataToArray(data);
 * // Returns: [
 * //   { label: 'Jan', value: 100 },
 * //   { label: 'Feb', value: 150 },
 * //   ...
 * // ]
 */
export function monthlyDataToArray(monthlyData, monthNames = MONTH_NAMES) {
  return monthNames.map((label, index) => ({
    label,
    value: monthlyData[index] || 0,
  }));
}

/**
 * Convert object to array of {label, value} pairs
 * Useful for converting aggregated data to chart-ready format
 *
 * @param {Object} data - Object with string keys and numeric values
 * @param {Object} [labelMap={}] - Optional mapping of keys to display labels
 * @returns {Array<Object>} Array of {label, value} objects
 *
 * @example
 * const data = { associate: 100, agency: 50 };
 * const labels = { associate: 'Associate', agency: 'Agency' };
 * objectToArray(data, labels);
 * // Returns: [
 * //   { label: 'Associate', value: 100 },
 * //   { label: 'Agency', value: 50 }
 * // ]
 */
export function objectToArray(data, labelMap = {}) {
  if (!data || typeof data !== 'object') {
    return [];
  }

  return Object.entries(data).map(([key, value]) => ({
    label: labelMap[key] || key,
    value: typeof value === 'number' ? value : 0,
  }));
}

/**
 * Sort array by value descending
 *
 * @param {Array<Object>} array - Array of objects with value property
 * @returns {Array<Object>} Sorted array (descending by value)
 *
 * @example
 * const data = [
 *   { label: 'A', value: 10 },
 *   { label: 'B', value: 50 },
 *   { label: 'C', value: 30 }
 * ];
 * sortByValueDesc(data);
 * // Returns: [{ label: 'B', value: 50 }, { label: 'C', value: 30 }, { label: 'A', value: 10 }]
 */
export function sortByValueDesc(array) {
  return [...array].sort((a, b) => (b.value || 0) - (a.value || 0));
}

// =============================================================================
// VALIDATION AND SAFETY
// =============================================================================

/**
 * Safely get a numeric value from an object
 * Returns 0 if value is not a valid number
 *
 * @param {Object} obj - Object to get value from
 * @param {string} key - Key to access
 * @param {number} [defaultValue=0] - Default value if not found or invalid
 * @returns {number} Numeric value or default
 *
 * @example
 * safeGetNumber({ count: 100 }, 'count'); // 100
 * safeGetNumber({ count: 'abc' }, 'count'); // 0
 * safeGetNumber({}, 'count'); // 0
 * safeGetNumber({ count: null }, 'count', 10); // 10
 */
export function safeGetNumber(obj, key, defaultValue = 0) {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const value = obj[key];

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  return defaultValue;
}

/**
 * Ensure value is a valid array
 *
 * @param {*} value - Value to check
 * @returns {Array} Input if it's an array, empty array otherwise
 *
 * @example
 * ensureArray([1, 2, 3]); // [1, 2, 3]
 * ensureArray(null); // []
 * ensureArray('string'); // []
 */
export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Deep clone an object using JSON parse/stringify
 * Safe for simple objects with no functions or circular references
 *
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 *
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * cloned.b.c = 3;
 * console.log(original.b.c); // 2 (unchanged)
 */
export function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}
