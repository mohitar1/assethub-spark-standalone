# Step 6 — Build collections from the searchable assets (`collections-created`)

Once Step 5's assets are searchable, turn them into **ready-made
collections** so the demo opens with the company's assets already
organized — one collection per category (the same `productCategory` slugs
the home cards and category coverage report use). Customer-facing wording stays
outcomes-only (I1): "grouping <Brand>'s assets into collections so they're
ready to browse by category." Runs **automatically after**
`assets-enriched` and `search-scoped` are `done` — do not wait for a
separate user request once assets are searchable. The assets must be
approved and index-visible before they can be collected. Leave
`collections-created` `deferred` only while `assets-enriched`/
`search-scoped` are themselves `deferred` (the customer chose to leave
enrichment for a later step — Entry flow Q2).

## Existing environment — no provisioning

Like Step 5, Step 6 **reuses the existing environment**. The controller
`.claude/skills/rebrand-portal/scripts/assets/create-collections.js` resolves everything itself: DM
technical-account creds from `cloudflare/.secrets` (`SPARK_DM_CLIENT_ID`/
`SPARK_DM_CLIENT_SECRET`) and the AEM env id from `cloudflare/src/config.js`
(`AEM_ENV_ID`). Collections live on the **delivery / Content Hub tier**, so
this uses the **DM collections API — not the author API** Step 5 writes
metadata with. It follows the worker's deterministic request contract:
asset search uses the DM client id as `x-api-key`, collection CRUD uses the
Content Hub collections key (`aem-assets-content-hub-1`), and the bearer
token always comes from the existing DM credentials. **No new collection
credential, no provisioning, no author writes.**

## Run the controller

```
node .claude/skills/rebrand-portal/scripts/assets/create-collections.js \
  --customer-key <companyKey> \
  [--display-name "<Company Display Name>"] \
  [--group-by productCategory|campaign|channel] \
  [--limit 200] [--min-assets 1] [--access-level public] \
  [--dry-run] [--report-file <path>] \
  [--secrets-file cloudflare/.secrets] [--fixture <assets.json>]
```

- `<companyKey>` is the same slug as Steps 2–5. The controller queries the
  DM asset search **scoped to `assetMetadata.company = <companyKey>`**
  (only this company's assets become members), groups the hits by
  `--group-by` (default `productCategory`), and creates one collection per
  distinct value titled `"<Company> — <Category>"`. **Always `--dry-run`
  first** — it enumerates the assets and prints the intended collections
  (title + asset count) without creating anything — then run live.
- `--display-name` sets the exact text used in place of `<Company>` in the
  title (e.g. `"URBN"`). Without it, the title falls back to title-casing
  `<companyKey>` (`urbn` → `"Urbn"`), which is usually wrong for
  all-caps/stylized brand names — pass `--display-name` whenever the
  company's real name doesn't title-case cleanly from its slug.
- Each collection is created `public` (every demo user sees it, not just
  the creator) and stamped `custom:metadata.company = <companyKey>`. That
  tag is what the company filter keys on (below). Assets with no
  `--group-by` value are skipped — no "uncategorized" collection.

## Hide/show collections by the company filter (`collections-created`)

Collections are scoped to the demo company exactly like assets. The worker
(`cloudflare/src/origin/dm.js` → `collectionsSearchContentAIAuthorization`)
injects, on **every** collections search, a
`collectionMetadata.custom:metadata.company = config.DEMO_COMPANY` clause —
mirroring the asset-side `assetMetadata.company` filter. So a demo only
ever surfaces the collections of the company `DEMO_COMPANY` points at;
switching `DEMO_COMPANY` (already set to `<companyKey>` in Step 4/5) hides
every other company's collections, and even admins don't see across
companies. This filter ships **in the same PR** as the rest of the scope
(`cloudflare/src/config.js` is already there), so the per-PR preview worker
enforces it — no extra deploy. The controller's `custom:metadata.company`
stamp and the worker clause use the **same `<companyKey>` value** by
construction; keep them equal.

**Every collection create and update is stamped — not just Step 6's.** The
worker injects `custom:metadata.company = config.DEMO_COMPANY` into the body of
any `POST /adobe/assets/collections` (create) **and** any
`POST /adobe/assets/collections/{id}` (metadata update) via dm.js →
`stampCollectionCompany`, so collections written through the portal UI or any
other client are company-scoped — and can never lose the tag through a later
update. Without this, a collection with no/overwritten company tag is hidden by
the search filter — reachable only by direct id ("unlisted"). Note: direct GET
of a collection by id is authorized by ACL/`accessLevel` only
(`checkCollectionAuthorization`), so a public collection stays reachable by link
even if its company tag differs — the company filter governs **listing/search**,
not direct-id reads.

## Verify (before marking Step 6 done)

Confirm the **visible outcome** in the running portal:

1. The Collections view lists the new `"<Company> — <Category>"`
   collections; opening one shows the expected assets (non-zero).
2. Each collection contains **only** this company's assets.
3. The collections belong to this company only — they show under the demo
   company and would be hidden if `DEMO_COMPANY` pointed elsewhere.

Mark `collections-created` `done` once all pass (skip and leave
`deferred` when enrichment itself is `deferred`).

**Completion report** (I1, outcomes only): which collections now exist and
what each groups; that they carry only this company's assets. The portal
link remains the deliverable (I3); never close/delete the PR (I5).
