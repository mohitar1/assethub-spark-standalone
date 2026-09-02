/**
 * Metadata generation — the single generator every enrichment run uses.
 *
 * Primary evidence is AEM's own asset-processing output (autogen:title,
 * autogen:description, autogen:subject — populated once dam:assetState reaches
 * "processed", see sling-metadata.js's waitForAssetProcessed). Filename tokens are
 * last-resort only, used per-field when the corresponding autogen:* value is still empty
 * after processing completes (never as a competing mode — there is no --metadata-mode
 * flag to choose between "filename" and something else).
 *
 * dam:roles is a rights/licensing field, never a title/description/classification signal —
 * deliberately never read here or anywhere else in this skill.
 */

import { AUTOGEN_FIELD } from './constants.js';

function humanizeName(repoName) {
  if (!repoName || typeof repoName !== 'string') return 'Asset';
  const base = repoName.replace(/\.[a-z0-9]+$/i, '');
  const words = base.split(/[-_\s]+/).filter(Boolean);
  if (words.length === 0) return 'Asset';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function tokensFromName(repoName) {
  if (!repoName || typeof repoName !== 'string') return [];
  const base = repoName.replace(/\.[a-z0-9]+$/i, '');
  return base.split(/[-_\s]+/).map((t) => t.toLowerCase()).filter((t) => t.length > 2);
}

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/**
 * The one generator every enrichment run uses. Reads AEM's autogen:* fields (present once
 * the caller has confirmed dam:assetState === "processed") as the primary source for
 * title/description/keywords, falling back to filename tokens + xcm:machineKeywords hints
 * only for whichever fields autogen left empty.
 */
export function createAssetMetadataGenerator() {
  return async function assetMetadataGenerate({
    repoName, hints = {}, existingAssetMetadata = {},
  }) {
    const autogenTitle = cleanString(existingAssetMetadata[AUTOGEN_FIELD.TITLE]);
    const autogenDescription = cleanString(existingAssetMetadata[AUTOGEN_FIELD.DESCRIPTION]);
    const autogenSubject = stringArray(existingAssetMetadata[AUTOGEN_FIELD.SUBJECT]);

    const fallbackTitle = humanizeName(repoName);
    const title = autogenTitle || fallbackTitle;

    const description = autogenDescription
      || `${fallbackTitle} - auto-generated preview description for demo enrichment.`;

    const nameTokens = tokensFromName(repoName);
    const hintKeywords = Array.isArray(hints.machineKeywords) ? hints.machineKeywords : [];
    const keywords = (autogenSubject.length > 0 ? autogenSubject : [...nameTokens, ...hintKeywords])
      .map((k) => String(k).toLowerCase());

    return {
      title,
      description,
      keywords,
      campaign: null,
      channel: null,
    };
  };
}
