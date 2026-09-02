# Step 5 — Upload and enrich the company's assets

## Step 5 preflight — rebrand verification gate

Before any `--dry-run` or live asset enrichment, assert all of these are
true in the current session: Step 4g passed on the deployed PR worker;
`cloudflare/src/config.js` is scoped to the company; the
**background-color applied check passed with zero mismatches** across all
landmark selectors (not just eyeballed — the computed-vs-expected diff
from Step 4g); the old cream/filter values and old action reds are gone or
intentionally justified; the facets panel computed background and
secondary hover state use the new semantic palette. If any check is
missing or stale, go back to Step 4g and leave the asset steps pending.
Do not treat asset enrichment as a way to "move forward" past an
unverified rebrand.

Make the customer's own assets show up in the portal and be **findable** —
searchable by what's written about each and filterable by facets
(Category, Campaign, Channel, Keywords) — and scope the portal to show
**only** this company's assets. Customer-facing wording stays outcomes-only
(I1): "bringing in <Brand>'s assets and making them easy to find by
searching and filtering on what's in each one." Two lanes:

- **Enrich-existing (default)** — the assets already sit in the company's
  AEM folder; this labels them so they surface in search and facets.
- **Bring-in (opt-in)** — the customer named a source website; pull sample
  images and linked documents from it into the folder first using the AEM UI's
  repository blob-upload API, then label them the same way.

## Existing environment — no collection, no provisioning

Step 5 **reuses the existing environment**. The asset controller
`.claude/skills/rebrand-portal/scripts/assets/enrich-assets.js` resolves everything itself at call time:

- **Credentials** from `cloudflare/.secrets` (`SPARK_DM_CLIENT_ID`,
  `SPARK_DM_CLIENT_SECRET`)
  — the existing repo already has these. **No new secret, no credential
  collection, no tier/boot/deploy.**
- **AEM env id** from the repo's own config
  (`cloudflare/src/config.js` → `AEM_ENV_ID`), via `resolveAemEnvId`.

If `cloudflare/.secrets` is missing the DM creds, the script errors
clearly — in that case ask the customer to fill `cloudflare/.secrets` per
`cloudflare/.secrets.example` (I2 — they add it themselves; never paste in
chat). **Do not** run any backend-onboarding/boot flow — that is the
disabled dedicated path.

## Run the controller

```
node .claude/skills/rebrand-portal/scripts/assets/enrich-assets.js \
  --customer-key <companyKey> \
  [--dam-path /content/dam/<companyKey>] \
  [--source-url <url>] \
  [--dry-run] [--force] \
  [--report-file .internal/<companyKey>-assets-report.json] \
  [--secrets-file cloudflare/.secrets]
```

- `<companyKey>` is the same slug as Steps 2–4 (`customer.companyKey`) —
  it drives both the DAM folder `/content/dam/<companyKey>` and the
  `company` scope value; they are the same value by construction. The
  controller rejects reserved route keys and any `--dam-path` outside
  `/content/dam/<companyKey>`.
- Default lane is enrich-existing; `--source-url <url>` selects the
  source-site lane (auto-creates the folder through
  `/adobe/repository/content/dam;api=create;path=<companyKey>;intermediates=true`,
  then uploads each file with the repository create → block_upload →
  presigned-blob PUT → block_upload_finalize flow captured from the AEM UI
  HARs). **Always `--dry-run` first**
  (scrape/enumerate → read Sling metadata → generate → categorize → plan
  Sling metadata writes, without writing) — review `categoryCoverage` and
  `representatives.items` — then run live. `--force` reprocesses already
  enriched assets but still never overwrites existing metadata. See
  `.claude/skills/rebrand-portal/docs/asset-enrichment.md` for the full flag list and offline `--fixture`
  mode.

**Do not give up on an EDS/AEM site after a plain `<img>` scrape.** The
packaged scraper extracts images from `og:image`/`twitter:image`,
`<img src|data-src|srcset>`, `<source srcset>`, and direct
`<a href="*.jpg|*.png|*.webp|...">` links, which covers EDS raw/
pre-decoration markup where authored images are links before block
decoration. If bring-in returns zero or too few downloads, report the exact
candidate/download counts and the failure reason (no candidates, blocked
download, tiny/thumbnail-only, non-image response). Ask for a different
source URL only after that diagnosis; do not stop at "try more URLs" when
the current page exposes direct image asset links.

**Bot-protected source site (403 on a plain fetch) — a named fallback,
not a one-off workaround.** Some source sites block non-browser HTTP
clients outright (verified live: a 403 that a browser-like User-Agent
header alone did not fix, indicating TLS-fingerprint/JS-challenge bot
protection, not just a missing header). When the scraper's plain fetch is
blocked this way, use a real browser session (e.g. a Playwright MCP tool,
if available in this session) to load the page and capture its rendered
HTML, then feed that HTML into the scraper's own exported extraction
functions (`extractPageEvidence`, `extractAssetUrls`,
`resolveOriginalUrl`, `fileNameFromUrl` in `scrape-site.js`) instead of
re-fetching the page. This reuses the packaged evidence/extraction logic
exactly as-is — only the page-fetch step changes — so category/keyword
evidence stays consistent with the normal path. Do not conclude a
bot-protected source site can't be scraped at all; this fallback is the
expected next step, not an improvisation to invent fresh each time.

**There is one enrichment path — no mode flag to choose between.** Before
reading any asset's metadata, the controller waits for AEM's own
asset-processing pipeline (thumbnail rendition, metadata extraction, smart
tagging) to finish: it polls Sling metadata until `dam:assetState` reaches
`processed` (bounded — a stuck pipeline fails that asset with a clear
`stage: plan` error rather than hanging or silently guessing from
incomplete data). Once processed, the primary evidence for `dc:title`,
`dc:description`, and `dc:subject` keywords is AEM's own generated
`autogen:title`/`autogen:description`/`autogen:subject` fields — real
signal from AEM's asset processing, not a guess. Filename tokens and
`xcm:machineKeywords` hints are last-resort only, used per-field when the
corresponding `autogen:*` value is still empty after processing.
`productCategory` is assigned separately from existing metadata and
source-site evidence, now including `autogen:subject` as a high-confidence
signal (see `docs/asset-enrichment.md`). `company`, `dam:status=approved`,
and `allowedCountries=["global"]` are stamped by the controller only when
missing.

**Never read or write `dam:roles`.** It is rights/licensing metadata, not
a classification or title/description signal — do not reference it in
generated metadata, category assignment, or this skill's own docs.

The controller does the per-asset work (bounded concurrency, idempotent):
**`assets-uploaded`/`assets-enriched`** — for each asset it generates a
title, description, keywords and, where inferable, category/campaign/
channel, stamps the company scope value, stamps
**`allowedCountries=["global"]`**, marks it approved, writes missing
metadata through Sling on
`/content/dam/<companyKey>/<asset>/jcr:content/metadata`, and relies on
**`dam:status=approved`** for Delivery visibility. Metadata auth uses only
the IMS bearer minted from `SPARK_DM_CLIENT_ID` and
`SPARK_DM_CLIENT_SECRET`; do not use the Assets Author metadata PATCH API
or a separate metadata API key. Do not run a separate asset publish stage.
The `allowedCountries=global` stamp is not optional:
the worker's country authz clause
(`cloudflare/src/origin/dm.js`) hides any asset whose `allowedCountries`
doesn't include the viewer's country, so an untagged asset returns **0
results** for a country-scoped user (verified-broken live). Every enriched
asset is tagged `global` so it is visible regardless of country.

**Category consumes the Step 4 contract — one vocabulary, mandatory
assignment.** Pass the source-derived contract in via `--categories
<slug1,slug2,...>`. It is the single shared vocabulary: homepage cards, facet
links, asset `productCategory`, and collections all use these slugs. There is
**no hardcoded keyword table** (a fixed list can't be generic across
verticals) and no second list to keep in sync. Every asset is mapped to
**exactly one** contract category from its real metadata
(`autogen:subject`/`predictedTags` smart tags, `dc:*`, generated
title/description/keywords, filename, source page) — a low-confidence mapping
is preferred over a blank card, so there is no "unclassified/FAILED" bucket in
normal operation. Because assignment is mandatory, every populated contract
category has a representative and the card set is complete. A contract category
that ends up with zero assets fails the **card gate** (below) — widen source
discovery rather than shipping an empty card.

## Author the landing cards from `report.cards`

This is part of **Step 5**, not a new Step 5.5. Asset metadata alone does not
change the copied landing page's category cards — those are authored page
cells. The enrichment run emits everything needed as **`report.cards`** (one
row per contract category: `label`, `blurb`, `href`, `cardImageUrl`). Author
the landing page directly from it — no hand-built URLs, no per-run improvising.

**Preserve the existing block structure; only regenerate its rows.** The
copied `/<companyKey>/en/index` already carries the landing blocks:
`<div class="carousel tiles">` for "Browse by category" (N slides, paginated)
and `<div class="cards">` for the secondary "Top" section. Both are already
generic in count and already wire whole-card clickability off each tile's
link — do **not** replace them with a bare `cards` block or a link-less
section (that is exactly what produced blank/dead tiles). Use
`.claude/skills/rebrand-portal/scripts/assets/update-index-cards.js`
(`updateIndexCards(indexHtml, report, { topAreasCount })`) to rewrite each
block's rows from `report.cards`, keeping the wrappers. Each row is authored in
the exact shape the base index uses: image cell (col 0) + heading + blurb +
facet `Browse →` link (col 1).

- **Count is whatever the contract yields** — the carousel absorbs any N.
  There is no fixed 5/2 target. The **card gate** in the enrichment run already
  fails when a contract category has zero assets or fewer than `MIN_CARDS`
  cards exist, so a sparse page can't ship; fix coverage (widen source
  discovery / the contract) rather than authoring a thin grid.
- Every card row has a facet `href` and a `cardImageUrl` by construction (the
  gate enforces it) — a card can't be link-less or image-less.
- The card href facet slug equals the asset's `productCategory` (both are the
  contract slug); never rewrite only the visible label.
- **Images are the worker proxy path, never a raw delivery URL.**
  `cardImageUrl` is `/api/adobe/assets/<assetId>/as/<fileName>.jpg?width=<N>`
  (the exact pattern `blocks/search-results/components/picture.js` produces) —
  relative, authenticated via the visitor's session cookie. A raw
  `https://delivery-*.adobeaemcloud.com/adobe/assets/...` URL 404s for every
  real visitor; the report never emits one. (`blocks/cards/cards.js` leaves
  `/api/adobe/assets/` images untouched so they aren't re-optimized into a
  broken Helix URL.)

Publish the updated company-scoped `/<companyKey>/en/index` after rewriting the
rows. The visible outcome is real customer imagery on every landing card —
carousel and secondary section — each clickable to a non-zero facet search.

## Scope the portal to this company (`search-scoped`)

So the demo shows **only** this company's assets, the scope lives in
`cloudflare/src/config.js`: `DEMO_COMPANY: '<companyKey>'` (search filter)
and `DEMO_BASE_PATH: '/<companyKey>'` (routing/login base) — default
`null`/`''` = unchanged. `.claude/skills/rebrand-portal/scripts/assets/enrich-assets.js` writes both keys
automatically during enrichment; if Step 4 already set them (it should),
confirm they equal `<companyKey>`. The worker injects a
`company = <companyKey>` filter into every search. **This edit must be in
the PR** — the per-PR preview worker (I3) is built from this file, so it is
what scopes the shared preview URL, not just local dev. It also applies
locally on the next `npm run dev` restart. No production merge /
`wrangler deploy` is needed — the PR's own worker deploy already serves
it.

## Verify (before marking Step 5 done)

Confirm the **visible outcome** in the running portal, not just that calls
returned success:

1. Searching words from an asset's generated title/description returns it.
2. Open the Category filter (and Campaign/Channel/Keywords if configured)
   and confirm buckets exist for the written values with **non-zero
   counts** — e.g. `Movies & Shows (N)`, `N ≥ 1`, not `(0)`. A bucket
   stuck at `(0)` after labelling/approval is this step's known failure
   (values not written, not indexed, or the asset is not visible) — confirm
   the assets carry `company`, `productCategory`, `dam:status=approved`, and
   `allowedCountries=global`, then retry after indexing.
3. **Every category card is a live, non-zero bucket.** For each card in
   `report.cards`, click it on the preview and confirm it returns **> 0**
   assets (not the "coffee (0)" failure). The card gate already blocks a
   zero-asset contract category, so a `(0)` here means a coverage/indexing
   drift — confirm the assets carry `company`, `productCategory`,
   `dam:status=approved`, `allowedCountries=global`, then retry after indexing.
4. **Card visuals are real customer assets.** Every card (carousel and the
   secondary section) uses its `cardImageUrl` from `report.cards`; no
   base-brand placeholder icons, stale imagery, or missing-image circles
   remain. Each card image belongs to the same category the card links to.
5. **Every landing tile — carousel and secondary — is authored from
   `report.cards`.** The page carries exactly the two canonical blocks
   (`carousel tiles` + `cards`), both regenerated from the report; there are
   no ad-hoc, hand-authored card sections. Inventory every tile on the
   published homepage and confirm each has a real (non-blank, non-broken)
   image and a working facet href that does not 404 or point at `#`.
6. **Country visibility.** Read one enriched asset's metadata and confirm
   `allowedCountries` includes `global`; confirm a country-scoped demo user
   (not just an admin) gets non-zero search results.
7. Filtering by a bucket narrows results to matching assets, and only this
   company's assets appear.

Mark `assets-uploaded`, `assets-enriched`, `search-scoped` `done` once all
pass.

**Completion report** (I1, outcomes only): which assets are now in the
portal and searchable; that filtering works (name the facets that lit up);
that the demo shows only this company's assets; any per-asset items that
couldn't be brought in. Do not stop here for `full` or `assets-only` flows:
continue directly to Step 6 and create the ready-made collections. The demo
is shareable **without merging** — the portal link serves the rebranded,
company-scoped portal; that link is the deliverable. Promoting to production
(merge) is optional and not the finish line (I3); never close/delete the PR
(I5).
