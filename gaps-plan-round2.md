# Demo Migration — Round 2 Gaps (PR #3 / urbn) — Evidence-Based Plan

All findings verified against the LIVE DA API, the deployed PR #3, and repo code.
No assumptions. Status per gap noted inline.

---

## Gap 1 — Navigation escapes the company folder ("nav missing in many places")   [FIXED]

### Root cause (proven)
`scripts/locale-utils.js` is already base-prefix-aware (`getBasePrefix`,
`getExplicitLocalePrefix` return `/<company>/<locale>`). That only helps callers that go
through `localizePath`. Several base-code navigation targets are **hardcoded absolute
`/en/...`** and bypass it, so on a `/urbn` foldered demo they jump back to the shared root
`/en` (which is `main`'s unbranded content):

- `blocks/header/header.js:487` → `window.location.href = '/en/reports/report-hub'`
- `blocks/report-hub/report-hub.js:27,35` → `url: '/en/reports/searches'`, `'/en/reports/asset-activity'` (consumed as `card.href` at :51)
- `blocks/search-results/components/image-gallery.js:137,138` → fallbacks `'/en/training-resources'`
- `scripts/scripts.js:217,227` → error fragment `` `/${locale}/error-pages/404` `` / `500` (bare locale, no base prefix)

Same bugs exist in base `assethub-spark` (verified) — this is base code, not a per-company
patch. Fix once in base; every fork/demo inherits it.

### Fix
Route every in-portal navigation through the base-aware helper; strip the hardcoded `/en`:
- header.js:487 → `localizePath('/reports/report-hub')`
- report-hub.js → constants `'/reports/searches'`, `'/reports/asset-activity'`; localize at render: `card.href = report.status === 'available' ? localizePath(report.url) : '#'`
- image-gallery.js → `localizePath('/training-resources')` (both)
- scripts.js error pages → build from `getLocalePrefixFromPath()` (includes base), not `` `/${locale}/...` ``
- Guard: audit for any remaining `'/en/...'` / `` `/${locale}/...` `` in-portal link literals; route through `localizePath`.

---

## Gap 2 — config/excel copied wrong (xlsx→json, docx→html); tree not faithfully copied   [FIXED]

### Root cause (proven)
The DA **Copy API preserves extensions faithfully** — copied `/config/access/application.xlsx`
to a throwaway path and got back a real 4.8 KB `application.xlsx` (`file` = "Microsoft Excel
2007+"). So the copy API is NOT the culprit.

The urbn destination was wrong:
- source `/config/access/application.xlsx` (4860 B, real xlsx) → dest `/urbn/config/access/application.json` (166 B, hand-authored DA sheet `":type":"sheet"`)
- source `/public/welcome.docx` → dest `/urbn/public/welcome.html`
- spurious empty `/urbn/config/config`

=> The prior run hand-authored replacement docs/sheets instead of copying originals; the
verifier only DETECTED a missing subtree and failed, it never REPAIRED it, so `config`
could be silently absent.

### Fix (APPLIED — copy part of `da-copy-folder.sh`)
- Path-by-path verification now matches each source doc **with its extension**, so a
  wrong-extension twin (`application.json` for source `application.xlsx`) is flagged MISSING,
  never a false match.
- Added a **self-healing repair pass**: any doc the bulk folder copy missed (classically the
  `config` subtree with its `access` sheet) is copied **individually from its exact source
  path** via `copy_entry`, preserving `.xlsx`/`.docx`. Only if still missing after repair
  does it exit `4`.
- No hand-copy logic added to the agent (per user: hand-copying config for this run is fine).
- SKILL.md Step 3 verification wording updated; both files synced to standalone.
- (User confirmed: for the urbn run they hand-copied config — acceptable; the script fix is
  for future runs.)

---

## Gap 3 — excat rebrand plugin referenced by machine-local path   [FIXED — skill wording]

### Root cause (proven)
`~/.claude/plugins/known_marketplaces.json` registers `excat-marketplace` from a
machine-specific local dir:
`/Users/mohitar/Documents/code/aem-experience-catalyst/resources/plugins/aem-excat-plugin/excat-marketplace`.
The excat marketplace is `"confidential": true` (internal Adobe); its README's only
documented install is a local clone + `plugin marketplace add ./resources/.../excat-marketplace`
(canonical remote: `Adobe-AEM-Foundation/aem-experience-catalyst`). A local path is inherent
to excat's install, but a **machine-specific absolute path must never be baked into the
skill/repo** — it won't exist on another operator's machine or in the fork.

Current SKILL.md + eval tasks already use placeholders (`<path-or-repo>`) — nothing hardcoded
there. Risk is runtime behavior: the skill must treat excat as a pre-installed operator
dependency, not invent/add a path.

### Fix
1. SKILL: treat excat purely as an operator-environment dependency; DETECT via live CLI only
   (`copilot skill list` / `claude plugin list`). Do NOT auto-`marketplace add` any path.
2. If missing: pause and hand the operator the OFFICIAL commands parameterized on THEIR OWN
   clone (clone `Adobe-AEM-Foundation/aem-experience-catalyst`, then `plugin marketplace add
   ./resources/plugins/aem-excat-plugin/excat-marketplace` from that clone) — never a
   machine-specific absolute path, never `/Users/...`.
3. Verify in-run (via transcript) the rebrand actually invoked `excat-complete-design-expert`
   rather than hand-editing `styles.css`. Keep the existing "never hand-roll the rebrand" guard.

---

## Status — all four gaps FIXED + synced
- **Gap 1** — base-code nav fix: `header.js`, `report-hub.js` (+localizePath import), `image-gallery.js`
  (+localizePath import), `scripts.js` error fragments now use `getLocalePrefixFromPath()`. No `/en/…`
  nav literals remain. Root vitest 687 pass, cloudflare 430 pass, eslint 0 errors on touched files.
- **Gap 2** — copy self-heal + extension-faithful verify (`da-copy-folder.sh` + SKILL).
- **Gap 3** — SKILL excat wording: detection-only, never fabricate/`marketplace add` an absolute path;
  official setup is a `./resources/...` path relative to the operator's OWN clone of
  `Adobe-AEM-Foundation/aem-experience-catalyst`. No absolute `/Users/...` baked anywhere.
- **Gap 4** — excat delegation prompt (full palette, all logo instances, nav+footer copies in rewrite)
  + Step 4g brand-residue checks.

All source + SKILL changes synced to standalone `main` (uncommitted, for the user's next test branch).

## Follow-up (optional)
- Evals for: nav stays inside `/<company>`; copy preserves extensions/no extra docs; footer/logo/
  background residue-free; excat never referenced by absolute local path.

---

## Gap 4 — Rebranding incomplete: footer, logo, background not fully rebranded   [FIXED — skill/prompt + checks]

### Root cause (proven, live)
- **Footer un-rebranded:** `/urbn/en/footer.html` still holds `:frescopa-icon:`,
  "Premium coffee, beautifully captured.", `assets@frescopa.coffee`, "© 2026 Fréscopa."
  The `nav` copy WAS rewritten (`:urbn-icon:`) but the `footer` copy was skipped.
  **Instruction bug:** Step 4 item 3 said *"do not touch nav/footer/templates/shared
  blocks"* — but in the foldered demo `/<company>/en/nav` and `/<company>/en/footer`
  are company-scoped COPIES that MUST be rebranded. The agent obeyed and skipped footer.
- **Logo incomplete:** header swapped to `urbn-icon.svg`; footer still `:frescopa-icon:`
  and `styles.css:244` still `url('/icons/frescopa-beans.svg')`. Logo/brand-asset swap
  didn't cover all instances (nav+footer+welcome shortcodes, repo icon assets, CSS refs).
- **Background not swept:** `:root` cream/coffee tokens + decorative `frescopa-beans.svg`
  survived because the hex sweep's old→new map is built only from excat's token diff; if
  excat changed only the primary accent, the background/decorative brand colors are never
  in the map and never flagged.

### Fix (APPLIED — SKILL.md Step 4 delegation + Step 4g checks; synced)
1. **Item 1 (design tokens):** require rebranding the FULL palette — primary, secondary,
   background/surface, and decorative brand backgrounds — naming the base slug (`frescopa`).
2. **Item 2 (brand assets):** explicit logo/wordmark swap across ALL instances (DA nav +
   footer + welcome shortcodes, repo `/icons/<baseSlug>*.svg`, CSS `url()`/`.icon-<baseSlug>`),
   plus a zero-residue rule (grep base slug across repo + copied DA docs → must be empty).
3. **Item 3 (content rewrite):** STOP excluding nav/footer; the rewrite list now MUST
   include `/<company>/en/nav`, `/<company>/en/footer`, `/<company>/public/welcome`
   (copies, not shared root) and swap the logo shortcode in each. Only the shared ROOT
   nav/footer stay off-limits.
4. **Step 4g checks:** base-slug repo grep must be zero; new **brand-residue check on
   copied DA docs** (fetch nav/footer/welcome; assert no old name/shortcode/tagline/contact/
   copyright); screenshot footer + search/hero to confirm logo/footer/backgrounds read as
   the new brand.

### Note
The excat plugin itself was used (header rebrand happened); the failure was an inaccurate
delegation prompt (footer excluded, partial palette, no residue check), not the tool.


---

## Gap 5 — config/access sheet stored as `.xlsx` MEDIA, not `.json` SHEET   [FIXED]

### Symptom (screenshots 2026-08-30)
In DA, `/<company>/config/access/application` shows a **document** icon and
opens at `da.live/media#/…/application.xlsx` (media viewer, broken image),
NOT the **sheet** editor. User: "application must be uploaded as spreadsheet
xl instead of document."

### Root cause (PROVEN, zero assumptions)
- DA's native **sheet** format is `.json` in the EDS shape
  `{"total":N,"limit":N,"offset":0,"data":[…],":type":"sheet"}` — proven by
  `en/system-notifications.json` (a working sheet) and by the **canonical
  upstream** `main--assethub-spark--aem-showcase.aem.page/config/access/application.json`
  → **HTTP 200**, `":type":"sheet"`, 5 real permission rows.
- The **standalone** stored `config/access/application` as a real `.xlsx`
  (`file` = "Microsoft Excel 2007+", served `application/octet-stream`).
  Its published `…/application.json` → **HTTP 404** (an `.xlsx` in DA is an
  opaque **media asset**; it is NEVER published as `.json`). AEM docs +
  live tests confirm: Create-Sheet → `.json` data endpoint; upload `.xlsx`
  → `/media_*` binary, no `.json`.
- Therefore the `.xlsx` never publishes, so `fetchHelixSheet('/config/access/application')`
  404s → login/permission gating breaks.
- **Our own round-2 "fix" made it worse:** Gap 2 forced the copy to keep
  `.xlsx` and forbade the agent's `.json`. The `.json` was the *right
  format* (just previously hand-authored empty/malformed). The copy API is
  faithful, so an `.xlsx` source → `.xlsx` document copy every time.

### Fix (APPLIED)
1. **Data repair (live DA):** wrote a proper EDS sheet
   `config/access/application.json`
   (`{…,"data":[{"email":"*","permissions":"preview"}],":type":"sheet"}`,
   preserving the xlsx's data) and **deleted** `application.xlsx` — at BOTH
   the standalone **root** `/config/access` and the **`/test`** demo copy.
   Verified each now lists `ext=json` only. (Write via
   `POST admin.da.live/source/{org}/{repo}/…/application.json` multipart
   `data`, 201; delete `.xlsx` via `DELETE …/source/…`, 204.)
2. **SKILL.md:** config description no longer calls it `.xlsx`; verification
   section now states the extension is load-bearing and a DA sheet **must**
   land as `.json` (an `.xlsx` present = broken copy); added a post-copy
   **Sheet-format check** (list `config/access`, every `ext` must be `json`;
   never mark `da-content-copied` done while any entry is `.xlsx`; fix the
   *source* to `.json`, never re-copy as `.xlsx`).
3. **da-copy-folder.sh:** corrected the (now-inverted) comments — the `.json`
   sheet is the correct source and an `.xlsx` twin is the broken one; copy
   stays faithful (`.json` → `.json`).

### Why this is the real fix (not a patch)
The copy mechanism was never wrong — it faithfully reproduces the source.
The bug was the **source** being media (`.xlsx`) instead of a sheet
(`.json`). Fixing the source once fixes every future migration copy with no
special-casing; the added skill check catches any future `.xlsx` regression.
