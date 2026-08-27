/* eslint-disable import/no-cycle, import/prefer-default-export, no-use-before-define */
/**
 * Search Panel Component - Search results header with actions
 */

import { getState, setState } from '../search-results.js';
import { saveSearchExpandAllDetailsState } from '../utils/toggle-state-storage.js';
import { createActionDropdown } from './action-dropdown.js';
import { getSearchPlaceholders, ph } from '../utils/placeholders.js';
import { buildOrderBy } from '../utils/sort-utils.js';

/**
 * Get orderBy string for ContentAI from selected sort type and direction
 * Returns null for 'topResults' (relevance-based, no explicit sort)
 * @returns {string|null} orderBy string or null for top results
 */
export function getOrderBy() {
  const state = getState();
  const { selectedSortType, selectedSortDirection } = state;
  if (selectedSortType === 'topResults') return null;
  return buildOrderBy(selectedSortType, selectedSortDirection);
}

// Cached placeholders
let placeholders = null;

/**
 * Create the search panel
 * @param {HTMLElement} container - Container element
 * @param {Object} callbacks - Callback functions
 */
export async function createSearchPanel(container, callbacks) {
  // Load placeholders if not cached
  if (!placeholders) {
    placeholders = await getSearchPlaceholders();
  }
  /* eslint-disable no-unused-vars */
  const {
    totalCount,
    selectedCount,
    displayedCount,
    onSelectAll,
    onToggleMobileFilter,
    onBulkShare,
    onBulkAddToCollection,
    onBulkAddToCart,
    onShareSearch,
  } = callbacks;
  /* eslint-enable no-unused-vars */

  const state = getState();
  const {
    viewType, expandAllDetails, isMobileFilterOpen, selectedSortType, selectedSortDirection,
  } = state;

  // Sort options: key -> label mapping (state stores keys, display uses labels)
  const sortTypeOptions = [
    { key: 'topResults', label: ph(placeholders, 'topResults', 'Top Results') },
    { key: 'dateCreated', label: ph(placeholders, 'dateCreated', 'Date Created') },
    { key: 'lastModified', label: ph(placeholders, 'lastModified', 'Last Modified') },
    { key: 'size', label: ph(placeholders, 'size', 'Size') },
  ];

  const sortDirectionOptions = [
    { key: 'ascending', label: ph(placeholders, 'ascending', 'Ascending') },
    { key: 'descending', label: ph(placeholders, 'descending', 'Descending') },
  ];

  // Get display labels from state keys
  const selectedSortTypeLabel = sortTypeOptions
    .find((o) => o.key === selectedSortType)?.label || selectedSortType;
  const selectedSortDirectionLabel = sortDirectionOptions
    .find((o) => o.key === selectedSortDirection)?.label || selectedSortDirection;

  const gridViewLabel = ph(placeholders, 'gridView', 'Grid View');
  const listViewLabel = ph(placeholders, 'listView', 'List View');
  const filterLabel = ph(placeholders, 'filter', 'Filter');
  const showFilterLabel = ph(placeholders, 'showFilter', 'Show Filter');
  const hideFilterLabel = ph(placeholders, 'hideFilter', 'Hide Filter');
  const totalLabel = ph(placeholders, 'total', 'Total');
  const selectAllLabel = ph(placeholders, 'selectAll', 'Select All');
  const showFullDetailsLabel = ph(placeholders, 'showFullDetails', 'Show full details');
  const shareSearchLabel = ph(placeholders, 'shareSearch', 'Share Search');

  container.innerHTML = `
    <!-- Search Primary Panel -->
    <div class="search-primary-panel">
      <div class="primary-panel-container">
        <!-- Left side -->
        <div class="left-panel-group">
          <div class="sort-dropdown-container SortCards sort-dropdown-disabled" id="sort-type-dropdown"></div>
          <div class="sort-dropdown-container SortCards sort-dropdown-disabled" id="sort-direction-dropdown"></div>

          <!-- Show Full Details Toggle -->
          <div class="cmp-title">
            <h1>${showFullDetailsLabel}
              <label class="toggle-switch">
                <input type="checkbox" class="expand-details-toggle" ${expandAllDetails ? 'checked' : ''} />
                <span class="toggle-switch-track"></span>
              </label>
            </h1>
          </div>
        </div>
        
        <!-- Right side: Filter button -->
        <div class="right-panel-group">
          <div class="card-view-container">
            <button class="view-toggle-btn grid-view-btn ${viewType === 'grid' ? 'active' : ''}" type="button" data-tooltip="${gridViewLabel}" aria-pressed="${viewType === 'grid'}">
              <span class="icon-mask icon-mask-gridview" aria-hidden="true"></span>
            </button>
            <button class="view-toggle-btn list-view-btn ${viewType === 'list' ? 'active' : ''}" type="button" data-tooltip="${listViewLabel}" aria-pressed="${viewType === 'list'}">
              <span class="icon-mask icon-mask-listview" aria-hidden="true"></span>
            </button>
          </div>
          
          <button class="filter-button" type="button" aria-label="${filterLabel}">
            <span class="icon-mask icon-mask-filter-search filter-icon" aria-hidden="true"></span>
            <span class="filter-button-label">${isMobileFilterOpen ? hideFilterLabel : showFilterLabel}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Search Secondary Panel -->
    <div class="search-secondary-panel">
      <div class="secondary-panel-container">
        <!-- Left side: Total, Select All, Actions -->
        <div class="left-panel-group">
          <!-- Total Count -->
          <div class="search-statistics">
            <div class="total-statistic">
              <span class="total-count">${totalCount}</span>
              <span class="total-label">${totalLabel}</span>
            </div>
          </div>
          
          <!-- Select All -->
          <div class="select-section">
            <label class="select-all">
              <input type="checkbox" id="select-all" ${selectedCount > 0 && selectedCount === displayedCount ? 'checked' : ''} />
              <span>${selectAllLabel} ${selectedCount > 0 ? `<span class="dropdown-count">(${selectedCount})</span>` : ''}</span>
            </label>
          </div>
          
          <!-- Actions Dropdown Container -->
          <div id="actions-dropdown-container" class="${selectedCount > 0 ? '' : 'hidden'}"></div>
        </div>

        <!-- Right side: Share search -->
        <div class="right-panel-group" data-tooltip="${shareSearchLabel}">
          <button class="share-search-btn" aria-label="${shareSearchLabel}"></button>
        </div>
      </div>
    </div>
  `;

  // Create sort type dropdown (stores keys in state, displays translated labels)
  const sortTypeContainer = container.querySelector('#sort-type-dropdown');
  if (sortTypeContainer) {
    const sortTypeDropdown = createActionDropdown({
      className: 'SortCards',
      items: sortTypeOptions.map((o) => o.label),
      handlers: [],
      show: true,
      selectedItem: selectedSortTypeLabel,
      onSelectedItemChange: (label) => {
        const option = sortTypeOptions.find((o) => o.label === label);
        if (option) {
          // Top Results only supports descending (relevance order)
          const updates = { selectedSortType: option.key };
          if (option.key === 'topResults') {
            updates.selectedSortDirection = 'descending';
          }
          setState(updates);
        }
      },
      disabled: false,
    });
    sortTypeContainer.replaceWith(sortTypeDropdown);
  }

  // Create sort direction dropdown
  // When Top Results is selected, ascending is disabled (greyed out)
  const isTopResults = selectedSortType === 'topResults';
  const ascendingLabel = sortDirectionOptions.find((o) => o.key === 'ascending')?.label;
  const disabledDirections = isTopResults && ascendingLabel ? [ascendingLabel] : [];
  const sortDirectionContainer = container.querySelector('#sort-direction-dropdown');
  if (sortDirectionContainer) {
    const sortDirectionDropdown = createActionDropdown({
      className: 'SortCards',
      items: sortDirectionOptions.map((o) => o.label),
      handlers: [],
      show: true,
      selectedItem: selectedSortDirectionLabel,
      onSelectedItemChange: (label) => {
        const option = sortDirectionOptions.find((o) => o.label === label);
        if (option) setState({ selectedSortDirection: option.key });
      },
      disabledItems: disabledDirections,
    });
    sortDirectionContainer.replaceWith(sortDirectionDropdown);
  }

  // Create actions dropdown
  const actionsContainer = container.querySelector('#actions-dropdown-container');
  const actionsLabel = ph(placeholders, 'actions', 'Actions');
  const addToCartLabel = ph(placeholders, 'addToCart', 'Add to cart');
  const addToCollectionLabel = ph(placeholders, 'addToCollection', 'Add to Collection');
  const shareLabel = ph(placeholders, 'share', 'Share');

  if (actionsContainer) {
    const actionsDropdown = createActionDropdown({
      className: 'BulkActions',
      items: [addToCartLabel, addToCollectionLabel, shareLabel],
      handlers: [
        () => callbacks.onBulkAddToCart?.(),
        () => callbacks.onBulkAddToCollection?.(),
        () => callbacks.onBulkShare?.(),
      ],
      show: selectedCount > 0,
      label: actionsLabel,
    });
    actionsContainer.replaceWith(actionsDropdown);
  }

  // Bind event listeners
  bindEvents(container, callbacks);
}

function bindEvents(container, callbacks) {
  /* eslint-disable no-unused-vars */
  const {
    onSelectAll,
    onToggleMobileFilter,
    onBulkShare,
    onBulkAddToCollection,
    onBulkAddToCart,
    onShareSearch,
  } = callbacks;
  /* eslint-enable no-unused-vars */

  // Expand details toggle
  const expandToggle = container.querySelector('.expand-details-toggle');
  if (expandToggle) {
    expandToggle.addEventListener('change', (e) => {
      setState({ expandAllDetails: e.target.checked });
      saveSearchExpandAllDetailsState(e.target.checked);
    });
  }

  // Grid view button
  const gridBtn = container.querySelector('.grid-view-btn');
  const listBtn = container.querySelector('.list-view-btn');

  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      setState({ viewType: 'grid' });
      gridBtn.classList.add('active');
      gridBtn.setAttribute('aria-pressed', 'true');
      if (listBtn) {
        listBtn.classList.remove('active');
        listBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // List view button
  if (listBtn) {
    listBtn.addEventListener('click', () => {
      setState({ viewType: 'list' });
      listBtn.classList.add('active');
      listBtn.setAttribute('aria-pressed', 'true');
      if (gridBtn) {
        gridBtn.classList.remove('active');
        gridBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // Filter button
  const filterBtn = container.querySelector('.filter-button');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      onToggleMobileFilter();
      const { isMobileFilterOpen } = getState();
      const showFilterLabel = ph(placeholders, 'showFilter', 'Show Filter');
      const hideFilterLabel = ph(placeholders, 'hideFilter', 'Hide Filter');
      const labelEl = filterBtn.querySelector('.filter-button-label');
      if (labelEl) {
        labelEl.textContent = isMobileFilterOpen ? hideFilterLabel : showFilterLabel;
      }
    });
  }

  // Select all checkbox
  const selectAllCheckbox = container.querySelector('#select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => onSelectAll(e.target.checked));
  }

  // Share search button
  const shareSearchBtn = container.querySelector('.share-search-btn');
  if (shareSearchBtn && onShareSearch) {
    shareSearchBtn.addEventListener('click', onShareSearch);
  }
}
