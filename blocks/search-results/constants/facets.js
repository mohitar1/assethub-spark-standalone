import { getExternalParams } from '../utils/config.js';

/** Keys that map to repositoryMetadata instead of assetMetadata */
const ADDITIONAL_REPOSITORY_METADATA_KEYS = [
  'dc:format',
];

/**
 * Get ContentAI metadata path for a facet key.
 * - repo:* → repositoryMetadata.repo:*
 * - Keys in ADDITIONAL_REPOSITORY_METADATA_KEYS → repositoryMetadata.*
 * - All others → assetMetadata.*
 * @param {string} key - Facet key (e.g., 'repo:createdBy' or 'country')
 * @returns {string} ContentAI field path (e.g., 'repositoryMetadata.repo:createdBy')
 */
export function getMetadataPath(key) {
  if (key.startsWith('repo:') || ADDITIONAL_REPOSITORY_METADATA_KEYS.includes(key)) {
    return `repositoryMetadata.${key}`;
  }
  return `assetMetadata.${key}`;
}

/**
 * Get current facets config from externalParams or default
 * @returns {Object} Facets config
 */
export function getFacetsConfig() {
  const externalParams = getExternalParams();
  return externalParams.excFacets || {};
}

/**
 * Get date facets
 * @returns {string[]} Array of date facet keys
 */
export function getDateFacets() {
  return Object.entries(getFacetsConfig())
    .filter(([, value]) => value.type === 'date')
    .map(([key]) => key);
}
