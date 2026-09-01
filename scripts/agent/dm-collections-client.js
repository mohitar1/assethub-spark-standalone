/**
 * Dynamic Media / Content Hub client for the collections step (Step 6).
 *
 * Collections live on the DELIVERY / Content Hub tier
 * (delivery-<aemEnvId>.adobeaemcloud.com), the same tier the worker
 * (cloudflare/src/origin/dm.js) proxies to — NOT the author tier the enrichment step
 * writes to. This client talks to that tier directly with the DM technical-account
 * client_credentials token and the same path-based x-api-key selector the worker uses:
 *
 *   - Asset search   POST /adobe/assets/search
 *                    x-api-key: <DM client id>, x-ch-request: search,
 *                    x-polaris-search-provider: 3
 *   - Create/update  POST /adobe/assets/collections
 *                    x-api-key: aem-assets-content-hub-1
 *
 * The company scope is enforced two ways: (1) this client filters the asset search by
 * assetMetadata.company so only the demo company's assets become members, and (2) every
 * collection it creates is stamped custom:metadata.company = <companyKey> so the worker's
 * collectionsSearchContentAIAuthorization company clause can hide/show it per DEMO_COMPANY.
 *
 * `fetchFn` is injectable for tests.
 */

import {
  HEADER_AUTHORIZATION,
  HEADER_API_KEY,
  getDynamicMediaApiKeyForPath,
  SEARCH_PAGE_LIMIT,
} from './constants.js';

const ASSET_SEARCH_PATH = '/adobe/assets/search';
const COLLECTIONS_PATH = '/adobe/assets/collections';

/** ContentAI asset-search body scoped to a single company. */
export function buildCompanyAssetSearchBody({ company, limit = SEARCH_PAGE_LIMIT, cursor }) {
  const body = {
    limit,
    // An empty match at the same level as a term is ignored by ContentAI, so the term is
    // wrapped in a nested `and` (same quirk the worker's forceContentAISearchFilter handles).
    query: [
      {
        and: [
          { match: { text: '', fields: ['assetMetadata.dc:title'] } },
          { and: [{ term: { 'assetMetadata.company': [company] } }] },
        ],
      },
    ],
  };
  if (cursor) body.cursor = cursor;
  return body;
}

/** Normalize a ContentAI asset hit into the fields the plan needs. */
export function assetHitToRecord(hit) {
  const assetMeta = hit.assetMetadata || {};
  const repoMeta = hit.repositoryMetadata || {};
  return {
    assetId: hit.assetId,
    title: assetMeta['dc:title'] || repoMeta['repo:name'] || 'Untitled Asset',
    productCategory: assetMeta.productCategory ?? null,
    campaign: assetMeta.campaign ?? null,
    channel: assetMeta.channel ?? null,
    company: assetMeta.company ?? null,
  };
}

export class DmCollectionsClient {
  /**
   * @param {Object} params
   * @param {{ getToken: Function, refresh: Function }} params.tokenProvider
   * @param {string} params.clientId  DM client id (sent as x-api-key for asset search)
   * @param {string} params.deliveryHost  https://delivery-<env>.adobeaemcloud.com
   * @param {Function} [params.fetchFn]
   */
  constructor({
    tokenProvider, clientId, deliveryHost, fetchFn = fetch,
  }) {
    if (!tokenProvider) throw new Error('DmCollectionsClient: tokenProvider is required');
    if (!clientId) throw new Error('DmCollectionsClient: clientId is required');
    if (!deliveryHost) throw new Error('DmCollectionsClient: deliveryHost is required');
    this.tokenProvider = tokenProvider;
    this.clientId = clientId;
    this.deliveryHost = deliveryHost.replace(/\/+$/, '');
    this.fetchFn = fetchFn;
  }

  /** Low-level request with a single token refresh + retry on 401. */
  async #request(path, { method = 'POST', body } = {}) {
    const doFetch = async (token) => this.fetchFn(`${this.deliveryHost}${path}`, {
      method,
      headers: {
        [HEADER_AUTHORIZATION]: `Bearer ${token}`,
        [HEADER_API_KEY]: getDynamicMediaApiKeyForPath(path, this.clientId),
        'Content-Type': 'application/json',
        ...(path === ASSET_SEARCH_PATH
          ? { 'x-ch-request': 'search', 'x-polaris-search-provider': '3' }
          : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    let token = await this.tokenProvider.getToken();
    let res = await doFetch(token);
    if (res.status === 401) {
      token = await this.tokenProvider.refresh();
      res = await doFetch(token);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`DM ${method} ${path} failed: ${res.status} ${text}`.trim());
      err.status = res.status;
      throw err;
    }
    return res;
  }

  /**
   * Search the company's searchable (published + indexed) assets. Pages until `limit`
   * records are collected or results are exhausted. Returns normalized records.
   */
  async searchCompanyAssets({ company, limit = 200, pageSize = SEARCH_PAGE_LIMIT }) {
    if (!company) throw new Error('searchCompanyAssets: company is required');
    const out = [];
    let cursor;
    do {
      const size = Math.min(pageSize, limit - out.length);
      const res = await this.#request(ASSET_SEARCH_PATH, {
        body: buildCompanyAssetSearchBody({ company, limit: size, cursor }),
      });
      const data = await res.json();
      const hits = data.hits?.results || data.results || data.hits || [];
      for (const hit of hits) out.push(assetHitToRecord(hit));
      cursor = data.cursor || data.hits?.cursor || null;
    } while (cursor && out.length < limit);
    return out.slice(0, limit);
  }

  /**
   * Create a company-scoped collection. The company tag is stamped under
   * custom:metadata.company (indexed as collectionMetadata.custom:metadata.company),
   * matching the worker's company filter. accessLevel defaults to 'public' so every demo
   * user (not just the creator) can see it.
   */
  async createCollection({
    title, description = '', company, assetIds = [], accessLevel = 'public',
  }) {
    if (!title) throw new Error('createCollection: title is required');
    if (!company) throw new Error('createCollection: company is required');
    const body = {
      title,
      description,
      accessLevel,
      'custom:metadata': { company },
      items: assetIds.map((id) => ({ op: 'add', id })),
    };
    const res = await this.#request(COLLECTIONS_PATH, {
      body,
    });
    return res.json();
  }
}
