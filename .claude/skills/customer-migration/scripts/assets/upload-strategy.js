/**
 * Repository API upload helpers for the bring-in lane (E3).
 *
 * This intentionally mirrors the AEM Assets UI protocol captured in the upload HARs.
 * Folder creation and binary upload must not use the legacy `/api/assets/...` Sling
 * endpoint, because that path can create a binary without triggering the asset-processing
 * completion path used by the UI.
 *
 * Interface:
 *   uploadAsset({ folderPath, fileName, bytes, contentType }) → { assetId, repoPath, repoName }
 *   ensureFolder({ folderPath })                              → { created: boolean }
 *   uploadImages({ folderPath, images })                      → { uploaded, failures }
 *
 * Flow:
 *   - Folder: POST /adobe/repository/<parent>;api=create;path=<folder>;intermediates=true
 *   - File:   POST /adobe/repository/<folder>;api=create;path=<file>;intermediates=true
 *   - Blob:   POST /adobe/repository/<folder>;api=block_upload;path=<file>
 *             PUT <presigned blob URL>
 *             POST /adobe/repository/<folder>;api=block_upload_finalize;token=<token>
 */

import { AEM_ASSETS_FRONTEND_API_KEY, DAM_ROOT } from './constants.js';

// ---------------------------------------------------------------------------
// Shared path helpers
// ---------------------------------------------------------------------------

function encodeSegments(path) {
  return path
    .split('/')
    .map((seg) => (seg === '' ? '' : encodeURIComponent(seg)))
    .join('/');
}

function splitFolderCreatePath(folderPath) {
  const clean = String(folderPath || '').replace(/\/+$/, '');
  if (!clean.startsWith(`${DAM_ROOT}/`)) {
    throw new Error(`repository create folder: folderPath must be under ${DAM_ROOT} (got ${folderPath})`);
  }
  const parts = clean.split('/').filter(Boolean);
  if (parts.length <= 2) {
    throw new Error(`repository create folder: refusing to create DAM root ${folderPath}`);
  }
  const folderName = parts.pop();
  return { parentPath: `/${parts.join('/')}`, folderName };
}

// ---------------------------------------------------------------------------
// RepositoryUploadStrategy
// ---------------------------------------------------------------------------

const REPO_BLOCK_SIZE = 5 * 1024 * 1024; // 5 MB; server may send a larger preferred size
const REL_PRIMARY = 'http://ns.adobe.com/adobecloud/rel/primary';
const REL_BLOCK_TRANSFER = 'http://ns.adobe.com/adobecloud/rel/block/transfer';
const REL_BLOCK_FINALIZE = 'http://ns.adobe.com/adobecloud/rel/block/finalize';
const REL_METADATA_REPOSITORY = 'http://ns.adobe.com/adobecloud/rel/metadata/repository';

/* eslint-disable no-underscore-dangle */
export class RepositoryUploadStrategy {
  constructor({ client, apiKey, fetchFn = fetch }) {
    this.client = client;
    this.apiKey = apiKey || AEM_ASSETS_FRONTEND_API_KEY;
    this.fetchFn = fetchFn;
  }

  async buildHeaders(extra = {}) {
    return this.client.buildHeaders({ 'x-api-key': this.apiKey, ...extra });
  }

  async repoFetch(method, url, { headers = {}, body } = {}) {
    const h = await this.buildHeaders(headers);
    return this.fetchFn(url, { method, headers: h, body });
  }

  /** Create a folder with the same /adobe/repository API the Assets UI uses. */
  async ensureFolder({ folderPath }) {
    const { parentPath, folderName } = splitFolderCreatePath(folderPath);
    const respondWith = encodeURIComponent(JSON.stringify({ reltype: REL_METADATA_REPOSITORY }));
    const url = [
      `${this.client.authorHost}/adobe/repository`,
      encodeSegments(parentPath),
      `;api=create;path=${encodeURIComponent(folderName)};intermediates=true`,
      `;respondWith=${respondWith}`,
    ].join('');
    const res = await this.repoFetch('POST', url, {
      headers: { 'Content-Type': 'application/vnd.adobecloud.directory+json' },
    });
    if (res.status === 409 || res.status === 412) {
      await res.text().catch(() => {});
      return { created: false, status: res.status };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`repository create folder ${folderPath} -> ${res.status} ${body}`.trim());
    }
    await res.text().catch(() => {});
    return { created: true, status: res.status };
  }

  /** Step 1: Create the asset placeholder (empty POST with ;api=create). */
  async createAsset(folderPath, fileName, contentType) {
    const url = [
      `${this.client.authorHost}/adobe/repository`,
      encodeSegments(folderPath),
      `;api=create;path=${encodeURIComponent(fileName)};intermediates=true`,
    ].join('');
    const res = await this.repoFetch('POST', url, {
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`repository create ${fileName} -> ${res.status} ${body}`.trim());
    }
    const assetId = res.headers?.get?.('asset-id') || '';
    const etag = res.headers?.get?.('etag') || '"0"';
    return { assetId, etag };
  }

  /** Step 2: Initiate block upload; returns SAS URLs, finalize URL, and preferred block size. */
  async initiateBlockUpload(folderPath, fileName, bytes, contentType, etag) {
    const url = [
      `${this.client.authorHost}/adobe/repository`,
      encodeSegments(folderPath),
      `;api=block_upload;path=${encodeURIComponent(fileName)}`,
    ].join('');
    const payload = {
      'repo:size': bytes.byteLength,
      'repo:blocksize': REPO_BLOCK_SIZE,
      'dc:format': contentType,
      assetMetadata: {},
      'repo:resource': { 'repo:reltype': REL_PRIMARY },
      'repo:md5': null,
      'repo:expires': null,
      'repo:if-match': etag,
      'repo:if-none-match': null,
      _links: null,
    };
    const res = await this.repoFetch('POST', url, {
      headers: { 'Content-Type': 'application/vnd.adobecloud.bulk-transfer+json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`repository block_upload ${fileName} -> ${res.status} ${body}`.trim());
    }
    const json = await res.json();
    const preferredBlockSize = json['repo:blocksize'] || REPO_BLOCK_SIZE;
    const links = json._links || {};
    const transferLinks = links[REL_BLOCK_TRANSFER] || [];
    const blockUrls = (Array.isArray(transferLinks) ? transferLinks : [transferLinks])
      .map((l) => l?.href).filter(Boolean);
    const finalizeUrl = links[REL_BLOCK_FINALIZE]?.href;
    if (!finalizeUrl) {
      throw new Error(`repository block_upload ${fileName}: no finalize URL in response`);
    }
    return {
      blockUrls,
      finalizeUrl,
      preferredBlockSize,
      bodyForFinalize: { ...payload, _links: json._links },
    };
  }

  /** Step 3: PUT each block directly to the presigned blob URL (no auth header). */
  async putBlocks(bytes, blockUrls, blockSize) {
    const totalBlocks = Math.ceil(bytes.byteLength / blockSize) || 1;
    if (blockUrls.length < totalBlocks) {
      throw new Error(`block_upload: got ${blockUrls.length} SAS URLs for ${totalBlocks} blocks`);
    }
    for (let i = 0; i < totalBlocks; i += 1) {
      const start = i * blockSize;
      const chunk = bytes.slice(start, start + blockSize);
      // SAS URL carries auth — no Authorization header.
      const res = await this.fetchFn(blockUrls[i], {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(chunk.byteLength),
        },
        body: chunk,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`block PUT ${i + 1}/${totalBlocks} -> ${res.status} ${body}`.trim());
      }
    }
  }

  /** Step 4: Finalize — tell AEM all blocks are committed. Returns the DAM repo path. */
  async finalize(finalizeUrl, bodyForFinalize) {
    const res = await this.repoFetch('POST', finalizeUrl, {
      headers: { 'Content-Type': 'application/vnd.adobecloud.bulk-transfer+json' },
      body: JSON.stringify(bodyForFinalize),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`repository finalize -> ${res.status} ${body}`.trim());
    }
    const location = res.headers?.get?.('location') || '';
    const m = location.match(/\/content\/dam\/.+/);
    return m ? m[0].split('?')[0] : '';
  }

  async uploadAsset({
    folderPath, fileName, bytes, contentType,
  }) {
    const { assetId, etag } = await this.createAsset(folderPath, fileName, contentType);
    const {
      blockUrls, finalizeUrl, preferredBlockSize, bodyForFinalize,
    } = await this.initiateBlockUpload(folderPath, fileName, bytes, contentType, etag);
    await this.putBlocks(bytes, blockUrls, preferredBlockSize);
    const repoPath = await this.finalize(finalizeUrl, bodyForFinalize);
    return { assetId, repoPath: repoPath || `${folderPath}/${fileName}`, repoName: fileName };
  }

  async uploadImages({ folderPath, images }) {
    const uploaded = [];
    const failures = [];
    for (const img of images) {
      try {
        const {
          bytes, fileName, contentType, ...evidence
        } = img;
        const res = await this.uploadAsset({
          folderPath,
          fileName,
          bytes,
          contentType,
        });
        uploaded.push({
          ...evidence,
          fileName,
          contentType,
          assetId: res.assetId,
          repoPath: res.repoPath,
          repoName: res.repoName,
        });
      } catch (err) {
        failures.push({ fileName: img.fileName, error: String(err.message || err) });
      }
    }
    return { uploaded, failures };
  }
}
/* eslint-enable no-underscore-dangle */

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the appropriate upload strategy.
 *
 * @param {'repository'|null} name
 * @param {object} opts
 * @param {object}   opts.client        — ClassicAuthorClient instance
 * @param {string}   [opts.apiKey]      — x-api-key; defaults to the Assets UI key
 * @param {Function} [opts.fetchFn]     — injectable fetch
 * @returns {RepositoryUploadStrategy}
 */
export function createUploadStrategy(name, { client, apiKey, fetchFn }) {
  const resolved = name || 'repository';
  if (resolved === 'repository') return new RepositoryUploadStrategy({ client, apiKey, fetchFn });
  throw new Error(`Unknown upload strategy "${name}". Only 'repository' is supported.`);
}
