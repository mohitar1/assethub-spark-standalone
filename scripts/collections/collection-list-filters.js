/**
 * Pure helpers for translating the search-collections UI filter state
 * (accessFilter + creatorFilter) into API params and post-fetch filtering.
 *
 * Extracted from the block so it can be unit-tested without a DOM. No
 * imports of browser globals — keep it that way.
 *
 * @typedef {'all'|'onlyMe'|'viewOnly'|'edit'|'sharedByMe'|'sharedWithMe'} AccessFilter
 * @typedef {'anyone'|'me'} CreatorFilter
 * @typedef {{ empty: true } | {
 *   relationship: string,
 *   visibility?: string,
 *   _clientFilter?: 'hasViewers',
 * }} ApiParams
 */

import {
  CollectionListSegment,
  CollectionCreatedByMeVisibility,
  CollectionAccessFilter,
  CollectionCreatorFilter,
  CollectionAclField,
} from './collection-search-constants.js';

/**
 * Map (accessFilter, creatorFilter) → API params.
 *
 * Special return values:
 *   { empty: true }
 *     Logically empty combination — skip the API call.
 *     - "Shared with me" + "Created by me" (can't be the owner of a collection shared with you).
 *     - "Shared by me" + "Created by anyone" (you can only share collections you own).
 *
 *   { _clientFilter: 'hasViewers', relationship, visibility }
 *     Server returns owner=me + private; the client then filters to collections
 *     whose viewer ACL is non-empty ("Shared by me + Created by me").
 *
 * @param {AccessFilter} accessFilter
 * @param {CreatorFilter} creatorFilter
 * @returns {ApiParams}
 */
export function getApiParams(accessFilter, creatorFilter) {
  const isMe = creatorFilter === CollectionCreatorFilter.ME;
  if (accessFilter === CollectionAccessFilter.ONLY_ME) {
    return {
      relationship: CollectionListSegment.CREATED_BY_ME,
      visibility: CollectionCreatedByMeVisibility.PRIVATE,
    };
  }
  if (accessFilter === CollectionAccessFilter.SHARED_WITH_ME) {
    if (isMe) return { empty: true };
    return { relationship: CollectionListSegment.SHARED_WITH_ME };
  }
  if (accessFilter === CollectionAccessFilter.SHARED_BY_ME) {
    if (!isMe) return { empty: true };
    return {
      relationship: CollectionListSegment.CREATED_BY_ME,
      visibility: CollectionCreatedByMeVisibility.PRIVATE,
      _clientFilter: 'hasViewers',
    };
  }
  if (accessFilter === CollectionAccessFilter.ALL) {
    if (isMe) {
      return {
        relationship: CollectionListSegment.CREATED_BY_ME,
        visibility: CollectionCreatedByMeVisibility.ALL,
      };
    }
    return { relationship: CollectionListSegment.ALL };
  }
  if (isMe) {
    let visibility = CollectionCreatedByMeVisibility.ALL;
    if (accessFilter === CollectionAccessFilter.VIEW_ONLY) {
      visibility = CollectionCreatedByMeVisibility.READ_ONLY;
    } else if (accessFilter === CollectionAccessFilter.EDIT) {
      visibility = CollectionCreatedByMeVisibility.PUBLIC;
    }
    return { relationship: CollectionListSegment.CREATED_BY_ME, visibility };
  }
  if (accessFilter === CollectionAccessFilter.VIEW_ONLY) {
    return { relationship: CollectionListSegment.PUBLIC_VIEW };
  }
  return { relationship: CollectionListSegment.PUBLIC };
}

/**
 * Apply a client-side filter to fetched items.
 *
 * Only used for "Shared by me + Created by me" today, where the server
 * returns all of the user's private collections and the client keeps only
 * those whose viewer ACL is non-empty.
 *
 * @param {Array<{ acl?: Record<string, unknown> }>} items
 * @param {string | undefined} clientFilter
 * @returns {Array}
 */
export function applyClientFilter(items, clientFilter) {
  if (clientFilter === 'hasViewers') {
    return items.filter((c) => (c.acl?.[CollectionAclField.VIEWER] || []).length > 0);
  }
  return items;
}
