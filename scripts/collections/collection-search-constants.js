/**
 * Shared constants for collection list search: UI tabs, API `relationship` / `visibility`,
 * and worker-normalized `relationship` (see cloudflare `collectionsSearchContentAIAuthorization`).
 *
 * Search `relationship` uses only {@link CollectionListSegment} values.
 */

/** Tab, `?view=`, client search `relationship`, and worker-normalized relationship. */
export const CollectionListSegment = Object.freeze({
  ALL: 'all',
  CREATED_BY_ME: 'createdByMe',
  SHARED_WITH_ME: 'sharedWithMe',
  PUBLIC_VIEW: 'publicView', // accessLevel=read_only (anyone can view, only creator can edit)
  PUBLIC: 'public', // accessLevel=public (anyone can view and edit)
});

/** Created-by-me visibility filter. READ_ONLY and PUBLIC align with DM accessLevel values. */
export const CollectionCreatedByMeVisibility = Object.freeze({
  ALL: 'all',
  PRIVATE: 'private',
  READ_ONLY: 'read_only', // anyone can view (accessLevel=read_only)
  PUBLIC: 'public', // anyone can edit (accessLevel=public)
});

/** Backward-compatible `?rel=` value when inferring list scope without `?view=`. */
export const CollectionListUrlRel = Object.freeze({
  ALL: 'all',
});

/**
 * DM `accessLevel` values on a collection.
 * - `PRIVATE`: only the owner (and named viewers via ACL) can see it.
 * - `READ_ONLY`: anyone authenticated can view; only the creator can edit.
 * - `PUBLIC`: anyone authenticated can view and edit.
 */
export const CollectionAccessLevel = Object.freeze({
  PRIVATE: 'private',
  READ_ONLY: 'read_only',
  PUBLIC: 'public',
});

/** ACL field names inside `collectionMetadata['custom:metadata']['custom:acl']`. */
export const CollectionAclField = Object.freeze({
  OWNER: 'custom:assetCollectionOwner',
  VIEWER: 'custom:assetCollectionViewer',
  EDITOR: 'custom:assetCollectionEditor',
});

/** UI access-filter picker keys (search-collections page). */
export const CollectionAccessFilter = Object.freeze({
  ALL: 'all',
  ONLY_ME: 'onlyMe',
  VIEW_ONLY: 'viewOnly',
  EDIT: 'edit',
  SHARED_BY_ME: 'sharedByMe',
  SHARED_WITH_ME: 'sharedWithMe',
});

/** UI creator-filter picker keys (search-collections page). */
export const CollectionCreatorFilter = Object.freeze({
  ANYONE: 'anyone',
  ME: 'me',
});
