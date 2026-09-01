import { describe, it, expect } from 'vitest';
import { buildProductCategoryRepresentatives } from '../representatives.js';

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
