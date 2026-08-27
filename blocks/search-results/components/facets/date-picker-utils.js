import { createDatePicker } from './my-date-picker.js';

export function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value.year && value.month && value.day) {
    return new Date(value.year, value.month - 1, value.day);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function toCalendarDateObject(value) {
  const date = toDateValue(value);
  if (!date) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export async function createSharedDatePicker(options = {}) {
  const {
    value = null,
    ariaLabel = 'Select date',
    showClearButton = true,
    portalZIndex = 10000,
    minValue = null,
    maxValue = null,
    onChange,
    onClear,
    className = '',
  } = options;

  return createDatePicker({
    value: toDateValue(value),
    ariaLabel,
    showClearButton,
    portalZIndex,
    minValue: toDateValue(minValue),
    maxValue: toDateValue(maxValue),
    onChange,
    onClear,
    className,
  });
}
