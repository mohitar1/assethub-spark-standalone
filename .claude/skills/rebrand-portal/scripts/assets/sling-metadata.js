/**
 * Sling metadata read/write for AEM DAM assets.
 *
 * Uses the asset's DAM repo path:
 *   GET  /content/dam/<folder>/<asset>/jcr:content/metadata.json
 *   POST /content/dam/<folder>/<asset>/jcr:content/metadata
 *
 * The POST body is add-only from the agent's point of view: scalar fields are sent only
 * when missing, and multi-value fields use Sling's @Patch append syntax when present.
 */

import {
  DAM_ROOT, FIELD, STATUS_APPROVED,
  AUTOGEN_FIELD, ASSET_STATE_PROCESSED,
  ASSET_PROCESSED_POLL_INTERVAL_MS, ASSET_PROCESSED_POLL_TIMEOUT_MS,
} from './constants.js';

export const SLING_FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded;charset=UTF-8';

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value != null && String(value).trim().length > 0;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function sameToken(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of normalizeStringArray(values)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function assertDamRepoPath(repoPath) {
  const path = String(repoPath || '');
  if (!path.startsWith(`${DAM_ROOT}/`) || path.includes('/../') || path.endsWith('/..')) {
    throw new Error(`Sling metadata requires a DAM asset repoPath under ${DAM_ROOT} (got ${repoPath})`);
  }
  return path.replace(/\/+$/, '');
}

function encodeSlingPath(repoPath) {
  return assertDamRepoPath(repoPath)
    .split('/')
    .map((seg) => (seg === '' ? '' : encodeURIComponent(seg).replace(/%3A/g, ':')))
    .join('/');
}

function formField(field) {
  return `./${field}`;
}

function recordKept(kept, field, value, reason = 'existing') {
  kept.push({ field, value, reason });
}

function recordConflict(conflicts, field, existing, desired) {
  conflicts.push({
    field,
    existing,
    desired,
    reason: 'existing-value-not-overwritten',
  });
}

function addEntry(entries, field, value) {
  entries.push({ name: formField(field), value });
}

function addControl(entries, field, suffix, value) {
  entries.push({ name: `${formField(field)}${suffix}`, value });
}

function addScalarIfMissing({
  entries, kept, conflicts, existing, field, value, conflictOnDifferent = false,
}) {
  const desired = cleanString(value);
  if (!desired) return;
  const current = existing[field];
  if (!hasValue(current)) {
    addEntry(entries, field, desired);
    return;
  }
  recordKept(kept, field, current);
  if (conflictOnDifferent && !sameToken(current, desired)) {
    recordConflict(conflicts, field, current, desired);
  }
}

function addArrayIfMissingOrAppend({
  entries, kept, conflicts, existing, field, values, requiredValues = [],
}) {
  const desired = uniqueStrings(values);
  if (desired.length === 0) return;
  const current = existing[field];

  if (!hasValue(current)) {
    addControl(entries, field, '@TypeHint', 'String[]');
    desired.forEach((value) => addEntry(entries, field, value));
    return;
  }

  recordKept(kept, field, current);

  if (!Array.isArray(current)) {
    const missingRequired = uniqueStrings(requiredValues)
      .filter((value) => !sameToken(current, value));
    missingRequired.forEach((value) => recordConflict(conflicts, field, current, value));
    return;
  }

  const existingTokens = new Set(
    current.map((value) => String(value).trim().toLowerCase()).filter(Boolean),
  );
  const additions = desired.filter((value) => !existingTokens.has(value.toLowerCase()));
  if (additions.length === 0) return;

  addControl(entries, field, '@TypeHint', 'String[]');
  addControl(entries, field, '@Patch', 'true');
  additions.forEach((value) => addEntry(entries, field, `+${value}`));
}

export function entriesToFormBody(entries = []) {
  const body = new URLSearchParams();
  body.set('_charset_', 'utf-8');
  entries.forEach(({ name, value }) => body.append(name, value));
  return body;
}

export function buildSlingMetadataUpdate(fields = {}, scope = {}, existingMetadata = {}) {
  const entries = [];
  const conflicts = [];
  const kept = [];
  const existing = existingMetadata || {};

  addScalarIfMissing({
    entries, kept, conflicts, existing, field: FIELD.TITLE, value: fields.title,
  });
  addScalarIfMissing({
    entries, kept, conflicts, existing, field: FIELD.DESCRIPTION, value: fields.description,
  });
  addArrayIfMissingOrAppend({
    entries, kept, conflicts, existing, field: FIELD.SUBJECT, values: fields.keywords,
  });
  addScalarIfMissing({
    entries,
    kept,
    conflicts,
    existing,
    field: FIELD.PRODUCT_CATEGORY,
    value: fields.productCategory,
  });
  addScalarIfMissing({
    entries, kept, conflicts, existing, field: FIELD.CAMPAIGN, value: fields.campaign,
  });
  addScalarIfMissing({
    entries, kept, conflicts, existing, field: FIELD.CHANNEL, value: fields.channel,
  });
  addScalarIfMissing({
    entries, kept, conflicts, existing, field: FIELD.BRAND, value: fields.brand,
  });
  addScalarIfMissing({
    entries,
    kept,
    conflicts,
    existing,
    field: FIELD.COMPANY,
    value: scope.company,
    conflictOnDifferent: true,
  });
  addScalarIfMissing({
    entries,
    kept,
    conflicts,
    existing,
    field: FIELD.STATUS,
    value: scope.status || STATUS_APPROVED,
    conflictOnDifferent: true,
  });
  addArrayIfMissingOrAppend({
    entries,
    kept,
    conflicts,
    existing,
    field: FIELD.ALLOWED_COUNTRIES,
    values: scope.allowedCountries,
    requiredValues: scope.allowedCountries,
  });

  return {
    entries,
    conflicts,
    kept,
    body: entriesToFormBody(entries),
  };
}

export async function getSlingAssetMetadata(client, repoPath) {
  const path = `${encodeSlingPath(repoPath)}/jcr:content/metadata.json`;
  const res = await client.request('sling', {
    method: 'GET',
    path,
    headers: { Accept: 'application/json' },
    includeApiKey: false,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET Sling metadata ${repoPath} -> ${res.status} ${text}`.trim());
  }
  const json = await res.json();
  return {
    assetMetadata: json || {},
    repositoryMetadata: { 'dc:format': json?.['dc:format'] },
    etag: res.headers?.get?.('ETag') || res.headers?.get?.('etag') || null,
  };
}

/**
 * AEM writes dam:assetState directly on jcr:content, NOT inside the jcr:content/metadata
 * sub-node that getSlingAssetMetadata reads — confirmed against a live asset's
 * jcr:content.-1.json, which shows "dam:assetState" as a sibling of "jcr:primaryType",
 * one level above the "metadata" node. Polling metadata.json for this field never sees it
 * change, so waitForAssetProcessed must read jcr:content.json separately.
 */
async function getAssetProcessingState(client, repoPath) {
  const path = `${encodeSlingPath(repoPath)}/jcr:content.json`;
  const res = await client.request('sling', {
    method: 'GET',
    path,
    headers: { Accept: 'application/json' },
    includeApiKey: false,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET Sling jcr:content ${repoPath} -> ${res.status} ${text}`.trim());
  }
  const json = await res.json();
  return json?.[AUTOGEN_FIELD.ASSET_STATE];
}

/**
 * Poll AEM's asset-processing pipeline until it reports dam:assetState === "processed"
 * (or the timeout elapses). Enrichment must not read autogen:* fields before this — they
 * may be missing or stale mid-processing, and reading early is exactly what forces a
 * silent fallback to weaker filename-based evidence.
 *
 * @returns {Promise<{ processed: boolean, meta: Object }>} `meta` is the last-read Sling
 *   metadata (from the separate metadata.json sub-node the caller actually consumes for
 *   autogen:* fields), fetched once processing is confirmed — or once the timeout hits, in
 *   which case `processed: false` tells the caller to treat autogen:* fields as unreliable
 *   and record the timeout rather than guess.
 */
export async function waitForAssetProcessed(client, repoPath, {
  timeoutMs = ASSET_PROCESSED_POLL_TIMEOUT_MS,
  intervalMs = ASSET_PROCESSED_POLL_INTERVAL_MS,
  sleepFn = (ms) => new Promise((r) => { setTimeout(r, ms); }),
  now = () => Date.now(),
} = {}) {
  const deadline = now() + timeoutMs;
  let state = await getAssetProcessingState(client, repoPath);
  while (state !== ASSET_STATE_PROCESSED) {
    if (now() >= deadline) {
      const meta = await getSlingAssetMetadata(client, repoPath);
      return { processed: false, meta };
    }
    await sleepFn(intervalMs);
    state = await getAssetProcessingState(client, repoPath);
  }
  const meta = await getSlingAssetMetadata(client, repoPath);
  return { processed: true, meta };
}

export async function writeSlingAssetMetadata(client, repoPath, updatePlan) {
  const entries = Array.isArray(updatePlan) ? updatePlan : updatePlan?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: true, status: 204, skipped: true };
  }

  const res = await client.request('sling', {
    method: 'POST',
    path: `${encodeSlingPath(repoPath)}/jcr:content/metadata`,
    headers: { 'Content-Type': SLING_FORM_CONTENT_TYPE },
    body: entriesToFormBody(entries).toString(),
    includeApiKey: false,
  });
  if (res.ok) return { ok: true, status: res.status };
  const text = await res.text().catch(() => '');
  return { ok: false, status: res.status, error: text };
}
