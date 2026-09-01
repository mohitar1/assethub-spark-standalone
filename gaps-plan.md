# Demo Migration — Gaps Plan

Root causes and fixes for the demo customer-migration flow, verified against
live DA, the deployed Cloudflare worker, CI, and the code. Zero assumptions.

## Delivery model (CI-verified)

- Every PR runs `wrangler deploy --env branch` (`.github/workflows/build.yaml`):
  worker `spark-eds-pr-<N>`, route `<branch>.dev.frescopamedia.com/*`,
  `--var HELIX_ORIGIN:https://<branch>--<repo>--<owner>.aem.page`.
- **The demo URL is `https://<branch>.dev.frescopamedia.com`** — a worker host.
  That worker does login/auth, proxies `/api/adobe/*` search, and injects the
  `DEMO_COMPANY` asset scope from the **bundled `cloudflare/src/config.js`**.
  The raw `*.aem.page` is only its content origin (no auth/search there).
- DA content lives per **org/repo/path** and is **shared across all branches**,
  so a company copy must live under `/<company>/…` (cannot rebrand root `/en`
  without breaking `main`).

## The migration's fatal omission

The prior migration edited blocks/CSS/DA docs but **never touched `cloudflare/`**.
So the deployed PR worker still had `DEMO_COMPANY: 'frescopa'`, root-only routing,
and a root login page → company filter, preview, and login all broke.

## Single-key model

One value drives everything, set in the PR and baked into the deployed worker:

    config.DEMO_COMPANY === enrich customerKey === content base folder /<companyKey>

## Gaps and fixes (file-by-file)

### G1 — Company filter absent -> cloudflare/src/config.js
- Set `DEMO_COMPANY: '<companyKey>'`. `dm.js` `buildAssetAuthClauses` already
  injects `{ term: { 'assetMetadata.company': [config.DEMO_COMPANY] } }` into
  every ContentAI search. This alone restores the company filter.

### G2 — Preview + login broken -> worker base-path awareness
DA copy lives under `/<company>/…`, but the worker serves root. Drive the base
from the same `DEMO_COMPANY`:
- `cloudflare/src/config.js`: add helper `companyBasePath()` -> `/${DEMO_COMPANY}`
  (empty when unset, for the root site).
- `cloudflare/src/index.js`: redirect `/` and `/<company>` -> `/<company>/en/`;
  route `/<company>/*` through helix + auth.
- `cloudflare/src/auth.js`: `LOGIN_PAGE = ${base}/public/welcome` (derive).

### G3 — Navigation escapes /company -> scripts/locale-utils.js
- Base detection: if `segment[1]` is not a supported locale but `segment[2]`
  is, treat `segment[1]` as the base prefix.
- `getLocalePrefixFromPath()` returns `base + '/' + locale`.
- All consumers (`localizePath`, `fetchSpreadsheetData`, header/footer/search)
  inherit it -> links, `/configs`, labels stay inside `/<company>`.
- Backward compatible: root site (segment[1] is a locale) unchanged.

### G4 — Empty /company/public, /company/config -> scripts/da-copy-folder.sh
- Replace count-only verification with **path-by-path**: every source doc must
  have a `/<company>/…` counterpart; fail (exit 4) listing any missing. Copies
  every top-level folder incl. `public` (login) and `config`, `.docx` included.

### G5 — Login page not rebranded -> SKILL.md Step 4 scope
- Add `/<company>/public/welcome` and `/<company>/config` to the scoped rebrand
  page-list; publish them with the rest.

### G6 — Assets unfiltered -> SKILL.md Step 5 (enrich), single-keyed
- Run `enrich-assets.js` with `customerKey = DEMO_COMPANY`. Assets get
  `assetMetadata.company = <companyKey>`; the worker scope shows exactly them.
  Required for a complete demo.

### G7 — Skill flow + evals
- New mandatory step "Apply worker + routing config" between rebrand and publish:
  set `config.DEMO_COMPANY`, verify base-routing/login/locale-utils use the same
  key. State schema: add `demo-company-set`.
- Hardening gate: assert `config.DEMO_COMPANY === companyKey === enrich
  customerKey`; assert the PR diff **touches `cloudflare/src/config.js`** (the
  check that was missing).
- Evals: (a) PR modifies `DEMO_COMPANY` to companyKey; (b) `localizePath`
  returns `/<company>/en/…`; (c) copy fails when a source subtree is missing at
  dest; (d) login page copied+published under `/<company>/public`; (e) worker
  scope value === companyKey.

## Order

1. G4 copy hardening -> re-copy to backfill /company/public + /company/config.
2. G1 + G2 + G3 (functional unblock).
3. G5 rebrand+publish login page.
4. G6 enrich assets.
5. G7 skill + evals.
