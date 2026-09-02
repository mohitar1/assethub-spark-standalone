/**
 * Source-evidence category assignment.
 *
 * The category contract is generated from assets we actually found. It is not an
 * operator-provided strict vocabulary and it is never used to drop values.
 *
 * Evidence is AEM's own autogen:subject smart tags (populated once dam:assetState reaches
 * "processed" — see sling-metadata.js's waitForAssetProcessed) plus scrape-time hints
 * (page/heading/alt text, filename). autogen:subject is real signal from AEM's asset
 * processing, not a guess, so it is checked first; the page/filename evidence below is the
 * fallback for assets with no smart tags yet (or none that matched a rule).
 */

import { FIELD, AUTOGEN_FIELD } from './constants.js';

const CATEGORY_RULES = [
  {
    slug: 'documents',
    label: 'Documents',
    terms: ['document', 'documents', 'pdf', 'brochure', 'catalog', 'catalogue', 'spec', 'specification', 'manual', 'guide', 'report', 'presentation'],
  },
  {
    slug: 'accessories',
    label: 'Accessories',
    terms: ['accessory', 'accessories', 'parts', 'merchandise', 'gear', 'apparel', 'collection'],
  },
  {
    slug: 'products',
    label: 'Products',
    terms: ['product', 'products', 'model', 'models', 'vehicle', 'vehicles', 'car', 'cars', 'shop', 'inventory', 'range'],
  },
  {
    slug: 'lifestyle',
    label: 'Lifestyle',
    terms: ['lifestyle', 'gallery', 'inspiration', 'story', 'people', 'interior', 'city', 'road', 'travel', 'home', 'experience'],
  },
  {
    slug: 'events',
    label: 'Events',
    terms: ['event', 'events', 'press', 'news', 'launch', 'conference', 'showroom'],
  },
  {
    slug: 'campaigns',
    label: 'Campaigns',
    terms: ['campaign', 'campaigns', 'promotion', 'promo', 'seasonal', 'sale', 'offer'],
  },
  {
    slug: 'alzheimers',
    label: "Alzheimer's Disease",
    terms: ['alzheimer', 'alzheimers', 'dementia'],
  },
  {
    slug: 'cancer',
    label: 'Cancer',
    terms: ['cancer', 'oncology', 'tumor', 'chemotherapy', 'lung-cancer', 'thyroid-cancer'],
  },
  {
    slug: 'diabetes',
    label: 'Diabetes',
    terms: ['diabetes', 'diabetic', 'blood-sugar', 'blood_sugar', 'insulin', 'glucose'],
  },
  {
    slug: 'dermatology',
    label: 'Dermatology',
    terms: ['dermatology', 'dermatitis', 'eczema', 'psoriasis', 'lupus', 'alopecia', 'skin-condition', 'skin_condition'],
  },
  {
    slug: 'obesity',
    label: 'Obesity',
    terms: ['obesity', 'weight-loss', 'weight_loss', 'weight-management'],
  },
  {
    slug: 'autoimmune',
    label: 'Autoimmune',
    terms: ['autoimmune'],
  },
  {
    slug: 'migraine',
    label: 'Migraine',
    terms: ['migraine'],
  },
];

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

function autogenSubjectTerms(metadata = {}) {
  const value = metadata[AUTOGEN_FIELD.SUBJECT];
  let list;
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === 'string' && value.trim()) {
    list = [value];
  } else {
    list = [];
  }
  return list.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
}

function evidenceText(asset = {}, metadata = {}, fields = {}) {
  return [
    asset.sourcePage,
    asset.pageTitle,
    asset.heading,
    asset.altText,
    asset.nearbyText,
    asset.fileName,
    asset.repoName,
    fields.title,
    fields.description,
    ...(Array.isArray(fields.keywords) ? fields.keywords : []),
    ...(Array.isArray(metadata[FIELD.SUBJECT]) ? metadata[FIELD.SUBJECT] : []),
    ...autogenSubjectTerms(metadata),
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');
}

function evidenceSnippets(asset = {}, fields = {}, metadata = {}) {
  const autogenSubject = autogenSubjectTerms(metadata);
  return [
    autogenSubject.length > 0 && `autogen:subject=${autogenSubject.join(',')}`,
    asset.sourcePage && `sourcePage=${asset.sourcePage}`,
    asset.heading && `heading=${asset.heading}`,
    asset.altText && `altText=${asset.altText}`,
    (asset.fileName || asset.repoName) && `fileName=${asset.fileName || asset.repoName}`,
    fields.title && `title=${fields.title}`,
  ].filter(Boolean).slice(0, 4);
}

function categoryFromEvidence(asset, metadata, fields) {
  const text = evidenceText(asset, metadata, fields);
  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some((term) => text.includes(term))) {
      // autogen:subject is AEM's own asset-processing output, not a guess — a match
      // sourced from it is higher confidence than the same rule matching only on
      // page/heading/filename text.
      const subjectTerms = autogenSubjectTerms(metadata);
      const matchesSubject = rule.terms.some((term) => subjectTerms.some((t) => t.includes(term)));
      return {
        slug: rule.slug,
        label: rule.label,
        confidence: matchesSubject ? 'high' : 'medium',
        reason: 'source-evidence',
      };
    }
  }
  if (asset?.sourcePage || asset?.pageTitle || asset?.heading || asset?.altText) {
    return {
      slug: 'brand-assets',
      label: 'Brand Assets',
      confidence: 'low',
      reason: 'generic-source-evidence',
    };
  }
  return null;
}

/**
 * Apply category assignment to planned assets. Existing productCategory wins.
 */
export function applyCategoryPlan(planned = []) {
  return planned.map((plan) => {
    if (!plan || !plan.fields) return plan;
    const existing = cleanString(plan.existingMetadata?.[FIELD.PRODUCT_CATEGORY]);
    const fields = { ...plan.fields };

    let assignment = null;
    if (existing) {
      fields.productCategory = existing;
      assignment = {
        slug: existing,
        label: humanizeCategorySlug(existing),
        confidence: 'existing',
        reason: 'existing-metadata',
        evidence: [`existingMetadata.${FIELD.PRODUCT_CATEGORY}=${existing}`],
      };
    } else if (!cleanString(fields.productCategory)) {
      const inferred = categoryFromEvidence(plan.asset, plan.existingMetadata || {}, fields);
      if (inferred) {
        fields.productCategory = inferred.slug;
        assignment = {
          ...inferred,
          evidence: evidenceSnippets(plan.asset, fields, plan.existingMetadata || {}),
        };
      }
    } else {
      const slug = slugifyCategory(fields.productCategory);
      fields.productCategory = slug || fields.productCategory;
      assignment = {
        slug: fields.productCategory,
        label: humanizeCategorySlug(fields.productCategory),
        confidence: 'generated',
        reason: 'generated-field',
        evidence: evidenceSnippets(plan.asset, fields, plan.existingMetadata || {}),
      };
    }

    return { ...plan, fields, categoryAssignment: assignment };
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
      evidence: [],
    };
    existing.assetCount += 1;
    for (const snippet of plan.categoryAssignment?.evidence || []) {
      if (!existing.evidence.includes(snippet) && existing.evidence.length < 4) {
        existing.evidence.push(snippet);
      }
    }
    categories.set(slug, existing);
  }

  return {
    categories: [...categories.values()].sort((a, b) => b.assetCount - a.assetCount),
    unclassified,
  };
}
