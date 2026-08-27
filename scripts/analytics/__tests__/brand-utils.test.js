/**
 * Unit tests for brand-utils.js
 */

import { describe, it, expect } from 'vitest';
import { cleanBrandName, BRAND_PREFIX_PATTERN } from '../brand-utils.js';

describe('cleanBrandName', () => {
  it('removes "Brand / " prefix from single brand', () => {
    expect(cleanBrandName('Brand / Acme Brand')).toBe('Acme Brand');
  });

  it('removes "Brand / " prefix from multiple comma-separated brands', () => {
    expect(cleanBrandName('Brand / Kist-KO, Brand / Fanta')).toBe('Kist-KO, Fanta');
  });

  it('handles case-insensitive "brand" keyword', () => {
    expect(cleanBrandName('brand / Sprite')).toBe('Sprite');
    expect(cleanBrandName('BRAND / Acme Brand')).toBe('Acme Brand');
  });

  it('handles flexible whitespace in prefix', () => {
    expect(cleanBrandName('Brand/Acme Brand')).toBe('Acme Brand');
    expect(cleanBrandName('Brand  /  Fanta')).toBe('Fanta');
  });

  it('returns "unknown" for null input', () => {
    expect(cleanBrandName(null)).toBe('unknown');
  });

  it('returns "unknown" for undefined input', () => {
    expect(cleanBrandName(undefined)).toBe('unknown');
  });

  it('returns "unknown" for empty string', () => {
    expect(cleanBrandName('')).toBe('unknown');
  });

  it('filters out empty values after cleaning', () => {
    expect(cleanBrandName('Brand / Acme Brand, , Brand / Fanta')).toBe('Acme Brand, Fanta');
  });

  it('returns "unknown" when all values are empty after cleaning', () => {
    expect(cleanBrandName(',,,,')).toBe('unknown');
  });

  it('preserves brands without prefix', () => {
    expect(cleanBrandName('Acme Brand')).toBe('Acme Brand');
  });

  it('handles mixed brands (some with prefix, some without)', () => {
    expect(cleanBrandName('Brand / Acme Brand, Sprite, Brand / Fanta')).toBe('Acme Brand, Sprite, Fanta');
  });

  it('trims whitespace from brand names', () => {
    expect(cleanBrandName('  Brand / Acme Brand  ,  Brand / Fanta  ')).toBe('Acme Brand, Fanta');
  });
});

describe('BRAND_PREFIX_PATTERN', () => {
  it('matches standard "Brand / " prefix', () => {
    expect('Brand / Acme Brand'.replace(BRAND_PREFIX_PATTERN, '')).toBe('Acme Brand');
  });

  it('matches case-insensitive prefix', () => {
    expect('brand / Sprite'.replace(BRAND_PREFIX_PATTERN, '')).toBe('Sprite');
    expect('BRAND / Fanta'.replace(BRAND_PREFIX_PATTERN, '')).toBe('Fanta');
  });

  it('matches prefix with flexible whitespace', () => {
    expect('Brand/Acme Brand'.replace(BRAND_PREFIX_PATTERN, '')).toBe('Acme Brand');
    expect('Brand  /  Sprite'.replace(BRAND_PREFIX_PATTERN, '')).toBe('Sprite');
  });

  it('only matches at start of string', () => {
    const text = 'Not Brand / at start';
    expect(text.replace(BRAND_PREFIX_PATTERN, 'X')).toBe(text); // Should not match
  });
});
