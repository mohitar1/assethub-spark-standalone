import { describe, it, expect } from 'vitest';
import { planCollections, humanize, companyLabel } from '../../scripts/assets/collections-plan.js';

describe('collections-plan', () => {
  describe('humanize', () => {
    it('title-cases slugs and underscores', () => {
      expect(humanize('movies-and-shows')).toBe('Movies And Shows');
      expect(humanize('cold_brew')).toBe('Cold Brew');
      expect(humanize('  toys ')).toBe('Toys');
    });
    it('handles empty', () => {
      expect(humanize('')).toBe('');
      expect(humanize(null)).toBe('');
    });
  });

  describe('companyLabel', () => {
    it('humanizes a company key', () => {
      expect(companyLabel('acme-corp')).toBe('Acme Corp');
    });
  });

  describe('planCollections', () => {
    const assets = [
      { assetId: 'a1', productCategory: 'coffee', campaign: 'spring' },
      { assetId: 'a2', productCategory: 'coffee', campaign: 'spring' },
      { assetId: 'a3', productCategory: 'tea', campaign: 'winter' },
      { assetId: 'a4', productCategory: '', campaign: 'winter' },
      { assetId: 'a5' },
    ];

    it('groups by productCategory by default, skipping untagged assets', () => {
      const specs = planCollections(assets, { company: 'acme' });
      expect(specs.map((s) => s.facetValue)).toEqual(['coffee', 'tea']);
      const coffee = specs.find((s) => s.facetValue === 'coffee');
      expect(coffee.assetIds).toEqual(['a1', 'a2']);
      expect(coffee.title).toBe('Acme — Coffee');
    });

    it('groups by an alternate facet', () => {
      const specs = planCollections(assets, { company: 'acme', facet: 'campaign' });
      expect(specs.map((s) => s.facetValue)).toEqual(['spring', 'winter']);
      expect(specs.find((s) => s.facetValue === 'winter').assetIds).toEqual(['a3', 'a4']);
    });

    it('drops groups below minAssets', () => {
      const specs = planCollections(assets, { company: 'acme', minAssets: 2 });
      expect(specs.map((s) => s.facetValue)).toEqual(['coffee']);
    });

    it('dedupes asset ids within a group', () => {
      const dup = [
        { assetId: 'x', productCategory: 'coffee' },
        { assetId: 'x', productCategory: 'coffee' },
        { assetId: 'y', productCategory: 'coffee' },
      ];
      const specs = planCollections(dup, { company: 'acme' });
      expect(specs[0].assetIds).toEqual(['x', 'y']);
    });

    it('sorts groups by facet value', () => {
      const specs = planCollections(
        [
          { assetId: '1', productCategory: 'zebra' },
          { assetId: '2', productCategory: 'apple' },
        ],
        { company: 'acme' },
      );
      expect(specs.map((s) => s.facetValue)).toEqual(['apple', 'zebra']);
    });

    it('uses a custom title prefix when provided', () => {
      const specs = planCollections(
        [{ assetId: '1', productCategory: 'coffee' }],
        { company: 'acme', titlePrefix: 'Brand' },
      );
      expect(specs[0].title).toBe('Brand — Coffee');
    });

    it('rejects an unsupported facet', () => {
      expect(() => planCollections(assets, { facet: 'nope' })).toThrow(/unsupported facet/);
    });

    it('returns empty for empty input', () => {
      expect(planCollections([], { company: 'acme' })).toEqual([]);
      expect(planCollections(null, { company: 'acme' })).toEqual([]);
    });
  });
});
