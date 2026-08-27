/* eslint-disable import/prefer-default-export, no-use-before-define */
/**
 * MyDatePicker Component - Pure JS date picker with calendar popup
 * Converted from React MyDatePicker.tsx
 */

import { getAppLabel } from '../../../../scripts/locale-utils.js';

// Module state for tracking open pickers
let activePickerId = null;
let pickerCounter = 0;
// Cached placeholder function
let ph = null;

/**
 * Get days in month
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get first day of month (0 = Sunday, 6 = Saturday)
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

/**
 * Check if two dates are the same day
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date is today
 * @param {Date} date
 * @returns {boolean}
 */
function isToday(date) {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is before another date (day comparison only)
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
function isDateBefore(date1, date2) {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1 < d2;
}

/**
 * Check if a date is after another date (day comparison only)
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
function isDateAfter(date1, date2) {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1 > d2;
}

/**
 * Create the date picker component
 * @param {Object} options
 * @param {Date|null} options.value - Current date value
 * @param {function(Date|null): void} options.onChange - Change handler
 * @param {string} [options.label] - Label text
 * @param {string} [options.ariaLabel] - Aria label
 * @param {boolean} [options.showClearButton=false] - Show clear button
 * @param {function(): void} [options.onClear] - Clear handler
 * @param {string} [options.className=''] - Additional CSS class
 * @param {number} [options.portalZIndex=1] - Z-index for calendar popup portal
 * @param {Date|null} [options.minValue] - Minimum selectable date
 * @param {Date|null} [options.maxValue] - Maximum selectable date
 * @returns {HTMLElement}
 */
export async function createDatePicker(options) {
  // Load placeholders first
  if (!ph) {
    ph = await getAppLabel();
  }

  const {
    value = null,
    onChange,
    // eslint-disable-next-line no-unused-vars
    label = '',
    ariaLabel = ph('selectDate', 'Select date'),
    showClearButton = false,
    onClear,
    className = '',
    portalZIndex = 1,
    minValue = null,
    maxValue = null,
  } = options;

  // Store constraint values (can be updated externally)
  let minDate = minValue;
  let maxDate = maxValue;

  pickerCounter += 1;
  const pickerId = `date-picker-${pickerCounter}`;

  // State
  let currentValue = value;
  let viewYear = value ? value.getFullYear() : new Date().getFullYear();
  let viewMonth = value ? value.getMonth() : new Date().getMonth();
  let isOpen = false;
  let isMonthPickerOpen = false;
  let isYearPickerOpen = false;
  let yearRangeStart = Math.max(0, viewYear - 5); // 12-year range;
  let popupElement = null; // Portal popup element

  // Create container
  const container = document.createElement('div');
  container.className = `my-date-picker ${className}`.trim();
  container.setAttribute('data-picker-id', pickerId);

  /**
   * Render the calendar popup
   */
  function renderCalendar() {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Year grid (when year header clicked in month view) — 12 years (e.g. 2026 → 2021–2032)
    if (isYearPickerOpen) {
      const yearEnd = yearRangeStart + 11;
      const yearCells = [];
      for (let y = yearRangeStart; y <= yearEnd; y += 1) {
        const isSelectedYear = y === viewYear;
        const yearStart = new Date(y, 0, 1);
        const yearEndDate = new Date(y, 11, 31);
        const isBeforeMin = minDate && isDateAfter(minDate, yearEndDate);
        const isAfterMax = maxDate && isDateBefore(maxDate, yearStart);
        const isDisabled = isBeforeMin || isAfterMax;
        const classes = ['year-cell'];
        if (isSelectedYear) classes.push('selected');
        if (isDisabled) classes.push('disabled');
        if (isDisabled) {
          yearCells.push(`<div class="${classes.join(' ')}" aria-disabled="true">${y}</div>`);
        } else {
          yearCells.push(`<div class="${classes.join(' ')}" data-year="${y}">${y}</div>`);
        }
      }
      return `
        <div class="calendar-popup" role="dialog" aria-label="${ph('chooseDate', 'Choose date')}">
          <div class="calendar-header">
            <button type="button" class="calendar-nav prev-month" aria-label="${ph('previousYearRange', 'Previous year range')}">◀</button>
            <span class="calendar-title year-range-toggle" role="button" tabindex="0">${yearRangeStart} - ${yearEnd}</span>
            <button type="button" class="calendar-nav next-month" aria-label="${ph('nextYearRange', 'Next year range')}">▶</button>
          </div>
          <div class="year-grid" role="grid" aria-label="${ph('chooseYear', 'Choose year')}">
            ${yearCells.join('')}
          </div>
        </div>
      `;
    }

    // Month grid (when title clicked)
    if (isMonthPickerOpen) {
      const months = monthNames.map((m, i) => {
        const monthStart = new Date(viewYear, i, 1);
        const monthEnd = new Date(viewYear, i + 1, 0);
        const isBeforeMin = minDate && isDateAfter(minDate, monthEnd);
        const isAfterMax = maxDate && isDateBefore(maxDate, monthStart);
        const isDisabled = isBeforeMin || isAfterMax;
        const isSelectedMonth = i === viewMonth;
        const classes = ['month-cell'];
        if (isSelectedMonth) classes.push('selected');
        if (isDisabled) classes.push('disabled');
        if (isDisabled) {
          return `<div class="${classes.join(' ')}" aria-disabled="true">${m.slice(0, 3).toUpperCase()}</div>`;
        }
        return `<div class="${classes.join(' ')}" data-month="${i}">${m.slice(0, 3).toUpperCase()}</div>`;
      });

      return `
        <div class="calendar-popup" role="dialog" aria-label="${ph('chooseDate', 'Choose date')}">
          <div class="calendar-header">
            <button type="button" class="calendar-nav prev-month" aria-label="${ph('previousYear', 'Previous year')}">◀</button>
            <span class="calendar-title month-toggle" role="button" tabindex="0">${viewYear}</span>
            <button type="button" class="calendar-nav next-month" aria-label="${ph('nextYear', 'Next year')}">▶</button>
          </div>
          <div class="month-grid" role="grid" aria-label="${ph('chooseMonth', 'Choose month')}">
            ${months.join('')}
          </div>
        </div>
      `;
    }

    // Build calendar days
    const days = [];
    // Empty cells for days before first of month
    for (let i = 0; i < firstDay; i += 1) {
      days.push('<td class="calendar-day empty"></td>');
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(viewYear, viewMonth, day);
      const isSelected = currentValue && isSameDay(date, currentValue);
      const isTodayDate = isToday(date);
      // Check if date is outside min/max constraints
      const isBeforeMin = minDate && isDateBefore(date, minDate);
      const isAfterMax = maxDate && isDateAfter(date, maxDate);
      const isDisabled = isBeforeMin || isAfterMax;
      const classes = ['calendar-day'];
      if (isSelected) classes.push('selected');
      if (isTodayDate) classes.push('today');
      if (isDisabled) classes.push('disabled');
      if (isDisabled) {
        days.push(`<td class="${classes.join(' ')}" aria-disabled="true">${day}</td>`);
      } else {
        days.push(`<td class="${classes.join(' ')}" data-day="${day}">${day}</td>`);
      }
    }

    // Pad remaining cells
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = firstDay + daysInMonth; i < totalCells; i += 1) {
      days.push('<td class="calendar-day empty"></td>');
    }

    // Build rows
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(`<tr>${days.slice(i, i + 7).join('')}</tr>`);
    }

    return `
      <div class="calendar-popup" role="dialog" aria-label="${ph('chooseDate', 'Choose date')}">
        <div class="calendar-header">
          <button type="button" class="calendar-nav prev-month" aria-label="${ph('previousMonth', 'Previous month')}">◀</button>
          <span class="calendar-title month-toggle" role="button" tabindex="0">${monthNames[viewMonth]} ${viewYear}</span>
          <button type="button" class="calendar-nav next-month" aria-label="${ph('nextMonth', 'Next month')}">▶</button>
        </div>
        <table role="grid">
          <thead>
            <tr>${dayNames.map((d) => `<th>${d}</th>`).join('')}</tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    `;
  }

  // Scroll handler reference for cleanup
  let scrollHandler = null;

  /**
   * Update popup position based on input element
   */
  function updatePopupPosition() {
    if (!popupElement) return;
    const inputGroup = container.querySelector('.date-input-group');
    if (!inputGroup) return;

    const rect = inputGroup.getBoundingClientRect();
    popupElement.style.top = `${rect.bottom + 4}px`;
    popupElement.style.left = `${rect.left}px`;
  }

  /**
   * Remove popup from body
   */
  function removePopup() {
    if (popupElement) {
      popupElement.remove();
      popupElement = null;
    }
    // Remove scroll listener
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, true);
      scrollHandler = null;
    }
  }

  /**
   * Create and position popup in body (portal pattern)
   */
  function createPopup() {
    removePopup();

    const inputGroup = container.querySelector('.date-input-group');
    if (!inputGroup) return;

    const rect = inputGroup.getBoundingClientRect();

    popupElement = document.createElement('div');
    popupElement.className = 'my-date-picker-portal';
    popupElement.innerHTML = renderCalendar();
    popupElement.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 4}px;
      left: ${rect.left}px;
      z-index: ${portalZIndex};
    `;

    document.body.appendChild(popupElement);

    // Add scroll listener to update position (use capture to catch all scroll events)
    scrollHandler = () => updatePopupPosition();
    window.addEventListener('scroll', scrollHandler, true);

    // Bind popup events
    bindPopupEvents();
  }

  /**
   * Render the component
   */
  function render() {
    const month = currentValue ? String(currentValue.getMonth() + 1).padStart(2, '0') : 'mm';
    const day = currentValue ? String(currentValue.getDate()).padStart(2, '0') : 'dd';
    const year = currentValue ? String(currentValue.getFullYear()) : 'yyyy';

    container.innerHTML = `
      <div class="date-picker-wrapper">
        <div role="group" class="date-input-group">
          <div class="date-input-segments" aria-label="${ariaLabel}">
            <span 
              class="date-segment ${!currentValue ? 'placeholder' : ''}" 
              data-segment="month" 
              contenteditable="true" 
              data-placeholder="mm"
              tabindex="0"
            >${month}</span>
            <span class="date-separator">/</span>
            <span 
              class="date-segment ${!currentValue ? 'placeholder' : ''}" 
              data-segment="day" 
              contenteditable="true" 
              data-placeholder="dd"
              tabindex="0"
            >${day}</span>
            <span class="date-separator">/</span>
            <span 
              class="date-segment ${!currentValue ? 'placeholder' : ''}" 
              data-segment="year" 
              contenteditable="true" 
              data-placeholder="yyyy"
              tabindex="0"
            >${year}</span>
          </div>
          ${showClearButton && currentValue ? `
            <button type="button" class="clear-button" aria-label="${ph('clearDate', 'Clear date')}">✕</button>
          ` : ''}
          <button type="button" class="dropdown-button" aria-label="${ph('openCalendar', 'Open calendar')}">▼</button>
        </div>
      </div>
    `;

    // Handle popup
    if (isOpen) {
      createPopup();
    } else {
      removePopup();
    }

    bindEvents();
  }

  /**
   * Close the calendar popup
   */
  function closeCalendar() {
    if (isOpen) {
      isOpen = false;
      isYearPickerOpen = false;
      activePickerId = null;
      render();
    }
  }

  /**
   * Open the calendar popup
   */
  function openCalendar() {
    // Close any other open picker
    if (activePickerId && activePickerId !== pickerId) {
      const otherPicker = document.querySelector(`[data-picker-id="${activePickerId}"]`);
      if (otherPicker && otherPicker.closePicker) {
        otherPicker.closePicker();
      }
    }

    isOpen = true;
    activePickerId = pickerId;
    render();
  }

  /**
   * Toggle calendar visibility
   */
  function toggleCalendar() {
    if (isOpen) {
      closeCalendar();
    } else {
      openCalendar();
    }
  }

  /**
   * Select a date
   * @param {number} day
   */
  function selectDate(day) {
    currentValue = new Date(viewYear, viewMonth, day);
    closeCalendar();
    if (onChange) {
      onChange(currentValue);
    }
  }

  /**
   * Update only the calendar popup content (for month navigation)
   * This avoids rebuilding the container which can cause position issues
   */
  function updateCalendarOnly() {
    if (!popupElement) return;
    popupElement.innerHTML = renderCalendar();
    bindPopupEvents();
  }

  /**
   * Navigate to previous month
   */
  function prevMonth() {
    if (isYearPickerOpen) {
      yearRangeStart -= 12;
      if (yearRangeStart < 0) yearRangeStart = 0;
      updateCalendarOnly();
      return;
    }
    if (isMonthPickerOpen) {
      viewYear -= 1;
    } else {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
    }
    updateCalendarOnly();
  }

  /**
   * Navigate to next month
   */
  function nextMonth() {
    if (isYearPickerOpen) {
      yearRangeStart += 12;
      updateCalendarOnly();
      return;
    }
    if (isMonthPickerOpen) {
      viewYear += 1;
    } else {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
    }
    updateCalendarOnly();
  }

  /**
   * Bind popup event handlers (for portal popup)
   */
  function bindPopupEvents() {
    if (!popupElement) return;

    // Calendar navigation
    const prevBtn = popupElement.querySelector('.prev-month');
    prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      prevMonth();
    });

    const nextBtn = popupElement.querySelector('.next-month');
    nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      nextMonth();
    });

    // Year view: header click closes year picker; year cells select year
    const yearRangeTitle = popupElement.querySelector('.calendar-title.year-range-toggle');
    if (yearRangeTitle) {
      yearRangeTitle.addEventListener('click', (e) => {
        e.stopPropagation();
        isYearPickerOpen = false;
        updateCalendarOnly();
      });
      yearRangeTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          isYearPickerOpen = false;
          updateCalendarOnly();
        }
      });
      const yearCells = popupElement.querySelectorAll('.year-cell[data-year]');
      yearCells.forEach((cell) => {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          const y = parseInt(cell.getAttribute('data-year'), 10);
          viewYear = y;
          isYearPickerOpen = false;
          updateCalendarOnly();
        });
      });
    } else {
      // Day or month view: title click opens month picker or year picker
      const titleEl = popupElement.querySelector('.calendar-title.month-toggle');
      titleEl?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMonthPickerOpen) {
          isYearPickerOpen = true;
          yearRangeStart = Math.max(0, viewYear - 5);
          updateCalendarOnly();
        } else {
          isMonthPickerOpen = !isMonthPickerOpen;
          updateCalendarOnly();
        }
      });
      titleEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isMonthPickerOpen) {
            isYearPickerOpen = true;
            yearRangeStart = Math.max(0, viewYear - 5);
            updateCalendarOnly();
          } else {
            isMonthPickerOpen = !isMonthPickerOpen;
            updateCalendarOnly();
          }
        }
      });
    }

    // Month grid selection
    if (isMonthPickerOpen && !isYearPickerOpen) {
      const monthCells = popupElement.querySelectorAll('.month-cell[data-month]');
      monthCells.forEach((cell) => {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          const m = parseInt(cell.getAttribute('data-month'), 10);
          viewMonth = m;
          isMonthPickerOpen = false;
          updateCalendarOnly();
        });
      });
    }

    // Day selection
    const dayElements = popupElement.querySelectorAll('.calendar-day[data-day]');
    dayElements.forEach((dayEl) => {
      dayEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = parseInt(dayEl.getAttribute('data-day'), 10);
        selectDate(day);
      });
    });

    // Prevent popup clicks from closing
    popupElement.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Prevent mousedown from causing blur on date segments
    // This is critical - blur triggers onChange which can cause facets re-render
    popupElement.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  }

  /**
   * Update date from segments
   */
  function updateDateFromSegments() {
    const monthSegment = container.querySelector('[data-segment="month"]');
    const daySegment = container.querySelector('[data-segment="day"]');
    const yearSegment = container.querySelector('[data-segment="year"]');

    const monthText = monthSegment?.textContent.trim();
    const dayText = daySegment?.textContent.trim();
    const yearText = yearSegment?.textContent.trim();

    // Check if all segments have values
    if (monthText && monthText !== 'mm'
        && dayText && dayText !== 'dd'
        && yearText && yearText !== 'yyyy') {
      const month = parseInt(monthText, 10);
      const day = parseInt(dayText, 10);
      const year = parseInt(yearText, 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1000) {
        const date = new Date(year, month - 1, day);
        // Validate the date is real
        if (date.getMonth() === month - 1) {
          // Validate against min/max constraints
          const isBeforeMin = minDate && isDateBefore(date, minDate);
          const isAfterMax = maxDate && isDateAfter(date, maxDate);
          if (isBeforeMin || isAfterMax) {
            // Date is outside allowed range - don't accept it
            return false;
          }
          // Only call onChange if date actually changed (prevents unnecessary re-renders)
          const hasChanged = !currentValue || !isSameDay(date, currentValue);
          currentValue = date;
          viewYear = year;
          viewMonth = month - 1;
          if (hasChanged && onChange) onChange(currentValue);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Move focus to next/previous segment
   */
  function moveFocus(currentSegment, direction) {
    const segments = ['month', 'day', 'year'];
    const currentIndex = segments.indexOf(currentSegment);
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < segments.length) {
      const nextSegment = container.querySelector(`[data-segment="${segments[nextIndex]}"]`);
      if (nextSegment) {
        nextSegment.focus();
        // Select all text in segment
        const range = document.createRange();
        range.selectNodeContents(nextSegment);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  /**
   * Bind event handlers
   */
  function bindEvents() {
    // Dropdown button
    const dropdownBtn = container.querySelector('.dropdown-button');
    dropdownBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCalendar();
    });

    // Click on date-input-segments opens calendar (not wrapper or parent)
    const dateInputSegments = container.querySelector('.date-input-segments');
    dateInputSegments?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isOpen) {
        openCalendar();
      }
    });

    // Segment events
    const segments = container.querySelectorAll('.date-segment');
    segments.forEach((segment) => {
      const segmentType = segment.getAttribute('data-segment');
      const maxLength = segmentType === 'year' ? 4 : 2;
      const placeholder = segment.getAttribute('data-placeholder');

      // Focus - select all text (calendar opened by parent click handler)
      segment.addEventListener('focus', (e) => {
        e.stopPropagation();
        // Select all text
        setTimeout(() => {
          const range = document.createRange();
          range.selectNodeContents(segment);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }, 0);
      });

      // Click - select all text and open calendar
      segment.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isOpen) {
          openCalendar();
        }
        const range = document.createRange();
        range.selectNodeContents(segment);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      // Input - only allow numbers and enforce max length
      segment.addEventListener('input', () => {
        let text = segment.textContent;
        // Remove non-digits
        text = text.replace(/\D/g, '');
        // Enforce max length
        if (text.length > maxLength) {
          text = text.substring(0, maxLength);
        }
        segment.textContent = text;

        // Auto-advance when segment is complete
        if (text.length === maxLength) {
          updateDateFromSegments();
          moveFocus(segmentType, 1);
        }
      });

      // Keydown - handle navigation and special keys
      segment.addEventListener('keydown', (e) => {
        let text = segment.textContent;

        // Check if text is selected
        const selection = window.getSelection();
        const isTextSelected = selection && selection.toString().length > 0;

        // Allow: backspace, delete, tab, escape, enter, arrows
        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            if (isTextSelected) {
              // Let browser handle deleting selection
              e.preventDefault();
              segment.textContent = placeholder;
              segment.classList.add('placeholder');
            } else if (!text || text === placeholder) {
              e.preventDefault();
              segment.textContent = placeholder;
              segment.classList.add('placeholder');
              moveFocus(segmentType, -1);
            } else {
              // Allow backspace/delete to work normally
              return;
            }
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            moveFocus(segmentType, 1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            moveFocus(segmentType, -1);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            closeCalendar();
            segment.blur();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            updateDateFromSegments();
            closeCalendar();
            segment.blur();
          } else if (e.key === 'Tab') {
            // Let tab work naturally
            return;
          }
          return;
        }

        // Only allow digits
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
          return;
        }

        // Always prevent default for digits to control insertion
        e.preventDefault();

        // If text is selected (highlighted), replace it with new digit
        if (isTextSelected) {
          text = '';
          segment.classList.remove('placeholder');
        }

        // Clear placeholder on first digit or if placeholder text
        if (text === placeholder) {
          text = '';
          segment.classList.remove('placeholder');
        }

        // Append digit if under max length
        if (text.length < maxLength) {
          text += e.key;
          segment.textContent = text;

          // Auto-advance when segment is complete
          if (text.length === maxLength) {
            updateDateFromSegments();
            moveFocus(segmentType, 1);
          }
        }
      });

      // Blur - restore placeholder if empty
      segment.addEventListener('blur', () => {
        const text = segment.textContent.trim();
        if (!text || text === placeholder) {
          segment.textContent = placeholder;
          segment.classList.add('placeholder');
        }
        updateDateFromSegments();
      });
    });

    // Clear button
    const clearBtn = container.querySelector('.clear-button');
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      currentValue = null;
      if (onClear) onClear();
      render();
    });
  }

  // Store close function on container for external access
  container.closePicker = closeCalendar;

  /**
   * Update the picker value externally
   * @param {Date|null} newValue
   */
  container.setValue = (newValue) => {
    currentValue = newValue;
    if (newValue) {
      viewYear = newValue.getFullYear();
      viewMonth = newValue.getMonth();
    }
    render();
  };

  /**
   * Get the current value
   * @returns {Date|null}
   */
  container.getValue = () => currentValue;

  /**
   * Update the minimum selectable date
   * @param {Date|null} newMinValue
   */
  container.setMinValue = (newMinValue) => {
    minDate = newMinValue;
    if (isOpen) {
      updateCalendarOnly();
    }
  };

  /**
   * Update the maximum selectable date
   * @param {Date|null} newMaxValue
   */
  container.setMaxValue = (newMaxValue) => {
    maxDate = newMaxValue;
    if (isOpen) {
      updateCalendarOnly();
    }
  };

  /**
   * Reset the picker
   */
  container.reset = () => {
    currentValue = null;
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    render();
  };

  // Initial render
  render();

  // Close on outside click
  document.addEventListener('click', (e) => {
    const isOutsideContainer = !container.contains(e.target);
    const isOutsidePopup = !popupElement || !popupElement.contains(e.target);
    if (isOpen && isOutsideContainer && isOutsidePopup) {
      closeCalendar();
    }
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeCalendar();
    }
  });

  return container;
}

export default createDatePicker;
