/**
 * Collections Utility Functions
 * Shared utilities for collection data transformation and management
 */

import { CollectionAccessLevel, CollectionAclField } from './collection-search-constants.js';

/**
 * Transform API collection format to internal format
 * Converts the Dynamic Media API collection structure to the format used by the UI
 *
 * @param {Object} apiCollection - Collection object from API
 * @returns {Object} Transformed collection object for UI use
 */
// eslint-disable-next-line import/prefer-default-export
export function transformApiCollectionToInternal(apiCollection) {
  if (!apiCollection) return null;

  const metadata = apiCollection.collectionMetadata || {};
  const repoMetadata = apiCollection.repositoryMetadata || {};

  // Support both colon and hyphen formats for repo metadata (Algolia uses hyphens)
  // Prioritize lastModifiedDate injected from collections migration
  const modifyDate = metadata.lastModifiedDate || repoMetadata['repo:modifyDate'] || repoMetadata['repo-modifyDate'] || metadata['jcr:lastModified'];
  const createDate = repoMetadata['repo:createDate'] || repoMetadata['repo-createDate'] || metadata['jcr:created'];
  const createdBy = repoMetadata['repo:createdBy'] || repoMetadata['repo-createdBy'];
  const modifiedBy = repoMetadata['repo:modifiedBy'] || repoMetadata['repo-modifiedBy'];
  const acl = metadata['custom:metadata']?.['custom:acl'] || null;
  const ownerEmail = acl?.[CollectionAclField.OWNER] || '';
  const currentUserEmail = typeof window !== 'undefined' ? window.user?.email || '' : '';
  const isOwner = !!ownerEmail && ownerEmail.toLowerCase() === currentUserEmail.toLowerCase();

  return {
    id: apiCollection.collectionId || apiCollection.id,
    name: metadata.title || metadata['dam:collectionTitle'] || 'Untitled Collection',
    description: metadata.description || metadata['dam:collectionDescription'] || '',
    lastUpdated: modifyDate,
    dateLastUsed: modifyDate
      ? new Date(modifyDate).getTime()
      : Date.now(),
    dateCreated: createDate,
    createdBy,
    modifiedBy,
    accessLevel: metadata.accessLevel || CollectionAccessLevel.PRIVATE,
    itemCount: apiCollection.itemCount || 0,
    thumbnailUrl: metadata['dam:thumbnailUrl'] || '',
    acl,
    isOwner,
    contents: [],
    favorite: false,
    // Keep original API data for reference
    apiData: apiCollection,
  };
}
