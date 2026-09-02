import { describe, it, expect } from 'vitest';
import { applyCategoryPlan, buildCategoryCoverage, slugifyCategory } from '../../scripts/assets/category-plan.js';

describe('category-plan', () => {
  it('keeps existing productCategory values', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'anything.jpg' },
      fields: { title: 'Anything' },
      existingMetadata: { productCategory: 'existing-category' },
    }]);
    expect(plan.fields.productCategory).toBe('existing-category');
    expect(plan.categoryAssignment.reason).toBe('existing-metadata');
  });

  it('gives high confidence to a rule match sourced from AEM\'s own autogen:subject tags', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'hero.jpg' },
      fields: { title: 'Foo' },
      existingMetadata: { 'autogen:subject': ['product', 'lifestyle shot'] },
    }]);
    expect(plan.fields.productCategory).toBe('products');
    expect(plan.categoryAssignment.confidence).toBe('high');
    expect(plan.categoryAssignment.evidence[0]).toMatch(/^autogen:subject=/);
  });

  it('falls back to medium confidence when the same rule only matches page/heading text', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'hero.jpg', heading: 'Product range' },
      fields: { title: 'Foo' },
      existingMetadata: {},
    }]);
    expect(plan.fields.productCategory).toBe('products');
    expect(plan.categoryAssignment.confidence).toBe('medium');
  });

  it('infers generic categories from source evidence', () => {
    const [plan] = applyCategoryPlan([{
      asset: {
        assetId: 'a1',
        repoName: 'hero.jpg',
        sourcePage: 'https://brand.example/en/models/foo',
        heading: 'Foo model range',
      },
      fields: { title: 'Foo Hero' },
      existingMetadata: {},
    }]);
    expect(plan.fields.productCategory).toBe('products');
    expect(plan.categoryAssignment.reason).toBe('source-evidence');
  });

  it('does not invent a category without evidence', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'asset.bin' },
      fields: { title: 'Asset' },
      existingMetadata: {},
    }]);
    expect(plan.fields.productCategory).toBeUndefined();
  });

  it('builds coverage only from categories with assets', () => {
    const plans = applyCategoryPlan([
      {
        asset: { assetId: 'a1', sourcePage: 'https://x/products' },
        fields: { title: 'A' },
        existingMetadata: {},
      },
      {
        asset: { assetId: 'a2', repoName: 'asset.bin' },
        fields: { title: 'B' },
        existingMetadata: {},
      },
    ]);
    const coverage = buildCategoryCoverage(plans);
    expect(coverage.categories).toMatchObject([{ slug: 'products', assetCount: 1 }]);
    expect(coverage.unclassified).toEqual(['a2']);
  });

  it('slugifies display categories', () => {
    expect(slugifyCategory('SUVs & Electric')).toBe('suvs-and-electric');
  });
});
