# Customer-Migration Demo — Gaps Plan (Round 3)

Debugged live against the `volkswagen` demo on
`demo-volkswagen.dev.frescopamedia.com`
(branch `demo/volkswagen` → `demo-volkswagen--assethub-spark-standalone--mohitar1.aem.page`),
PR https://github.com/mohitar1/assethub-spark-standalone/pull/4.

**Scope of this round:** DEBUG + PLAN only. No product-code changes. All
fixes land in the **skill** (`SKILL.md`), the **migration scripts**
(`scripts/agent/*`, `scripts/da-copy-folder.sh`), and **hardening**
(verification gates + the publish/residue checks). Each gap below records
the *proven* root cause (fetched from the live portal, not assumed) and the
exact prescribed change.

---

## Gap 1 — Brand logo missing (login page, header, browser-tab favicon)

### Proven root cause
Fetched the three published company-scoped docs on the branch:

- `…/volkswagen/en/nav.plain.html`
  → `<span class="icon icon-frescopa-icon"></span>`  ← base shortcode, NOT swapped
- `…/volkswagen/en/footer.plain.html`
  → `<span class="icon icon-frescopa-icon"></span>`  ← NOT swapped
- `…/volkswagen/public/welcome.plain.html`
  → `<span class="icon icon-frescopa-beans"></span>` ← NOT swapped (the coffee-bean login logo in the screenshot)

Repo favicon is unchanged: `favicon.svg` is the Fréscopa bean
(`aria-label="Frescopa"`, `fill="#eaa33a"`); `head.html` hardcodes
`/favicon.svg` + `/favicon.ico`, so the browser-tab icon stays base-brand.

The header logo renders as an **empty circle** because the volkswagen icon
never existed — the `icon-frescopa-icon` shortcode survived and there is no
`/icons/volkswagen-icon.svg` to resolve it. The SKILL already mandates a
logo swap + a "zero-residue" grep (Step 4b item 2 + Step 4g), but it was
neither executed nor enforced.

### Fix (skill + hardening — no code)
1. **SKILL Step 4b, make the logo swap a hard, self-contained sub-step
   (`logo-swapped`), not a bullet inside the delegation.** It must:
   - Obtain a real brand mark for the company: fetch the source site's
     logo/favicon (the `--source-url` already given for the look), or, if
     none, generate a minimal wordmark SVG. Register it as
     `/icons/<companyKey>-icon.svg` (and a matching `…-beans`/mark variant
     if the base uses more than one shortcode).
   - Replace the icon **shortcode in every copied DA doc** —
     `/<companyKey>/en/nav`, `/<companyKey>/en/footer`,
     `/<companyKey>/public/welcome` — swapping `:frescopa-icon:` /
     `:frescopa-beans:` → `:<companyKey>-icon:` (never leave a base
     shortcode; never leave a shortcode that points at a missing icon).
   - Replace the repo **`favicon.svg` and `favicon.ico`** with the brand
     mark (branch-global assets; `head.html` root refs are fixed, so
     replacing the files rebrands the tab icon). Do not edit `head.html`.
2. **Hardening — extend Step 4g "Brand-residue check on copied DA docs":**
   after publish, fetch nav + footer + welcome and assert **zero**
   `icon-frescopa` / `frescopa` shortcodes remain, AND that each remaining
   icon shortcode resolves to an existing `/icons/<companyKey>-*.svg`
   (guards the empty-circle failure). Assert `favicon.svg` no longer
   contains the base marker (`aria-label="Frescopa"` or `#eaa33a`).
   Screenshot the login page + header at the preview URL and confirm the
   brand mark renders (not an empty circle, not a coffee bean).

---

## Gap 2 — Enriched assets must be tagged `allowedCountries=global`

### Proven root cause
The worker (`cloudflare/src/origin/dm.js`, ~L587–612) injects a country
authz clause: it builds `authorisedCountries` from the user's country
(JWT `ctry` / users-sheet) plus the `global` sentinel and, unless the only
value is `global`, adds
`{ term: { 'assetMetadata.allowedCountries': authorisedCountries } }`.
`scripts/agent/enrich-assets.js` stamps only
`scope = { company: customerKey, status: 'approved' }` — it **never sets
`allowedCountries`**. So an enriched asset carries no country tag; a demo
user who has any country sees **0 results** (the "0 Total" in the
screenshot). There is no `ALLOWED_COUNTRIES` key in
`scripts/agent/constants.js` `FIELD`.

### Fix (scripts + hardening — no product code)
1. `scripts/agent/constants.js` `FIELD`: add
   `ALLOWED_COUNTRIES: 'allowedCountries'`.
2. `scripts/agent/enrich-assets.js`: stamp it in the controller scope —
   `const scope = { company: customerKey, status: STATUS_APPROVED, allowedCountries: 'global' };`
   (mirrors the existing "stamped by the controller, never the model" rule).
3. Wire the scope key through both write paths:
   - `scripts/agent/csv.js` `COLUMN_REGISTRY`: add
     `{ key: 'allowedCountries', header: \`${FIELD.ALLOWED_COUNTRIES}[string]\` }`.
   - `scripts/agent/json-patch.js` `buildMetadataPatch`: after the company
     op, add
     `if (scope.allowedCountries) ops.push(addOp(FIELD.ALLOWED_COUNTRIES, scope.allowedCountries));`.
   (Single-value `'global'` matches the worker's `term` clause; keep it a
   plain string to match the `global` sentinel semantics.)
4. **SKILL Step 5:** document that every enriched asset is stamped
   `allowedCountries=global` so it is visible regardless of the viewer's
   country; note it in the dry-run preview review.
5. **Hardening (Step 5 verify):** after enrich+publish, read one enriched
   asset's metadata and assert `allowedCountries` contains `global`; and
   confirm a country-scoped demo user gets **non-zero** search results
   (not just HTTP 200).

---

## Gap 3 — Home + filter backgrounds must match brand colors

### Proven root cause
The rebrand changed the primary/accent (navy buttons) but the home hero and
the **filter/facets panel** keep the base cream/beige surface (screenshots
g4/g5, and the tinted "Filters" panel in g1). This is exactly the
"background/surface tokens + decorative brand background" case Step 4b item
1 warns about, but the sweep in Step 4g is described loosely and missed it.

### Fix (hardening — no code)
Make the color sweep name the **background/surface** targets explicitly and
run it against the **preview URL** as a required pass:
- Add background/surface tokens to the old→new hex map and grep them across
  `styles/*.css`, `blocks/**/**.css` (esp. the search-results **facets/
  filter panel** CSS and the home hero/section backgrounds).
- Screenshot the home hero AND the open filter panel at the preview and
  confirm both read as the new palette (no surviving cream surface, no
  decorative base-brand background SVG). Fix + re-run until clean.
- Fail the `rebranded` step if any base surface token or decorative base
  background asset survives.

---

## Gap 4 — Filter values must match what the agent applies on assets

### Proven root cause (strongest finding)
The home "Browse by category" cards were rebranded **visually only**. Their
hrefs still carry the **base Fréscopa** `productCategory` slugs
(`…/volkswagen/en/index.plain.html`):

| Card label (rebranded) | href `facetFilters` slug (NOT rewritten) |
|------------------------|-------------------------------------------|
| Sedans                 | `productCategory:coffee`                  |
| SUVs                   | `productCategory:machine`                 |
| Accessories            | `productCategory:accessory`               |
| Lifestyle              | `productCategory:lifestyle`               |
| Performance            | `productCategory:machine`                 |

So clicking "Sedans" filters `productCategory:coffee` → 0 results (g1). Two
compounding faults: (a) the content rewrite changed the label text but not
the facet slug in the href; (b) `enrich-assets.js` generates **free-text**
`productCategory` from image analysis, so even a correct href wouldn't
match unless the two are reconciled.

### Fix (skill + scripts coordination — no product code)
Establish a **single source of truth** for the company's category set and
use it on both sides:
1. **SKILL Step 4 content-rewrite:** the rewrite MUST update the
   `facetFilters` `productCategory` (and campaign/channel) slugs inside the
   category-card hrefs (and any curated filter links) — not just the visible
   label. The new slugs are the company's real categories
   (e.g. `sedan`, `suv`, `accessory`, `lifestyle`, `performance`).
2. **SKILL Step 5 enrich:** run with
   `--product-category-vocab "<that exact list>"` so
   `normalize.js` maps each asset's `productCategory` into the SAME slugs
   the cards link to. (The vocab path already exists; make it mandatory
   whenever curated category cards exist, instead of the free-text default.)
3. **Hardening (Step 5 verify):** for every category-card href, assert its
   `productCategory` slug appears as a **non-zero** facet bucket after
   enrich+publish; fail the step if any card yields `(0)`. This directly
   catches the "coffee (0)" failure.

---

## Gap 5 — Navigation: clicking the logo 404s (ignores company folder)

### Proven root cause
`…/volkswagen/en/nav.plain.html` logo link:
`<a href="file:////en/"><span class="icon icon-frescopa-icon"></span></a>`,
and it sits inside `<div data-role="tools">` — **not** `.nav-brand`.
`blocks/header/header.js` normalizes `file://` → `/en/` (L341–345) but only
re-scopes links inside `.nav-brand`/`.nav-sections` via `localizePath`
(L356–375); a **tools** link is left untouched. Result: the logo points at
`/en/`, which is outside `/volkswagen/` → the worker serves `/404.html`
(screenshot g2). The footer links were correctly authored as
`/volkswagen/en/about`, so this is a **content** defect in the copied nav
doc, not a code bug — no code change is warranted.

### Fix (skill content-rewrite + hardening — no code)
1. **SKILL Step 4 content-rewrite:** when rewriting the copied
   `/<companyKey>/en/nav` (and footer/welcome), fix internal links to be
   company-scoped: strip any `file:` scheme and rewrite `/en/…` →
   `/<companyKey>/en/…` (explicitly including the logo/brand link). No bare
   `/en/…` or `file:` link may remain in a copied doc.
2. **Hardening (Step 4g folder-scope check):** after publish, fetch the
   copied nav doc and assert the logo/brand link href starts with
   `/<companyKey>/` and has no `file:` scheme; assert every internal
   nav/footer link is under `/<companyKey>/`. Click-test the logo on the
   preview and confirm it lands on `/<companyKey>/en/` (not `/404.html`).

---

## Cross-cutting hardening summary (what to add to Step 4g / Step 5 verify)
A single post-publish checklist, run against the **preview URL**, that fails
the corresponding step on any miss:
- **Logo/residue:** nav+footer+welcome carry zero `frescopa`/base
  shortcodes; every icon shortcode resolves to an existing
  `/icons/<companyKey>-*.svg`; `favicon.svg` rebranded.
- **Links:** logo + all internal nav/footer links are `/<companyKey>/…`
  (no `file:`, no bare `/en/`); logo click ≠ 404.
- **Background:** home hero + filter panel read new palette (screenshot).
- **Filters:** each category-card slug is a non-zero facet bucket.
- **Country:** enriched assets tagged `allowedCountries=global`; a
  country-scoped user sees non-zero results.

---

## Implementation status — APPLIED (2026-08-30)

All five gaps implemented. No product/worker/block code was changed except
the migration **scripts** required for Gap 2.

- **Gap 1 (logo + favicon):** SKILL Step 4b logo bullet rewritten to a
  MANDATORY 4-part sub-step (produce mark → swap shortcode in nav+footer+
  welcome → repoint repo/CSS refs → replace `favicon.svg`/`favicon.ico`).
  Step 4g residue check now asserts every icon shortcode resolves to an
  existing `/icons/<companyKey>-*.svg` and that `favicon.svg` dropped the
  base marker; screenshots now include the login page.
- **Gap 2 (allowedCountries=global):** `scripts/agent/constants.js`
  (`FIELD.ALLOWED_COUNTRIES`), `enrich-assets.js` (scope +
  `toCsvRow`), `csv.js` (`COLUMN_REGISTRY`), `json-patch.js`
  (`buildMetadataPatch` op). SKILL Step 5 stamp desc + verify updated.
  Regression tests added to `json-patch.test.js` + `csv.test.js`.
- **Gap 3 (backgrounds):** Step 4g color-sweep item 2 now explicitly names
  background/surface tokens + the search-results filter/facets panel and
  fails on a surviving base surface.
- **Gap 4 (filter values):** SKILL Step 4 content-rewrite now rewrites the
  category-card `facetFilters` slugs; Step 5 makes `--product-category-vocab`
  MANDATORY (same list); Step 5 verify asserts every card slug is a
  non-zero bucket.
- **Gap 5 (logo 404):** SKILL Step 4 content-rewrite now strips `file:` and
  re-scopes `/en/…` → `/<companyKey>/en/…` in copied nav/footer/welcome
  (logo link included); Step 4g adds a link-scope check (logo ≠ `/404.html`).

**Validation:** `scripts/agent` suite 192→ (with 3 new tests) passing;
eslint clean on the 4 changed JS files; `node --check` OK.
