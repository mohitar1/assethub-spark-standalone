/**
 * Grounded constants for the asset-enrichment agent.
 *
 * Hosts, limits, headers, and IMS parameters shared with the worker's DM
 * integration (cloudflare/src/origin/dm.js).
 */

// --- IMS (mirror cloudflare/src/origin/dm.js) ---
export const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v4';
// The AEM Author Assets HTTP API requires the broader AEM-as-a-Cloud-Service technical-
// account scope set (not just AdobeID,openid, which only reaches the delivery/Content Hub
// tier). Verified empirically: adding adobeio_api + the read_organizations/roles/
// projectedProductContext scopes flips the author host past the "missing required scopes"
// 403 to the env-side "client ID not allowlisted" gate.
export const IMS_SCOPE = [
  'openid',
  'AdobeID',
  'read_organizations',
  'additional_info.projectedProductContext',
  'additional_info.roles',
  'adobeio_api',
].join(',');
export const IMS_TOKEN_EXPIRY_BUFFER_SECONDS = 5 * 60;

// --- Per-request headers ---
export const HEADER_AUTHORIZATION = 'Authorization';
export const HEADER_API_KEY = 'x-api-key';
export const HEADER_EXPERIMENTAL = 'x-adobe-accept-experimental';
export const HEADER_IF_MATCH = 'If-Match';
export const HEADER_IF_NONE_MATCH = 'If-None-Match';
export const HEADER_PREFER = 'Prefer';
export const EXPERIMENTAL_VALUE = '1';
export const AEM_ASSETS_FRONTEND_API_KEY = 'aem-assets-frontend-1';

export {
  DM_COLLECTIONS_PATH_PREFIX,
  DM_CONTENT_HUB_COLLECTIONS_API_KEY as ADOBE_API_KEY_COLLECTIONS,
  getDynamicMediaApiKeyForPath,
  isDynamicMediaCollectionsPath,
} from '../../../../../scripts/dm-api-contract.js';

// --- Author API host map, keyed by logical operation ---
//
// The customer's assets live in AEM Author (author-<aemEnvId>.adobeaemcloud.com), NOT the
// delivery/Content Hub tier the worker proxies. Every op targets the same author host; the
// per-op paths (/assets/search, /assets/{id}/metadata, ...) start with /assets, so the base
// carries the /adobe prefix. Build the map per environment with buildHosts(aemEnvId).
export function buildAuthorHost(aemEnvId) {
  if (!aemEnvId || !/^p\d+-e\d+$/.test(aemEnvId)) {
    throw new Error(`buildAuthorHost: invalid aemEnvId "${aemEnvId}" (expected pNNN-eNNN)`);
  }
  return `https://author-${aemEnvId}.adobeaemcloud.com`;
}

export function buildHosts(aemEnvId) {
  const base = `${buildAuthorHost(aemEnvId)}/adobe`;
  return {
    search: base,
    metadata: base,
    metadataImport: base,
    jobs: base,
    upload: base,
    rendition: base,
    importFromUrl: base,
    sling: buildAuthorHost(aemEnvId),
  };
}

// --- Delivery / Content Hub host (collections live here, NOT on author) ---
//
// Collections are a Content Hub concept served from the delivery tier
// (delivery-<aemEnvId>.adobeaemcloud.com), the same tier cloudflare/src/origin/dm.js
// proxies to. The asset ContentAI search and the collections CRUD/search endpoints all
// live under this host. Mirrors ADOBE_DELIVERY_HOST_PREFIX/SUFFIX in the worker.
export function buildDeliveryHost(aemEnvId) {
  if (!aemEnvId || !/^p\d+-e\d+$/.test(aemEnvId)) {
    throw new Error(`buildDeliveryHost: invalid aemEnvId "${aemEnvId}" (expected pNNN-eNNN)`);
  }
  return `https://delivery-${aemEnvId}.adobeaemcloud.com`;
}

// --- Limits (grounded in schema) ---
export const SEARCH_PAGE_LIMIT = 50;
export const SEARCH_TOTALCOUNT_CAP = 10000;
// Folder enumeration scans the tenant repo and filters by repo:path prefix client-side,
// because the author search's field-scoped startsWith operator does NOT prefix-match
// repo:path (verified live: it only returns the exact full path, and match-alls on
// repo:ancestors). This caps how many assets we page through before giving up.
export const SEARCH_SCAN_CAP = 20000;
export const CSV_MAX_BYTES = 10 * 1024 * 1024;

// --- Generated-metadata field limits ---
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 200;
export const KEYWORDS_MIN = 3;
export const KEYWORDS_MAX = 12;

// --- Metadata keys we write ---
export const FIELD = {
  TITLE: 'dc:title',
  DESCRIPTION: 'dc:description',
  SUBJECT: 'dc:subject',
  PRODUCT_CATEGORY: 'productCategory',
  CAMPAIGN: 'campaign',
  CHANNEL: 'channel',
  BRAND: 'brand',
  COMPANY: 'company',
  STATUS: 'dam:status',
  // Country-visibility gate. The worker (cloudflare/src/origin/dm.js) filters search by
  // assetMetadata.allowedCountries against the viewer's country plus the 'global' sentinel;
  // enriched demo assets are stamped 'global' so they are visible regardless of country.
  ALLOWED_COUNTRIES: 'allowedCountries',
};

// --- Metadata keys we only ever READ (AEM's own asset-processing output) ---
// Written by AEM's asset microservices (thumbnail rendition, metadata extraction, smart
// tagging) once an upload finishes processing — never written by this agent. Read as the
// primary evidence source for generated metadata (generate.js) and category assignment
// (category-plan.js), ahead of filename-token guessing.
//
// Deliberately excludes dam:roles — rights/licensing metadata, never a classification or
// title/description signal, and never to be read or referenced by this skill.
export const AUTOGEN_FIELD = {
  ASSET_STATE: 'dam:assetState',
  TITLE: 'autogen:title',
  DESCRIPTION: 'autogen:description',
  SUBJECT: 'autogen:subject',
  // AEM smart-tagging also writes predicted tags; read as additional classification
  // evidence (never written by this agent), alongside autogen:subject.
  PREDICTED_TAGS: 'predictedTags',
};

// The only dam:assetState value that means "AEM's asset-processing microservices have
// finished and autogen:* fields are populated." Anything else (or absent) means processing
// hasn't completed yet — autogen:* fields may be missing or stale.
export const ASSET_STATE_PROCESSED = 'processed';

// --- Wait-for-processed polling (upload -> dam:assetState=processed) ---
// AEM's asset processing (thumbnail, metadata extraction, smart tagging) runs
// asynchronously after upload. Enrichment must not read autogen:* fields before this
// completes, or it silently falls back to weaker evidence with no warning. Bounded so a
// stuck/failed processing pipeline can't hang the run indefinitely.
export const ASSET_PROCESSED_POLL_INTERVAL_MS = 2000;
export const ASSET_PROCESSED_POLL_TIMEOUT_MS = 60 * 1000;

export const STATUS_APPROVED = 'approved';

// Minimum number of populated category cards for a credible landing page. Not a fixed
// target — the card count follows the source-derived contract — but below this the page
// looks too thin, so the enrichment gate fails rather than publishing a sparse grid.
export const MIN_CARDS = 4;

// The DAM content root. The Assets HTTP API mirrors this tree under /api/assets.
export const DAM_ROOT = '/content/dam';

// --- Bring-in (E3: scrape a site -> upload) limits ---
// Sensible demo-scale bounds so a scrape can't run away or pull a huge binary.
export const BRING_IN_MAX_IMAGES = 50;
// Below this many downloaded images, the bring-in result is too thin for a credible demo;
// the controller warns loudly (see enrich-classic.js) instead of silently proceeding.
export const BRING_IN_MIN_TARGET_IMAGES = 20;
export const BRING_IN_MAX_BYTES = 15 * 1024 * 1024;
// Skip images smaller than this — typically icons, flags, or tiny renditions.
export const BRING_IN_MIN_BYTES = 10 * 1024;
export const BRING_IN_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];
export const BRING_IN_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
export const BRING_IN_ASSET_EXTENSIONS = [
  ...BRING_IN_IMAGE_EXTENSIONS,
  ...BRING_IN_DOCUMENT_EXTENSIONS,
];
