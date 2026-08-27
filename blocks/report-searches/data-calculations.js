/**
 * Data calculation utilities for the Searches Report
 * Handles data fetching and processing from the search-metrics D1 API
 */

/* eslint-disable import/prefer-default-export */

import { MONTH_NAMES, processRoleData } from './config.js';
import { buildDateRange as sharedBuildDateRange } from '../../scripts/analytics/data-utils.js';

function buildDateRange(viewType, selectedYear, selectedMonth) {
  return sharedBuildDateRange(viewType, selectedYear, selectedMonth);
}

/**
 * Fetch a single metric from the API
 * @param {string} metricType - Type of metric to fetch
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} searchFilters - Optional search filters (role, searchType, searchTerm, region)
 * @returns {Promise<any>} Metric data
 */
async function fetchMetric(metricType, startDate, endDate, searchFilters = {}) {
  const params = new URLSearchParams({
    type: metricType,
    startDate,
    endDate,
  });

  if (searchFilters.role && searchFilters.role !== 'all') {
    params.set('role', searchFilters.role);
  }
  if (searchFilters.searchType && searchFilters.searchType !== 'all') {
    params.set('searchType', searchFilters.searchType);
  }
  if (searchFilters.searchTerm && searchFilters.searchTerm !== 'all') {
    params.set('searchTerm', searchFilters.searchTerm);
  }
  if (searchFilters.region && searchFilters.region !== 'all') {
    params.set('region', searchFilters.region);
  }

  const response = await fetch(`/api/analytics/search-metrics?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${metricType}`);
  }
  const json = await response.json();
  return json.data || [];
}

/**
 * Fetch distinct asset market values for the report date range (dropdown options).
 * @param {Object} filters - Current filter settings (viewType, selectedYear, selectedMonth)
 * @returns {Promise<string[]>}
 */
export async function fetchDistinctMarkets(filters) {
  const { viewType, selectedYear, selectedMonth } = filters;
  const { startDate, endDate } = buildDateRange(viewType, selectedYear, selectedMonth);
  try {
    const rows = await fetchMetric('distinctMarkets', startDate, endDate);
    return rows.map((row) => row.market).filter(Boolean);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Searches Report] Failed to load market options:', err);
    return [];
  }
}

function processMonthlyData(monthlyData, selectedYear, countField) {
  const dataMap = {};
  monthlyData.forEach((item) => {
    dataMap[item.month] = parseInt(item[countField], 10) || 0;
  });

  const result = [];
  for (let i = 0; i < 12; i += 1) {
    const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
    result.push({
      month: MONTH_NAMES[i],
      count: dataMap[monthKey] || 0,
    });
  }
  return result;
}

function processMonthlyDataBySearchType(monthlyData, selectedYear) {
  const dataMap = {};

  monthlyData.forEach((item) => {
    const { month, searchType, searches } = item;
    if (!dataMap[month]) {
      dataMap[month] = {
        all: 0, assets: 0, products: 0, templates: 0,
      };
    }
    const count = parseInt(searches, 10) || 0;
    if (searchType === 'all' || searchType === 'assets' || searchType === 'products' || searchType === 'templates') {
      dataMap[month][searchType] = count;
    }
  });

  const result = [];
  for (let i = 0; i < 12; i += 1) {
    const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
    const monthData = dataMap[monthKey] || {
      all: 0, assets: 0, products: 0, templates: 0,
    };
    result.push({
      month: MONTH_NAMES[i],
      allCount: monthData.all,
      assetsCount: monthData.assets,
      productsCount: monthData.products,
      templatesCount: monthData.templates,
    });
  }

  return result;
}

/**
 * Process market data for pie charts (API returns pre-aggregated rows).
 * @param {Array} marketData - Rows with { market, users|searches }
 * @param {string} countField - 'users' or 'searches'
 * @returns {Array<{ type: string, count: number }>}
 */
function processMarketData(marketData, countField = 'users') {
  return marketData
    .map((item) => ({
      type: item.market || 'Unknown',
      count: parseInt(item[countField], 10) || 0,
    }))
    .filter((item) => item.count > 0);
}

function processSearchDistributionByType(distributionData) {
  const typeLabels = {
    all: 'All',
    assets: 'Assets',
    products: 'Products',
    templates: 'Templates',
  };

  return distributionData.map((item) => ({
    type: typeLabels[item.searchType] || item.searchType,
    count: parseInt(item.searches, 10) || 0,
  }));
}

function processSearchDistributionByResultSize(distributionData) {
  return distributionData
    .map((item) => ({
      bucket: item.bucket,
      count: parseInt(item.searches, 10) || 0,
    }))
    .filter((item) => item.count > 0);
}

export function processTopSearchData(item, index) {
  return {
    rank: index + 1,
    searchTerm: item.searchTerm || '',
    searchType: item.searchType || '',
    uniqueSearchers: parseInt(item.uniqueSearchers, 10) || 0,
    totalSearches: parseInt(item.totalSearches, 10) || 0,
  };
}

function processTopSearches(topSearchesData) {
  return topSearchesData.map(processTopSearchData);
}

function processTopZeroResultSearches(topZeroResultSearchesData) {
  return topZeroResultSearchesData.map(processTopSearchData);
}

/**
 * Build market table data with dynamic columns from API rows.
 * @param {Array} usersData - uniqueSearchersByMarket rows
 * @param {Array} searchesData - searchesByMarket rows
 * @param {Array} searchesByTypeData - searchesByMarketAndType rows
 * @returns {Object}
 */
function processMarketTableData(usersData, searchesData, searchesByTypeData) {
  const marketSet = new Set();
  usersData.forEach((row) => { if (row.market) marketSet.add(row.market); });
  searchesData.forEach((row) => { if (row.market) marketSet.add(row.market); });
  searchesByTypeData.forEach((row) => { if (row.market) marketSet.add(row.market); });

  const markets = [...marketSet].sort((a, b) => a.localeCompare(b));

  const users = {};
  const searches = {};
  const searchesByType = {
    all: {},
    assets: {},
    products: {},
    templates: {},
  };

  markets.forEach((market) => {
    users[market] = 0;
    searches[market] = 0;
    searchesByType.all[market] = 0;
    searchesByType.assets[market] = 0;
    searchesByType.products[market] = 0;
    searchesByType.templates[market] = 0;
  });

  usersData.forEach((item) => {
    if (item.market && users[item.market] !== undefined) {
      users[item.market] += parseInt(item.users, 10) || 0;
    }
  });

  searchesData.forEach((item) => {
    if (item.market && searches[item.market] !== undefined) {
      searches[item.market] += parseInt(item.searches, 10) || 0;
    }
  });

  searchesByTypeData.forEach((item) => {
    const { market, searchType } = item;
    const count = parseInt(item.searches, 10) || 0;
    if (market && searchType && searchesByType[searchType]?.[market] !== undefined) {
      searchesByType[searchType][market] += count;
    }
  });

  return {
    markets,
    users,
    searches,
    searchesByType,
  };
}

/**
 * Fetch search metrics based on current filters
 * @param {Object} filters - Current filter settings
 * @returns {Promise<Object|null>} Processed search metrics
 */
export async function fetchSearchMetrics(filters) {
  const {
    viewType, selectedYear, selectedMonth, role, searchType, searchTerm, region,
  } = filters;
  const { startDate, endDate } = buildDateRange(viewType, selectedYear, selectedMonth);

  const searchFilters = {
    role, searchType, searchTerm, region,
  };

  try {
    const [
      totalSearchesData,
      uniqueSearchersData,
      firstTimeSearchersData,
      uniqueSearchersByMonthData,
      uniqueSearchersByRoleData,
      uniqueSearchersByMarketData,
      searchesByMonthData,
      searchesByRoleData,
      searchesByMarketData,
      searchesByMarketAndTypeData,
      searchDistributionByTypeData,
      searchDistributionByResultSizeData,
      topSearchesData,
      topZeroResultSearchesData,
    ] = await Promise.all([
      fetchMetric('totalSearches', startDate, endDate, searchFilters),
      fetchMetric('uniqueSearchers', startDate, endDate, searchFilters),
      fetchMetric('firstTimeSearchers', startDate, endDate, searchFilters),
      fetchMetric('uniqueSearchersByMonth', startDate, endDate, searchFilters),
      fetchMetric('uniqueSearchersByRole', startDate, endDate, searchFilters),
      fetchMetric('uniqueSearchersByMarket', startDate, endDate, searchFilters),
      fetchMetric('searchesByMonth', startDate, endDate, searchFilters),
      fetchMetric('searchesByRole', startDate, endDate, searchFilters),
      fetchMetric('searchesByMarket', startDate, endDate, searchFilters),
      fetchMetric('searchesByMarketAndType', startDate, endDate, searchFilters),
      fetchMetric('searchDistributionByType', startDate, endDate, searchFilters),
      fetchMetric('searchDistributionByResultSize', startDate, endDate, searchFilters),
      fetchMetric('topSearches', startDate, endDate, searchFilters),
      fetchMetric('topZeroResultSearches', startDate, endDate, searchFilters),
    ]);

    return {
      totalSearches: totalSearchesData[0]?.total || 0,
      uniqueSearchers: uniqueSearchersData[0]?.unique_count || 0,
      firstTimeSearchers: firstTimeSearchersData[0]?.first_time_count || 0,
      uniqueSearchersByMonth: processMonthlyData(uniqueSearchersByMonthData, selectedYear, 'users'),
      uniqueSearchersByRole: processRoleData(uniqueSearchersByRoleData, 'users'),
      uniqueSearchersByMarket: processMarketData(uniqueSearchersByMarketData, 'users'),
      searchesByMonth: processMonthlyDataBySearchType(searchesByMonthData, selectedYear),
      searchesByRole: processRoleData(searchesByRoleData, 'searches'),
      searchesByMarket: processMarketData(searchesByMarketData, 'searches'),
      marketTableData: processMarketTableData(
        uniqueSearchersByMarketData,
        searchesByMarketData,
        searchesByMarketAndTypeData,
      ),
      searchDistributionByType: processSearchDistributionByType(searchDistributionByTypeData),
      searchDistributionByResultSize: processSearchDistributionByResultSize(
        searchDistributionByResultSizeData,
      ),
      topSearches: processTopSearches(topSearchesData),
      topZeroResultSearches: processTopZeroResultSearches(topZeroResultSearchesData),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Searches Report] Error fetching search metrics:', error);

    if (error.message?.includes('Invalid') && error.message?.includes('filter')) {
      throw new Error(`Invalid filter value detected. ${error.message}`);
    }

    return null;
  }
}
