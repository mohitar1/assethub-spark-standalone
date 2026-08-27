/**
 * Basic unit tests for ui-components.js utility functions
 * Tests pure utility functions that don't require DOM
 */

import { describe, it, expect } from 'vitest';
import {
  formatNumber,
} from '../ui-components.js';

// =============================================================================
// UTILITY FUNCTIONS (Pure functions, no DOM needed)
// =============================================================================

describe('ui-components: formatNumber', () => {
  it('formats numbers with commas', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
  });

  it('formats with custom decimal places', () => {
    const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    expect(formatNumber(1234.5678, options)).toBe('1,234.57');
  });

  it('formats as percentage', () => {
    const result = formatNumber(0.1234, { style: 'percent' });
    expect(result).toContain('%');
  });

  it('handles null/undefined as 0', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });

  it('handles NaN as 0', () => {
    expect(formatNumber(NaN)).toBe('0');
  });

  it('formats currency', () => {
    const result = formatNumber(1234.56, { style: 'currency', currency: 'USD' });
    expect(result).toContain('$');
    expect(result).toContain('1,234');
  });

  it('handles very large numbers', () => {
    const result = formatNumber(1234567890);
    expect(result).toBe('1,234,567,890');
  });

  it('handles decimal numbers without options', () => {
    const result = formatNumber(1234.5);
    // Should contain the integer part formatted
    expect(result).toContain('1,234');
  });
});
