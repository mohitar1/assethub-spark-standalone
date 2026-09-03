/**
 * Upload one representative image per category as a normal DA page image, so homepage
 * cards never depend on the worker's `/api/adobe/assets/...` proxy.
 *
 * Why this exists (verified live on a real demo): the proxy URL depends on the *visitor's*
 * session cookie at render time. A statically published DA doc has no visitor session —
 * the cards rendered broken/alt-text even for a signed-in user. Every other call site of
 * that proxy (blocks/search-results/, blocks/cards/, etc.) renders inside the authenticated
 * portal shell, a genuinely different code path — this module only replaces the one broken
 * call site, landing-card images, not the proxy pattern itself.
 *
 * The fix: fetch the representative asset's real bytes from AEM (reusing the same
 * IMS-authenticated `client`/`fetchRenditionBytes` already used elsewhere in this tool —
 * no new auth path), then PUT them to DA's source API as an ordinary binary page resource
 * under the company folder, same as any other authored image. Reference the resulting
 * `content.da.live/<org>/<repo>/...` URL with normal <picture>/<img> markup; Helix rewrites
 * it into its own public `media_<hash>.<ext>` path automatically at preview/publish — no
 * DA public-read requirement, no visitor auth needed.
 */

import { fetchRenditionBytes } from './rendition.js';

const DA_ADMIN_BASE = process.env.DA_ADMIN_BASE || 'https://admin.da.live';

function extFromContentType(contentType) {
  const type = (contentType || '').split(';')[0].trim().toLowerCase();
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
  };
  return map[type] || 'jpg';
}

/**
 * Upload one representative's image bytes to DA and return its source URL.
 * @param {object} deps
 * @param {object} deps.client  AuthorClient (IMS-authenticated AEM Author API client)
 * @param {string} deps.daToken  DA bearer token (never logged)
 * @param {string} deps.org
 * @param {string} deps.repo
 * @param {string} deps.companyKey
 * @param {{assetId:string, productCategory:string}} deps.rep
 * @param {function} [deps.fetchFn]
 * @returns {Promise<{ok:true, daSourceUrl:string}|{ok:false, error:string}>}
 */
export async function uploadCardImage({
  client, daToken, org, repo, companyKey, rep, fetchFn = fetch,
}) {
  if (!rep?.assetId) return { ok: false, error: 'representative has no assetId' };
  const rendition = await fetchRenditionBytes(client, rep.assetId).catch((err) => {
    throw new Error(`fetch rendition for ${rep.assetId} failed: ${err.message || err}`);
  });
  if (!rendition?.bytes) return { ok: false, error: 'no rendition bytes available' };

  const ext = extFromContentType(rendition.contentType);
  const fileName = `media_${rep.productCategory}.${ext}`;
  const daPath = `${companyKey}/en/${fileName}`;
  const url = `${DA_ADMIN_BASE}/source/${org}/${repo}/${daPath}`;

  const form = new FormData();
  form.append('data', new Blob([rendition.bytes], { type: rendition.contentType || 'image/jpeg' }), fileName);

  const res = await fetchFn(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${daToken}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `DA upload ${res.status} ${text}`.trim() };
  }

  return {
    ok: true,
    daSourceUrl: `https://content.da.live/${org}/${repo}/${daPath}`,
  };
}

/**
 * Materialize a DA card image for every representative that doesn't already have one.
 * Dry-run reports what WOULD be fetched/uploaded without any network write.
 * @returns {Promise<{ items: Record<string,object>, failures: Array<{slug:string,error:string}> }>}
 */
export async function materializeCardImages({
  client, daToken, org, repo, companyKey, representatives, dryRun = false, fetchFn = fetch,
}) {
  const items = { ...(representatives?.items || {}) };
  const failures = [];

  for (const [slug, rep] of Object.entries(items)) {
    if (rep.cardImageUrl) continue; // already set (e.g. re-run / already enriched)
    if (dryRun) {
      items[slug] = {
        ...rep,
        cardImageUrl: `[dry-run] would upload media_${slug}.jpg from asset ${rep.assetId} to /${companyKey}/en/`,
      };
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const result = await uploadCardImage({
      client, daToken, org, repo, companyKey, rep, fetchFn,
    });
    if (result.ok) {
      items[slug] = { ...rep, cardImageUrl: result.daSourceUrl };
    } else {
      failures.push({ slug, error: result.error });
    }
  }

  return { items, failures };
}
