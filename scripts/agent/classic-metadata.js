/**
 * Path-based AEM Author metadata operations for the pre-issued-token runner.
 *
 * Folder creation and binary upload intentionally live in upload-strategy.js and use the
 * AEM UI's `/adobe/repository/...` block-upload protocol. This module keeps only the
 * remaining path-based operations needed by enrichment: folder enumeration, metadata read,
 * and metadata write.
 */

import { DAM_ROOT, SEARCH_SCAN_CAP } from './constants.js';

/** URL-encode each path segment while preserving separators (and leading slash). */
function encodeSegments(path) {
  return path
    .split('/')
    .map((seg) => (seg === '' ? '' : encodeURIComponent(seg)))
    .join('/');
}

/** /content/dam/acme -> /acme ; /content/dam -> '' (the relative path under the DAM root). */
export function damRelPath(damPath) {
  if (damPath === DAM_ROOT) return '';
  if (damPath.startsWith(`${DAM_ROOT}/`)) return damPath.slice(DAM_ROOT.length);
  return damPath; // already relative / unexpected shape — caller passes full dam paths
}

/** Build the Assets HTTP API listing URL for a folder (encoded), with paging. */
export function apiFolderJsonPath(damFolderPath, { offset = 0, limit = 50 } = {}) {
  const rel = encodeSegments(damRelPath(damFolderPath));
  return `/api/assets${rel}.json?offset=${offset}&limit=${limit}`;
}

/** Build the Sling metadata-node path for an asset. */
export function metadataNodePath(repoPath) {
  return `${encodeSegments(repoPath)}/jcr:content/metadata`;
}

/** Build the JSON read URL for an asset's metadata node. */
export function metadataJsonPath(repoPath) {
  return `${metadataNodePath(repoPath)}.json`;
}

/** True when a HAL entity's `class` array marks it as an asset (vs a folder). */
function entityIsAsset(entity) {
  const cls = entity?.class || [];
  const list = Array.isArray(cls) ? cls : [cls];
  return list.some((c) => String(c).includes('asset'));
}

function entityIsFolder(entity) {
  const cls = entity?.class || [];
  const list = Array.isArray(cls) ? cls : [cls];
  return list.some((c) => String(c).includes('folder'));
}

/**
 * Enumerate every asset under a DAM folder by walking the Assets HTTP API HAL listing,
 * recursing into sub-folders and paging each folder. No repo-wide scan and no broken
 * field-scoped search: the listing is already correctly scoped to the folder.
 *
 * Returns { assets, scanned, matched, exceededWindow }, where each asset is
 * { assetId, repoPath, repoName, halMetadata } — assetId is the repoPath (a stable,
 * human-readable identifier; the classic write ops are path-based, so no urn is
 * needed).
 *
 * A missing root folder (404) yields zero assets, matching [EDGE-FOLDER] ("nothing to
 * enrich") rather than an error.
 */
export async function enumerateFolderClassic({
  client, folderPath, limit = 50, scanCap = SEARCH_SCAN_CAP,
}) {
  const assets = [];
  const seen = new Set();
  let scanned = 0;
  let exceededWindow = false;

  const queue = [folderPath];
  let rootMissing = false;

  while (queue.length > 0) {
    const folder = queue.shift();
    let offset = 0;

    for (;;) {
      const json = await client.getJson(apiFolderJsonPath(folder, { offset, limit }));
      if (json === null) {
        // 404: the root folder does not exist -> nothing to enrich; a sub-folder vanishing
        // mid-walk is simply skipped.
        if (folder === folderPath) rootMissing = true;
        break;
      }
      const entities = Array.isArray(json.entities) ? json.entities : [];
      scanned += entities.length;

      for (const entity of entities) {
        const name = entity?.properties?.name || entity?.properties?.['dam:name'];
        if (!name) continue;
        const childPath = `${folder}/${name}`;
        if (entityIsFolder(entity)) {
          queue.push(childPath);
        } else if (entityIsAsset(entity)) {
          if (seen.has(childPath)) continue;
          seen.add(childPath);
          assets.push({
            assetId: childPath,
            repoPath: childPath,
            repoName: name,
            halMetadata: entity?.properties?.metadata || {},
          });
        }
      }

      if (assets.length >= scanCap) { exceededWindow = true; break; }
      if (entities.length < limit) break; // last page of this folder
      offset += limit;
    }

    if (exceededWindow) break;
  }

  return {
    assets, scanned, matched: assets.length, exceededWindow, rootMissing,
  };
}

/**
 * Read an asset's full metadata (flat property map) for the idempotency check + generation
 * hints. Returns {} when the metadata node is absent.
 */
export async function getAssetMetadataClassic({ client, repoPath }) {
  const json = await client.getJson(metadataJsonPath(repoPath));
  return json || {};
}

/**
 * Build the Sling POST form params for a set of metadata properties.
 * - null / undefined / '' / empty-array values are skipped (no change / no empty writes).
 * - array values are written as a multi-value String[] property.
 * Always includes _charset_=utf-8 so non-ASCII generated copy round-trips.
 */
export function buildSlingParams(properties) {
  const params = [['_charset_', 'utf-8']];
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      const vals = value.filter((v) => v !== null && v !== undefined && String(v).length > 0);
      if (vals.length === 0) continue;
      params.push([`${key}@TypeHint`, 'String[]']);
      for (const v of vals) params.push([key, String(v)]);
    } else {
      const str = String(value);
      if (str.length === 0) continue;
      params.push([key, str]);
    }
  }
  return params;
}

/**
 * Write metadata onto an asset via the Sling POST servlet. `properties` is a flat map of
 * AEM property name -> string | string[]. Returns { ok, status }.
 */
export async function writeAssetMetadataClassic({ client, repoPath, properties }) {
  const params = buildSlingParams(properties);
  const res = await client.postForm(metadataNodePath(repoPath), params);
  return { ok: res.ok, status: res.status };
}
