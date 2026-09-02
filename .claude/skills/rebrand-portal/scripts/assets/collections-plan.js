/**
 * Pure planning logic for the collections step (Step 6): turn the company's searchable
 * assets into a set of collections, one per distinct facet value (default productCategory).
 *
 * Kept side-effect free so it can be unit-tested without network or credentials — the
 * controller (create-collections.js) supplies the live client and applies the plan.
 */

/** Supported facets to group collections by. */
export const GROUP_FACETS = ['productCategory', 'campaign', 'channel'];

/** Title-case a facet slug/value for a human-friendly collection title. */
export function humanize(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Title-case a company key ("acme-corp" -> "Acme Corp"). */
export function companyLabel(companyKey) {
  return humanize(companyKey);
}

/**
 * Group asset records into collection specs by a facet.
 *
 * @param {Array<{assetId:string, productCategory?:string, campaign?:string}>} assets
 *   asset records (each may also carry a `channel` facet value)
 * @param {Object} options
 * @param {string} [options.company]      companyKey — used to build titles
 * @param {string} [options.facet='productCategory']
 * @param {number} [options.minAssets=1]  drop groups with fewer than this many assets
 * @param {string} [options.titlePrefix]  defaults to the humanized company label
 * @returns {Array<{facetValue:string, title:string, assetIds:string[]}>}
 *   sorted by facetValue; assets missing the facet are skipped (no junk bucket).
 */
export function planCollections(assets, options = {}) {
  const {
    company,
    facet = 'productCategory',
    minAssets = 1,
    titlePrefix,
  } = options;

  if (!GROUP_FACETS.includes(facet)) {
    throw new Error(`planCollections: unsupported facet "${facet}" (use ${GROUP_FACETS.join('|')})`);
  }

  const prefix = titlePrefix != null ? titlePrefix : companyLabel(company);
  const buckets = new Map();

  for (const asset of assets || []) {
    if (!asset || !asset.assetId) continue;
    const raw = asset[facet];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue; // skip untagged — never create an "uncategorized" collection
    if (!buckets.has(value)) buckets.set(value, new Set());
    buckets.get(value).add(asset.assetId);
  }

  const specs = [];
  for (const [facetValue, idSet] of buckets) {
    const assetIds = [...idSet];
    if (assetIds.length < minAssets) continue;
    const label = humanize(facetValue);
    specs.push({
      facetValue,
      title: prefix ? `${prefix} — ${label}` : label,
      assetIds,
    });
  }

  specs.sort((a, b) => a.facetValue.localeCompare(b.facetValue));
  return specs;
}
