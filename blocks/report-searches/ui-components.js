/**
 * UI Components for the Searches Report
 * Uses shared UI components from scripts/analytics/ui-components.js
 */

import {
  MONTH_NAMES,
  ANALYTICS_START_YEAR,
  ROLE_OPTIONS,
  SEARCH_TYPE_OPTIONS,
  SEARCH_TERM_OPTIONS,
  ALL_MARKETS_OPTION,
  FILTER_ELEMENT_IDS,
  UI_TEXT,
} from './config.js';
import {
  createMetricsSection as createSharedMetricsSection,
  createChartsSection,
  createFilterDropdown,
} from '../../scripts/analytics/ui-components.js';

/**
 * Create summary metrics section (all sourced from search_events).
 * @param {Object} summary - totalSearches, uniqueSearchers, firstTimeSearchers
 * @returns {HTMLElement} Metrics section
 */
export function createMetricsSection(summary) {
  const metrics = [
    { label: 'Total Searches', value: summary.totalSearches.toLocaleString() },
    { label: 'Unique Searchers', value: summary.uniqueSearchers.toLocaleString() },
    { label: 'First Time Searchers', value: summary.firstTimeSearchers.toLocaleString() },
  ];

  return createSharedMetricsSection(metrics, 'searches-metrics');
}

/**
 * Create Row 2: Unique Searchers Charts (3 charts)
 * @returns {HTMLElement} Charts section for unique searchers
 */
export function createUniqueSearchersChartsSection() {
  const chartConfigs = [
    { id: 'unique-searchers-monthly-chart', title: 'Unique Searchers by Month' },
    { id: 'unique-searchers-role-chart', title: 'Share of Searchers (by Role)' },
    { id: 'unique-searchers-market-chart', title: 'Share of Searchers (by Market)' },
  ];

  return createChartsSection(chartConfigs, 'searches-charts');
}

/**
 * Create Row 3: Search Events Charts (3 charts)
 * @returns {HTMLElement} Charts section for search events
 */
export function createSearchEventsChartsSection() {
  const chartConfigs = [
    { id: 'search-events-monthly-chart', title: 'Search Events by Month' },
    { id: 'search-events-role-chart', title: 'Share of Searches (by Role)' },
    { id: 'search-events-market-chart', title: 'Share of Searches (by Market)' },
  ];

  return createChartsSection(chartConfigs, 'searches-charts');
}

/** Column headers shared by both ranked-search tables */
const RANKED_SEARCH_TABLE_HEADERS = ['Rank', 'Search Term', 'Search Type', '# of Searchers', '# of Searches'];

/**
 * Capitalise a searchType value for display (e.g. "assets" → "Assets").
 * @param {string} type
 * @returns {string}
 */
function formatSearchType(type) {
  if (!type) return '';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Build a collapsible ranked-search table (shared by top-searches and
 * top-zero-result-searches).
 *
 * @param {Object} config
 * @param {string}   config.containerClass - CSS class for the outer container
 * @param {string}   config.title          - Heading text
 * @param {string}   config.emptyMessage   - Text shown when data is empty
 * @param {Array}    config.rows           - Processed search rows
 * @returns {HTMLElement}
 */
function createRankedSearchTable({
  containerClass, title, emptyMessage, rows,
}) {
  const container = document.createElement('div');
  container.className = `${containerClass} collapsible-section`;

  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'table-title collapsible-title';
  titleWrapper.innerHTML = `
    <span class="title-text">${title}</span>
    <span class="collapse-icon">▼</span>
  `;
  titleWrapper.addEventListener('click', () => {
    container.classList.toggle('collapsed');
  });
  container.appendChild(titleWrapper);

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'collapsible-content';

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'top-searches-table-wrapper';

  const table = document.createElement('table');
  table.className = 'top-searches-table report-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  RANKED_SEARCH_TABLE_HEADERS.forEach((headerText) => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!rows || rows.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = RANKED_SEARCH_TABLE_HEADERS.length;
    emptyCell.textContent = emptyMessage;
    emptyCell.className = 'empty-cell';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  } else {
    rows.forEach((search) => {
      const row = document.createElement('tr');

      const rankCell = document.createElement('td');
      rankCell.textContent = search.rank;
      rankCell.className = 'rank-cell';
      row.appendChild(rankCell);

      const termCell = document.createElement('td');
      termCell.textContent = search.searchTerm;
      termCell.className = 'search-term-cell';
      row.appendChild(termCell);

      const typeCell = document.createElement('td');
      typeCell.textContent = formatSearchType(search.searchType);
      typeCell.className = 'search-type-cell';
      row.appendChild(typeCell);

      const searchersCell = document.createElement('td');
      searchersCell.textContent = search.uniqueSearchers.toLocaleString();
      searchersCell.className = 'numeric-cell';
      row.appendChild(searchersCell);

      const searchesCell = document.createElement('td');
      searchesCell.textContent = search.totalSearches.toLocaleString();
      searchesCell.className = 'numeric-cell';
      row.appendChild(searchesCell);

      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  contentWrapper.appendChild(tableWrapper);
  container.appendChild(contentWrapper);

  return container;
}

/**
 * Create top searches table
 * @param {Array} topSearches - Top searches data
 * @returns {HTMLElement} Table container
 */
export function createTopSearchesTable(topSearches) {
  return createRankedSearchTable({
    containerClass: 'top-searches-container',
    title: 'Top Searches',
    emptyMessage: 'No search data available',
    rows: topSearches,
  });
}

/**
 * Create top zero-result searches table
 * @param {Array} topZeroResultSearches - Top zero-result searches data
 * @returns {HTMLElement} Table container
 */
export function createTopZeroResultSearchesTable(topZeroResultSearches) {
  return createRankedSearchTable({
    containerClass: 'top-zero-result-searches-container',
    title: 'Top 0-Result Searches',
    emptyMessage: 'No zero-result searches',
    rows: topZeroResultSearches,
  });
}

/**
 * Create search distribution charts section
 * @returns {HTMLElement} Distribution charts section
 */
export function createDistributionChartsSection() {
  const section = document.createElement('div');
  section.className = 'distribution-charts-section';

  // Search Type Distribution Chart
  const typeChartCard = document.createElement('div');
  typeChartCard.className = 'chart-card chart-card-pie';
  const typeTitle = document.createElement('h3');
  typeTitle.className = 'chart-title';
  typeTitle.textContent = 'Search Distribution by Type';
  const typeCanvasContainer = document.createElement('div');
  typeCanvasContainer.className = 'chart-canvas-wrapper';
  const typeCanvas = document.createElement('canvas');
  typeCanvas.id = 'search-type-distribution-chart';
  typeCanvasContainer.appendChild(typeCanvas);
  typeChartCard.appendChild(typeTitle);
  typeChartCard.appendChild(typeCanvasContainer);

  // Result Size Distribution Chart
  const sizeChartCard = document.createElement('div');
  sizeChartCard.className = 'chart-card chart-card-bar-horizontal';
  const sizeTitle = document.createElement('h3');
  sizeTitle.className = 'chart-title';
  sizeTitle.textContent = 'Search Distribution by Result Size';
  const sizeCanvasContainer = document.createElement('div');
  sizeCanvasContainer.className = 'chart-canvas-wrapper';
  const sizeCanvas = document.createElement('canvas');
  sizeCanvas.id = 'result-size-distribution-chart';
  sizeCanvasContainer.appendChild(sizeCanvas);
  sizeChartCard.appendChild(sizeTitle);
  sizeChartCard.appendChild(sizeCanvasContainer);

  section.appendChild(typeChartCard);
  section.appendChild(sizeChartCard);

  return section;
}

/**
 * Create market table with searchers and searches data
 * @param {Object} marketData - Market data with markets, users, and searches
 * @returns {HTMLElement} Table container
 */
export function createMarketTable(marketData) {
  const tableContainer = document.createElement('div');
  tableContainer.className = 'searches-table-container';

  const title = document.createElement('div');
  title.className = 'table-title';
  title.textContent = 'Searches by Market';

  const table = document.createElement('table');
  table.className = 'searches-market-table report-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const emptyTh = document.createElement('th');
  emptyTh.className = 'metric-label-header';
  headerRow.appendChild(emptyTh);

  (marketData.markets || []).forEach((market) => {
    const th = document.createElement('th');
    th.textContent = market;
    th.className = 'market-header';
    headerRow.appendChild(th);
  });

  const totalTh = document.createElement('th');
  totalTh.textContent = 'TOTAL';
  totalTh.className = 'market-header total-column';
  headerRow.appendChild(totalTh);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  const usersRow = document.createElement('tr');
  const usersLabel = document.createElement('td');
  usersLabel.textContent = '# of Searchers';
  usersLabel.className = 'metric-label';
  usersRow.appendChild(usersLabel);

  let usersTotal = 0;
  (marketData.markets || []).forEach((market) => {
    const td = document.createElement('td');
    const value = marketData.users[market] || 0;
    td.textContent = value.toLocaleString();
    td.className = 'numeric-cell';
    usersRow.appendChild(td);
    usersTotal += value;
  });

  const usersTotalTd = document.createElement('td');
  usersTotalTd.textContent = usersTotal.toLocaleString();
  usersTotalTd.className = 'numeric-cell total-cell';
  usersRow.appendChild(usersTotalTd);
  tbody.appendChild(usersRow);

  const createSearchTypeRow = (label, typeKey) => {
    const row = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.textContent = label;
    labelTd.className = 'metric-label search-type-row';
    row.appendChild(labelTd);

    let rowTotal = 0;
    (marketData.markets || []).forEach((market) => {
      const td = document.createElement('td');
      const value = marketData.searchesByType[typeKey][market] || 0;
      td.textContent = value.toLocaleString();
      td.className = 'numeric-cell';
      row.appendChild(td);
      rowTotal += value;
    });

    const totalTd = document.createElement('td');
    totalTd.textContent = rowTotal.toLocaleString();
    totalTd.className = 'numeric-cell total-cell';
    row.appendChild(totalTd);

    return row;
  };

  tbody.appendChild(createSearchTypeRow('All', 'all'));
  tbody.appendChild(createSearchTypeRow('Assets', 'assets'));
  tbody.appendChild(createSearchTypeRow('Products', 'products'));
  tbody.appendChild(createSearchTypeRow('Templates', 'templates'));

  const searchesRow = document.createElement('tr');
  const searchesLabel = document.createElement('td');
  searchesLabel.textContent = '# of Searches';
  searchesLabel.className = 'metric-label total-row';
  searchesRow.appendChild(searchesLabel);

  let searchesTotal = 0;
  (marketData.markets || []).forEach((market) => {
    const td = document.createElement('td');
    const value = marketData.searches[market] || 0;
    td.textContent = value.toLocaleString();
    td.className = 'numeric-cell total-row-cell';
    searchesRow.appendChild(td);
    searchesTotal += value;
  });

  const searchesTotalTd = document.createElement('td');
  searchesTotalTd.textContent = searchesTotal.toLocaleString();
  searchesTotalTd.className = 'numeric-cell total-cell';
  searchesRow.appendChild(searchesTotalTd);
  tbody.appendChild(searchesRow);

  table.appendChild(tbody);
  tableContainer.appendChild(title);
  tableContainer.appendChild(table);

  return tableContainer;
}

/**
 * Create filters section with two-row layout
 * Row 1: Date filters (View, Year, Month)
 * Row 2: User filters (Role, Market) + Search filters (Type, Term) + Reset button
 * @param {Object} filters - Current filter settings
 * @param {Function} handleFilterChange - Callback for filter changes
 * @param {Function} handleReset - Callback for reset button
 * @param {string[]} marketOptions - Distinct asset markets for the active date range
 * @returns {HTMLElement} The filter section element
 */
export function createFiltersSection(filters, handleFilterChange, handleReset, marketOptions = []) {
  const filterSection = document.createElement('div');
  filterSection.className = 'searches-filters';

  // =============================================================================
  // DATE FILTERS (ALWAYS VISIBLE)
  // =============================================================================
  const dateFiltersRow = document.createElement('div');
  dateFiltersRow.className = 'filters-row date-filters';

  // View type selector (Year vs Month)
  const viewTypeGroup = document.createElement('div');
  viewTypeGroup.className = 'filter-group';

  const viewTypeLabel = document.createElement('label');
  viewTypeLabel.textContent = 'View:';
  viewTypeLabel.htmlFor = 'view-type-select';

  const viewTypeSelect = document.createElement('select');
  viewTypeSelect.id = 'view-type-select';
  viewTypeSelect.className = 'filter-select';
  viewTypeSelect.innerHTML = `
    <option value="year">Year</option>
    <option value="month">Month</option>
  `;
  viewTypeSelect.value = filters.viewType;

  viewTypeSelect.addEventListener('change', (e) => {
    const newViewType = e.target.value;
    // Toggle month dropdown visibility
    const monthGroupEl = document.getElementById('month-filter-group');
    if (monthGroupEl) {
      monthGroupEl.style.display = newViewType === 'month' ? 'flex' : 'none';
    }
    handleFilterChange({ viewType: newViewType });
  });

  viewTypeGroup.appendChild(viewTypeLabel);
  viewTypeGroup.appendChild(viewTypeSelect);
  dateFiltersRow.appendChild(viewTypeGroup);

  // Year filter
  const yearGroup = document.createElement('div');
  yearGroup.className = 'filter-group';

  const yearLabel = document.createElement('label');
  yearLabel.textContent = 'Year:';
  yearLabel.htmlFor = 'year-select';

  const yearSelect = document.createElement('select');
  yearSelect.id = 'year-select';
  yearSelect.className = 'filter-select';
  for (let i = ANALYTICS_START_YEAR; i <= new Date().getFullYear(); i += 1) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    if (i === filters.selectedYear) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  }
  yearSelect.addEventListener('change', (e) => {
    handleFilterChange({ selectedYear: parseInt(e.target.value, 10) });
  });

  yearGroup.appendChild(yearLabel);
  yearGroup.appendChild(yearSelect);
  dateFiltersRow.appendChild(yearGroup);

  // Month filter
  const monthGroup = document.createElement('div');
  monthGroup.className = 'filter-group';
  monthGroup.id = 'month-filter-group';

  const monthLabel = document.createElement('label');
  monthLabel.textContent = 'Month:';
  monthLabel.htmlFor = 'month-select';

  const monthSelect = document.createElement('select');
  monthSelect.id = 'month-select';
  monthSelect.className = 'filter-select';
  MONTH_NAMES.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month;
    if (index === filters.selectedMonth) {
      option.selected = true;
    }
    monthSelect.appendChild(option);
  });
  monthSelect.addEventListener('change', (e) => {
    handleFilterChange({ selectedMonth: parseInt(e.target.value, 10) });
  });

  monthGroup.appendChild(monthLabel);
  monthGroup.appendChild(monthSelect);
  dateFiltersRow.appendChild(monthGroup);

  // Toggle month visibility based on viewType
  if (filters.viewType === 'year') {
    monthGroup.style.display = 'none';
  } else {
    monthGroup.style.display = 'flex';
  }

  // =============================================================================
  // COLLAPSIBLE TOGGLE (in date row, far right)
  // =============================================================================

  const toggleWrapper = document.createElement('div');
  toggleWrapper.className = 'filters-toggle-wrapper';

  const filterTitle = document.createElement('span');
  filterTitle.className = 'filters-toggle-label';
  filterTitle.textContent = UI_TEXT.ADDITIONAL_FILTERS_LABEL;

  const toggleButton = document.createElement('button');
  toggleButton.className = 'filters-toggle';
  toggleButton.setAttribute('aria-label', 'Toggle additional filters');

  // Start collapsed by default, but expand if filters are set in URL
  const hasActiveFilters = filters.role !== 'all'
    || filters.searchType !== 'all'
    || filters.searchTerm !== 'all'
    || filters.region !== 'all';
  const isCollapsed = !hasActiveFilters;

  const filtersContent = document.createElement('div');
  filtersContent.className = 'filters-content';
  if (isCollapsed) {
    filtersContent.classList.add('collapsed');
    toggleButton.classList.add('collapsed');
  }

  // Toggle functionality
  const handleToggle = () => {
    filtersContent.classList.toggle('collapsed');
    toggleButton.classList.toggle('collapsed');
  };

  toggleButton.addEventListener('click', handleToggle);
  toggleWrapper.addEventListener('click', handleToggle);

  toggleWrapper.appendChild(filterTitle);
  toggleWrapper.appendChild(toggleButton);
  dateFiltersRow.appendChild(toggleWrapper);

  filterSection.appendChild(dateFiltersRow);

  // User & Event filters row
  const dataFiltersRow = document.createElement('div');
  dataFiltersRow.className = 'filters-row data-filters';

  // --- USER FILTERS GROUP ---
  const userGroupWrapper = document.createElement('div');
  userGroupWrapper.className = 'filter-group-wrapper';

  const userGroupLabel = document.createElement('div');
  userGroupLabel.className = 'filter-group-label';
  userGroupLabel.textContent = 'User';

  const userGroupBox = document.createElement('div');
  userGroupBox.className = 'filter-group-box';

  // Role filter
  const roleGroup = document.createElement('div');
  roleGroup.className = 'filter-group';

  const roleLabel = document.createElement('label');
  roleLabel.textContent = 'Role:';
  roleLabel.htmlFor = FILTER_ELEMENT_IDS.ROLE;

  const roleSelect = createFilterDropdown({
    id: FILTER_ELEMENT_IDS.ROLE,
    options: ROLE_OPTIONS,
    selectedValue: filters.role || 'all',
    onChange: (value) => handleFilterChange({ role: value }),
  });

  roleGroup.appendChild(roleLabel);
  roleGroup.appendChild(roleSelect);
  userGroupBox.appendChild(roleGroup);

  // Market filter (dynamic options from asset allowedCountries)
  const marketGroup = document.createElement('div');
  marketGroup.className = 'filter-group';

  const marketLabel = document.createElement('label');
  marketLabel.textContent = 'Market:';
  marketLabel.htmlFor = FILTER_ELEMENT_IDS.MARKET;

  const marketFilterOptions = [
    ALL_MARKETS_OPTION,
    ...marketOptions.map((market) => ({ value: market, label: market })),
  ];

  const marketSelect = createFilterDropdown({
    id: FILTER_ELEMENT_IDS.MARKET,
    options: marketFilterOptions,
    selectedValue: filters.region || 'all',
    onChange: (value) => handleFilterChange({ region: value }),
  });

  marketGroup.appendChild(marketLabel);
  marketGroup.appendChild(marketSelect);
  userGroupBox.appendChild(marketGroup);

  userGroupWrapper.appendChild(userGroupLabel);
  userGroupWrapper.appendChild(userGroupBox);
  dataFiltersRow.appendChild(userGroupWrapper);

  // --- SEARCH FILTERS GROUP ---
  const searchGroupWrapper = document.createElement('div');
  searchGroupWrapper.className = 'filter-group-wrapper';

  const searchGroupLabel = document.createElement('div');
  searchGroupLabel.className = 'filter-group-label';
  searchGroupLabel.textContent = 'Search';

  const searchGroupBox = document.createElement('div');
  searchGroupBox.className = 'filter-group-box';

  // Search Type filter
  const searchTypeGroup = document.createElement('div');
  searchTypeGroup.className = 'filter-group';

  const searchTypeLabel = document.createElement('label');
  searchTypeLabel.textContent = 'Type:';
  searchTypeLabel.htmlFor = FILTER_ELEMENT_IDS.SEARCH_TYPE;

  const searchTypeSelect = createFilterDropdown({
    id: FILTER_ELEMENT_IDS.SEARCH_TYPE,
    options: SEARCH_TYPE_OPTIONS,
    selectedValue: filters.searchType || 'all',
    onChange: (value) => handleFilterChange({ searchType: value }),
  });

  searchTypeGroup.appendChild(searchTypeLabel);
  searchTypeGroup.appendChild(searchTypeSelect);
  searchGroupBox.appendChild(searchTypeGroup);

  // Search Term filter
  const searchTermGroup = document.createElement('div');
  searchTermGroup.className = 'filter-group';

  const searchTermLabel = document.createElement('label');
  searchTermLabel.textContent = 'Term:';
  searchTermLabel.htmlFor = FILTER_ELEMENT_IDS.SEARCH_TERM;

  const searchTermSelect = createFilterDropdown({
    id: FILTER_ELEMENT_IDS.SEARCH_TERM,
    options: SEARCH_TERM_OPTIONS,
    selectedValue: filters.searchTerm || 'all',
    onChange: (value) => handleFilterChange({ searchTerm: value }),
  });

  searchTermGroup.appendChild(searchTermLabel);
  searchTermGroup.appendChild(searchTermSelect);
  searchGroupBox.appendChild(searchTermGroup);

  searchGroupWrapper.appendChild(searchGroupLabel);
  searchGroupWrapper.appendChild(searchGroupBox);
  dataFiltersRow.appendChild(searchGroupWrapper);

  // --- RESET BUTTON ---
  const resetButton = document.createElement('button');
  resetButton.className = 'reset-button';
  resetButton.textContent = UI_TEXT.RESET_FILTERS_BUTTON;
  resetButton.addEventListener('click', handleReset);

  dataFiltersRow.appendChild(resetButton);

  filtersContent.appendChild(dataFiltersRow);

  // Add collapsible content section
  filterSection.appendChild(filtersContent);

  return filterSection;
}
