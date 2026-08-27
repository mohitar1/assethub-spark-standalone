/**
 * Collections Authorization Logic
 * Handles access control for Dynamic Media Collections based on ACLs
 */

/**
 * Get ACL object from collection metadata
 * @param {Object} apiCollection - The collection object from API
 * @returns {Object|null} ACL object with custom:assetCollectionOwner, custom:assetCollectionViewer
 */
function getCollectionACL(apiCollection) {
  return apiCollection?.collectionMetadata?.['custom:metadata']?.['custom:acl'] || null;
}

/**
 * Get current user's email
 * @param {Object} currentUser - User object
 * @returns {string} User's email in lowercase
 */
function getCurrentUserEmail(currentUser) {
  return (currentUser?.email || '').toLowerCase();
}

/**
 * Check if user matches an ACL entry (email only)
 * @param {string} userEmail - User's email
 * @param {string} aclEntry - ACL entry to check
 * @returns {boolean} True if match
 */
function userMatchesEntry(userEmail, aclEntry) {
  return userEmail === aclEntry.toLowerCase();
}

/**
 * Check if user is in ACL array
 * @param {string} userEmail - User's email
 * @param {Array<string>} aclArray - Array of ACL entries
 * @returns {boolean} True if user is in array
 */
function userInArray(userEmail, aclArray) {
  if (!Array.isArray(aclArray)) return false;
  return aclArray.some((entry) => userMatchesEntry(userEmail, entry));
}

/**
 * Log authorization check result
 * @param {string} collectionId - Collection ID
 * @param {string} action - Action being checked (read/write)
 * @param {boolean} hasAccess - Whether access was granted
 * @param {string} reason - Reason for the decision
 */
function logAuth(collectionId, action, hasAccess, reason) {
  // eslint-disable-next-line no-console
  console.debug(
    `[Collections Auth] ${collectionId} - ${action}:`,
    hasAccess ? '✓ GRANTED' : '✗ DENIED',
    `(${reason})`,
  );
}

/**
 * Check if user has access to a collection
 * @param {Object} apiCollection - The collection object from API
 * @param {Object} currentUser - The current user object
 * @param {string} action - The action to check ('read' or 'write')
 * @returns {boolean} True if user has access
 */
export function hasCollectionAccess(apiCollection, currentUser, action = 'read') {
  const collectionId = apiCollection?.collectionId || 'unknown';

  // Get user email
  const userEmail = getCurrentUserEmail(currentUser);
  if (!userEmail) {
    logAuth(collectionId, action, false, 'no user email');
    return false;
  }

  // Get ACL
  const acl = getCollectionACL(apiCollection);
  if (!acl) {
    logAuth(collectionId, action, false, 'no ACL metadata');
    return false;
  }

  // Check owner (has all permissions)
  if (acl['custom:assetCollectionOwner'] && userMatchesEntry(userEmail, acl['custom:assetCollectionOwner'])) {
    logAuth(collectionId, action, true, 'owner');
    return true;
  }

  // Check write permission (implies read)
  if (userInArray(userEmail, acl['custom:assetCollectionEditor'])) {
    logAuth(collectionId, action, true, 'write permission');
    return true;
  }

  // Check read permission (only for read action)
  if (action === 'read' && userInArray(userEmail, acl['custom:assetCollectionViewer'])) {
    logAuth(collectionId, action, true, 'read permission');
    return true;
  }

  // No access
  logAuth(collectionId, action, false, 'not in ACL');
  return false;
}

/**
 * Filter collections based on user access
 * @param {Array<Object>} collections - Array of collection objects from API
 * @param {Object} currentUser - The current user object
 * @param {string} action - The action to check ('read' or 'write')
 * @returns {Array<Object>} Filtered array of collections user has access to
 */
export function assertCollectionAccess(collections, currentUser, action = 'read') {
  if (!Array.isArray(collections)) {
    return [];
  }

  const filtered = collections.filter(
    (collection) => hasCollectionAccess(collection, currentUser, action),
  );

  // eslint-disable-next-line no-console
  console.debug(
    `[Collections Auth] Filtered ${collections.length} collections → ${filtered.length} with ${action} access`,
  );

  return filtered;
}
