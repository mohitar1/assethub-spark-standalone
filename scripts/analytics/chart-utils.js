/**
 * Shared Chart Utilities for Analytics Reports
 *
 * Provides common Chart.js loading, initialization, and rendering functions
 * to eliminate code duplication across all analytics reports.
 *
 * Usage:
 *   import { loadChartJs, createBarChart, createPieChart }
 *     from '../../scripts/analytics/chart-utils.js';
 *
 * @module scripts/analytics/chart-utils
 */

import {
  CHART_JS_CDN,
  CHART_DATALABELS_CDN,
  getRoleColor,
  GEO_COLORS,
} from './analytics-constants.js';

// Module-level loading state
let chartJsLoaded = false;
let chartDataLabelsLoaded = false;

// =============================================================================
// CHART.JS LIBRARY LOADING
// =============================================================================

/**
 * Load Chart.js library and plugins from CDN
 * Ensures libraries are only loaded once, even if called multiple times
 *
 * @returns {Promise<void>} Promise that resolves when Chart.js is loaded
 */
export async function loadChartJs() {
  if (chartJsLoaded && chartDataLabelsLoaded) {
    return Promise.resolve();
  }

  // Load Chart.js first
  if (!chartJsLoaded && !window.Chart) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHART_JS_CDN;
      script.onload = () => {
        chartJsLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  } else {
    chartJsLoaded = true;
  }

  // Then load DataLabels plugin
  if (!chartDataLabelsLoaded && !window.ChartDataLabels) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHART_DATALABELS_CDN;
      script.onload = () => {
        chartDataLabelsLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  } else {
    chartDataLabelsLoaded = true;
  }

  return Promise.resolve();
}

// =============================================================================
// CHART LIFECYCLE MANAGEMENT
// =============================================================================

/**
 * Destroy all chart instances safely
 * @param {Object} chartInstances - Object containing chart instances
 */
export function destroyCharts(chartInstances) {
  Object.keys(chartInstances).forEach((key) => {
    if (chartInstances[key]) {
      try {
        chartInstances[key].destroy();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[destroyCharts] Error destroying chart:', key, error);
      }
      // eslint-disable-next-line no-param-reassign
      chartInstances[key] = null;
    }
  });
}

/**
 * Destroy existing chart on a canvas if it exists
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
export function destroyExistingChart(canvas) {
  const existingChart = window.Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }
}

// =============================================================================
// DEFAULT CHART OPTIONS
// =============================================================================

/**
 * Default options for bar charts
 */
const DEFAULT_BAR_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    datalabels: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

/**
 * Default options for pie charts
 */
const DEFAULT_PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 15,
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return `${label}: ${value.toLocaleString()} (${percentage}%)`;
        },
      },
    },
    datalabels: {
      color: '#fff',
      font: {
        weight: 'bold',
        size: 14,
      },
      formatter: (value, context) => {
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
        return value > 0 ? `${value}\n${percentage}%` : '';
      },
    },
  },
};

// =============================================================================
// CHART FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a simple bar chart
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array<{month: string, count: number}>} data - Data array
 * @param {string} label - Dataset label
 * @param {Object} options - Additional chart options (merged with defaults)
 * @returns {Chart} Chart.js instance
 */
export function createBarChart(canvas, data, label = 'Count', options = {}) {
  destroyExistingChart(canvas);

  return new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.month || d.label),
      datasets: [{
        label,
        data: data.map((d) => d.count || d.value),
        backgroundColor: '#00647D',
        borderColor: '#004d61',
        borderWidth: 1,
      }],
    },
    options: {
      ...DEFAULT_BAR_OPTIONS,
      ...options,
    },
  });
}

/**
 * Create a stacked bar chart with multiple datasets
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array<string>} labels - X-axis labels (e.g., months)
 * @param {Array<Object>} datasets - Chart datasets with label, data, backgroundColor
 * @param {Object} options - Additional chart options (merged with defaults)
 * @returns {Chart} Chart.js instance
 */
export function createStackedBarChart(canvas, labels, datasets, options = {}) {
  destroyExistingChart(canvas);

  return new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.backgroundColor,
        borderColor: ds.backgroundColor,
        borderWidth: 0,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            padding: 15,
          },
        },
        title: {
          display: false,
        },
        datalabels: {
          display: false,
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: (value) => value.toLocaleString(),
          },
        },
      },
      ...options,
    },
  });
}

/**
 * Create a pie chart
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array<{type: string, count: number}>} data - Data array
 * @param {Array<string>|Function} colors - Array of colors or color mapping function
 * @param {Object} options - Additional chart options (merged with defaults)
 * @returns {Chart} Chart.js instance
 */
export function createPieChart(canvas, data, colors, options = {}) {
  destroyExistingChart(canvas);

  // Determine colors based on input type
  let chartColors;
  if (typeof colors === 'function') {
    chartColors = data.map((item) => colors(item.type));
  } else if (Array.isArray(colors)) {
    chartColors = colors;
  } else {
    // Default to sequential colors
    chartColors = data.map((_, index) => GEO_COLORS[index % GEO_COLORS.length]);
  }

  return new window.Chart(canvas, {
    type: 'pie',
    data: {
      labels: data.map((d) => d.type || d.label),
      datasets: [{
        data: data.map((d) => d.count || d.value),
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: '#fff',
      }],
    },
    options: {
      ...DEFAULT_PIE_OPTIONS,
      ...options,
    },
    plugins: [window.ChartDataLabels],
  });
}

/**
 * Create a horizontal bar chart
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array<{bucket: string, count: number}>} data - Data array
 * @param {string} label - Dataset label
 * @param {Object} options - Additional chart options (merged with defaults)
 * @returns {Chart} Chart.js instance
 */
export function createHorizontalBarChart(canvas, data, label = 'Count', options = {}) {
  destroyExistingChart(canvas);

  return new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.bucket || d.label),
      datasets: [{
        label,
        data: data.map((d) => d.count || d.value),
        backgroundColor: '#EBA439',
        borderColor: '#DC6E52',
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y', // Horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        datalabels: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value) => value.toLocaleString(),
          },
        },
        y: {
          ticks: {
            font: {
              size: 11,
            },
          },
        },
      },
      ...options,
    },
  });
}

// =============================================================================
// SPECIALIZED CHART FUNCTIONS (Common Patterns)
// =============================================================================

/**
 * Render monthly bar chart (used across multiple reports)
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array<{month: string, count: number}>} monthlyData - Monthly data
 * @param {string} label - Chart label
 * @returns {Chart} Chart.js instance
 */
export function renderMonthlyBarChart(canvas, monthlyData, label) {
  return createBarChart(canvas, monthlyData, label);
}

/**
 * Render role pie chart (used across multiple reports)
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array<{type: string, count: number}>} roleData - Role distribution data
 * @returns {Chart} Chart.js instance
 */
export function renderRolePieChart(canvas, roleData) {
  return createPieChart(canvas, roleData, getRoleColor);
}

/**
 * Render geography pie chart (used across multiple reports)
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array<{type: string, count: number}>} geoData - Geography distribution data
 * @returns {Chart} Chart.js instance
 */
export function renderGeoPieChart(canvas, geoData) {
  return createPieChart(
    canvas,
    geoData,
    geoData.map((_, index) => GEO_COLORS[index % GEO_COLORS.length]),
  );
}
