/**
 * Searches Report Block
 * Main entry point that orchestrates data loading, chart rendering, and UI updates
 */

import {
  CHART_INIT_DELAY,
  FILTER_ELEMENT_IDS,
  ANALYTICS_START_YEAR,
  ANALYTICS_MAX_YEAR,
  ROLE_OPTIONS,
  SEARCH_TYPE_OPTIONS,
  SEARCH_TERM_OPTIONS,
  isValidMarketToken,
} from './config.js';
import {
  loadChartJs,
  destroyCharts,
  renderMonthlyBarChart,
  renderSearchesByMonthChart,
  renderRolePieChart,
  renderMarketPieChart,
  renderSearchTypeDistributionChart,
  renderResultSizeDistributionChart,
} from './chart-utils.js';
import { fetchSearchMetrics, fetchDistinctMarkets } from './data-calculations.js';
import showToast from '../../scripts/toast/toast.js';
import {
  createMetricsSection,
  createUniqueSearchersChartsSection,
  createSearchEventsChartsSection,
  createFiltersSection,
  createTopSearchesTable,
  createTopZeroResultSearchesTable,
  createDistributionChartsSection,
  createMarketTable,
} from './ui-components.js';

/**
 * Parse query parameters from URL with validation
 * Invalid filter values are silently reset to 'all'
 * @returns {Object} Object with filters and invalidFilters array
 */
function parseQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const year = params.get('year');
  const month = params.get('month');

  // Track if any invalid filters were found
  const invalidFilters = [];

  // Validate role filter
  const rawRole = params.get('role') || 'all';
  const validRole = ROLE_OPTIONS.some((opt) => opt.value === rawRole);
  const role = validRole ? rawRole : 'all';
  if (!validRole && rawRole !== 'all') {
    invalidFilters.push(`role="${rawRole}"`);
  }

  // Validate search type filter
  const rawSearchType = params.get('searchType') || 'all';
  const validSearchType = SEARCH_TYPE_OPTIONS.some((opt) => opt.value === rawSearchType);
  const searchType = validSearchType ? rawSearchType : 'all';
  if (!validSearchType && rawSearchType !== 'all') {
    invalidFilters.push(`searchType="${rawSearchType}"`);
  }

  // Validate search term filter
  const rawSearchTerm = params.get('searchTerm') || 'all';
  const validSearchTerm = SEARCH_TERM_OPTIONS.some((opt) => opt.value === rawSearchTerm);
  const searchTerm = validSearchTerm ? rawSearchTerm : 'all';
  if (!validSearchTerm && rawSearchTerm !== 'all') {
    invalidFilters.push(`searchTerm="${rawSearchTerm}"`);
  }

  // Validate market filter (token safety; availability checked after API load)
  const rawRegion = params.get('region') || 'all';
  const validRegion = rawRegion === 'all' || isValidMarketToken(rawRegion);
  const region = validRegion ? rawRegion : 'all';
  if (!validRegion && rawRegion !== 'all') {
    invalidFilters.push(`region="${rawRegion}"`);
  }

  const filters = {
    viewType: 'year', // Default to year view
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth(), // 0-11
    // Data filters (validated and sanitized)
    role,
    searchType,
    searchTerm,
    region,
  };

  // If year is provided in query params
  if (year) {
    const yearNum = parseInt(year, 10);
    const isValidYear = !Number.isNaN(yearNum)
      && yearNum >= ANALYTICS_START_YEAR
      && yearNum <= ANALYTICS_MAX_YEAR;
    if (isValidYear) {
      filters.selectedYear = yearNum;

      // If month is also provided, switch to month view
      if (month) {
        const monthNum = parseInt(month, 10);
        // Month in query is 1-12, but we store as 0-11
        if (!Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
          filters.viewType = 'month';
          filters.selectedMonth = monthNum - 1; // Convert to 0-based
        }
      }
    }
  }

  return { filters, invalidFilters };
}

// State management
const state = {
  chartData: null,
  chartInstances: {
    uniqueSearchersMonth: null,
    uniqueSearchersRole: null,
    uniqueSearchersMarket: null,
    searchEventsMonth: null,
    searchEventsRole: null,
    searchEventsMarket: null,
    searchTypeDistribution: null,
    resultSizeDistribution: null,
  },
  filters: null,
  invalidFilters: [],
  marketOptions: [],
};

/**
 * Update URL query parameters based on current filters
 */
function updateURLParams() {
  const { filters } = state;
  const {
    viewType, selectedYear, selectedMonth, role, searchType, searchTerm, region,
  } = filters;
  const params = new URLSearchParams();
  params.set('year', selectedYear);

  if (viewType === 'month') {
    params.set('month', selectedMonth + 1);
  }

  // Add data filters to URL (only if not 'all')
  if (role && role !== 'all') {
    params.set('role', role);
  }
  if (searchType && searchType !== 'all') {
    params.set('searchType', searchType);
  }
  if (searchTerm && searchTerm !== 'all') {
    params.set('searchTerm', searchTerm);
  }
  if (region && region !== 'all') {
    params.set('region', region);
  }

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ filters: state.filters }, '', newURL);
}

/**
 * Initialize all charts with current data
 */
function initializeCharts() {
  const { chartData } = state;

  if (!chartData) {
    // eslint-disable-next-line no-console
    console.error('[Report Searches] No chart data available');
    return;
  }

  // Row 2: Unique Searchers Charts
  const uniqueSearchersMonthCanvas = document.getElementById('unique-searchers-monthly-chart');
  if (uniqueSearchersMonthCanvas && chartData.uniqueSearchersByMonth) {
    state.chartInstances.uniqueSearchersMonth = renderMonthlyBarChart(
      uniqueSearchersMonthCanvas,
      chartData.uniqueSearchersByMonth,
      'Unique Searchers',
    );
  }

  const uniqueSearchersRoleCanvas = document.getElementById('unique-searchers-role-chart');
  if (uniqueSearchersRoleCanvas && chartData.uniqueSearchersByRole) {
    state.chartInstances.uniqueSearchersRole = renderRolePieChart(
      uniqueSearchersRoleCanvas,
      chartData.uniqueSearchersByRole,
    );
  }

  const uniqueSearchersMarketCanvas = document.getElementById('unique-searchers-market-chart');
  if (uniqueSearchersMarketCanvas && chartData.uniqueSearchersByMarket) {
    state.chartInstances.uniqueSearchersMarket = renderMarketPieChart(
      uniqueSearchersMarketCanvas,
      chartData.uniqueSearchersByMarket,
    );
  }

  // Row 3: Search Events Charts
  const searchEventsMonthCanvas = document.getElementById('search-events-monthly-chart');
  if (searchEventsMonthCanvas && chartData.searchesByMonth) {
    state.chartInstances.searchEventsMonth = renderSearchesByMonthChart(
      searchEventsMonthCanvas,
      chartData.searchesByMonth,
    );
  }

  const searchEventsRoleCanvas = document.getElementById('search-events-role-chart');
  if (searchEventsRoleCanvas && chartData.searchesByRole) {
    state.chartInstances.searchEventsRole = renderRolePieChart(
      searchEventsRoleCanvas,
      chartData.searchesByRole,
    );
  }

  const searchEventsMarketCanvas = document.getElementById('search-events-market-chart');
  if (searchEventsMarketCanvas && chartData.searchesByMarket) {
    state.chartInstances.searchEventsMarket = renderMarketPieChart(
      searchEventsMarketCanvas,
      chartData.searchesByMarket,
    );
  }

  // Distribution Charts
  const searchTypeDistributionCanvas = document.getElementById('search-type-distribution-chart');
  if (searchTypeDistributionCanvas && chartData.searchDistributionByType) {
    // eslint-disable-next-line no-console
    console.log('[Searches Report] Search type distribution data:', chartData.searchDistributionByType);
    state.chartInstances.searchTypeDistribution = renderSearchTypeDistributionChart(
      searchTypeDistributionCanvas,
      chartData.searchDistributionByType,
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn('[Searches Report] Missing search type distribution data or canvas');
  }

  const resultSizeDistributionCanvas = document.getElementById('result-size-distribution-chart');
  if (resultSizeDistributionCanvas && chartData.searchDistributionByResultSize) {
    // eslint-disable-next-line no-console
    console.log('[Searches Report] Result size distribution data:', chartData.searchDistributionByResultSize);
    state.chartInstances.resultSizeDistribution = renderResultSizeDistributionChart(
      resultSizeDistributionCanvas,
      chartData.searchDistributionByResultSize,
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn('[Searches Report] Missing result size distribution data or canvas');
  }
}

/**
 * Sync market dropdown options from API and validate current selection.
 * @returns {Promise<void>}
 */
async function refreshMarketOptions() {
  const markets = await fetchDistinctMarkets(state.filters);
  state.marketOptions = markets;

  const marketSelect = document.getElementById(FILTER_ELEMENT_IDS.MARKET);
  if (marketSelect) {
    const selected = state.filters.region || 'all';
    marketSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Markets';
    marketSelect.appendChild(allOption);
    markets.forEach((market) => {
      const option = document.createElement('option');
      option.value = market;
      option.textContent = market;
      marketSelect.appendChild(option);
    });
    if (selected !== 'all' && !markets.includes(selected)) {
      state.filters.region = 'all';
      state.invalidFilters.push(`region="${selected}"`);
      marketSelect.value = 'all';
    } else {
      marketSelect.value = selected;
    }
  }
}

/**
 * Refresh the report with current filter settings
 */
async function refreshReport() {
  const { filters } = state;

  await refreshMarketOptions();

  // Destroy all existing charts
  destroyCharts(state.chartInstances);

  // Fetch new data
  const metrics = await fetchSearchMetrics(filters);

  if (!metrics) {
    // eslint-disable-next-line no-console
    console.error('[Report Searches] Failed to load search metrics');
    return;
  }

  // Update state with new chart data
  state.chartData = {
    uniqueSearchersByMonth: metrics.uniqueSearchersByMonth,
    uniqueSearchersByRole: metrics.uniqueSearchersByRole,
    uniqueSearchersByMarket: metrics.uniqueSearchersByMarket,
    searchesByMonth: metrics.searchesByMonth,
    searchesByRole: metrics.searchesByRole,
    searchesByMarket: metrics.searchesByMarket,
    marketTableData: metrics.marketTableData,
    searchDistributionByType: metrics.searchDistributionByType,
    searchDistributionByResultSize: metrics.searchDistributionByResultSize,
    topSearches: metrics.topSearches,
    topZeroResultSearches: metrics.topZeroResultSearches,
  };

  // Update metrics section
  const metricsSection = document.querySelector('.searches-metrics');
  if (metricsSection) {
    const newMetrics = createMetricsSection({
      totalSearches: metrics.totalSearches,
      uniqueSearchers: metrics.uniqueSearchers,
      firstTimeSearchers: metrics.firstTimeSearchers,
    });
    metricsSection.replaceWith(newMetrics);
  }

  // Update top searches table
  const topSearchesContainer = document.querySelector('.top-searches-container');
  if (topSearchesContainer && state.chartData.topSearches) {
    const newTopSearches = createTopSearchesTable(state.chartData.topSearches);
    topSearchesContainer.replaceWith(newTopSearches);
  }

  // Update top zero-result searches table
  const topZeroResultSearchesContainer = document.querySelector(
    '.top-zero-result-searches-container',
  );
  if (topZeroResultSearchesContainer && state.chartData.topZeroResultSearches) {
    const newTopZeroResultSearches = createTopZeroResultSearchesTable(
      state.chartData.topZeroResultSearches,
    );
    topZeroResultSearchesContainer.replaceWith(newTopZeroResultSearches);
  }

  // Update market table
  const tableContainer = document.querySelector('.searches-table-container');
  if (tableContainer && state.chartData.marketTableData) {
    const newTable = createMarketTable(state.chartData.marketTableData);
    tableContainer.replaceWith(newTable);
  }

  // Re-initialize all charts
  setTimeout(() => {
    initializeCharts();
  }, CHART_INIT_DELAY);
}

/**
 * Handle filter changes
 * @param {Object} changes - Filter changes to apply
 */
async function handleFilterChange(changes) {
  Object.assign(state.filters, changes);
  updateURLParams();
  await refreshReport();
}

/**
 * Handle filter reset - resets user and event filters to 'all'
 */
async function handleFilterReset() {
  Object.assign(state.filters, {
    role: 'all',
    searchType: 'all',
    searchTerm: 'all',
    region: 'all',
  });

  // Update the UI dropdowns to reflect the reset
  const roleSelect = document.getElementById(FILTER_ELEMENT_IDS.ROLE);
  const marketSelect = document.getElementById(FILTER_ELEMENT_IDS.MARKET);
  const searchTypeSelect = document.getElementById(FILTER_ELEMENT_IDS.SEARCH_TYPE);
  const searchTermSelect = document.getElementById(FILTER_ELEMENT_IDS.SEARCH_TERM);

  if (roleSelect) roleSelect.value = 'all';
  if (marketSelect) marketSelect.value = 'all';
  if (searchTypeSelect) searchTypeSelect.value = 'all';
  if (searchTermSelect) searchTermSelect.value = 'all';

  updateURLParams();
  await refreshReport();

  // Show confirmation toast
  showToast('Filters reset to default values', 'success');
}

/**
 * Main decorate function - initializes the searches report
 * @param {HTMLElement} block - The block element to decorate
 */
export default async function decorate(block) {
  block.innerHTML = '';

  // Parse and validate URL parameters
  const { filters, invalidFilters } = parseQueryParams();
  state.filters = filters;
  state.invalidFilters = invalidFilters;

  // Listen for browser back/forward navigation
  window.addEventListener('popstate', async (event) => {
    if (event.state?.filters) {
      state.filters = event.state.filters;
      await refreshReport();
    }
  });

  const container = document.createElement('div');
  container.className = 'searches-report-container';

  // Add header
  const header = document.createElement('div');
  header.className = 'searches-header';
  const title = document.createElement('h1');
  title.className = 'searches-title';
  title.textContent = 'Searches Report';
  header.appendChild(title);
  container.appendChild(header);

  // Add loading state
  const loading = document.createElement('div');
  loading.className = 'loading-state';
  loading.textContent = 'Loading search data...';
  container.appendChild(loading);

  block.appendChild(container);

  try {
    // Load Chart.js library
    await loadChartJs();
    loading.remove();

    // Load market options and add filters section
    state.marketOptions = await fetchDistinctMarkets(state.filters);
    if (state.filters.region !== 'all' && !state.marketOptions.includes(state.filters.region)) {
      state.invalidFilters.push(`region="${state.filters.region}"`);
      state.filters.region = 'all';
    }

    const filtersEl = createFiltersSection(
      state.filters,
      handleFilterChange,
      handleFilterReset,
      state.marketOptions,
    );
    container.appendChild(filtersEl);

    // Fetch initial data
    const metrics = await fetchSearchMetrics(state.filters);

    if (!metrics) {
      throw new Error('Failed to load search data');
    }

    // Store chart data in state
    state.chartData = {
      uniqueSearchersByMonth: metrics.uniqueSearchersByMonth,
      uniqueSearchersByRole: metrics.uniqueSearchersByRole,
      uniqueSearchersByMarket: metrics.uniqueSearchersByMarket,
      searchesByMonth: metrics.searchesByMonth,
      searchesByRole: metrics.searchesByRole,
      searchesByMarket: metrics.searchesByMarket,
      marketTableData: metrics.marketTableData,
      searchDistributionByType: metrics.searchDistributionByType,
      searchDistributionByResultSize: metrics.searchDistributionByResultSize,
      topSearches: metrics.topSearches,
      topZeroResultSearches: metrics.topZeroResultSearches,
    };

    // Add metrics section (Row 1)
    const metricsEl = createMetricsSection({
      totalSearches: metrics.totalSearches,
      uniqueSearchers: metrics.uniqueSearchers,
      firstTimeSearchers: metrics.firstTimeSearchers,
    });
    container.appendChild(metricsEl);

    // Add Row 2: Unique Searchers Charts
    const uniqueSearchersCharts = createUniqueSearchersChartsSection();
    container.appendChild(uniqueSearchersCharts);

    // Add Row 3: Search Events Charts
    const searchEventsCharts = createSearchEventsChartsSection();
    container.appendChild(searchEventsCharts);

    // Add distribution charts section
    const distributionCharts = createDistributionChartsSection();
    container.appendChild(distributionCharts);

    // Add market table
    const marketTable = createMarketTable(metrics.marketTableData);
    container.appendChild(marketTable);

    // Add top searches table
    const topSearchesTable = createTopSearchesTable(metrics.topSearches);
    container.appendChild(topSearchesTable);

    // Add top zero-result searches table
    const topZeroResultSearchesTable = createTopZeroResultSearchesTable(
      metrics.topZeroResultSearches,
    );
    container.appendChild(topZeroResultSearchesTable);

    // Initialize all charts after DOM is ready
    setTimeout(() => {
      initializeCharts();

      // Show warning toast if any invalid filters were detected (after page loads)
      if (state.invalidFilters.length > 0) {
        const filterList = state.invalidFilters.join(', ');
        showToast(`Invalid URL parameters (${filterList}) - reset to defaults`, 'warning');
      }
    }, CHART_INIT_DELAY);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Report Searches] Error decorating block:', error);
    const errorState = document.createElement('div');
    errorState.className = 'error-state';

    // Check if it's a filter validation error from backend
    if (error.message?.includes('Invalid') && error.message?.includes('filter')) {
      errorState.innerHTML = `
        <strong>Invalid Filter Parameters</strong><br>
        ${error.message}<br><br>
        <a href="${window.location.pathname}" class="error-reset-link">Reset to default filters</a>
      `;
    } else {
      errorState.innerHTML = `
        <strong>Failed to load report</strong><br>
        ${error.message}<br><br>
        <a href="${window.location.pathname}" class="error-reset-link">Try again with default filters</a>
      `;
    }

    container.appendChild(errorState);
    loading.remove();
  }
}
