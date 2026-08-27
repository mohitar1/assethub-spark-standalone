/**
 * Shared UI Components for Analytics Reports
 *
 * Provides reusable component factories to eliminate duplication across reports.
 * All reports (logins, searches, downloads, etc.) should use these shared components.
 *
 * @module scripts/analytics/ui-components
 */

// =============================================================================
// METRIC CARDS
// =============================================================================

/**
 * Create a single metric card
 *
 * @param {Object} metric - Metric data
 * @param {string} metric.label - Metric label (e.g., "Unique Users")
 * @param {string|number} metric.value - Metric value (will be formatted)
 * @param {string} [className='metric-card'] - Optional custom class name
 * @returns {HTMLElement} Metric card element
 *
 * @example
 * const card = createMetricCard({
 *   label: 'Unique Users',
 *   value: 1234
 * });
 */
export function createMetricCard(metric, className = 'metric-card') {
  const card = document.createElement('div');
  card.className = className;
  card.innerHTML = `
    <div class="metric-content">
      <div class="metric-value">${metric.value}</div>
      <div class="metric-label">${metric.label}</div>
    </div>
  `;
  return card;
}

/**
 * Create a metrics section with multiple metric cards
 *
 * @param {Array<Object>} metrics - Array of metric objects
 * @param {string} [containerClass='analytics-metrics'] - Container class name
 * @returns {HTMLElement} Metrics section container
 *
 * @example
 * const metrics = [
 *   { label: 'Total Users', value: '1,234' },
 *   { label: 'New Users', value: '567' }
 * ];
 * const section = createMetricsSection(metrics, 'logins-metrics');
 */
export function createMetricsSection(metrics, containerClass = 'analytics-metrics') {
  const metricsSection = document.createElement('div');
  metricsSection.className = containerClass;

  metrics.forEach((metric) => {
    const card = createMetricCard(metric);
    metricsSection.appendChild(card);
  });

  return metricsSection;
}

// =============================================================================
// CHART CARDS
// =============================================================================

/**
 * Create a chart card with canvas element
 *
 * @param {Object} config - Chart configuration
 * @param {string} config.id - Canvas element ID
 * @param {string} config.title - Chart title
 * @param {string} [config.containerClass='chart-card'] - Container class
 * @param {string} [config.canvasClass=''] - Additional canvas class
 * @returns {HTMLElement} Chart card element
 *
 * @example
 * const chart = createChartCard({
 *   id: 'monthly-chart',
 *   title: 'Users by Month',
 *   containerClass: 'chart-card chart-card-bar'
 * });
 */
export function createChartCard(config) {
  const {
    id,
    title,
    containerClass = 'chart-card',
    canvasClass = '',
  } = config;

  const card = document.createElement('div');
  card.className = containerClass;
  card.innerHTML = `
    <div class="chart-title">${title}</div>
    <div class="chart-container">
      <canvas id="${id}" class="${canvasClass}"></canvas>
    </div>
  `;

  return card;
}

/**
 * Create a charts section with multiple chart cards
 *
 * @param {Array<Object>} chartConfigs - Array of chart configurations
 * @param {string} [containerClass='analytics-charts'] - Container class name
 * @returns {HTMLElement} Charts section container
 *
 * @example
 * const charts = [
 *   { id: 'chart-1', title: 'Users by Month' },
 *   { id: 'chart-2', title: 'Users by Role' },
 *   { id: 'chart-3', title: 'Users by Geography' }
 * ];
 * const section = createChartsSection(charts, 'logins-charts');
 */
export function createChartsSection(chartConfigs, containerClass = 'analytics-charts') {
  const chartsSection = document.createElement('div');
  chartsSection.className = containerClass;

  chartConfigs.forEach((config) => {
    const card = createChartCard(config);
    chartsSection.appendChild(card);
  });

  return chartsSection;
}

// =============================================================================
// FILTER COMPONENTS
// =============================================================================

/**
 * Create a filter dropdown select element
 *
 * @param {Object} config - Filter configuration
 * @param {string} config.id - Element ID
 * @param {Array<{value: string, label: string}>} config.options - Dropdown options
 * @param {string} [config.selectedValue] - Currently selected value
 * @param {Function} config.onChange - Change handler function
 * @param {string} [config.className='filter-select'] - CSS class name
 * @returns {HTMLSelectElement} Select element
 *
 * @example
 * const roleFilter = createFilterDropdown({
 *   id: 'role-select',
 *   options: [
 *     { value: 'all', label: 'All Roles' },
 *     { value: 'associate', label: 'Associate' }
 *   ],
 *   selectedValue: 'all',
 *   onChange: (value) => console.log(value)
 * });
 */
export function createFilterDropdown(config) {
  const {
    id,
    options,
    selectedValue,
    onChange,
    className = 'filter-select',
  } = config;

  const select = document.createElement('select');
  select.id = id;
  select.className = className;

  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  select.addEventListener('change', (e) => onChange(e.target.value));
  return select;
}

/**
 * Create a filter group with label and dropdown
 *
 * @param {Object} config - Filter group configuration
 * @param {string} config.label - Filter label
 * @param {string} config.id - Dropdown ID
 * @param {Array} config.options - Dropdown options
 * @param {string} config.selectedValue - Selected value
 * @param {Function} config.onChange - Change handler
 * @param {string} [config.containerClass='filter-group'] - Container class
 * @returns {HTMLElement} Filter group element
 *
 * @example
 * const roleFilterGroup = createFilterGroup({
 *   label: 'Role:',
 *   id: 'role-select',
 *   options: roleOptions,
 *   selectedValue: 'all',
 *   onChange: handleRoleChange
 * });
 */
export function createFilterGroup(config) {
  const {
    label,
    id,
    options,
    selectedValue,
    onChange,
    containerClass = 'filter-group',
  } = config;

  const group = document.createElement('div');
  group.className = containerClass;

  const labelElement = document.createElement('label');
  labelElement.setAttribute('for', id);
  labelElement.textContent = label;

  const dropdown = createFilterDropdown({
    id,
    options,
    selectedValue,
    onChange,
  });

  group.appendChild(labelElement);
  group.appendChild(dropdown);

  return group;
}

/**
 * Create a date range filter (year and month dropdowns)
 *
 * @param {Object} config - Date filter configuration
 * @param {number} config.selectedYear - Selected year
 * @param {number} config.selectedMonth - Selected month (1-12)
 * @param {Function} config.onYearChange - Year change handler
 * @param {Function} config.onMonthChange - Month change handler
 * @param {number} [config.startYear=2020] - Earliest year option
 * @param {Array<string>} [config.monthNames] - Month names array
 * @returns {HTMLElement} Date filter group
 *
 * @example
 * const dateFilter = createDateRangeFilter({
 *   selectedYear: 2026,
 *   selectedMonth: 2,
 *   onYearChange: handleYearChange,
 *   onMonthChange: handleMonthChange
 * });
 */
export function createDateRangeFilter(config) {
  const {
    selectedYear,
    selectedMonth,
    onYearChange,
    onMonthChange,
    startYear = 2020,
    monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  } = config;

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= startYear; year -= 1) {
    years.push({ value: year.toString(), label: year.toString() });
  }

  const months = monthNames.map((name, index) => ({
    value: (index + 1).toString(),
    label: name,
  }));

  const container = document.createElement('div');
  container.className = 'date-range-filter';

  const yearGroup = createFilterGroup({
    label: 'Year:',
    id: 'year-select',
    options: years,
    selectedValue: selectedYear.toString(),
    onChange: onYearChange,
  });

  const monthGroup = createFilterGroup({
    label: 'Month:',
    id: 'month-select',
    options: months,
    selectedValue: selectedMonth.toString(),
    onChange: onMonthChange,
  });

  container.appendChild(yearGroup);
  container.appendChild(monthGroup);

  return container;
}

// =============================================================================
// COLLAPSIBLE SECTIONS
// =============================================================================

/**
 * Create a collapsible section with toggle functionality
 *
 * @param {Object} config - Collapsible section configuration
 * @param {string} config.title - Section title
 * @param {HTMLElement|string} config.content - Content element or HTML string
 * @param {boolean} [config.collapsed=false] - Initial collapsed state
 * @param {string} [config.containerClass='analytics-collapsible-section'] - Container class
 * @param {string} [config.titleClass='analytics-collapsible-title'] - Title class
 * @param {string} [config.contentClass='analytics-collapsible-content'] - Content class
 * @returns {HTMLElement} Collapsible section element
 *
 * @example
 * const section = createCollapsibleSection({
 *   title: 'Additional Filters',
 *   content: filtersElement,
 *   collapsed: true
 * });
 */
export function createCollapsibleSection(config) {
  const {
    title,
    content,
    collapsed = false,
    containerClass = 'analytics-collapsible-section',
    titleClass = 'analytics-collapsible-title',
    contentClass = 'analytics-collapsible-content',
  } = config;

  const container = document.createElement('div');
  container.className = containerClass;
  if (collapsed) {
    container.classList.add('collapsed');
  }

  // Title with toggle icon
  const titleWrapper = document.createElement('div');
  titleWrapper.className = titleClass;
  titleWrapper.innerHTML = `
    <span class="analytics-title-text">${title}</span>
    <span class="analytics-collapse-icon">▼</span>
  `;

  // Toggle functionality
  titleWrapper.addEventListener('click', () => {
    container.classList.toggle('collapsed');
  });

  // Content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.className = contentClass;

  if (typeof content === 'string') {
    contentWrapper.innerHTML = content;
  } else {
    contentWrapper.appendChild(content);
  }

  container.appendChild(titleWrapper);
  container.appendChild(contentWrapper);

  return container;
}

// =============================================================================
// TABLE COMPONENTS
// =============================================================================

/**
 * Create a table header row
 *
 * @param {Array<string|Object>} columns - Column definitions
 * @param {string} [columns[].label] - Column label
 * @param {string} [columns[].className] - Column header class
 * @returns {HTMLElement} Table header element
 *
 * @example
 * // Simple string array
 * const header = createTableHeader(['Name', 'Count', 'Percentage']);
 *
 * // Or with custom config
 * const header = createTableHeader([
 *   { label: 'Name', className: 'text-left' },
 *   { label: 'Count', className: 'text-right' }
 * ]);
 */
export function createTableHeader(columns) {
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  columns.forEach((col) => {
    const th = document.createElement('th');

    if (typeof col === 'string') {
      th.textContent = col;
    } else {
      th.textContent = col.label || '';
      if (col.className) {
        th.className = col.className;
      }
    }

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  return thead;
}

/**
 * Create a table row
 *
 * @param {Array<string|number|Object>} cells - Cell values or configurations
 * @param {string} [cells[].content] - Cell content
 * @param {string} [cells[].className] - Cell class name
 * @param {Object} [cells[].attrs] - Additional attributes
 * @returns {HTMLElement} Table row element
 *
 * @example
 * // Simple values
 * const row = createTableRow(['John', 42, '25%']);
 *
 * // Or with custom config
 * const row = createTableRow([
 *   { content: 'John', className: 'name-cell' },
 *   { content: 42, className: 'numeric' }
 * ]);
 */
export function createTableRow(cells) {
  const row = document.createElement('tr');

  cells.forEach((cell) => {
    const td = document.createElement('td');

    if (typeof cell === 'object' && cell !== null && !Array.isArray(cell)) {
      td.innerHTML = cell.content !== undefined ? cell.content : '';
      if (cell.className) {
        td.className = cell.className;
      }
      if (cell.attrs) {
        Object.entries(cell.attrs).forEach(([key, value]) => {
          td.setAttribute(key, value);
        });
      }
    } else {
      td.textContent = cell !== null && cell !== undefined ? cell : '';
    }

    row.appendChild(td);
  });

  return row;
}

/**
 * Create a complete table with header and rows
 *
 * @param {Object} config - Table configuration
 * @param {Array} config.columns - Column definitions
 * @param {Array<Array>} config.rows - Row data (array of arrays)
 * @param {string} [config.className='analytics-table'] - Table class name
 * @param {string} [config.containerClass] - Optional container class
 * @returns {HTMLElement} Table element or container with table
 *
 * @example
 * const table = createTable({
 *   columns: ['Name', 'Count', 'Percentage'],
 *   rows: [
 *     ['Associate', 100, '50%'],
 *     ['Agency', 75, '37.5%'],
 *     ['Partner', 25, '12.5%']
 *   ],
 *   className: 'report-table'
 * });
 */
export function createTable(config) {
  const {
    columns,
    rows,
    className = 'analytics-table',
    containerClass,
  } = config;

  const table = document.createElement('table');
  table.className = className;

  // Add header
  const thead = createTableHeader(columns);
  table.appendChild(thead);

  // Add rows
  const tbody = document.createElement('tbody');
  rows.forEach((rowData) => {
    const row = createTableRow(rowData);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  // Return table with or without container
  if (containerClass) {
    const container = document.createElement('div');
    container.className = containerClass;
    container.appendChild(table);
    return container;
  }

  return table;
}

/**
 * Create a table container with title
 *
 * @param {Object} config - Container configuration
 * @param {string} config.title - Table title
 * @param {HTMLElement} config.table - Table element
 * @param {string} [config.containerClass='analytics-table-container'] - Container class
 * @param {string} [config.titleClass='analytics-table-title'] - Title class
 * @param {boolean} [config.collapsible=false] - Make section collapsible
 * @returns {HTMLElement} Table container element
 *
 * @example
 * const container = createTableContainer({
 *   title: 'Logins by Geography',
 *   table: tableElement,
 *   containerClass: 'logins-table-container'
 * });
 */
export function createTableContainer(config) {
  const {
    title,
    table,
    containerClass = 'analytics-table-container',
    titleClass = 'analytics-table-title',
    collapsible = false,
  } = config;

  if (collapsible) {
    return createCollapsibleSection({
      title,
      content: table,
      containerClass,
    });
  }

  const container = document.createElement('div');
  container.className = containerClass;

  const titleElement = document.createElement('div');
  titleElement.className = titleClass;
  titleElement.textContent = title;

  container.appendChild(titleElement);
  container.appendChild(table);

  return container;
}

// =============================================================================
// LOADING AND ERROR STATES
// =============================================================================

/**
 * Create a loading state message
 *
 * @param {string} [message='Loading...'] - Loading message
 * @param {string} [className='analytics-loading-state'] - CSS class name
 * @returns {HTMLElement} Loading state element
 */
export function createLoadingState(message = 'Loading...', className = 'analytics-loading-state') {
  const loading = document.createElement('div');
  loading.className = className;
  loading.textContent = message;
  return loading;
}

/**
 * Create an error state message
 *
 * @param {string} message - Error message
 * @param {string} [className='analytics-error-state'] - CSS class name
 * @returns {HTMLElement} Error state element
 */
export function createErrorState(message, className = 'analytics-error-state') {
  const error = document.createElement('div');
  error.className = className;
  error.textContent = message;
  return error;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a number with locale-specific formatting
 *
 * @param {number} value - Number to format
 * @param {Object} [options] - Intl.NumberFormat options
 * @returns {string} Formatted number string
 *
 * @example
 * formatNumber(1234567); // "1,234,567"
 * formatNumber(0.1234, { style: 'percent' }); // "12.34%"
 */
export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Escape HTML to prevent XSS
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create an element with class and optional content
 *
 * @param {string} tag - HTML tag name
 * @param {string} [className] - CSS class name
 * @param {string|HTMLElement} [content] - Content (text or element)
 * @returns {HTMLElement} Created element
 *
 * @example
 * const div = createElement('div', 'my-class', 'Hello World');
 */
export function createElement(tag, className, content) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else {
      element.appendChild(content);
    }
  }

  return element;
}
