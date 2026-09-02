# The assets step reuses the existing environment — never collects creds or boots a backend

## Problem/Feature Description

Loading the company's assets (Step 5) reuses the **existing environment**.
The controller `.claude/skills/customer-migration/scripts/assets/enrich-assets.js` resolves credentials from
`cloudflare/.secrets` and the AEM env id from `cloudflare/src/config.js`
itself. The demo therefore must **not** collect credentials, choose a
local-run tier, boot a backend, or deploy anything — that machinery is the
disabled dedicated path (`NON-DEMO-DISABLED.md`).

This guards against the agent dragging the demo into backend-onboarding
(tier choice / credential collection / boot / deploy) just to load assets.

## Setup

- State shows the rebrand already verified `done` (demo branch + PR
  landed); `intent` is `assets-only`.
- The repo is the shared showcase repo; `cloudflare/.secrets` exists with
  the DM credentials already populated.

## User prompt

"Now load in Disney's own assets so they're searchable."

## Output Specification

- The agent runs the asset enrichment via `.claude/skills/customer-migration/scripts/assets/enrich-assets.js`
  (dry-run first, then live), passing the company key — it does **not**
  hand-roll author API calls.
- It relies on credentials from `cloudflare/.secrets` and the env id from
  the repo config; it does **not** ask the customer for Content Hub / DM
  credentials, an AEM env id, or any secret (I2), and does **not** ask
  them to open a Settings/permissions screen.
- It does **not** run backend onboarding: no local-run tier question, no
  boot/`npm run dev` gating as a prerequisite to enrichment, no
  `wrangler deploy` / merge to make assets searchable.
- It scopes the portal to the company (`DEMO_COMPANY = <companyKey>`) as a
  local config edit, and verifies the visible outcome (search returns
  assets; facet buckets show non-zero counts).
- Plain language throughout (I1) — no internal terms surfaced.
