import { describe, it, expect } from 'vitest';
import { buildProductCategoryRepresentatives, cardImageUrl } from '../../scripts/assets/representatives.js';

describe('cardImageUrl', () => {
  it('builds the worker-proxy image URL (strip ext, encode name, ?width)', () => {
    expect(cardImageUrl({ assetId: 'urn:aaid:aem:abc', repoName: 'woman walking.avif' }))
      .toBe('/api/adobe/assets/urn:aaid:aem:abc/as/woman%20walking.jpg?width=750');
  });

  it('falls back to title, then thumbnail, for the file name', () => {
    expect(cardImageUrl({ assetId: 'id1', title: 'Hero Shot' }))
      .toBe('/api/adobe/assets/id1/as/Hero%20Shot.jpg?width=750');
    expect(cardImageUrl({ assetId: 'id2' }))
      .toBe('/api/adobe/assets/id2/as/thumbnail.jpg?width=750');
  });

  it('returns null without an assetId', () => {
    expect(cardImageUrl({ repoName: 'x.jpg' })).toBeNull();
    expect(cardImageUrl(null)).toBeNull();
  });

  it('is attached to each representative', () => {
    const report = buildProductCategoryRepresentatives([{
      asset: { assetId: 'a1', repoPath: '/content/dam/acme/hero.jpg', repoName: 'hero.jpg' },
      fields: { title: 'Hero', productCategory: 'coffee' },
    }]);
    expect(report.items.coffee.cardImageUrl).toBe('/api/adobe/assets/a1/as/hero.jpg?width=750');
  });
});

describe('buildProductCategoryRepresentatives', () => {
  it('selects the first asset per productCategory and reports missing expected groups', () => {
    const report = buildProductCategoryRepresentatives([
      {
        asset: {
          assetId: 'a1',
          repoPath: '/content/dam/acme/swift.jpg',
          repoName: 'swift.jpg',
        },
        fields: {
          title: 'Swift',
          productCategory: 'hatchback',
          keywords: ['swift'],
        },
      },
      {
        asset: {
          assetId: 'a2',
          repoPath: '/content/dam/acme/baleno.jpg',
          repoName: 'baleno.jpg',
        },
        fields: {
          title: 'Baleno',
          productCategory: 'hatchback',
        },
      },
      {
        asset: {
          assetId: 'a3',
          repoPath: '/content/dam/acme/brezza.jpg',
          repoName: 'brezza.jpg',
        },
        fields: {
          title: 'Brezza',
          productCategory: 'suv',
        },
      },
    ], {
      expectedCategories: ['hatchback', 'sedan', 'suv'],
    });

    expect(report).toMatchObject({
      groupBy: 'productCategory',
      expected: ['hatchback', 'sedan', 'suv'],
      missing: ['sedan'],
    });
    expect(report.items.hatchback).toMatchObject({
      assetId: 'a1',
      assetPath: '/content/dam/acme/swift.jpg',
      productCategory: 'hatchback',
      source: 'planned-enrichment',
    });
    expect(report.items.suv).toMatchObject({
      assetId: 'a3',
      productCategory: 'suv',
    });
  });
});
