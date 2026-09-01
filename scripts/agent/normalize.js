/**
 * Normalize + validate model-generated metadata into the portal's facet vocabulary.
 *
 * The vision/LLM step (generate.js) returns a loose object; this module repairs it into
 * a strict, portal-ready shape (plan §2.7): clamps lengths and cleans the keyword array.
 * `company` and `dam:status` are stamped by the controller, never by the model, so they
 * are not handled here.
 *
 * IMPORTANT — productCategory/channel are FREE TEXT by default, not a fixed enum. The
 * portal's `excFacets` config (docs/da-content/search.docx) declares these as
 * `{ "type": "string" }` CATEGORY facets — the facet UI buckets on whatever distinct
 * values exist on assets, there is no curated list to match against. Silently mapping
 * to a hardcoded vocabulary (as this module used to do) means any customer whose real
 * values aren't in that list gets silently dropped to `null` — metadata never lands,
 * search/facets stay empty, and nothing in the run tells you why (this exact bug
 * happened during the Disney demo: `productCategory` values like "Movies & Shows" were
 * dropped because they didn't match a leftover banking-demo vocabulary).
 *
 * A caller MAY pass `productCategoryVocab`/`channelVocab` to opt into strict-enum
 * behavior (map-or-drop) when a customer genuinely has a fixed, curated set of
 * categories/channels they've told you about. Without that, values are clamped and
 * kept as free text — never silently discarded.
 */

import {
  TITLE_MAX, DESCRIPTION_MAX, KEYWORDS_MIN, KEYWORDS_MAX,
} from './constants.js';

// Optional strict vocabularies — NOT applied by default (see module header). Pass one
// explicitly via `normalizeGenerated(raw, { productCategoryVocab })` only when a
// customer has confirmed a fixed, curated category/channel list.
export const DEFAULT_PRODUCT_CATEGORY_VOCAB = [
  'accounts', 'cards', 'loans', 'mortgages', 'insurance', 'investments',
  'payments', 'savings', 'business', 'wealth',
];

export const DEFAULT_CHANNEL_VOCAB = [
  'web', 'social', 'email', 'print', 'display', 'video', 'mobile', 'in-branch',
];

function clampString(value, max) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim();
}

/**
 * Clean a keyword array: coerce to strings, lowercase, trim, drop empties, dedupe,
 * and cap at KEYWORDS_MAX. Returns [] when nothing usable is present.
 */
export function normalizeKeywords(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    if (typeof raw !== 'string' && typeof raw !== 'number') continue;
    const kw = String(raw).trim().toLowerCase();
    if (!kw) continue;
    if (seen.has(kw)) continue;
    seen.add(kw);
    out.push(kw);
    if (out.length >= KEYWORDS_MAX) break;
  }
  return out;
}

function normalizeVocabularyValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function singularizeToken(token) {
  if (token.endsWith('ies') && token.length > 3) return `${token.slice(0, -3)}y`;
  if (token.endsWith('es') && token.length > 2) return token.slice(0, -2);
  if (token.endsWith('s') && token.length > 1) return token.slice(0, -1);
  return token;
}

function normalizedVocabularyKeys(value) {
  const normalized = normalizeVocabularyValue(value);
  const keys = new Set();
  if (!normalized) return keys;
  keys.add(normalized);
  keys.add(normalized.split('-').map(singularizeToken).join('-'));
  return keys;
}

/**
 * Map a loose value onto a controlled vocabulary, case-insensitively. Returns the
 * canonical vocab entry, or null when there is no confident match. Only used when the
 * caller opts into strict-enum behavior by passing a vocab.
 */
export function mapToVocabulary(value, vocab) {
  if (typeof value !== 'string') return null;
  const needle = value.trim();
  if (!needle) return null;

  const needleKeys = normalizedVocabularyKeys(needle);
  const match = vocab.find((entry) => {
    const entryKeys = normalizedVocabularyKeys(entry);
    return [...needleKeys].some((key) => entryKeys.has(key));
  });
  return match || null;
}

/**
 * Validate the raw model output shape. Returns { ok, errors } — non-blocking; the caller
 * repairs rather than rejects, but a completely unusable object (no title) is flagged.
 */
export function validateGeneratedShape(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['output is not an object'] };
  }
  if (typeof raw.title !== 'string' || !raw.title.trim()) {
    errors.push('missing title');
  }
  if (raw.description != null && typeof raw.description !== 'string') {
    errors.push('description must be a string');
  }
  if (raw.keywords != null && !Array.isArray(raw.keywords)) {
    errors.push('keywords must be an array');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Repair + normalize raw model output into portal-ready fields. Empty/undefined fields
 * are omitted (never written as empty strings). Returns a plain object holding only the
 * fields that survived normalization.
 *
 * `productCategory`/`channel` are free text by default (clamped to TITLE_MAX) — pass
 * `options.productCategoryVocab`/`options.channelVocab` to restrict to a strict,
 * confirmed-with-the-customer enum instead (map-or-drop, never invents a bucket).
 */
export function normalizeGenerated(raw, options = {}) {
  const { productCategoryVocab = null, channelVocab = null } = options;
  const out = {};

  const title = clampString(raw?.title, TITLE_MAX);
  if (title) out.title = title;

  const description = clampString(raw?.description, DESCRIPTION_MAX);
  if (description) out.description = description;

  const keywords = normalizeKeywords(raw?.keywords);
  if (keywords.length >= KEYWORDS_MIN) {
    out.keywords = keywords;
  } else if (keywords.length > 0) {
    // Fewer than the preferred minimum is still useful for filtering — keep them.
    out.keywords = keywords;
  }

  if (productCategoryVocab) {
    const productCategory = mapToVocabulary(raw?.productCategory, productCategoryVocab);
    if (productCategory) out.productCategory = productCategory;
  } else {
    const productCategory = clampString(raw?.productCategory, TITLE_MAX);
    if (productCategory) out.productCategory = productCategory;
  }

  if (channelVocab) {
    const channel = mapToVocabulary(raw?.channel, channelVocab);
    if (channel) out.channel = channel;
  } else {
    const channel = clampString(raw?.channel, TITLE_MAX);
    if (channel) out.channel = channel;
  }

  const campaign = clampString(raw?.campaign, TITLE_MAX);
  if (campaign) out.campaign = campaign;

  const brand = clampString(raw?.brand, TITLE_MAX);
  if (brand) out.brand = brand;

  return out;
}
