/**
 * Chart utilities for the Search Report
 * Uses shared chart utilities from scripts/analytics/chart-utils.js
 */

import { SEARCH_TYPE_COLORS } from './config.js';
import {
  createStackedBarChart,
  createPieChart,
  createHorizontalBarChart,
} from '../../scripts/analytics/chart-utils.js';

// Re-export shared utilities for backward compatibility
export {
  loadChartJs,
  destroyCharts,
  renderMonthlyBarChart,
  renderRolePieChart,
  renderGeoPieChart as renderMarketPieChart,
} from '../../scripts/analytics/chart-utils.js';

/**
 * Render stacked bar chart by search type
 * @param {HTMLCanvasElement} canvas - Canvas element for the chart
 * @param {Array} searchesByMonth - Monthly data with counts per search type
 * @returns {Chart} Chart.js instance
 */
export function renderSearchesByMonthChart(canvas, searchesByMonth) {
  const labels = searchesByMonth.map((item) => item.month);
  const datasets = [
    {
      label: 'All',
      data: searchesByMonth.map((item) => item.allCount),
      backgroundColor: SEARCH_TYPE_COLORS.all,
    },
    {
      label: 'Assets',
      data: searchesByMonth.map((item) => item.assetsCount),
      backgroundColor: SEARCH_TYPE_COLORS.assets,
    },
    {
      label: 'Products',
      data: searchesByMonth.map((item) => item.productsCount),
      backgroundColor: SEARCH_TYPE_COLORS.products,
    },
    {
      label: 'Templates',
      data: searchesByMonth.map((item) => item.templatesCount),
      backgroundColor: SEARCH_TYPE_COLORS.templates,
    },
  ];

  return createStackedBarChart(canvas, labels, datasets);
}

/**
 * Render search type distribution pie chart
 * @param {HTMLCanvasElement} canvas - Canvas element for the chart
 * @param {Array} distributionData - Distribution data by search type
 * @returns {Chart} Chart.js instance
 */
export function renderSearchTypeDistributionChart(canvas, distributionData) {
  const colorMapper = (type) => {
    const typeKey = type.toLowerCase();
    return SEARCH_TYPE_COLORS[typeKey] || '#999999';
  };

  return createPieChart(canvas, distributionData, colorMapper);
}

/**
 * Render result size distribution horizontal bar chart
 * @param {HTMLCanvasElement} canvas - Canvas element for the chart
 * @param {Array} distributionData - Distribution data by result size bucket
 * @returns {Chart} Chart.js instance
 */
export function renderResultSizeDistributionChart(canvas, distributionData) {
  return createHorizontalBarChart(canvas, distributionData, 'Number of Searches');
}
