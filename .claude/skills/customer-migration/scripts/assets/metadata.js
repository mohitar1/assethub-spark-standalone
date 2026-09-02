/**
 * Per-asset metadata read + idempotency test.
 */

import {
  FIELD,
  STATUS_APPROVED,
} from './constants.js';

function includesGlobal(value) {
  if (Array.isArray(value)) {
    return value.some((v) => String(v).toLowerCase() === 'global');
  }
  return String(value || '').toLowerCase() === 'global';
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

/**
 * [EDGE-IDEMP] An asset counts as already enriched when it carries this fork's company
 * scope AND a non-empty title. Re-runs skip these unless --force.
 */
export function isAlreadyEnriched(assetMetadata, customerKey) {
  if (!assetMetadata) return false;
  const company = assetMetadata[FIELD.COMPANY];
  const title = assetMetadata[FIELD.TITLE];
  const status = assetMetadata[FIELD.STATUS];
  const allowedCountries = assetMetadata[FIELD.ALLOWED_COUNTRIES];
  const productCategory = assetMetadata[FIELD.PRODUCT_CATEGORY];
  return company === customerKey
    && nonEmptyString(title)
    && status === STATUS_APPROVED
    && includesGlobal(allowedCountries)
    && nonEmptyString(productCategory);
}

/** Convert stored AEM metadata back into the normalized field shape used by reports. */
export function fieldsFromMetadata(assetMetadata = {}) {
  const fields = {};
  const copyString = (outKey, metadataKey) => {
    const value = assetMetadata[metadataKey];
    if (nonEmptyString(value)) fields[outKey] = value.trim();
  };

  copyString('title', FIELD.TITLE);
  copyString('description', FIELD.DESCRIPTION);
  copyString('productCategory', FIELD.PRODUCT_CATEGORY);
  copyString('campaign', FIELD.CAMPAIGN);
  copyString('channel', FIELD.CHANNEL);
  copyString('brand', FIELD.BRAND);

  const keywords = normalizeStringArray(assetMetadata[FIELD.SUBJECT]);
  if (keywords.length > 0) fields.keywords = keywords;

  return fields;
}
