/**
 * Per-asset metadata read + idempotency test (plan §2.5).
 */

import { FIELD, STATUS_APPROVED } from './constants.js';

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

function categoryMatchesVocab(value, vocab) {
  if (!Array.isArray(vocab) || vocab.length === 0) return true;
  if (!nonEmptyString(value)) return false;
  return vocab.some((entry) => value.trim() === String(entry).trim());
}

/**
 * GET /assets/{id}/metadata, returning the parsed body plus the ETag needed for the
 * per-asset PATCH path.
 *
 * @returns {Promise<{ assetId, assetMetadata, repositoryMetadata, etag }>}
 */
export async function getAssetMetadata(client, assetId) {
  const res = await client.request('metadata', {
    method: 'GET',
    path: `/assets/${encodeURIComponent(assetId)}/metadata`,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET metadata ${assetId} -> ${res.status} ${text}`.trim());
  }
  const etag = res.headers?.get?.('ETag') || res.headers?.get?.('etag') || null;
  const json = await res.json();
  return {
    assetId,
    assetMetadata: json.assetMetadata || {},
    repositoryMetadata: json.repositoryMetadata || {},
    etag,
  };
}

/**
 * [EDGE-IDEMP] An asset counts as already enriched when it carries this fork's company
 * scope AND a non-empty title. Re-runs skip these unless --force.
 */
export function isAlreadyEnriched(assetMetadata, customerKey, options = {}) {
  const { productCategoryVocab = null } = options;
  if (!assetMetadata) return false;
  const company = assetMetadata[FIELD.COMPANY];
  const title = assetMetadata[FIELD.TITLE];
  const status = assetMetadata[FIELD.STATUS];
  const allowedCountries = assetMetadata[FIELD.ALLOWED_COUNTRIES];
  return company === customerKey
    && nonEmptyString(title)
    && status === STATUS_APPROVED
    && includesGlobal(allowedCountries)
    && categoryMatchesVocab(assetMetadata[FIELD.PRODUCT_CATEGORY], productCategoryVocab);
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
