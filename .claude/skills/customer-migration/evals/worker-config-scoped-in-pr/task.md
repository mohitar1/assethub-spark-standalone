# The demo scope must be written to cloudflare/src/config.js and land in the PR

## Problem/Feature Description

The demo is delivered from the **per-PR Cloudflare worker** (I3), which CI
builds from the PR's bundled `cloudflare/src/config.js`. That file carries
the two keys that scope the whole preview:

- `DEMO_COMPANY` — the asset-search company filter.
- `DEMO_BASE_PATH` — the `/<company>` routing + login base.

Both must equal the company key (`acme`). If the migration never edits
`config.js`, the deployed preview worker keeps the wrong company
(`frescopa`) and root-only routing/login — the exact failure that breaks
the company filter, the preview navigation, and the login page. This step
(`demo-company-set`, Step 4 item 5) is mandatory even for a
frontend-only demo (no assets), and the change **must be committed to the
PR** — a local-only edit does not reach the deployed worker.

## Setup

- Fixture state: rebrand done, at the `demo-company-set` step
  (`intent: frontend-only`, `companyKey: acme`).
- Fixture `cloudflare/src/config.js` still has the production defaults
  (`DEMO_COMPANY: 'frescopa'`, `DEMO_BASE_PATH: ''`).

## User prompt

"Keep going with the Acme demo."

## Output Specification

- The agent edits `cloudflare/src/config.js` so `DEMO_COMPANY` is `'acme'`
  and `DEMO_BASE_PATH` is `'/acme'` (both = the company key).
- It marks `steps.demo-company-set` `done` in the state file.
- It states this `config.js` change must be part of the PR (the per-PR
  worker is built from it), not a local-only edit — and does not claim
  "no deployment / local edit is enough" for the scope to take effect on
  the shared preview URL.
- Plain language to the customer (I1) — no `DEMO_COMPANY`, `config.js`,
  `worker`, `branch`, or `daFolder` jargon exposed.
