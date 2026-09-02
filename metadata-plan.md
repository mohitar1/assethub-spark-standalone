# Metadata Plan

## Goal

- Use the customer source site to find assets and infer usable categories.
- Upload source-site assets through the AEM repository upload flow.
- Enrich DAM metadata through Sling after upload.
- Write only missing metadata values.
- Never overwrite existing asset metadata.
- Never publish category cards that link to zero-result facets.

## Non-Goals

- No CSV metadata import.
- No Assets Author metadata PATCH.
- No JSON Patch payloads.
- No `AUTHOR_SPARK_IMS_TOKEN` branch.
- No hardcoded customer vocab such as Audi-specific categories.
- No broad search fallback for a broken category card.
- No replacing existing `productCategory`, `dc:title`, `dc:description`, or other user-authored metadata.

## Auth

- Read credentials from `cloudflare/.secrets`.
- Required values:
  - `SPARK_DM_CLIENT_ID`
  - `SPARK_DM_CLIENT_SECRET`
- Mint an IMS bearer token with client credentials.
- Use that bearer token for Sling metadata reads/writes.
- Do not use `aem-assets-frontend-1` for metadata.
- Do not require a separate author token.

## APIs

- Uploads use the AEM repository upload flow:

```text
POST /adobe/repository/...;api=create
POST /adobe/repository/...;api=block_upload
PUT <presigned blob URL>
POST /adobe/repository/...;api=block_upload_finalize
```

- Metadata uses Sling on the asset repo path:

```http
GET /content/dam/<companyKey>/<asset>/jcr:content/metadata.json
Authorization: Bearer <ims-token>
```

```http
POST /content/dam/<companyKey>/<asset>/jcr:content/metadata
Authorization: Bearer <ims-token>
Content-Type: application/x-www-form-urlencoded;charset=UTF-8

./dc:title=Foo Product front view
./productCategory=products
./company=brand
./dam:status=approved
./allowedCountries@TypeHint=String[]
./allowedCountries=global
```

## Worklist

- Default path: list existing assets under `/content/dam/<companyKey>`.
- Bring-in path: scrape the customer source site, upload assets, then enrich the uploaded DAM paths.
- Worklist shape:

```json
[
  {
    "assetId": "urn:aaid:aem:...",
    "repoPath": "/content/dam/<companyKey>/hero.jpg",
    "repoName": "hero.jpg",
    "sourcePage": "https://brand.example/products/foo",
    "assetUrl": "https://brand.example/assets/hero.jpg",
    "altText": "Foo Product front view"
  }
]
```

- Sling metadata writes require `repoPath`.
- If upload returns an unreliable asset id, enumerate the target folder and resolve the uploaded file by `repoPath` / `repoName`.

## Evidence

- Every candidate asset should carry evidence before enrichment:

```json
{
  "assetUrl": "https://brand.example/products/foo/front.jpg",
  "sourcePage": "https://brand.example/products/foo",
  "pageTitle": "Foo Product",
  "heading": "Foo Product",
  "nearbyText": "Exterior and interior photography for Foo Product.",
  "altText": "Foo Product front view",
  "fileName": "foo-front.jpg",
  "mediaType": "image/jpeg"
}
```

- Discovery should inspect:
  - sitemap pages
  - nav and category pages
  - rendered DOM images
  - `picture/source/srcset`
  - OpenGraph images
  - linked image and document assets
  - page headings and nearby copy

## Categories

- `productCategory` powers the Category facet.
- Category assignment is generic and source-site driven.
- Sources, in priority order:
  - existing `productCategory`
  - source page category
  - folder/path category
  - page heading, alt text, nearby text
  - filename tokens
  - generated keywords

- Assignment shape:

```json
{
  "assetId": "urn:aaid:aem:...",
  "repoPath": "/content/dam/brand/foo-front.jpg",
  "productCategory": "products",
  "evidence": [
    "sourcePage=/products/foo",
    "heading=Foo Product",
    "fileName=foo-front.jpg"
  ]
}
```

- If no category is defensible:
  - mark asset `unclassified`
  - do not write `productCategory`
  - continue discovery for uncovered categories

## Metadata

- Generate candidate values only.
- Final writes are decided after reading current Sling metadata.

```json
{
  "dc:title": "Foo Product front view",
  "dc:description": "Brand-approved Foo Product image for product and marketing use.",
  "dc:subject": ["brand", "foo-product", "front-view", "product"],
  "productCategory": "products",
  "brand": "Brand",
  "company": "brand",
  "dam:status": "approved",
  "allowedCountries": ["global"]
}
```

- Basis:
  - `dc:title`: existing title, else alt text, else page heading plus view token, else filename
  - `dc:description`: existing description, else source page heading plus nearby text
  - `dc:subject`: existing subjects plus evidence tokens
  - `productCategory`: category assignment result only
  - `brand`: customer name when available
  - `company`: customer key
  - `dam:status`: `approved` when missing
  - `allowedCountries`: `global` when missing, append when already multi-value

## No-Overwrite

- Read Sling metadata before every write.
- Scalar fields are posted only when missing.
- Multi-value fields:
  - missing property: create with `@TypeHint=String[]`
  - existing array: append with `@Patch=true` and `+value`
  - existing scalar: keep it; fail if a required value like `global` cannot be appended
- Never send empty values.
- Never send delete operations.

| Field | Missing | Present |
|---|---|---|
| `dc:title` | add generated title | keep |
| `dc:description` | add generated description | keep |
| `dc:subject` | add generated keywords | append missing keywords only if already multi-value |
| `productCategory` | add assigned category | keep |
| `brand` | add customer name | keep |
| `company` | add customer key | if different, fail |
| `dam:status` | add `approved` | if not approved, fail |
| `allowedCountries` | add `global` | append `global` if possible; otherwise fail |

## Coverage

- Before live write:
  - source-site discovery found usable assets
  - every intended homepage category has at least one classified asset
  - unclassified assets are allowed only if published card coverage is already satisfied

- After live write:
  - every enriched asset has `company=<companyKey>`
  - every enriched asset has `productCategory`
  - every enriched asset has `dam:status=approved`
  - every enriched asset has `allowedCountries` including `global`

- After indexing:
  - run the real portal search for each category
  - every published category-card facet must return `total > 0`

## Report

- Write one report:

```text
.internal/<companyKey>-assets-report.json
```

- Important fields:
  - `counts`
  - `assets`
  - `categoryCoverage.categories`
  - `categoryCoverage.unclassified`
  - `representatives.items`

## Code Changes

- Use `scripts/agent/sling-metadata.js` for metadata reads/writes.
- Keep `scripts/agent/enrich-assets.js` as the single controller.
- Keep `scripts/agent/category-plan.js` as the category coverage source.
- Remove:
  - `scripts/agent/metadata-patch-plan.js`
  - `scripts/agent/write-patch.js`
  - metadata PATCH tests
  - JSON Patch / ETag retry docs

## Acceptance

- A generic source site can run without customer-specific category code.
- Same category evidence drives metadata, cards, and collections.
- Existing metadata is never overwritten.
- `dam:status=approved` is written through Sling when missing.
- A category card cannot produce a selected facet with `0` results.
- Missing coverage blocks with a concrete discovery report.
