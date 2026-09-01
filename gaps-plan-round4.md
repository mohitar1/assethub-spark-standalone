# Customer-Migration Demo — Gaps Plan (Round 4)

Debugged live against `demo-volkswagen-2.dev.frescopamedia.com/volkswagen/...`
+ worker/EDS code. No code changed yet — plan only.

## Gap 1 — Auth: config/access/application not used per-company
**Root cause (proven).** `cloudflare/src/user.js` `resolvePermissions()` (L105)
and `resolveUserAttributes()` (L68), plus `util/notifications-helpers.js` (L33),
read the LITERAL root sheets `/config/access/application` + `/config/access/users`.
`util/helixutil.js fetchHelixSheet()` (L64) does NOT prepend `companyBasePath()`
— unlike `auth.js LOGIN_PAGE` (L13) which does. So the `/<company>/config/access/*`
sheets that Step 3 copies and Step 4 publishes are NEVER read; auth is decided by
the ROOT frescopa sheet → demo user gets "User not allowed to access this
application", and the company sheet is inert.
**Fixes.**
- CODE: prepend `companyBasePath()` to the two `user.js` reads and the
  `notifications-helpers.js` read (mirror LOGIN_PAGE). BASE='' keeps root prod intact.
- CODE: scope the admin gate `index.js` L114 `.all('/config/access/*')` → `${BASE}/config/access/*`.
- SKILL Step 4 publish: explicitly publish `/<company>/config/access/application`
  and `/<company>/config/access/users`.
- RULE/VERIFY Step 4g: GET `<preview>/<company>/config/access/application.json` → 200
  + sheet shape; live login as a known demo user succeeds; assert no literal-root
  access read remains in the worker.

## Gap 2 — Login page flattened + missing brand marks
**Root cause (proven).** Live `/<company>/public/welcome.plain.html` = plain `<div>`;
frescopa root = `<div class="welcome">`. Split-screen is pure CSS
(`styles/styles.css` L210-397 `body:has(.section.welcome)` + `main::before/::after`).
The rewrite LOST the `welcome` section style → single column. Compounding:
(a) left-panel mark CSS is hardcoded to `.icon-frescopa-beans` (L296-311);
(b) `/icons/volkswagen-icon.svg` + `-beans.svg` don't exist (only frescopa-*) → both marks broken.
**Fixes.**
- RULE: the `welcome` section style is load-bearing — the rewrite MUST preserve the
  `Welcome` section wrapper/metadata; never flatten the login page.
- RULE: create BOTH marks `/icons/<company>-icon.svg` AND `-beans.svg`; verify files exist.
- CSS rebrand: repoint hardcoded `.section.welcome .icon-frescopa-beans` (L296-311) to
  `.icon-<company>-beans`; add welcome-block CSS to the zero-residue `frescopa` grep.
- VERIFY Step 4g: screenshot login → split layout, both marks render, no broken image.

## Gap 3 — Navigation drops the company folder (many places)
**Root cause (proven).** Frontend learns the company base ONLY from the current URL
(`locale-utils.js getBasePrefix()`; `getLocalePrefixFromPath()` falls back to `/en`).
One link resolving to root `/en/...` (or a boundary page like `/404.html`) makes
`getBasePrefix()` return '' → every localized link cascades to root. Leaks:
- `error-page.js` L42 default `buttonHref='/'`, content href un-localized → 404 "Go home" → `/en/`.
- `header.js` L595 welcome-logo `<a href="/">` hardcoded.
- `auth.js` L378 `post_logout_redirect_uri:'/en/'` hardcoded root.
- Copied home cards / hero CTAs still bare `/en/`.
- Worker redirects only BARE `/` → `${BASE}/en/`; NOT `/en/*` → root `/en/` served out-of-company (n4).
**Fixes.**
- CODE (worker, systemic): in a foldered demo, redirect `/en/*` (+`/ja/*`) → `${BASE}/en/*`
  and serve the company 404 so boundary pages keep context.
- CODE (frontend): persist detected base in sessionStorage; `getBasePrefix()` falls back to it.
- CODE (defaults): error-page home link → `localizePath`; header welcome-logo → `localizePath('/')`;
  auth logout → `${companyBasePath()}/en/`.
- SKILL/RULE Step 4: extend internal-link rewrite to HOME cards, Browse links, hero CTAs —
  every bare `/en/…` → `/<company>/en/…` across ALL copied pages (not just nav/footer/welcome).
- VERIFY Step 4g: click logo, a category card, cart "Go to Homepage", trigger a 404 →
  all land under `/<company>/`, never root `/en/` or `/404.html` out-of-folder.

## Gap 4 — Filter/hero background still cream
**Root cause (proven).** `styles/styles.css` L15 `--light-color:#F4E9DC` (frescopa cream
surface). `search-bar.css` L18 `background:var(--light-color)`; filter/facets + sections
also ride `--light-color`, `.frescopa-background-beige` (L1609/1647), `backgrounds/big.svg`
(L934/943/1626). Rebranding only `--primary-color` leaves all cream (n5).
**Fixes.**
- RULE Step 4 tokens: `--light-color` and every surface/background token are MANDATORY
  rebrand targets (named explicitly); replace `styles/backgrounds/big.svg`; repoint
  `.frescopa-background-beige`.
- VERIFY Step 4g sweep: add `#F4E9DC`, `frescopa-background-beige`, `backgrounds/big.svg`
  to the fixed grep checklist; screenshot SEARCH page → hero + filter column brand-colored.

## New rules to add to SKILL.md
1. Auth is company-scoped: worker reads `/<company>/config/access/*`; publish + verify + live login.
2. `welcome` section style is load-bearing; never flatten login; both marks (`-icon`,`-beans`) must exist.
3. All nav stays inside `/<company>/`: worker re-enters folder for `/en/*`; frontend persists base;
   every copied link + code default company-scoped; verified via logo/cards/cart/404 clicks.
4. Surface tokens (`--light-color`) + decorative backgrounds are mandatory sweep targets.

---
## STATUS: APPLIED (2026-08-31)
- Gap 1: user.js + notifications-helpers.js reads scoped to `companyBasePath()/config/access/*`; index.js admin gate scoped to `${BASE}`. SKILL: publish access sheets + Step 4g auth-login verify.
- Gap 2: welcome split-panel variableized (`--welcome-panel-bg/-accent-rgb/-mark-image`, `--welcome-tagline`) with frescopa defaults; mark CSS generalized (`.section.welcome p .icon`). SKILL: preserve `welcome` section, create BOTH marks, verify split + `<div class="welcome">`.
- Gap 3: worker redirect `/en/*`+`/ja/*` -> `${BASE}/en/*` (BASE-guarded); locale-utils persists company base in sessionStorage + boundary fallback. SKILL: scope links on ALL copied pages + nav-click verify.
- Gap 4: SKILL names `--light-color`/`#F4E9DC`, `frescopa-background`, `backgrounds/big.svg` as mandatory rebrand+sweep targets.
Validation: worker 430/430, frontend 632/632, eslint + biome clean, node --check clean.
