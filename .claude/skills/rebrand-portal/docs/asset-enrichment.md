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

There is **one category vocabulary**: the source-derived contract the migration builds at
Step 4 (a shared set of `{slug, label}` used by homepage cards, facet links, asset
`productCategory`, and collections). There is **no hardcoded keyword table** — a fixed
vocabulary can never be generic across verticals (a retail term list silently drops every
pharma/finance asset, which is exactly the bug this replaced).

Each asset is mapped to **exactly one** contract category (mandatory — a low-confidence
mapping is preferred over a blank/missing card). Assignment order:

- existing contract-valid `productCategory` (kept as-is)
- a generated `productCategory` that is already a contract slug
- otherwise a **classifier** maps the asset's real metadata — AEM's own
  `autogen:subject`/`predictedTags` smart tags, `dc:title`/`dc:description`/`dc:subject`,
  generated title/description/keywords, filename, and source-page evidence — onto the
  nearest contract slug. The classifier is dependency-injected: the live path uses the
  agent/LLM (which maps e.g. "psoriasis" → dermatology trivially); the offline default and
  fallback is a deterministic token-overlap classifier over the contract.

The contract is passed in via `--categories <slugs>` (or `options.categoryContract`); it is
never invented inside the tool. Because assignment is mandatory, every populated contract
category has a representative asset, so the homepage card set is complete and non-sparse. A
contract category that ends up with **zero** assets fails the card gate (below) — the
workflow widens source discovery rather than publishing an empty card.

## Command

```bash
node .claude/skills/rebrand-portal/scripts/assets/enrich-assets.js \
  --customer-key <customerKey> \
  --categories <slug1,slug2,...> \
  [--dam-path /content/dam/<customerKey>] \
  [--source-url <url>] \
  [--dry-run] [--force] \
  [--concurrency <n>] \
  [--limit <n>] \
  [--secrets-file cloudflare/.secrets] \
  [--aem-env-id pNNN-eNNN] \
  [--report-file <path.json>] \
  [--org <githubOrg>] [--repo <githubRepo>] [--da-token-file token.env]
```

`--org`/`--repo` (the same GitHub org/repo as the DA content, resolved from
the git remote) and `--da-token-file` (default `token.env`) enable card-image
upload to DA (`da-card-images.js`). Without them, card images are skipped and
the card gate fails on missing images — pass these whenever cards need to be
authored.

`--categories` is the source-derived category contract from Step 4 (comma-separated slugs,
e.g. `--categories dermatology,cancer,diabetes,obesity,alzheimers`). Every asset is mapped
into exactly one of these; the card set and collections use the same slugs.

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
- `representatives.items`: one usable asset per category — includes `cardImageUrl`, a
  DA-hosted page-image source URL (uploaded by `da-card-images.js` from the asset's real
  bytes), used directly in `<picture>/<img>` card markup
- `cards`: **ready-to-author landing card rows**, one per contract category. Each row has
  `label`, `blurb`, `href` (facet-filter search URL), and `cardImageUrl`. The landing page
  edit consumes these directly — no URL construction by hand, no raw delivery host, and
  never the worker's `/api/adobe/assets/...` proxy (verified broken for a statically
  published card — it depends on the visitor's session cookie, which a published DA doc
  never has).

**Card gate.** After building `cards`, the tool fails (non-zero exit) unless every contract
category has ≥1 asset, at least `MIN_CARDS` (5) cards exist, and every card row has both an
`href` and a `cardImageUrl`. A card cannot exist without a facet link and an image — this
structurally prevents the "blank tile / dead un-clickable card" failure. The floor is hard:
5 real, source-derived categories minimum, both at Step 4's initial contract proposal and
here at Step 5's post-enrichment gate. A zero-asset category is not simply dropped if that
would breach the floor — widen source discovery for a real replacement first; a clearly-
flagged placeholder category is only a last resort once real discovery is genuinely
exhausted, and only after asking the user.

Example:

```json
{
  "counts": { "enriched": 12, "skipped": 3 },
  "categoryCoverage": {
    "categories": [{ "slug": "derived-slug", "label": "Derived Label", "assetCount": 12 }],
    "unclassified": []
  },
  "representatives": {
    "items": {
      "derived-slug": {
        "productCategory": "derived-slug",
        "assetId": "urn:aaid:aem:...",
        "assetPath": "/content/dam/acme/hero.jpg",
        "repoName": "hero.jpg",
        "title": "Hero",
        "cardImageUrl": "https://content.da.live/org/repo/acme/en/media_derived-slug.jpg"
      }
    }
  },
  "cards": [
    {
      "slug": "derived-slug",
      "label": "Derived Label",
      "assetCount": 12,
      "blurb": "Derived Label product and campaign imagery.",
      "href": "/en/search?facetFilters=%7B%22productCategory%22%3A%7B%22derived-slug%22%3Atrue%7D%7D",
      "cardImageUrl": "https://content.da.live/org/repo/acme/en/media_derived-slug.jpg"
    }
  ]
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
