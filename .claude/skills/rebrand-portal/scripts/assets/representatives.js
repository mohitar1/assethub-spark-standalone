/**
 * Select representative assets from a planned enrichment run.
 *
 * Step 5 uses this report data to update copied DA cards/top-model visuals without
 * mixing DA page edits into the AEM Assets metadata controller.
 */

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Worker-proxy image URL for a representative asset — the ONLY renderable form for a DAM
 * asset in the portal (raw delivery-*.adobeaemcloud.com 404s unauthenticated). Same shape
 * the app's own components produce (blocks/search-results/components/picture.js): strip the
 * file extension and encodeURIComponent the base name. Returns null when assetId is missing.
 */
export function cardImageUrl(rep, { width = 750 } = {}) {
  const assetId = rep && cleanString(rep.assetId);
  if (!assetId) return null;
  const name = cleanString(rep.repoName) || cleanString(rep.title) || 'thumbnail';
  const fileName = encodeURIComponent(name.replace(/\.[^/.]+$/, '') || 'thumbnail');
  return `/api/adobe/assets/${assetId}/as/${fileName}.jpg?width=${width}`;
}

function representativeFor(plan, groupValue) {
  const { asset, fields = {}, skip } = plan;
  const rep = {
    productCategory: groupValue,
    assetId: cleanString(asset.assetId),
    assetPath: cleanString(asset.repoPath),
    repoName: cleanString(asset.repoName),
    title: cleanString(fields.title) || cleanString(asset.repoName),
    description: cleanString(fields.description),
    keywords: Array.isArray(fields.keywords) ? fields.keywords : [],
    source: skip ? 'already-enriched' : 'planned-enrichment',
  };
  rep.cardImageUrl = cardImageUrl(rep);
  return rep;
}

/**
 * Build one representative asset per productCategory.
 *
 * @param {Array<{asset:Object,fields?:Object,skip?:boolean}>} planned
 * @param {Object} options
 * @param {string[]} [options.expectedCategories] category slugs from curated cards
 * @returns {{groupBy:string,expected:string[],missing:string[],items:Object}}
 */
export function buildProductCategoryRepresentatives(planned = [], options = {}) {
  const expected = Array.isArray(options.expectedCategories)
    ? options.expectedCategories.map(cleanString).filter(Boolean)
    : [];
  const items = {};

  for (const plan of planned) {
    const groupValue = cleanString(plan?.fields?.productCategory);
    if (!groupValue || items[groupValue]) continue;
    items[groupValue] = representativeFor(plan, groupValue);
  }

  const missing = expected.filter((category) => !items[category]);
  return {
    groupBy: 'productCategory',
    expected,
    missing,
    items,
  };
}
