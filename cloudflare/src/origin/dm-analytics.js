/**
 * @fileoverview Analytics tracking for Adobe Dynamic Media requests
 *
 * Extracted from dm.js for separation of concerns. Handles:
 * - Download analytics (single asset and archive)
 * - Search analytics (Algolia and ContentAI formats)
 * - Search context extraction from request bodies
 *
 * All tracking is fire-and-forget using ctx.waitUntil().
 *
 * @module origin/dm-analytics
 */

import { stripAssetUrn, VALID_DOWNLOAD_TYPES } from '../util/constants.js';

// ==========================================
// Debug Flag
// ==========================================

/**
 * Debug flag for analytics logging
 * Set to true to enable verbose analytics logging in console
 * @constant {boolean}
 */
const DEBUG_ANALYTICS = false;

// ==========================================
// Path Constants (analytics-only)
// ==========================================

/** Path for search endpoint
 * @constant {string}
 */
const PATH_SEARCH = '/adobe/assets/search';

/** Path segment indicating "as attachment" download
 * @constant {string}
 */
const PATH_DOWNLOAD_SEGMENT = '/as/';

/** Path for archive creation endpoint
 * @constant {string}
 */
const PATH_ARCHIVES = '/adobe/assets/archives';

// ==========================================
// Header Constants (analytics-only)
// ==========================================

/** Header name for analytics context (JSON)
 * @constant {string}
 */
export const HEADER_ANALYTICS_CONTEXT = 'x-analytics-context';

/** Referer header name
 * @constant {string}
 */
const HEADER_REFERER = 'referer';

// ==========================================
// Search Type Mapping
// ==========================================

/** Mapping of search types to their referer URL patterns
 * @constant {Object.<string, string>}
 */
const SEARCH_TYPE_PATHS = {
  all: '/search/all',
  assets: '/search/assets',
  products: '/search/products',
  templates: '/search/templates',
};

// ==========================================
// Analytics URL Parameters
// ==========================================

/** URL parameter name for brand analytics
 * @constant {string}
 */
const ANALYTICS_PARAM_BRAND = 'x-analytics-brand';

/** URL parameter name for campaign analytics
 * @constant {string}
 */
const ANALYTICS_PARAM_CAMPAIGN = 'x-analytics-campaign';

/** URL parameter name for resource type analytics
 * @constant {string}
 */
const ANALYTICS_PARAM_RESOURCE_TYPE = 'x-analytics-resource-type';

/** URL parameter name for download session ID (groups downloads)
 * @constant {string}
 */
const ANALYTICS_PARAM_DOWNLOAD_ID = 'x-analytics-download-id';

/** URL parameter name for download item ID (asset ID)
 * @constant {string}
 */
const ANALYTICS_PARAM_ITEM_ID = 'x-analytics-item-id';

/** URL parameter name for download type (ready-to-use/restricted)
 * @constant {string}
 */
const ANALYTICS_PARAM_DOWNLOAD_TYPE = 'x-analytics-download-type';

/** URL parameter name for rendition name
 * @constant {string}
 */
const ANALYTICS_PARAM_RENDITION = 'x-analytics-rendition';

// ==========================================
// Analytics Defaults
// ==========================================

/** Default value for unknown brand/campaign
 * @constant {string}
 */
const ANALYTICS_DEFAULT_UNKNOWN = 'unknown';

/** Default resource type when not specified
 * @constant {string}
 */
const ANALYTICS_DEFAULT_RESOURCE_TYPE = 'asset';

/** Valid resource types for analytics
 * @constant {string[]}
 */
const ANALYTICS_VALID_RESOURCE_TYPES = ['asset', 'template'];

/** Maximum length for search term in analytics (characters)
 * @constant {number}
 */
const ANALYTICS_SEARCH_TERM_MAX_LENGTH = 200;

// ==========================================
// Query Parameters
// ==========================================

/** URL parameter for attachment download
 * @constant {string}
 */
const PARAM_ATTACHMENT = 'attachment';

/** Value for attachment parameter to indicate download
 * @constant {string}
 */
const PARAM_ATTACHMENT_VALUE = 'true';

// ==========================================
// Internal Helper Functions
// ==========================================

/** Matches Frescopa unified search page: /{locale}/search (no /all|/assets suffix). */
const UNIFIED_SEARCH_PATH = /\/search\/?$/i;

/**
 * Derive search type from the Referer header URL path.
 * Returns null when the request does not originate from a known search UI
 * page (e.g. direct API calls, permission testers, ID-lookup utilities,
 * asset-details pages). Callers must treat null as "skip analytics".
 * @param {Request} request - The incoming request
 * @returns {string|null} One of 'all', 'assets', 'products', 'templates', or null
 */
function extractSearchType(request) {
  const referer = request.headers.get(HEADER_REFERER) || '';
  if (!referer) return null;

  // Typed search pages — check specific paths before the unified /search page.
  if (referer.includes(SEARCH_TYPE_PATHS.all)) return 'all';
  if (referer.includes(SEARCH_TYPE_PATHS.assets)) return 'assets';
  if (referer.includes(SEARCH_TYPE_PATHS.products)) return 'products';
  if (referer.includes(SEARCH_TYPE_PATHS.templates)) return 'templates';

  // Unified search UI (e.g. /en/search?query=…) — Frescopa default search route.
  try {
    const { pathname } = new URL(referer);
    if (UNIFIED_SEARCH_PATH.test(pathname)) return 'all';
  } catch {
    // invalid referer URL — treat as non-UI
  }

  return null;
}

/**
 * Walk a ContentAI query tree to find the search term inside a match or term clause.
 * The client builds: query[0].and[0].and[0].match.text  (text search)
 *               or: query[0].and[0].and[0].term.assetId (assetId lookup)
 * but the nesting can vary, so we search recursively.
 * @param {*} node - Current node in the query tree
 * @returns {string|null} The search text or null if not found
 */
function findContentAISearchTerm(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.match?.text != null) return String(node.match.text);
  // assetId lookup: { term: { assetId: ['urn:aaid:aem:...'] } }
  if (node.term?.assetId?.[0] != null) return String(node.term.assetId[0]);
  for (const key of ['and', 'or', 'not']) {
    if (Array.isArray(node[key])) {
      for (const child of node[key]) {
        const found = findContentAISearchTerm(child);
        if (found != null) return found;
      }
    }
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findContentAISearchTerm(child);
      if (found != null) return found;
    }
  }
  return null;
}

/**
 * Detect if request is a download (has /as/ in path or attachment param)
 * @param {URL} url - Request URL
 * @returns {boolean}
 */
function isDownloadRequest(url) {
  return (
    url.pathname.includes(PATH_DOWNLOAD_SEGMENT) || url.searchParams.get(PARAM_ATTACHMENT) === PARAM_ATTACHMENT_VALUE
  );
}

/**
 * Extract download context from URL and request
 * @param {URL} url - Request URL
 * @param {Request} _request - Original request (unused but kept for API consistency)
 * @returns {Object|null} Download context or null
 */
function extractDownloadContext(url, _request) {
  // Extract assetId from URL patterns:
  // /adobe/assets/{assetId}/as/{filename}
  // /adobe/assets/{assetId}/renditions/{renditionName}/as/{filename}
  const pathParts = url.pathname.split('/');
  const assetsIndex = pathParts.indexOf('assets');

  if (assetsIndex === -1 || pathParts.length < assetsIndex + 2) {
    return null;
  }

  const assetId = pathParts[assetsIndex + 1];

  // Extract rendition name from URL path (if present)
  // Pattern: /adobe/assets/{assetId}/renditions/{renditionName}/as/{filename}
  const renditionsIndex = pathParts.indexOf('renditions');
  const renditionFromPath =
    renditionsIndex !== -1 && pathParts.length > renditionsIndex + 1 ? pathParts[renditionsIndex + 1] : 'original';

  // Extract analytics metadata from URL parameters (sent by client)
  const brand = url.searchParams.get(ANALYTICS_PARAM_BRAND);
  const campaign = url.searchParams.get(ANALYTICS_PARAM_CAMPAIGN);
  const resourceType = url.searchParams.get(ANALYTICS_PARAM_RESOURCE_TYPE);

  // New enhanced tracking fields
  const downloadId = url.searchParams.get(ANALYTICS_PARAM_DOWNLOAD_ID);
  const downloadItemId = url.searchParams.get(ANALYTICS_PARAM_ITEM_ID);
  const downloadType = url.searchParams.get(ANALYTICS_PARAM_DOWNLOAD_TYPE);
  const rendition = url.searchParams.get(ANALYTICS_PARAM_RENDITION) || renditionFromPath;

  // ONLY track if we have analytics parameters
  // This filters out archive downloads and other automatic downloads
  if (!brand && !campaign && !resourceType) {
    if (DEBUG_ANALYTICS) {
      console.log(
        `[Analytics] Skipping download tracking for asset ${assetId} - no analytics parameters (likely archive file)`,
      );
    }
    return null; // Don't track!
  }

  if (DEBUG_ANALYTICS) {
    console.log(`[Analytics] Extracted download context for asset ${assetId}:`, {
      brand: brand || ANALYTICS_DEFAULT_UNKNOWN,
      campaign: campaign || ANALYTICS_DEFAULT_UNKNOWN,
      resourceType: resourceType || ANALYTICS_DEFAULT_RESOURCE_TYPE,
      downloadId,
      downloadItemId,
      downloadType,
      rendition,
      allParams: Array.from(url.searchParams.entries()),
    });
  }

  // Validate and default resourceType
  let validResourceType = resourceType || ANALYTICS_DEFAULT_RESOURCE_TYPE;
  if (!ANALYTICS_VALID_RESOURCE_TYPES.includes(validResourceType)) {
    console.warn(
      `[Analytics] Invalid resourceType: ${validResourceType}, defaulting to '${ANALYTICS_DEFAULT_RESOURCE_TYPE}'`,
    );
    validResourceType = ANALYTICS_DEFAULT_RESOURCE_TYPE;
  }

  // Validate downloadType if provided
  let validDownloadType = downloadType || '';
  if (downloadType && !VALID_DOWNLOAD_TYPES.includes(downloadType)) {
    console.warn(`[Analytics] Invalid downloadType: ${downloadType}, clearing value`);
    validDownloadType = '';
  }

  return {
    assetId,
    brand: brand || ANALYTICS_DEFAULT_UNKNOWN,
    campaign: campaign || ANALYTICS_DEFAULT_UNKNOWN,
    resourceType: validResourceType,
    downloadId: downloadId || '',
    downloadItemId: stripAssetUrn(downloadItemId || assetId),
    downloadType: validDownloadType,
    rendition: rendition || '',
  };
}

/**
 * Extract common user data for analytics events
 * Note: userId replaces email as user identifier for privacy
 * @param {Object} user - User session data
 * @returns {Object} Common user data fields
 */
function extractCommonUserData(user) {
  const userId = user?.userId || user?.sub || user?.email || '';
  return {
    userId,
    userEmail: user?.email || null,
    country: user?.country,
    employeeType: user?.employeeType,
    company: user?.company,
    roles: user?.roles || [],
  };
}

/**
 * Helper to track analytics with waitUntil (fire-and-forget)
 * @param {ExecutionContext} ctx - Cloudflare execution context
 * @param {Promise} analyticsPromise - Analytics promise to track
 */
function trackWithWaitUntil(ctx, analyticsPromise) {
  if (ctx?.waitUntil) {
    ctx.waitUntil(analyticsPromise);
  }
}

/**
 * Track download analytics asynchronously (fire-and-forget)
 * Each event = 1 download (no count field needed)
 * @param {Object} user - User session data
 * @param {Object} downloadContext - Download context (brand, campaign, new fields, etc.)
 * @param {Object} env - Cloudflare env with Analytics Engine binding
 */
async function trackDownloadAnalytics(user, downloadContext, env) {
  try {
    if (!user?.userId) {
      console.warn(
        '[Analytics] Download event written with no user ID — user may be missing User ID in IDP token.',
        `downloadItemId=${downloadContext.downloadItemId}`,
        `resourceType=${downloadContext.resourceType}`,
      );
    }

    const eventData = {
      ...extractCommonUserData(user),
      resourceType: downloadContext.resourceType,
      campaigns: downloadContext.campaign,
      brand: downloadContext.brand,
      downloadId: downloadContext.downloadId,
      downloadItemId: downloadContext.downloadItemId,
      downloadType: downloadContext.downloadType,
      rendition: downloadContext.rendition,
    };

    if (DEBUG_ANALYTICS) {
      console.info('[Analytics] Tracking download event with data:', JSON.stringify(eventData));
    }

    const { trackAnalyticsEvent } = await import('../util/analytics-helper.js');
    await trackAnalyticsEvent(env, 'download', eventData);

    if (DEBUG_ANALYTICS) {
      console.info(
        `[Analytics] Download tracked: ${user.userId} downloaded ${downloadContext.resourceType} (${downloadContext.rendition}) from ${downloadContext.campaign} (brand: ${downloadContext.brand})`,
      );
    }
  } catch (err) {
    console.error('[Analytics] Download tracking error:', err);
  }
}

/**
 * Track archive creation analytics - each asset in the archive gets tracked
 * with the same downloadId for grouping
 * @param {Object} user - User session data
 * @param {Object} analyticsContext - Archive analytics context from client
 * @param {string} analyticsContext.downloadId - Shared session ID for all assets
 * @param {Array} analyticsContext.assets - Array of asset details
 * @param {Object} env - Cloudflare env with Analytics Engine binding
 */
async function trackArchiveAnalytics(user, analyticsContext, env) {
  try {
    const { downloadId, assets } = analyticsContext;
    const commonUserData = extractCommonUserData(user);
    const { trackAnalyticsEvent } = await import('../util/analytics-helper.js');

    if (DEBUG_ANALYTICS) {
      console.info(`[Analytics] 📦 ARCHIVE TRACKING START: ${assets?.length || 0} assets, downloadId: ${downloadId}`);
    }

    if (!assets || assets.length === 0) {
      console.error('[Analytics] No assets in analyticsContext');
      return;
    }

    let totalTracked = 0;
    let totalFailed = 0;

    const trackingPromises = assets.map(async (assetInfo, assetIndex) => {
      const assetId = assetInfo.assetId || `unknown-asset-${assetIndex}`;

      let renditionsToTrack = assetInfo.renditions;
      if (!renditionsToTrack || renditionsToTrack.length === 0) {
        renditionsToTrack = ['original'];
      }

      renditionsToTrack = renditionsToTrack.map((r) => r || 'original').filter((r) => typeof r === 'string');

      if (renditionsToTrack.length === 0) {
        renditionsToTrack = ['original'];
      }

      const renditionPromises = renditionsToTrack.map(async (renditionName) => {
        const publicationId = assetInfo.publicationId || '';

        // A path in publicationId means the client-side contentHubId lookup
        // failed (dam:assetId absent from JCR and uuid absent from My Templates API).
        // Log an error so this is visible in Cloudflare logs for investigation.
        if (publicationId.startsWith('/')) {
          console.error(
            '[Analytics] publicationId is a DAM path — expected a UUID.',
            `user=${commonUserData.userId || '(unknown)'}`,
            `publicationId=${publicationId}`,
            `assetId=${assetId}`,
            `resourceType=${analyticsContext.resourceType || 'asset'}`,
          );
        }

        const eventData = {
          ...commonUserData,
          resourceType: analyticsContext.resourceType || 'asset',
          campaigns: assetInfo.campaign || ANALYTICS_DEFAULT_UNKNOWN,
          brand: assetInfo.brand || ANALYTICS_DEFAULT_UNKNOWN,
          downloadId: downloadId || '',
          downloadItemId: stripAssetUrn(assetId),
          downloadType: assetInfo.downloadType || '',
          rendition: renditionName || 'original',
          publicationId,
        };

        try {
          await trackAnalyticsEvent(env, 'download', eventData);
          totalTracked++;
          if (DEBUG_ANALYTICS) {
            console.info(`[Analytics] ✅ Tracked: ${assetId}/${renditionName}`);
          }
        } catch (trackErr) {
          totalFailed++;
          console.error(`[Analytics] Failed to track ${assetId}/${renditionName}:`, trackErr);
        }
      });

      await Promise.all(renditionPromises);
    });

    await Promise.all(trackingPromises);

    if (DEBUG_ANALYTICS) {
      console.info(`[Analytics] 📦 ARCHIVE COMPLETE: ${totalTracked} tracked, ${totalFailed} failed`);
    }
  } catch (err) {
    console.error('[Analytics] Archive tracking error:', err);
  }
}

/**
 * Extract result count from a search response, supporting both
 * Algolia format (results[0].nbHits) and ContentAI format
 * (search_metadata.totalCount.total or hits.total).
 * @param {Object} data - Parsed response JSON
 * @returns {number} Total result count, or 0 if not found
 */
function extractSearchResultCount(data) {
  const algoliaCount = data.results?.[0]?.nbHits;
  if (algoliaCount != null) return algoliaCount;

  const contentAICount = data.search_metadata?.totalCount?.total;
  if (contentAICount != null) return contentAICount;

  const hitsTotal = data.hits?.total;
  if (hitsTotal != null) return hitsTotal;

  console.error(
    '[Analytics] extractSearchResultCount: could not find result count in response — checked results[0].nbHits, search_metadata.totalCount.total, hits.total',
  );
  return 0;
}

/** Maximum markets stored per search event (guards against malformed responses) */
const MAX_MARKETS_PER_EVENT = 20;

/**
 * Normalize allowedCountries metadata values from a ContentAI hit.
 * @param {*} fieldValue - string or string array from assetMetadata.allowedCountries
 * @returns {string[]}
 */
function extractAllowedCountryValues(fieldValue) {
  if (!fieldValue) return [];
  if (!Array.isArray(fieldValue)) {
    const value = String(fieldValue).trim();
    return value ? [value] : [];
  }
  return fieldValue
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

/**
 * Normalize search response hits to an array (ContentAI, Algolia, legacy shapes).
 * ContentAI returns { hits: { results: [...], total: N } }, not hits as a bare array.
 * @param {Object} data - Parsed search response JSON
 * @returns {Object[]} Hit objects
 */
export function getSearchHitResults(data) {
  if (Array.isArray(data?.hits)) return data.hits;
  if (Array.isArray(data?.hits?.results)) return data.hits.results;
  if (Array.isArray(data?.results?.[0]?.hits)) return data.results[0].hits;
  return [];
}

/**
 * Collect distinct asset market tags from search response hits.
 * @param {Object} data - Parsed ContentAI or Algolia search response
 * @returns {string[]} Unique market values from assetMetadata.allowedCountries
 */
export function extractAssetMarketsFromHits(data) {
  const hits = getSearchHitResults(data);
  const markets = new Set();
  hits.forEach((hit) => {
    extractAllowedCountryValues(hit?.assetMetadata?.allowedCountries).forEach((market) => {
      markets.add(market);
    });
  });
  return [...markets].slice(0, MAX_MARKETS_PER_EVENT);
}

/**
 * Process search analytics asynchronously (fire-and-forget)
 * Extracts result count from response and tracks event.
 * Supports both Algolia and ContentAI response formats.
 * @param {Response} clonedResponse - Cloned response stream
 * @param {Object} user - User session data
 * @param {Object} searchContext - Search context (term, type)
 * @param {Object} env - Cloudflare env with Analytics Engine binding
 */
async function processSearchAnalytics(clonedResponse, user, searchContext, env) {
  try {
    const data = await clonedResponse.json();
    const resultCount = extractSearchResultCount(data);

    const userData = extractCommonUserData(user);
    if (!userData.userId) {
      console.warn(
        '[Analytics] Search event written with no user ID — user may be missing User ID in IDP token.',
        `searchTerm="${searchContext.searchTerm}"`,
        `searchType=${searchContext.searchType}`,
      );
    }

    const assetMarkets = extractAssetMarketsFromHits(data);

    const { trackAnalyticsEvent } = await import('../util/analytics-helper.js');
    await trackAnalyticsEvent(env, 'search', {
      ...userData,
      searchTerm: (searchContext.searchTerm || '').substring(0, ANALYTICS_SEARCH_TERM_MAX_LENGTH),
      searchType: searchContext.searchType,
      resourceType: '',
      resultCount,
      assetMarkets,
    });

    if (DEBUG_ANALYTICS) {
      console.info(
        `[Analytics] Search tracked: ${user.userId} searched for "${searchContext.searchTerm}" (${searchContext.searchType}), ${resultCount} results`,
      );
    }
  } catch (err) {
    console.error('[Analytics] Search processing error:', err);
  }
}

// ==========================================
// Exported Functions
// ==========================================

/**
 * Extract search context (search term and type) from request for analytics.
 * Supports both legacy Algolia format and ContentAI format.
 * Sets request.searchContext for later use by handleSearchAnalytics.
 * @param {Request} request - The incoming request
 * @param {Object} search - Parsed search body
 */
export function extractSearchContext(request, search) {
  const searchType = extractSearchType(request);

  // Only track searches that originate from a known search UI page.
  // Programmatic callers (permission testers, ID-lookup utilities, curl, etc.)
  // have no matching Referer and return null — skip analytics entirely.
  if (searchType === null) {
    const referer = request.headers.get(HEADER_REFERER) || '(none)';
    const userAgent = request.headers.get('user-agent') || '(none)';
    const userId = request.user?.userId || '(unauthenticated)';
    const searchTerm = findContentAISearchTerm(search.query) || search.requests?.[0]?.params?.query || '(unknown)';
    console.warn(
      '[Analytics] Search not from UI — skipping analytics.',
      `user=${userId}`,
      `referer=${referer}`,
      `searchTerm="${searchTerm}"`,
      `userAgent=${userAgent}`,
    );
    return;
  }

  // Legacy Algolia/Polaris format: { requests: [{ params: { query: "..." } }] }
  const searchParams = search.requests?.[0]?.params;
  if (searchParams) {
    request.searchContext = {
      searchTerm: searchParams.query || '',
      searchType,
    };
    return;
  }

  // ContentAI format: { query: [{ and: [...] }], limit: N, orderBy: "..." }
  if (search.query && Array.isArray(search.query)) {
    const searchTerm = findContentAISearchTerm(search.query) || '';
    request.searchContext = {
      searchTerm,
      searchType,
    };
    return;
  }

  console.error(
    '[Analytics] extractSearchContext: unrecognized search body format — search analytics will NOT be tracked for this request',
  );
}

/**
 * Handle archive creation analytics (fire-and-forget).
 * Parses the x-analytics-context header, tracks each asset, and removes the header.
 * @param {URL} url - Request URL
 * @param {Request} request - The incoming request (must have request.user)
 * @param {Headers} headers - Mutable headers (analytics header will be deleted)
 * @param {Object} env - Cloudflare env
 * @param {ExecutionContext} ctx - Cloudflare execution context
 */
export function handleArchiveAnalytics(url, request, headers, env, ctx) {
  if (url.pathname !== PATH_ARCHIVES || request.method !== 'POST') return;

  const analyticsContextHeader = headers.get(HEADER_ANALYTICS_CONTEXT);
  if (!analyticsContextHeader) return;

  try {
    const analyticsContext = JSON.parse(analyticsContextHeader);
    if (analyticsContext.downloadId && analyticsContext.assets?.length > 0) {
      if (DEBUG_ANALYTICS) {
        console.info('[Analytics] Tracking archive:', analyticsContext.assets.length, 'assets');
      }
      const analyticsPromise = trackArchiveAnalytics(request.user, analyticsContext, env).catch((err) =>
        console.error('[Analytics] Archive tracking error:', err),
      );
      trackWithWaitUntil(ctx, analyticsPromise);
    }
  } catch (parseErr) {
    console.error('[Analytics] Failed to parse archive analytics context:', parseErr);
  }

  headers.delete(HEADER_ANALYTICS_CONTEXT);
}

/**
 * Handle template download analytics (fire-and-forget).
 * Called from originPublish for template download POSTs that carry
 * the x-analytics-context header. Same tracking shape as archive downloads
 * but with resourceType 'template'.
 * @param {Request} request - The incoming request (must have request.user)
 * @param {Headers} headers - Mutable headers (analytics header will be deleted)
 * @param {Object} env - Cloudflare env
 * @param {ExecutionContext} ctx - Cloudflare execution context
 * @returns {boolean} true if analytics were handled
 */
export function handleTemplateDownloadAnalytics(request, headers, env, ctx) {
  const analyticsContextHeader = headers.get(HEADER_ANALYTICS_CONTEXT);
  if (!analyticsContextHeader) return false;

  try {
    const analyticsContext = JSON.parse(analyticsContextHeader);
    if (analyticsContext.downloadId && analyticsContext.assets?.length > 0) {
      if (DEBUG_ANALYTICS) {
        analyticsContext.assets.forEach((a, i) => {
          console.info(
            `[Analytics] Template event[${i}]: assetId(base)=${a.assetId} pubId(copy)=${a.publicationId || ''} brand=${a.brand} campaign=${a.campaign}`,
          );
        });
      }
      const analyticsPromise = trackArchiveAnalytics(request.user, analyticsContext, env).catch((err) =>
        console.error('[Analytics] Template download tracking error:', err),
      );
      trackWithWaitUntil(ctx, analyticsPromise);
    }
  } catch (parseErr) {
    console.error('[Analytics] Failed to parse template download analytics context:', parseErr);
  }

  headers.delete(HEADER_ANALYTICS_CONTEXT);
  return true;
}

/**
 * Handle download analytics (fire-and-forget).
 * Checks if the request is a download, extracts context, and tracks.
 * @param {URL} url - Request URL
 * @param {Request} request - The incoming request (must have request.user)
 * @param {Response} response - The fetch response
 * @param {Object} env - Cloudflare env
 * @param {ExecutionContext} ctx - Cloudflare execution context
 */
export function handleDownloadAnalytics(url, request, response, env, ctx) {
  if (!isDownloadRequest(url)) return;

  const downloadContext = extractDownloadContext(url, request);
  if (response.ok && downloadContext) {
    const analyticsPromise = trackDownloadAnalytics(request.user, downloadContext, env).catch((err) =>
      console.error('[Analytics] Download tracking error:', err),
    );
    trackWithWaitUntil(ctx, analyticsPromise);
  }
}

/**
 * Handle search analytics (fire-and-forget).
 * Clones the response to read the result count, then tracks the event.
 * @param {URL} url - Request URL
 * @param {Request} request - The incoming request (must have request.searchContext)
 * @param {Response} response - The fetch response
 * @param {Object} env - Cloudflare env
 * @param {ExecutionContext} ctx - Cloudflare execution context
 */
export function handleSearchAnalytics(url, request, response, env, ctx) {
  if (url.pathname !== PATH_SEARCH) return;

  if (!request.searchContext) {
    // Expected for non-UI requests (no matching Referer) — extractSearchContext skips them intentionally.
    console.warn(
      '[Analytics] Search request to',
      url.pathname,
      'has no searchContext — non-UI request, skipping analytics.',
    );
    return;
  }

  if (!response.ok) {
    console.error('[Analytics] Search request failed with status', response.status, '— analytics will NOT be tracked');
    return;
  }

  const clonedResponse = response.clone();
  const analyticsPromise = processSearchAnalytics(clonedResponse, request.user, request.searchContext, env).catch(
    (err) => console.error('[Analytics] Search tracking error:', err),
  );
  trackWithWaitUntil(ctx, analyticsPromise);
}
