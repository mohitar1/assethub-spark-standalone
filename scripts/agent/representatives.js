/**
 * Select representative assets from a planned enrichment run.
 *
 * Step 5 uses this report data to update copied DA cards/top-model visuals without
 * mixing DA page edits into the AEM Assets metadata controller.
 */

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function representativeFor(plan, groupValue) {
  const { asset, fields = {}, skip } = plan;
  return {
    productCategory: groupValue,
    assetId: cleanString(asset.assetId),
    assetPath: cleanString(asset.repoPath),
    repoName: cleanString(asset.repoName),
    title: cleanString(fields.title) || cleanString(asset.repoName),
    description: cleanString(fields.description),
    keywords: Array.isArray(fields.keywords) ? fields.keywords : [],
    source: skip ? 'already-enriched' : 'planned-enrichment',
  };
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
