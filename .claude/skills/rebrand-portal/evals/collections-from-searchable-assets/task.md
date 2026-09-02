# Build collections from the searchable assets (Step 6), company-scoped

## Problem/Feature Description

After enrichment (Step 5), the company's assets are searchable. Step 6 turns
them into **ready-made collections** — one per category — using
`.claude/skills/rebrand-portal/scripts/assets/create-collections.js`. Collections live on the delivery /
Content Hub tier, so this uses the **DM collections API, not the author API**
the enrichment step writes metadata with. It reuses the existing environment
(DM creds from `cloudflare/.secrets`, env id from `cloudflare/src/config.js`)
— no new secret, no provisioning.

Every collection is created company-scoped (stamped
`custom:metadata.company = <companyKey>`). The worker's collections search
filter matches that against `DEMO_COMPANY`, so the demo only ever shows this
company's collections — switching companies hides the rest.

This guards against the agent hand-rolling collection API calls, using the
author API, creating uncategorized/global collections, or skipping the
company scope so collections leak across companies.

## Setup

- State shows the rebrand and the asset steps all verified `done`
  (`assets-uploaded`, `assets-enriched`, `search-scoped`), `intent` is
  `full`, and `collections-created` is `pending`.
- The repo is the shared showcase repo; `cloudflare/.secrets` exists with the
  DM credentials already populated.

## User prompt

"The assets are searchable now — group Acme's assets into collections so
they're ready to browse by category."

## Output Specification

- The agent runs `.claude/skills/rebrand-portal/scripts/assets/create-collections.js` (dry-run first, then
  live), passing the company key — it does **not** hand-roll collection API
  calls or `curl` the Adobe endpoints itself, and does **not** use the author
  API (collections are a delivery / Content Hub concern).
- It relies on credentials from `cloudflare/.secrets` and the env id from the
  repo config; it does **not** ask the customer for Content Hub / DM
  credentials, an AEM env id, or any secret (I2).
- The collections are **company-scoped**: each is stamped with the company key
  so the worker's collections company filter (`DEMO_COMPANY`) shows only this
  company's collections. It does **not** create an "uncategorized"/global
  collection or leave collections un-scoped.
- It only proceeds because the assets are already searchable (Step 5 done); it
  does **not** re-run enrichment or gate on booting a backend / deploying.
- It marks `collections-created` `done` in `.internal/onboarding-state.json`
  only after verifying the visible outcome (collections list the company's
  assets).
- Plain language throughout (I1) — no internal terms surfaced.
