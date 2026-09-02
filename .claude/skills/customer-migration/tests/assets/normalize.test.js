import { describe, it, expect } from 'vitest';
import {
  normalizeKeywords, normalizeGenerated, validateGeneratedShape,
} from '../../scripts/assets/normalize.js';

describe('normalize', () => {
  describe('normalizeKeywords', () => {
    it('lowercases, trims, dedupes and drops empties', () => {
      expect(normalizeKeywords([' Retail ', 'retail', 'BANK', '', null, 'bank']))
        .toEqual(['retail', 'bank']);
    });

    it('returns [] for non-arrays', () => {
      expect(normalizeKeywords('nope')).toEqual([]);
      expect(normalizeKeywords(undefined)).toEqual([]);
    });

    it('caps at 12 keywords', () => {
      const many = Array.from({ length: 20 }, (_, i) => `kw${i}`);
      expect(normalizeKeywords(many)).toHaveLength(12);
    });
  });

  describe('validateGeneratedShape', () => {
    it('flags missing title', () => {
      expect(validateGeneratedShape({}).ok).toBe(false);
    });

    it('accepts a minimal valid object', () => {
      expect(validateGeneratedShape({ title: 'Hi' }).ok).toBe(true);
    });

    it('rejects non-objects', () => {
      expect(validateGeneratedShape(null).ok).toBe(false);
    });
  });

  describe('normalizeGenerated', () => {
    it('clamps title/description length and drops empty fields', () => {
      const out = normalizeGenerated({
        title: 'x'.repeat(200),
        description: '',
        keywords: ['a', 'b', 'c'],
        productCategory: 'Movies & Shows',
        channel: 'social',
        campaign: 'Spring Sale',
      });
      expect(out.title).toHaveLength(80);
      expect(out.description).toBeUndefined();
      expect(out.keywords).toEqual(['a', 'b', 'c']);
      expect(out.productCategory).toBeUndefined();
      expect(out.channel).toBe('social');
      expect(out.campaign).toBe('Spring Sale');
    });

    it('keeps generated channel as free text', () => {
      const out = normalizeGenerated({ title: 'T', channel: 'dealer portal' });
      expect(out.channel).toBe('dealer portal');
    });
  });
});
