/**
 * Category assignment against the source-derived contract.
 *
 * The category vocabulary is the contract the migration derives from the source site at
 * Step 4 (one shared set of {slug,label} used by homepage cards, facet links, asset
 * productCategory, and collections). This module does NOT invent categories and does NOT
 * carry a hardcoded keyword vocabulary — a fixed keyword table can never be generic across
 * verticals (a retail term list silently drops every pharma/finance/etc. asset).
 *
 * Instead, each asset is mapped to exactly one contract slug by a classifier over the
 * asset's real metadata — AEM's own autogen:subject/predictedTags smart tags plus dc:* fields,
 * generated title/description/keywords, filename, and source-page evidence. The classifier
 * is dependency-injected (like `generator`): the live path uses the agent/LLM; tests inject
 * a deterministic stub. A built-in deterministic classifier (token overlap against the
 * contract labels) is the offline default and the fallback when the injected classifier
 * declines an asset — assignment is mandatory, so every asset lands in one contract slug.
 */

import { FIELD, AUTOGEN_FIELD } from './constants.js';

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function slugifyCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function humanizeCategorySlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Facet-filter search URL for a category slug — the exact shape the DA index cards use. */
export function categorySearchUrl(slug, { basePath = '/en' } = {}) {
  const facetFilters = JSON.stringify({ productCategory: { [slug]: true } });
  return `${basePath}/search?facetFilters=${encodeURIComponent(facetFilters)}`;
}

function stringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function autogenSubjectTerms(metadata = {}) {
  return [
    ...stringArray(metadata[AUTOGEN_FIELD.SUBJECT]),
    ...stringArray(metadata[AUTOGEN_FIELD.PREDICTED_TAGS]),
  ].map((v) => v.toLowerCase());
}

/**
 * The evidence bundle handed to the classifier for one asset. Real AEM signal first
 * (autogen:subject/predictedTags smart tags, dc:* fields), then generated fields, then
 * filename/source-page context.
 */
export function assetEvidence(asset = {}, metadata = {}, fields = {}) {
  return {
    assetId: asset.assetId || null,
    fileName: asset.fileName || asset.repoName || null,
    sourcePage: asset.sourcePage || null,
    heading: asset.heading || null,
    altText: asset.altText || null,
    nearbyText: asset.nearbyText || null,
    smartTags: autogenSubjectTerms(metadata),
    autogenTitle: cleanString(metadata[AUTOGEN_FIELD.TITLE]),
    autogenDescription: cleanString(metadata[AUTOGEN_FIELD.DESCRIPTION]),
    dcTitle: cleanString(metadata[FIELD.TITLE]) || cleanString(fields.title),
    dcDescription: cleanString(metadata[FIELD.DESCRIPTION]) || cleanString(fields.description),
    dcSubject: stringArray(metadata[FIELD.SUBJECT]),
    keywords: Array.isArray(fields.keywords) ? fields.keywords : [],
  };
}

function evidenceBlob(evidence) {
  return [
    evidence.fileName,
    evidence.sourcePage,
    evidence.heading,
    evidence.altText,
    evidence.nearbyText,
    evidence.autogenTitle,
    evidence.autogenDescription,
    evidence.dcTitle,
    evidence.dcDescription,
    ...evidence.smartTags,
    ...evidence.dcSubject,
    ...evidence.keywords,
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');
}

/** Contract entry -> comparable tokens (slug words + label words). */
function contractTokens(entry) {
  return `${entry.slug} ${entry.label || ''}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/**
 * Deterministic fallback classifier: pick the contract category whose slug/label tokens
 * overlap the asset's evidence most; ties and no-overlap fall back to the first contract
 * entry so assignment is always defined (mandatory single-category, never unclassified).
 * Smart-tag hits count double (AEM's own processing output is stronger signal).
 */
export function deterministicClassifier(contract = []) {
  const entries = contract.filter((c) => c && c.slug);
  return (evidence) => {
    if (entries.length === 0) return null;
    const blob = evidenceBlob(evidence);
    const smart = evidence.smartTags.join(' ');
    let best = entries[0].slug;
    let bestScore = -1;
    for (const entry of entries) {
      const tokens = contractTokens(entry);
      let score = 0;
      for (const tok of tokens) {
        if (smart.includes(tok)) score += 2;
        else if (blob.includes(tok)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = entry.slug;
      }
    }
    return { slug: best, confidence: bestScore > 0 ? 'evidence' : 'fallback' };
  };
}

function contractSlugSet(contract = []) {
  return new Set(contract.map((c) => c && c.slug).filter(Boolean));
}

/** Map an arbitrary value onto the nearest contract slug (exact, else slugified match). */
function coerceToContract(value, contract = []) {
  const slug = slugifyCategory(value);
  if (!slug) return null;
  const slugs = contractSlugSet(contract);
  if (slugs.has(slug)) return slug;
  return null;
}

/**
 * Assign a contract category to every planned asset.
 *
 * @param {Array<{asset,fields,existingMetadata,skip}>} planned
 * @param {Object} options
 * @param {Array<{slug,label}>} options.contract  source-derived category contract (required)
 * @param {(evidence)=>{slug,confidence}|string|null} [options.classifier]  injected classifier;
 *   defaults to the deterministic token-overlap classifier over the contract.
 * @returns {Array} planned with fields.productCategory set + categoryAssignment
 */
export function applyCategoryPlan(planned = [], options = {}) {
  const contract = Array.isArray(options.contract)
    ? options.contract.filter((c) => c && c.slug)
    : [];
  const classify = options.classifier || deterministicClassifier(contract);
  const fallback = deterministicClassifier(contract);

  return planned.map((plan) => {
    if (!plan || !plan.fields || plan.error) return plan;
    const fields = { ...plan.fields };
    const metadata = plan.existingMetadata || {};

    // 1) Existing contract-valid productCategory wins.
    const existing = coerceToContract(metadata[FIELD.PRODUCT_CATEGORY], contract);
    if (existing) {
      fields.productCategory = existing;
      return {
        ...plan,
        fields,
        categoryAssignment: { slug: existing, confidence: 'existing', reason: 'existing-metadata' },
      };
    }

    // 2) A generated productCategory that is already a contract slug wins.
    const generated = coerceToContract(fields.productCategory, contract);
    if (generated) {
      fields.productCategory = generated;
      return {
        ...plan,
        fields,
        categoryAssignment: { slug: generated, confidence: 'generated', reason: 'generated-field' },
      };
    }

    // 3) Classify from real metadata evidence into the contract. Mandatory: the classifier
    //    (or the deterministic fallback) always returns a contract slug.
    const evidence = assetEvidence(plan.asset, metadata, fields);
    let result = classify(evidence);
    let slug = coerceToContract(typeof result === 'string' ? result : result?.slug, contract);
    let confidence = (result && typeof result === 'object' && result.confidence) || 'classified';
    if (!slug) {
      result = fallback(evidence);
      slug = result?.slug || (contract[0] && contract[0].slug) || null;
      confidence = 'fallback';
    }

    if (slug) fields.productCategory = slug;
    return {
      ...plan,
      fields,
      categoryAssignment: slug
        ? { slug, confidence, reason: 'classified' }
        : null,
    };
  });
}

export function buildCategoryCoverage(planned = []) {
  const categories = new Map();
  const unclassified = [];

  for (const plan of planned) {
    if (!plan || plan.error) continue;
    const category = cleanString(plan.fields?.productCategory);
    if (!category) {
      unclassified.push(plan.asset?.assetId || plan.asset?.repoPath || plan.asset?.repoName || 'unknown');
      continue;
    }
    const slug = slugifyCategory(category) || category;
    const existing = categories.get(slug) || {
      slug,
      label: humanizeCategorySlug(slug),
      assetCount: 0,
    };
    existing.assetCount += 1;
    categories.set(slug, existing);
  }

  return {
    categories: [...categories.values()].sort((a, b) => b.assetCount - a.assetCount),
    unclassified,
  };
}
