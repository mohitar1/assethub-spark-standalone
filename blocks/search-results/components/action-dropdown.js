/**
 * Action Dropdown Component - Vanilla JS implementation matching React's ActionDropdown
 * Uses .ui.simple.dropdown.item structure for styling consistency
 */

/**
 * Create an action dropdown
 * @param {Object} options - Dropdown options
 * @returns {HTMLElement} Dropdown element
 */
export function createActionDropdown(options) {
  const {
    className = '',
    items = [],
    handlers = [],
    show = true,
    label = 'Actions',
    selectedItem,
    onSelectedItemChange,
    disabled = false,
    disabledItems = [],
  } = options;

  // Generate unique ID
  const baseId = className ? className.replace(/\s+/g, '-').toLowerCase() : 'dropdown';
  const dropdownId = `${baseId}-${Math.random().toString(36).substr(2, 9)}`;

  const container = document.createElement('div');
  // Always build the full dropdown, just add 'hidden' class when show is false
  container.className = `dropdown-actions-section ${className}${show ? '' : ' hidden'}`.trim();

  // Create dropdown using React's structure
  container.innerHTML = `
    <div class="ui simple dropdown item ${disabled ? 'disabled' : ''}" id="${dropdownId}">
      <span class="dropdown-label">${selectedItem || label}</span>
      <i class="dropdown icon"></i>
      <div class="menu">
        ${items.map((item, index) => `
          <div class="item ${selectedItem === item ? 'selected' : ''} ${disabledItems.includes(item) ? 'disabled' : ''}" data-index="${index}">${item}</div>
        `).join('')}
      </div>
    </div>
  `;

  const dropdown = container.querySelector('.ui.simple.dropdown.item');
  const menu = dropdown.querySelector('.menu');
  const labelSpan = dropdown.querySelector('.dropdown-label');

  if (disabled) {
    return container;
  }

  // Handle dropdown click
  dropdown.addEventListener('click', (e) => {
    // Don't toggle if clicking on menu item
    if (e.target.classList.contains('item') && e.target.closest('.menu')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      menu.style.display = 'none';
      dropdown.classList.remove('open');
    } else {
      menu.style.display = 'block';
      dropdown.classList.add('open');
    }
  });

  // Handle menu item clicks
  const menuItems = menu.querySelectorAll('.item');
  menuItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Skip disabled items
      if (item.classList.contains('disabled')) return;

      const index = parseInt(item.dataset.index, 10);
      const itemText = item.textContent;

      // Update selected state
      menuItems.forEach((i) => i.classList.remove('selected'));
      item.classList.add('selected');

      // Update label
      labelSpan.textContent = itemText;

      // Call handler
      if (handlers[index]) {
        handlers[index]();
      }

      // Call onSelectedItemChange
      if (onSelectedItemChange) {
        onSelectedItemChange(itemText);
      }

      // Close dropdown
      menu.style.display = 'none';
      dropdown.classList.remove('open');
    });
  });

  // Handle click outside
  const handleClickOutside = (e) => {
    if (dropdown.classList.contains('open') && !dropdown.contains(e.target)) {
      menu.style.display = 'none';
      dropdown.classList.remove('open');
    }
  };

  document.addEventListener('mousedown', handleClickOutside);

  // Store cleanup function
  container.cleanup = () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };

  return container;
}

/**
 * Update dropdown selected item
 * @param {HTMLElement} container - Dropdown container
 * @param {string} selectedItem - New selected item
 */
export function updateDropdownSelection(container, selectedItem) {
  if (!container) return;

  const label = container.querySelector('.dropdown-label');
  if (label) {
    label.textContent = selectedItem;
  }

  const items = container.querySelectorAll('.menu .item');
  items.forEach((item) => {
    if (item.textContent === selectedItem) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}
