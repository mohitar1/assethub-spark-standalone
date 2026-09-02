# Asset Enrichment

This tool prepares a customer demo's AEM assets so they show up in the portal search,
filters, category cards, and collections.

It can work in two ways:

- Use assets already in `/content/dam/<customerKey>`.
- Pull assets from a customer website first, upload them to AEM, then enrich them.

## What It Adds

For each asset, the tool fills missing metadata only:

- `dc:title`
- `dc:description`
- `dc:subject`
- `productCategory`
- `campaign`
- `channel`
- `brand`
- `company`
- `dam:status`
- `allowedCountries`

Existing metadata is kept. The tool does not replace titles, categories, descriptions,
or customer-authored values already on the asset.

## Why Category Matters

`productCategory` powers the Category filter and the homepage category cards.

Example:

```text
/search?facetFilters={"productCategory":{"<derived-slug>":true}}
```

That link only works when at least one visible asset has:

```text
productCategory = <derived-slug>
company = <customerKey>
dam:status = approved
allowedCountries contains global
```

The migration workflow derives a category contract from the source site before
homepage cards are published. The enrichment report proves which contract slugs
have visible assets. Cards, facet links, `productCategory`, and collections must
use the same slugs.

## Before Reading Any Metadata: Wait For Processing

AEM's own asset-processing pipeline (thumbnail rendition, metadata extraction, smart
tagging) runs asynchronously after upload. Before the tool reads an asset's metadata for
enrichment, it polls Sling metadata until `dam:assetState` reaches `processed` (bounded —
a stuck pipeline fails that asset with a clear error instead of hanging or reading
incomplete/stale data). Only once processed are `autogen:*` fields treated as reliable.

## How Titles, Descriptions, and Keywords Are Generated

There is one generation path — no mode flag to choose between:

- Primary evidence: AEM's own `autogen:title`, `autogen:description`, and
  `autogen:subject` fields, populated by AEM's asset-processing pipeline once the asset
  reaches `dam:assetState = processed`. This is real signal from AEM's own processing, not
  a guess.
- Fallback, per field: filename tokens and `xcm:machineKeywords` hints, used only for
  whichever of title/description/keywords is still empty after processing completes.

`dam:roles` is rights/licensing metadata. It is never read, written, or referenced by any
part of this tool — not for generated metadata, not for category assignment.

## How Categories Are Chosen

Category assignment uses evidence in this order:

- existing `productCategory`
- AEM's own `autogen:subject` smart tags matched against the category rule table
  (highest-confidence rule match — this is AEM's own processing output, not a guess)
- source page URL, page title, headings, and image alt text matched against the same
  rule table (medium confidence)
- filename and generated keywords as fallback evidence

There is no hardcoded customer list, no generic fallback taxonomy when the source
site is clear, and no operator-supplied strict category vocabulary. If the tool
cannot defend a category for an asset against the source-derived evidence, it
does not write `productCategory` for that asset and reports a category failure.

If a source-derived category has no visible assets after enrichment, the workflow
does not publish a zero-result card or replace it with a broad search link. It
continues source discovery/enrichment, or blocks with the missing category.

## Command

```bash
node .claude/skills/rebrand-portal/scripts/assets/enrich-assets.js \
  --customer-key <customerKey> \
  [--dam-path /content/dam/<customerKey>] \
  [--source-url <url>] \
  [--dry-run] [--force] \
  [--concurrency <n>] \
  [--limit <n>] \
  [--secrets-file cloudflare/.secrets] \
  [--aem-env-id pNNN-eNNN] \
  [--report-file <path.json>]
```

Examples:

```bash
node .claude/skills/rebrand-portal/scripts/assets/enrich-assets.js \
  --customer-key acme \
  --dry-run \
  --report-file .internal/acme-assets-report.json
```

```bash
node .claude/skills/rebrand-portal/scripts/assets/enrich-assets.js \
  --customer-key acme \
  --source-url https://www.acme.example/products \
  --report-file .internal/acme-assets-report.json
```

## Credentials

The tool reads existing Dynamic Media credentials:

- `SPARK_DM_CLIENT_ID`
- `SPARK_DM_CLIENT_SECRET`

Credential lookup order:

- environment variables
- `cloudflare/.secrets`
- `secret.env`

The tool does not use `AUTHOR_SPARK_IMS_TOKEN`.

## AEM APIs Used

Source-site uploads use the same repository upload flow as the AEM Assets UI:

```text
POST /adobe/repository/...;api=create
POST /adobe/repository/...;api=block_upload
PUT <presigned blob URL>
POST /adobe/repository/...;api=block_upload_finalize
```

Metadata reads and writes use Sling on the asset metadata node:

```http
GET /content/dam/<customerKey>/<asset>/jcr:content/metadata.json
POST /content/dam/<customerKey>/<asset>/jcr:content/metadata
```

The metadata POST uses a normal Sling form body:

```text
./productCategory=products
./company=acme
./dam:status=approved
./allowedCountries@TypeHint=String[]
./allowedCountries=global
```

The form is built after reading current metadata. Scalar fields are sent only when
missing. Multi-value fields use Sling's append mode when the asset already has values,
so existing keywords and country values are kept.

## Report

Use `--report-file` to write a JSON report.

Important fields:

- `counts`: enriched, skipped, and failed asset counts
- `assets`: per-asset outcome and failure reason
- `categoryCoverage.categories`: categories that have at least one asset
- `categoryCoverage.unclassified`: assets with no defensible category
- `representatives.items`: one usable asset per category for card imagery

Example:

```json
{
  "counts": { "enriched": 12, "skipped": 3 },
  "categoryCoverage": {
    "categories": [
      {
        "slug": "derived-slug",
        "label": "Derived Label",
        "assetCount": 12
      }
    ],
    "unclassified": []
  },
  "representatives": {
    "items": {
      "derived-slug": {
        "productCategory": "derived-slug",
        "assetId": "urn:aaid:aem:...",
        "assetPath": "/content/dam/acme/hero.jpg",
        "title": "Hero"
      }
    }
  }
}
```

## Not Used

- CSV metadata import
- `--write-mode`
- `--metadata-mode` (removed — there is one enrichment path, not a mode to select)
- `AUTHOR_SPARK_IMS_TOKEN`
- Assets Author metadata PATCH / JSON Patch
- strict `productCategory` or `channel` vocabulary flags
- `dam:roles` (rights/licensing metadata — never read or written by this tool)

## Tests

```bash
npx vitest run .claude/skills/rebrand-portal/tests/assets
```
