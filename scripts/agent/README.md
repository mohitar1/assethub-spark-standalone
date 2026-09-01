# Asset enrichment agent

A one-time authoring action, run per forked demo, that makes a customer's
assets **searchable and filterable** in the Assets Hub portal. It writes
generated metadata (title, description, keywords, and — where inferable
— category, campaign, channel) onto the customer's AEM assets, stamps a
per-customer scope value plus `dam:status=approved` so Delivery search and
facets can surface them.

It is invoked by **Step 5** of the `customer-migration` skill
(`.claude/skills/customer-migration/SKILL.md`), but can also be run
directly. It introduces **no new secret** — it reuses the Content Hub
technical-account credentials already present in `cloudflare/.secrets`.

## What it does (controller flow)

The agent has **two metadata runners**, chosen by how credentials resolve:

- **Pre-issued-token runner (live/working path)** — used when
  `AUTHOR_SPARK_IMS_TOKEN` is present. It uses path-based author metadata
  operations for enumerate/read/write. Bring-in folder creation and binary
  upload use the AEM UI's `/adobe/repository/...` create → block_upload →
  presigned-blob PUT → finalize flow.
- **Converged-API runner (fallback)** — used with the DM
  `client_credentials` flow against `/adobe/assets`; requires the client ID
  to be allowlisted for the environment.

Both share the same shape:

```
load config (customerKey -> /content/dam/<customerKey>, company scope)
  -> acquire author token (pre-issued bearer, or DM client_credentials)
  -> [bring-in, optional] with --source-url: scrape the site for images/docs,
       create the customer folder and upload files through /adobe/repository
  -> enumerate the folder
       classic:   GET /api/assets/<folder>.json (HAL, recurses sub-folders)
       converged: match-all search + client-side repo:path prefix filter
  -> per asset (bounded concurrency):
       read metadata -> skip if already enriched (unless --force)
       generate metadata -> normalize to facet vocabulary
  -> WRITE
       classic:   Sling POST to <path>/jcr:content/metadata
       converged: bulk CSV import, or per-asset PATCH
  -> REPORT (per-asset enriched/skipped/failed; exit non-zero on failure)
```

The metadata generator is pluggable. The default `--metadata-mode filename`
is **deterministic**: it derives fields from the filename and available
metadata hints so the pipeline produces valid metadata offline. Do not call
that AI/vision output. `--metadata-mode vision` is reserved for a real
invokeModel/vision integration and currently fails fast until that integration
is wired.

## Usage

Run from the repo root with Node >= 18:

```bash
node scripts/agent/enrich-assets.js \
  --customer-key <customerKey> \
  [--dam-path /content/dam/<customerKey>] \
  [--bring-in --source-url <url>] \
  [--dry-run] [--force] \
  [--write-mode bulk|patch] \
  [--concurrency <n>] \
  [--limit <n>] \
  [--secrets-file cloudflare/.secrets] \
  [--aem-env-id pNNN-eNNN] \
  [--metadata-mode filename|vision] \
  [--product-category-vocab "A,B,C"] [--channel-vocab "A,B,C"] \
  [--report-file <path.json>]
```

**Always run `--dry-run` first** — it performs enumerate -> read ->
generate -> normalize and prints the intended CSV/patches **without**
writing anything.

### Flags

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--customer-key` | value | *(required)* | Customer slug; drives both `/content/dam/<key>` and the `company` scope value. |
| `--dam-path` | value | `/content/dam/<customerKey>` | Override the DAM folder. |
| `--bring-in` | bool | off | Lane B: bring **new** assets in from a source site before enriching (implied by `--source-url`). |
| `--source-url` | value | — | Source website to scrape images from for `--bring-in`. |
| `--dry-run` | bool | off | Preview only; no writes. |
| `--force` | bool | off | Re-generate + re-write already-enriched assets. |
| `--write-mode` | value | `bulk` | `bulk` (CSV import) or `patch` (per-asset JSON Patch). |
| `--concurrency` | value | `4` | Parallel per-asset workers. |
| `--limit` | value | — | Cap the number of assets processed. |
| `--secrets-file` | value | `cloudflare/.secrets` | Where to read DM creds. |
| `--aem-env-id` | value | from `cloudflare/src/config.js` | AEM env id (`pNNN-eNNN`) → author host. |
| `--metadata-mode` | value | `filename` | Metadata generator mode. `filename` is deterministic filename/hint-derived output. `vision` is reserved and fails until a real model integration is wired. |
| `--product-category-vocab` | value (CSV) | — (free text) | **Opt-in only.** If set, Category is mapped to the closest match in this list, or dropped if none matches. Only use if the customer has confirmed a fixed category list; otherwise Category is written as free text (matching the portal's `excFacets` string-type facet). |
| `--channel-vocab` | value (CSV) | — (free text) | Same opt-in behavior as `--product-category-vocab`, for Channel. |
| `--report-file` | value | — | Write the JSON report to this path. |
| `--fixture` | value | — | Offline preview from a fixture file (forces `--dry-run`). |

## Bring-in from a site (`--source-url`, repository upload)

Passing `--source-url <url>` turns on the **bring-in** lane (E3): the agent
pulls the customer's own images and linked documents off their website and lands them in the
customer folder, then the normal enrichment flow runs over them.

For a credible demo, target **at least 20 downloaded images**
(`BRING_IN_MIN_TARGET_IMAGES`, default 20; hard cap `BRING_IN_MAX_IMAGES`,
default 25). A single product/detail page often only exposes a handful of
usable image URLs (most `<img>` tags on such pages are icons/thumbnails that
get filtered out) — prefer a **collection/listing page** with many product
tiles as the source URL, or rerun with another source page from the same site
if the first pass returns too few. If the live run logs a warning that fewer
than the target were found, don't treat the run as done — try a richer
source page (and/or raise `--limit`) before moving on to labelling.

```bash
# Preview: scrape + download only (nothing is uploaded or written)
node scripts/agent/enrich-assets.js --customer-key acme \
  --source-url https://www.santander.com/en/collections/all --limit 25 --dry-run

# Live: scrape -> create folder -> repository upload -> enumerate -> enrich
node scripts/agent/enrich-assets.js --customer-key acme \
  --source-url https://www.santander.com/en/collections/all --limit 25
```

What happens on a live run:

1. **Scrape** (`scrape-site.js`) — fetch the page and extract asset URLs from
   `<img src|data-src|srcset>`, `<source srcset>`, `og:image`/`twitter:image`
   meta tags, direct `<a href="*.jpg|*.png|*.webp|...">` image links
   (including EDS raw/pre-decoration markup), and document links (`pdf`,
   Office docs); resolve relative URLs; drop `data:`/empty.
2. **Download** — bounded by `--limit` (else `BRING_IN_MAX_IMAGES`) and a per-file
   byte cap (`BRING_IN_MAX_BYTES`); non-image and empty responses are skipped, and
   file names are sanitised/deduped with the extension taken from the `Content-Type`.
3. **Create folder** — `POST /adobe/repository/content/dam;api=create;path=<key>;intermediates=true`
   with `Content-Type: application/vnd.adobecloud.directory+json`.
4. **Upload** — the HAR-verified repository block-upload sequence:
   `POST /adobe/repository/content/dam/<key>;api=create;path=<file>`, then
   `POST ...;api=block_upload;path=<file>`, then `PUT <presigned blob URL>`,
   then `POST ...;api=block_upload_finalize;token=<token>`.
5. **Enumerate → enrich** — the uploaded assets are discovered by the normal
   listing, labelled, stamped `dam:status=approved`, and reported.

`--dry-run` performs steps 1–2 (proving the scrape/download) but does **not**
upload, ensure the folder, or enrich — there is nothing in AEM yet to enumerate.

Bring-in currently runs on the **pre-issued-token path only** and uses
`/adobe/repository/...` for folder creation and binary upload. `--bring-in`
on its own (no `--source-url`) warns and is a no-op.

## Target host (AEM Author)

The customer's assets live in **AEM Author**, not the delivery/Content Hub
tier the worker proxies. Calls target
`https://author-<aemEnvId>.adobeaemcloud.com`. The `aemEnvId`
(`pNNN-eNNN`) resolves from `--aem-env-id` → `AEM_ENV_ID` env → the
worker's `cloudflare/src/config.js` (`AEM_ENV_ID`).

> **Environment prerequisite — client-ID allowlist.** The AEM Author
> Assets HTTP API only accepts a technical-account client ID that has been
> **allowlisted for the environment via the AEM Configuration Pipeline**
> (Cloud Manager config, api allowlist). Until then, every author call
> returns `403 "IMS Client ID not allowlisted"` even though the
> credentials and scopes are correct. The agent detects this and exits `3`
> with guidance.

## Credentials

No secret is passed on the command line or read from chat. Creds resolve
in this order:

1. `SPARK_DM_CLIENT_ID` / `SPARK_DM_CLIENT_SECRET` in the environment.
2. `SPARK_DM_CLIENT_ID` / `SPARK_DM_CLIENT_SECRET` in `cloudflare/.secrets`
   (collected in migration Phase B.7) — the default.
3. `SPARK_DM_CLIENT_ID` / `SPARK_DM_CLIENT_SECRET` in root `secret.env`.

The token is acquired via IMS `client_credentials` and used with
`Authorization: Bearer`, `x-api-key`, and `x-adobe-accept-experimental: 1`
headers on all author calls. The AEM Author Assets API requires the
broader AEM-as-a-Cloud-Service technical-account scope set (not just
`AdobeID,openid`, which only reaches the delivery tier):
`openid,AdobeID,read_organizations,additional_info.projectedProductContext,additional_info.roles,adobeio_api`.

### Pre-issued token (`AUTHOR_SPARK_IMS_TOKEN`) — the live path

If `AUTHOR_SPARK_IMS_TOKEN` is set, it is used **verbatim** as the author
bearer token and **no `client_credentials` grant is performed**. Resolution
order: environment -> `cloudflare/.secrets` -> root `secret.env`. A leading
`Bearer ` is stripped automatically.

**Why path-based metadata remains.** The converged `/adobe/assets/{id}/metadata`
and `/metadata/import` endpoints route through the AEM I/O gateway, which
validates an `x-api-key` against a real registered key belonging to the
token's own client. A Content-Hub-issued demo token does not carry such a key
(metadata reads return
`403 {"error_code":"403003","message":"Api Key is invalid"}`, and
metadata import is not routed → `404`). The path-based metadata endpoints
authenticate the same bearer token with **no `x-api-key`**, so when a
pre-issued token is present the agent uses these endpoints:

| Step | Endpoint |
|---|---|
| Enumerate | `GET /api/assets/<folder>.json?offset&limit` (HAL listing, recurses sub-folders) |
| Read metadata | `GET /content/dam/<path>/jcr:content/metadata.json` |
| Write metadata | `POST /content/dam/<path>/jcr:content/metadata` (Sling POST servlet; multi-value via `<prop>@TypeHint=String[]`) |

Folder creation and upload do **not** use `/api/assets`. They use the AEM
UI repository API with `x-api-key` defaulting to `aem-assets-frontend-1`:

| Step | Endpoint |
|---|---|
| Create folder | `POST /adobe/repository/content/dam;api=create;path=<folder>;intermediates=true` |
| Create asset | `POST /adobe/repository/content/dam/<folder>;api=create;path=<file>;intermediates=true` |
| Negotiate upload | `POST /adobe/repository/content/dam/<folder>;api=block_upload;path=<file>` |
| Upload bytes | `PUT <presigned blob URL>` |
| Finalize | `POST /adobe/repository/content/dam/<folder>;api=block_upload_finalize;token=<token>` |

`AUTHOR_SPARK_IMS_API_KEY` can override the default repository API key, but
is not required for the common Assets UI flow. `AGENT_DEBUG=1` prints each
request as a copy-pasteable curl with the bearer redacted to `$TOKEN`, and
per-asset failures (with status + exact response body) are printed to the
CLI as well as the `--report-file`.

When a pre-issued token is used, `SPARK_DM_CLIENT_ID`/`SECRET` are not
consulted at all. The agent falls back to the DM `client_credentials` flow
against the converged API **only** when `AUTHOR_SPARK_IMS_TOKEN` is unset
(that path additionally requires the client ID to be allowlisted for the
environment).

## Offline preview (`--fixture`)

Preview the full generate -> normalize -> CSV pipeline with no
credentials and no network. Provide a JSON array of assets:

```json
[
  {
    "assetId": "urn:aaid:aem:demo-1",
    "repoPath": "/content/dam/acme/hero-spring-campaign.jpg",
    "repoName": "hero-spring-campaign.jpg",
    "dcFormat": "image/jpeg",
    "assetMetadata": {}
  }
]
```

```bash
node scripts/agent/enrich-assets.js --customer-key acme --fixture assets.json
```

`--fixture` forces `--dry-run`; it never performs live writes.

## Report

The run records a per-asset outcome (`enriched`, `skipped`, `failed`) and a
summary. With `--report-file` it also writes a machine-readable JSON summary:

```json
{
  "startedAt": "...",
  "finishedAt": "...",
  "context": {
    "customerKey": "acme",
    "damPath": "/content/dam/acme",
    "metadataMode": "filename"
  },
  "counts": { "enriched": 12, "skipped": 3 },
  "assets": [ { "assetId": "...", "outcome": "enriched" } ],
  "representatives": {
    "groupBy": "productCategory",
    "expected": ["hatchback", "sedan", "suv"],
    "missing": [],
    "items": {
      "hatchback": {
        "productCategory": "hatchback",
        "assetId": "...",
        "assetPath": "/content/dam/acme/swift.jpg",
        "title": "Swift"
      }
    }
  }
}
```

The process exits non-zero if any asset hard-failed, so the caller can
gate on success.

The `representatives` block is the Step 5 handoff to DA page updates: it
gives one usable asset per `productCategory` bucket and lists any expected
category-card bucket that still has no asset. Use it to replace copied
homepage/category/top-model placeholder imagery with real customer assets.

## Idempotency

An asset is treated as already enriched when its `company` scope value
equals the customer key, it has a non-empty `dc:title`, `dam:status` is
`approved`, and `allowedCountries` includes `global`. If
`--product-category-vocab` is supplied, the stored `productCategory` must
also match that current vocab; otherwise it is reprocessed. Such assets are
skipped unless `--force` is passed, so re-runs are safe but stale category
metadata does not silently pass.

## Module map

| Module | Responsibility |
|---|---|
| `enrich-assets.js` | Controller + CLI entrypoint. |
| `config.js` | Arg parsing, `customerKey` -> paths, credential resolution. |
| `constants.js` | Hosts, headers, limits, field keys. |
| `ims-auth.js` | IMS token grant + cached refresh. |
| `author-client.js` | Author API client (host map, auth, 401/429/5xx retry). |
| `enumerate.js` | Folder discovery: match-all `search` scan (cursor pagination) filtered client-side by `repo:path` prefix, because the author search's field-scoped `startsWith` does not prefix-match `repo:path` in this lexical space. Bounded by `SEARCH_SCAN_CAP`. |
| `metadata.js` | Read metadata (+ETag); already-enriched test. |
| `rendition.js` | Fetch a small rendition (fallback to original). |
| `generate.js` | Metadata generation (deterministic default; pluggable vision). |
| `normalize.js` | Clean keywords, map to facet vocabulary, validate shape. |
| `representatives.js` | Pick one representative asset per `productCategory` for Step 5 page/card media updates. |
| `csv.js` | Bulk metadata CSV (RFC-4180) + batching. |
| `json-patch.js` | Per-asset RFC-6902 patch body. |
| `write-bulk.js` | Multipart metadata import + job poll. |
| `write-patch.js` | Per-asset PATCH with ETag retry. |
| `scrape-site.js` | Bring-in: extract image URLs from a page + bounded download. |
| `upload-strategy.js` | Repository API folder create + block upload for bring-in. |
| `classic-client.js` | Path-based Author metadata client (`getJson`/`postForm`). |
| `classic-metadata.js` | Path-based enumerate/read/write metadata helpers. |
| `enrich-classic.js` | Pre-issued-token enrichment controller (hosts the bring-in stage). |
| `concurrency.js` | Bounded-concurrency `map` helper. |
| `report.js` | Per-asset report, counts, exit code. |
| `fixture-client.js` | Offline client for `--fixture`. |
| `dm-collections-client.js` | Step 6: DM/Content Hub client (delivery tier) — company-scoped asset search + collection create. |
| `collections-plan.js` | Step 6: pure grouping logic (assets → one collection spec per facet value). |
| `create-collections.js` | Step 6 controller + CLI entrypoint (`create-collections.js`). |

## Tests

```bash
# from the repo root
npx vitest run --project unit-tests scripts/agent
```

## Worker scope companion (Step 5)

Making the portal show **only** this customer's assets and content is a
two-key config edit, applied by the worker at runtime and committed to the PR:

```js
// cloudflare/src/config.js
DEMO_COMPANY: '<customerKey>',
DEMO_BASE_PATH: '/<customerKey>',
```

`dm.js` injects `term: { 'assetMetadata.company': [DEMO_COMPANY] }` into
search authorization when set. `DEMO_BASE_PATH` keeps routing, login, and
access-sheet reads under the company folder. The PR worker applies both keys
when the PR deploys.

## Collections (Step 6)

After enrichment, `create-collections.js` turns the now-searchable assets
into **company-scoped collections** — one per facet value (default
`productCategory`). Collections live on the **delivery / Content Hub tier**,
so this uses the **DM collections API, not the author API** the enrichment
runners use. It mirrors the worker's deterministic request contract: asset
search uses the DM client id as `x-api-key`, collection CRUD uses the Content
Hub collections key (`aem-assets-content-hub-1`), and the bearer token comes
from the existing DM credentials in `cloudflare/.secrets`. No new collection
credential.

```bash
# preview the intended collections (no writes)
node scripts/agent/create-collections.js --customer-key acme --dry-run

# live: search company assets -> group -> create public, company-tagged collections
node scripts/agent/create-collections.js --customer-key acme
```

### Flags

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--customer-key` | value | *(required)* | Company slug; scopes the asset search (`assetMetadata.company`) and stamps `custom:metadata.company` on each collection. |
| `--group-by` | value | `productCategory` | Facet to group by: `productCategory`\|`campaign`\|`channel`. |
| `--limit` | value | `200` | Max assets to pull from search. |
| `--min-assets` | value | `1` | Drop groups with fewer than this many assets. |
| `--access-level` | value | `public` | Collection visibility (`public` so every demo user sees it). |
| `--dry-run` | bool | off | Enumerate + plan only; no collections created. |
| `--report-file` | value | — | Write the JSON report to this path. |
| `--fixture` | value | — | Offline preview: read asset records from a JSON file (forces `--dry-run`). |
| `--secrets-file` / `--aem-env-id` | value | as Step 5 | Creds file / AEM env id override. |

### Company filter (hide/show collections per demo company)

Each collection is stamped `custom:metadata.company = <companyKey>`. The
worker (`cloudflare/src/origin/dm.js` →
`collectionsSearchContentAIAuthorization`) injects a
`collectionMetadata.custom:metadata.company = DEMO_COMPANY` clause into
**every** collections search — mirroring the asset company filter — so a demo
only ever surfaces the current company's collections (admins included).
Switching `DEMO_COMPANY` hides the rest. The clause ships in the same PR as
`config.js`; no extra deploy.
