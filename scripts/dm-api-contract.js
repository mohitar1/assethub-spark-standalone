/**
 * Shared Dynamic Media request contract.
 *
 * Both the Cloudflare worker and agent-side scripts use this path-based selector so
 * collection automation cannot drift from the portal proxy's upstream header behavior.
 */

export const DM_COLLECTIONS_PATH_PREFIX = '/adobe/assets/collections';
export const DM_CONTENT_HUB_COLLECTIONS_API_KEY = 'aem-assets-content-hub-1';

function toPathname(pathOrUrl) {
  const value = String(pathOrUrl || '');
  try {
    return new URL(value).pathname;
  } catch {
    return value.split('?')[0].split('#')[0];
  }
}

export function isDynamicMediaCollectionsPath(pathOrUrl) {
  const pathname = toPathname(pathOrUrl);
  return pathname === DM_COLLECTIONS_PATH_PREFIX
    || pathname.startsWith(`${DM_COLLECTIONS_PATH_PREFIX}/`);
}

export function getDynamicMediaApiKeyForPath(pathOrUrl, dmClientId) {
  if (isDynamicMediaCollectionsPath(pathOrUrl)) {
    return DM_CONTENT_HUB_COLLECTIONS_API_KEY;
  }
  if (!dmClientId) {
    throw new Error('getDynamicMediaApiKeyForPath: dmClientId is required for non-collection paths');
  }
  return dmClientId;
}
