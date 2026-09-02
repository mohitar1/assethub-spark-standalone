import { describe, it, expect } from 'vitest';
import {
  applyCategoryPlan,
  buildCategoryCoverage,
  slugifyCategory,
  categorySearchUrl,
  deterministicClassifier,
  assetEvidence,
} from '../../scripts/assets/category-plan.js';

// Contracts are the source-derived vocabulary threaded in from Step 4 — no hardcoded list.
const PHARMA = [
  { slug: 'dermatology', label: 'Dermatology' },
  { slug: 'cancer', label: 'Cancer' },
  { slug: 'diabetes', label: 'Diabetes' },
];
const RETAIL = [
  { slug: 'coffee', label: 'Coffee' },
  { slug: 'machines', label: 'Machines' },
];

describe('category-plan', () => {
  it('keeps an existing contract-valid productCategory', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'anything.jpg' },
      fields: { title: 'Anything' },
      existingMetadata: { productCategory: 'cancer' },
    }], { contract: PHARMA });
    expect(plan.fields.productCategory).toBe('cancer');
    expect(plan.categoryAssignment.reason).toBe('existing-metadata');
  });

  it('honors a generated productCategory that is already a contract slug', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'hero.jpg' },
      fields: { title: 'Foo', productCategory: 'diabetes' },
      existingMetadata: {},
    }], { contract: PHARMA });
    expect(plan.fields.productCategory).toBe('diabetes');
    expect(plan.categoryAssignment.reason).toBe('generated-field');
  });

  it('classifies pharma assets into the contract from AEM smart tags (no keyword edits)', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'discoid-eczema-0031.avif' },
      fields: { title: 'Skin condition' },
      existingMetadata: { 'autogen:subject': ['dermatology', 'psoriasis', 'skin'] },
    }], { contract: PHARMA });
    expect(plan.fields.productCategory).toBe('dermatology');
    expect(plan.categoryAssignment.reason).toBe('classified');
  });

  it('classifies retail assets with the SAME code and a different contract', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'espresso-machine.jpg', heading: 'Machines' },
      fields: { title: 'Brewer' },
      existingMetadata: { 'autogen:subject': ['machines'] },
    }], { contract: RETAIL });
    expect(plan.fields.productCategory).toBe('machines');
  });

  it('uses an injected classifier when provided', () => {
    const classifier = () => ({ slug: 'cancer', confidence: 'high' });
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'unknown.jpg' },
      fields: { title: 'X' },
      existingMetadata: {},
    }], { contract: PHARMA, classifier });
    expect(plan.fields.productCategory).toBe('cancer');
  });

  it('mandatory assignment: an evidence-less asset still lands in a contract slug (fallback)', () => {
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'asset.bin' },
      fields: { title: 'Asset' },
      existingMetadata: {},
    }], { contract: PHARMA });
    expect(PHARMA.map((c) => c.slug)).toContain(plan.fields.productCategory);
    expect(plan.categoryAssignment.confidence).toBe('fallback');
  });

  it('re-maps an injected slug outside the contract via the deterministic fallback', () => {
    const classifier = () => ({ slug: 'not-a-contract-slug' });
    const [plan] = applyCategoryPlan([{
      asset: { assetId: 'a1', repoName: 'psoriasis-patient.jpg' },
      fields: { title: 'X' },
      existingMetadata: { 'autogen:subject': ['dermatology'] },
    }], { contract: PHARMA, classifier });
    expect(PHARMA.map((c) => c.slug)).toContain(plan.fields.productCategory);
  });

  it('builds coverage from assigned categories', () => {
    const plans = applyCategoryPlan([
      {
        asset: { assetId: 'a1', repoName: 'cancer-story.jpg' },
        fields: { title: 'A' },
        existingMetadata: { 'autogen:subject': ['cancer'] },
      },
      {
        asset: { assetId: 'a2', repoName: 'diabetes-care.jpg' },
        fields: { title: 'B' },
        existingMetadata: { 'autogen:subject': ['diabetes'] },
      },
    ], { contract: PHARMA });
    const coverage = buildCategoryCoverage(plans);
    const slugs = coverage.categories.map((c) => c.slug).sort();
    expect(slugs).toEqual(['cancer', 'diabetes']);
    expect(coverage.unclassified).toEqual([]);
  });

  it('slugifies display categories', () => {
    expect(slugifyCategory('SUVs & Electric')).toBe('suvs-and-electric');
  });

  it('builds the facet-filter search URL used by DA index cards', () => {
    expect(categorySearchUrl('dermatology')).toBe(
      '/en/search?facetFilters=%7B%22productCategory%22%3A%7B%22dermatology%22%3Atrue%7D%7D',
    );
  });

  it('deterministicClassifier prefers smart-tag hits (double weight)', () => {
    const classify = deterministicClassifier(PHARMA);
    const evidence = assetEvidence(
      { repoName: 'x.jpg' },
      { 'autogen:subject': ['diabetes'] },
      {},
    );
    expect(classify(evidence).slug).toBe('diabetes');
  });
});
