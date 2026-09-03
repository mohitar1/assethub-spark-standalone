## Step 4g — Verification (before declaring the rebrand done)

This section is a **hard gate before Step 5**, not optional cleanup. Do not
invoke `.claude/skills/rebrand-portal/scripts/assets/enrich-assets.js`, create collections, or mark asset
steps `done` until every Step 4g check passes against the deployed PR
worker in the current session. If a resumed state claims rebrand is done
but any Step 4g check fails, leave `assets-*` pending, fix Step 4, and only
then continue.

Completion is the **open PR + its verified branch-preview URL** (I3), not
a merge. The preview URL is the **per-PR worker**
(`https://<branch>.dev.frescopamedia.com/<company>/…`), not the raw
`aem.page` origin — that worker is where login, search, and the company
filter actually run. First confirm the PR diff **includes
`cloudflare/src/config.js`** with `DEMO_COMPANY`/`DEMO_BASE_PATH` =
companyKey (without it the deployed worker is unscoped — abort and fix).
Then open the preview: confirm the rebranded `/<company>` pages render,
the `/<company>/public/welcome` login page shows the new brand, and
searching returns **only** this company's assets. Run the asset-color
sweep against that **preview URL** (not the local tree, not after a
merge).

**Background-color applied check — a hard gate, before the residue
sweep.** The residue sweep below catches leftover old-brand values; it
does NOT catch a new-brand token that excat wrote into `styles/styles.css`
but that never actually took effect on the rendered page (a cascade miss,
a more-specific selector winning, a stale cached build). Check that
separately, and first, because a token that isn't applied makes the
residue grep moot:

1. **Build the selector → expected-value map from excat's own edit** —
   not from any external fetch or user-supplied reference. Read the exact
   `background`/`background-color` value (or the `var(--token)` it
   resolves to) that excat's Step 1 edit wrote in `styles/styles.css` for
   each landmark: `body`, `main .section.search-hero`,
   `main .section.category-tiles`, `.cards-card-body`,
   `.section.welcome`, and the facets/filter panel
   (`.facet-filter-panel`). Excat already fetched the source site and
   already decided these values — this step reuses that decision as the
   expected value, it does not re-derive brand colors from anywhere else.
2. **Read the actual computed value on the deployed PR preview** for each
   of those same selectors (not the local tree, not source-inspection —
   the rendered, cascaded result).
3. **Hard fail on any mismatch.** Computed ≠ expected for any landmark
   selector blocks Step 5 the same way a missing welcome-panel token does
   (Step 4b–4f item 1) — go back and fix the losing declaration (check for
   a later `background-color` override, an `!important`, or a
   more-specific selector winning; see the known-repeat-misses list below
   for files this has hit before), then re-check. Do not downgrade this to
   a screenshot judgment call — it is binary pass/fail per selector.

**Asset-file color sweep — a fixed checklist, not an ad hoc grep** (a
manual eyeball pass has missed real cases). Run the whole checklist twice:
once right after the step 1–2 edits, and again against the preview URL.

1. **Build the old→new hex map** from step 1's token diff.
2. **Grep every value in that map**, case-insensitive, across every
   `*.svg`, `*.css`, `*.scss` — report every hit. Check icon SVGs for
   `fill="#..."`, background assets for embedded raster, hardcoded panel
   colors. **Explicitly include the background/surface tokens and the
   filter/facets panel** — not just the accent. Grep the base
   background/surface hexes (the cream section/hero surface and any
   decorative brand-background SVG) across `styles/*.css`, the home
   hero/section CSS, AND the search-results **facets/filter panel** CSS.
   A rebrand that changes only the primary/accent leaves the home hero and
   the filter panel on the base cream surface (verified live) — that is a
   FAIL, not a pass. **Explicitly grep the base surface names captured
   before Step 4b** (`--light-color` and `baseSurfaceHex`, the
   facets/search-panel surface value if it's a separate hardcoded literal
   rather than the `--light-color` token, `${baseSlug}-background` (the
   `.${baseSlug}-background-*` section classes), and `backgrounds/big.svg`
   if it still carries the base brand's decorative artwork). Any of these
   still present with the captured base value is the "filter background
   off-brand" gap. Every base surface token and decorative base-brand
   background must be gone. Also confirm the welcome-panel tokens were set
   (see item 5). Also grep the base action-color values captured before
   Step 4b (the base secondary-button `background-color`/hover hexes) that
   commonly survive through component overrides, and every other red/gold
   value in the token diff. Any remaining hit must be either changed to a
   semantic token from the new palette or explicitly justified as a
   deliberate new-brand choice; do not classify these old brand colors as
   neutral chrome. (At the time of writing this repo's example values are
   `#F4E9DC`, `#FBF1EA`, `#95351D`, `#7a2b17` — read the actual current
   values from the tree per the capture step above, don't match these
   literals if the base template has since changed.)
   Then run a **structural hardcoded-surface audit**, not just exact old
   values: inspect every `background`, `background-color`, `border-color`,
   token assignment, and SVG `fill`/`stroke` using a literal hex in
   `styles/`, `blocks/search-results/`, `blocks/search-bar/`, and `icons/`.
   Classify each hit as **neutral UI chrome** (`#fff`, greys, focus ring),
   **semantic token fallback**, or **brand/off-brand surface**. Any
   brand/off-brand hit must become a semantic token. Do not dismiss a color
   as neutral until checking the rendered component it styles.
   **Known repeat misses that must be checked explicitly before Step 5:**
   `blocks/search-results/styles/facets.css .facet-filter-panel`
   (`background-color` overrides earlier `background`), search-results
   `theme.css` red token aliases (`--red-*`, invalid/pressed colors),
   `blocks/search-results/styles/search-panel.css`,
   `blocks/search-results/styles/cart-panel.css`,
   `blocks/search-results/styles/date-picker.css`,
   `styles/add-to-collection-modal.css`, and `styles/styles.css`
   secondary button base/hover colors. If a rule has both
   `background: #...` and later `background-color: #...`, the later
   declaration wins; inspect the computed result and fix the winning
   declaration, not just the first one.
3. **Grep `baseSlug`** (captured before Step 4b; `frescopa` at the time of
   writing) — case-insensitive, across
   the whole repo (`icons/`, `styles/`, `blocks/`, `head.html`) — catching
   a renamed icon whose class still reads `.icon-<baseSlug>-mark`, a CSS
   `url('/icons/<baseSlug>…')` decorative background, or a stray copy
   string. Must be **zero** hits (barring a documented placeholder).
4. **Diff every file touched** against its pre-edit version and flag any
   changed line not explained by the intended token/color/name swap
   (catches a linter auto-fix riding along).

5. **Welcome-panel token check.** Confirm the brand theme sets
   `--welcome-panel-bg`, `--welcome-panel-accent-rgb`,
   `--welcome-panel-mark-image` (→ `/icons/<companyKey>-beans.svg`), and
   `--welcome-tagline-line1` + `--welcome-tagline-line2`; otherwise the
   login's left panel keeps the frescopa coffee colour, bean mark, and
   "world's finest coffee" tagline (the CSS
   defaults). Confirm both `/icons/<companyKey>-icon.svg` AND
   `/icons/<companyKey>-beans.svg` exist.

Not every hardcoded fill is wrong (a neutral icon that turns brand-colored
on hover is fine) — screenshot to confirm a flagged file reads off-brand
before fixing. Fix real misses and re-run both passes clean.

**Brand-residue check on the copied DA docs — the footer/logo guard.**
The asset sweep covers the *repo*; this covers the *content*. Fetch each
published company-scoped doc — `/<companyKey>/en/nav`,
**`/<companyKey>/en/footer`**, and `/<companyKey>/public/welcome` — from
the preview (or via `admin.da.live/source`) and assert **none** contains
`baseSlug` anywhere in its name/casing variants (`Fréscopa`/`frescopa` at
the time of writing), its old logo shortcode (`:${baseSlug}-icon:`), its
taglines/contact, or its copyright line. Any hit means that doc was
skipped in item 3 of the delegation — go rewrite it and republish.
Also assert **every** remaining icon shortcode in those docs resolves to an
**existing** `/icons/<companyKey>-*.svg` (a shortcode pointing at a missing
icon renders the empty circle seen live), and that the repo `favicon.svg`
no longer carries the base marker captured before Step 4b
(`aria-label`/`fill`).
Then **screenshot the footer, the login page, AND a search/hero page** at
the preview and confirm the logo (header + login), footer, and section
backgrounds all read as the NEW brand (this is what catches a surviving
cream/coffee background, a stale footer/welcome logo, or an empty-circle
header that a grep of the repo alone will not). **On the login screenshot,
assert the two-panel split layout** (left brand panel + right sign-in) with
BOTH marks rendered (left large mark + the panel logo — no empty circle or
broken image) and the panel in the NEW brand colour; a single off-brand
column means the `welcome` section style was flattened (fix the rewrite).
Also fetch `/<companyKey>/public/welcome.plain.html` and assert it still
contains `<div class="welcome">`.

**Facets-panel verification is mandatory before assets.** Open the
deployed PR worker URL, not only the raw AEM content origin, at a desktop
viewport where the facets panel is visible (`width >= 1440px`). Inspect the
search page with the filter panel open and verify computed color values
come from the new palette/semantic variables. **Check every interactive
state an element has, not just its resting appearance** — default, hover,
focus, checked/active, and disabled all can carry their own color
declaration, and a stale base-brand value can hide in any one of them
while the resting state looks correctly rebranded (verified live: a
checked filter checkbox rendering the old brand color while its unchecked
resting state was already correctly rebranded). This applies to every
interactive control in the panel — checkboxes, toggles, buttons, tabs —
not only the ones named here. Do not proceed to Step 5 while any stale
base-brand color is visible in any state of any control; this is the
common gap where the hero looks rebranded but the actual searchable-assets
UI still carries the old brand in a state nobody happened to trigger
during a quick look.

**Link-scope check (the logo-404 guard).** Fetch the copied
`/<companyKey>/en/nav` doc and assert the logo/brand link href starts with
`/<companyKey>/` and has **no** `file:` scheme; assert every internal link
in the copied nav/footer/welcome is under `/<companyKey>/` (no bare
`/en/…`). Then click the logo on the preview and confirm it lands on
`/<companyKey>/en/`, **not** `/404.html` (verified-broken live: an
un-rescoped `/en/` logo link 404s).

**Auth verification (the login-gating guard).** The worker resolves login
and permissions from the **company-scoped** access sheets
(`companyBasePath()/config/access/application` and `.../users`), not the
root ones. After publish: (a) GET
`<preview>/<companyKey>/config/access/application.json` and confirm **200 +
an EDS sheet shape** (`{":type":"sheet",…}`) — a `404` or an `.xlsx`/media
response means the sheet wasn't published under `/<companyKey>` (or landed
as media, not a `.json` sheet); (b) sign in on the preview as a known demo
user and confirm you **reach the portal**, NOT "User not allowed to access
this application". Either failure means Step 3/4 didn't get the company
`config/access/*` sheets published as `.json` — fix and republish before
declaring the rebrand done.

**Navigation-scope check (the folder-drop guard).** Beyond the logo, click
through the preview and confirm **every** hop stays under `/<companyKey>/`:
a home **category card**, the cart's **"Go to Homepage"**, the **404 "Go
home"** (hit a bad `/<companyKey>/...` URL to trigger it), and **sign-out**.
None may land on a bare `/en/…`, `/`, or `/404.html` outside the folder
(all verified-broken live). The worker's `/en/*`→`/<companyKey>/en/*`
redirect should catch strays, so a landing outside `/<companyKey>/` means
both the link and the redirect are wrong — investigate.

**Folder-scope checks.** Confirm: the rebranded pages render at the branch
preview under `/<companyKey>/`; only `/<companyKey>/...` paths were
published (per-path report shows no root path); and the original shared
root content is unchanged (spot-check one root page still shows the old
brand). Only then is the rebrand done.

**Completion report** (I1, outcomes only): what's rebranded and confirmed
on the portal link (no merge needed); the new brand name and content
highlights; any follow-up (e.g. a placeholder logo pending the real
asset). Then continue straight into Step 5 with the asset answers already
gathered in the Entry flow (Q1/Q2) — if `assetsEnrichNow` is `false`,
upload (if applicable) and stop there; stopping with enrichment deferred
is a valid end state (I4).
