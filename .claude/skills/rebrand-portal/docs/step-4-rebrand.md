# Step 4 — Rebrand `/<companyKey>` + repo, publish, open the PR

**Gate — do not start until both `customer.demoBranch` and
`customer.daFolder` are set** (Steps 2 and 3 `done`). Do not invoke
`excat-complete-design-expert` or touch any file until both are set.

## Step 4 preflight — Experience Catalyst availability

Before any design/rebrand work, verify `excat-complete-design-expert` is
invokable in the current session. Run the operator setup check above
(`claude plugin list`, `claude skill list`, or the equivalent in the active
CLI). If it is not invokable, follow `docs/excat-setup.md` and block here
until the plugin is loaded.

If a source website URL is present, that URL is the design source. Invoke
`excat-complete-design-expert` directly in Complete Migration mode with the
source URL and the copied `/<companyKey>/...` verification targets.

**Do not ask how to source the look when a source URL is already present.**
Do not ask the user for colors or a palette while Catalyst is available.
A generic `WebFetch` failure is not a blocker and is not a reason to ask
for manual colors; Catalyst performs its own source extraction. Do not
route this work to DesignSync or any generic design tool. If Catalyst
itself fails to extract the source after it is invoked, then report that
specific Catalyst failure and ask for a better source URL or brand inputs.

## Step 4a — Content-authoring access (`token.env` — the only setup)

The only customer-provided access setup is a gitignored `token.env` at the
repo root with **one** line, `KEY=value`, no quotes:

- **`DA_TOKEN`** — read/write Document Authoring content, and mint the
  Helix Admin API key used for preview/publish.

Send this exact message (don't paraphrase, don't add any settings/toggle/
permissions step — none exists for this flow):

> "Before I start, create a file called `token.env` in the project root
> with this one line (I'll never ask you to paste this in chat):
> `DA_TOKEN=<token copied from da.live>`
> To get it: open `https://da.live/#/{org}/{site}`, sign in, open browser
> DevTools → Network, click a request like
> `https://admin.da.live/config/{org}/...`, copy the
> `Authorization: Bearer ...` request header, and paste only the token
> value after `DA_TOKEN=`.
> Let me know once it's there."

Then check the file exists (never read/log its contents — I2) and confirm
it's gitignored; if `.gitignore` lacks a `token.env` entry, add one.
Access is exactly this DA token from the customer. The active flow does not
ask the customer for any other token or send them to another setup screen.

After `token.env` exists, run the packaged token script:

```
.claude/skills/rebrand-portal/scripts/da/ensure-eds-tokens.sh \
  <org> <repo> \
  --token-file token.env
```

The script verifies `DA_TOKEN`, reuses an existing valid `HLX_ADMIN_TOKEN`
if present, otherwise mints a new Helix Admin API key from `DA_TOKEN`,
writes it back to `token.env`, and verifies Helix Admin status. It never
prints token values. If DA validation fails, stop and say the DA token is
expired or does not have access to this site. If minting fails or returns no
token value, stop and say the DA token works for DA but the user cannot mint
the publish token for this site; ask for a DA token from a user with the
required site admin/config rights. Do not offer fallback token paths.

Known quirk: a `admin.hlx.page` preview/publish can `401` even with valid
tokens — forward the DA token via an `x-content-source-authorization`
header rather than assuming it's wrong.

**Capture the base brand's current values — before any edit.** Every
later residue/applied check in this skill needs to know what the
*current* base-brand values are, on THIS repo, right now — not a fixed
value frozen into this document. Read them directly from the unedited
tree before Step 4b touches anything:

- **Base slug** — the brand name string currently present in the copied
  `/<companyKey>/...` docs and repo icon filenames (e.g. read from
  `icons/*-icon.svg` / `icons/*-beans.svg` filenames, or the `nav`/
  `footer` copy). Call this `baseSlug`.
- **Base surface/background values** — the current `--light-color` value
  and any other section-background custom property in `styles/styles.css`
  `:root`. Call this `baseSurfaceHex`.
- **Base welcome-panel values** — the current literal fallback in
  `body:has(.section.welcome)` rules (`--welcome-panel-bg`'s fallback,
  `--welcome-panel-accent-rgb`'s fallback) if the `var(..., <fallback>)`
  pattern is present, otherwise the literal `background-color` there.
- **Base action-color values** — the current secondary-button
  `background-color`/hover values in `styles/styles.css`.

At the time of writing, this repo's base demo brand is "frescopa" and
these values are `baseSlug = frescopa`, `baseSurfaceHex = #F4E9DC`,
welcome-panel `#2f2318` / `234 163 58`, action colors `#95351D` /
`#7a2b17` — **shown here only as the illustrative current example**, not
as fixed matching targets. If this template's base demo brand is ever
replaced, every check below must key off the values read from the tree
at run-time, not off this paragraph's example values. Every mention of
`frescopa` or these specific hexes later in this document means "the base
brand's actual current value, read from the tree" — treat it as shorthand
for `baseSlug`/`baseSurfaceHex`/etc., not as a literal to match forever.

Also confirm the brand inputs before the delegation: the new brand name
(`customer.name`), the source site to extract the look from, and that the
customer wants the full scope — design tokens AND asset colors AND
content-register rewrite AND publish AND landing via PR. Don't proceed
without a source site, or on a vague "update the styles."

## Step 4b–4f — The delegation (`rebranded`, `published`, `landed-via-pr`)

Issue one comprehensive request covering all of the following — don't
split it across turns:

1. **Design tokens and typography** — invoke `excat-complete-design-expert`
   in **Complete Migration** mode (site design system + all blocks),
   naming the source site if given. Its CSS is branch-global (correct —
   the demo previews on this branch). Point its visual verification at the
   copied `/<companyKey>/...` pages. Do not substitute manual `styles.css`
   edits. **Rebrand the FULL palette, not just the accent** — primary,
   secondary, **background/surface tokens, and every decorative brand
   background** (e.g. a coffee-bean hero/section background, a tinted
   filter/facets panel). The base site ships a themed background (cream
   sections + a decorative bean SVG); if only the primary color changes,
   those backgrounds survive off-brand. Name `baseSlug` (captured above)
   so the agent knows exactly what to replace.
   **Name the exact base surface tokens/assets that MUST change (not just
   `--primary-color`)** — verified still-cream live:
   - `--light-color` (`#F4E9DC`, `styles/styles.css`) — the cream surface
     behind the search hero (`blocks/search-bar/search-bar.css`), the
     **filter/facets panel**, and section backgrounds. This is the single
     token behind gap "filter background is off-brand"; if it is not
     rebranded the whole portal stays cream.
   - the `.frescopa-background-*` section-style classes and
     `styles/backgrounds/big.svg` (the decorative bean).
   - **Login/welcome split-screen tokens.** The left brand panel is themed
     by CSS variables with frescopa defaults — set them in the brand theme
     so the login rebrands: `--welcome-panel-bg` (panel colour, base
     `#2f2318`), `--welcome-panel-accent-rgb` (glow, base `234 163 58`),
     `--welcome-panel-mark-image` (→ `url('/icons/<companyKey>-beans.svg')`),
     and the tagline — set as **two separate line properties**,
     `--welcome-tagline-line1` and `--welcome-tagline-line2` (each a quoted
     CSS string, no line-break escapes inside them — the stylesheet inserts
     the break between the two). Do not reintroduce a single
     `--welcome-tagline` property with a `\A` escape baked into its value:
     a line-break escape only renders when parsed directly in a stylesheet
     content string, not when it's stored inside a custom property and
     substituted via `var()` — that was a real bug in an earlier revision.
     Leaving these unset keeps the frescopa coffee panel + "world's finest
     coffee" tagline on the customer's login.
2. **Brand assets + hardcoded colors** — separately in scope, and the
   most-missed step:
   - **Logo/wordmark swap (all instances) — MANDATORY, and the single
     most-missed step.** This is not optional and not "leave it if there's
     no logo": leaving the base shortcode makes the header render an **empty
     circle** (the shortcode points at an icon that no longer exists) and
     the login page keep the base brand's mark. Do all of the following and
     do not mark `rebranded` done until the residue check (Step 4g) is clean:
     1. **Produce a real brand mark for the company.** Prefer the source
        site's own logo/favicon (fetch it from the `--source-url` given for
        the look); if none is available, generate a minimal wordmark SVG
        from the brand name. Register it in the repo as
        `/icons/<companyKey>-icon.svg`. **The base uses TWO marks —
        `frescopa-icon` (nav/wordmark) AND `frescopa-beans` (the large
        login-panel mark) — so you MUST create BOTH `/icons/<companyKey>-icon.svg`
        AND `/icons/<companyKey>-beans.svg`.** A shortcode with no matching
        SVG renders an empty circle / broken image (verified live on the
        login page — two broken marks). Never leave a shortcode that
        resolves to a missing icon; confirm both files exist before publish.
     2. **Swap the icon shortcode in EVERY DA doc that carries it** — the
        base brand's logo appears in **multiple** places: the DA `nav` doc,
        the DA **`footer`** doc, AND the login/`welcome` page, as EDS icon
        shortcodes like `:frescopa-icon:` / `:frescopa-beans:` (rendered
        `class="icon icon-frescopa-icon"`). Replace each with the new
        brand's shortcode (`:<companyKey>-icon:` etc.) in nav AND footer AND
        welcome. A swapped header with a stale footer or welcome logo is the
        classic failure — verified live to still read `icon-frescopa-*`.
     3. **Repoint every repo asset + CSS reference** — `<baseSlug>_logo.svg`,
        `<baseSlug>-beans.svg`, CSS `url('/icons/<baseSlug>…')`,
        `.icon-<baseSlug>…`.
     4. **Rebrand the browser-tab favicon.** Replace the repo `favicon.svg`
        AND `favicon.ico` (repo root) with the brand mark — these are
        branch-global and `head.html` references them by fixed root path
        (`/favicon.svg`, `/favicon.ico`), so replacing the files rebrands
        the tab icon without touching `head.html`. The base `favicon.svg`
        carries the base brand's `aria-label` (e.g. `aria-label="Frescopa"`
        at the time of writing, along with its `fill` hex) — check the
        current `aria-label`/`fill` on the unedited `favicon.svg` before
        Step 4b; either still present afterward is a giveaway it wasn't
        replaced.
   - **Hardcoded fills / embedded raster.** SVG icons with a literal
     `fill="#hex"` or background SVGs with embedded raster don't follow CSS
     variables — each needs its own file edited to the new palette.
   - **Zero-residue rule.** After the swap, grepping the **base brand slug**
     (`frescopa`) across the repo (`icons/`, `styles/`, `blocks/`) AND the
     copied `/<companyKey>/…` DA docs must return **nothing** except a
     documented, intentional placeholder — any other hit is an un-rebranded
     asset or string.
3. **Content-register rewrite** — rewrite the **DA documents copied in
   Step 3**, i.e. the authored page content, **not** source-code strings.
   **Scoped to the company folder only** (`customer.daFolder`): rewrite
   the pages under `/<companyKey>/...`, never the shared root. For each
   page rewrite the actual copy to match the new brand's real subject
   matter, not just a name swap. Show a before/after diff before
   publishing. Express it as a **scoped page-URL update**: hand the design
   skill/agent the **explicit list of `/<companyKey>/…` page URLs** with
   scope restrictions — change *only* pages **inside** `/<companyKey>`; do **not** touch the
   shared **root** (`/en/...`, `/nav`, `/footer`) or any page outside
   `/<companyKey>`; have it identify the files first and report modified
   files after. **The rewrite list MUST include the company-scoped `nav`,
   `footer`, and login/welcome copies** —
   `/<companyKey>/en/nav`, `/<companyKey>/en/footer`, and
   `/<companyKey>/public/welcome`. These are **copies** (Step 3), not the
   shared root, and they carry the brand logo shortcode, tagline, contact
   details, and copyright — rewriting the pages but skipping the footer is
   exactly how a Fréscopa footer (logo + "© … Fréscopa") survives on an
   otherwise-rebranded portal. Rewrite the copy AND swap the logo shortcode
   in each. (Only the **shared root** nav/footer are off-limits; the
   `/<companyKey>` copies are in scope.) Never hand it "the whole site" or
   an un-prefixed path.

   **Preserve the login page's `welcome` section style — never flatten it.**
   The split-screen login (left brand panel / right sign-in) is driven
   purely by the `.section.welcome` section style (a `Section Metadata`
   `Style: welcome` on `/<companyKey>/public/welcome`) plus the
   `--welcome-panel-*` tokens from step 1. The rewrite MUST keep the
   `welcome` **section wrapper and its Section Metadata** intact and swap
   BOTH marks (`:<companyKey>-icon:` and `:<companyKey>-beans:`) — it must
   NOT collapse the page to plain paragraphs. A rewrite that drops the
   section style renders the login as a single off-brand column with broken
   marks (verified live). After rewrite, the published
   `/<companyKey>/public/welcome.plain.html` must still contain
   `<div class="welcome">` (i.e. `.section.welcome`).
   (The site-wide design tokens from step 1 are the deliberate global
   exception; this per-page content step stays scoped.)

   **Source-derived category contract — mandatory handoff to assets.**
   Before rewriting any Browse/category cards, derive one category contract
   from the source site. It is the only vocabulary shared by homepage cards,
   facet links, asset `productCategory`, and collections. Derive it from
   source-site navigation, product/category sections, URL paths, headings,
   nearby product text, and asset/page context. Do **not** hardcode
   brand-specific category examples in the skill, and do not choose a
   generic category set when source-site categories are clear. Normalize
   labels to stable lowercase slugs and keep `{slug, label, evidence}` for
   each category in the working notes handed to Step 5.

   Ask the customer to choose categories only when the source site is
   genuinely ambiguous after inspection. Otherwise state the decision
   plainly: "I found these usable categories from the source site: <derived
   categories>. I'll use them for cards, filters, asset metadata, and
   collections." Do not mix that answer with lint output, CSS details,
   copied-content bugs, branch mechanics, script names, or any other
   operator/debug narrative.

   **Also rewrite two things INSIDE those docs that a label-only rewrite
   misses (both verified broken live):**
   - **Internal links → company-scoped.** The copied docs carry links that
     still point at the shared root, and DA/docx import can emit them as
     `file://` URLs — e.g. the `nav` logo link was authored
     `href="file:////en/"`. The header only re-scopes links inside
     `.nav-brand`/`.nav-sections`, so a logo link in a `data-role="tools"`
     block stays `/en/…`, lands **outside** `/<companyKey>/`, and 404s.
     Rewrite every internal link in the copied `nav`/`footer`/`welcome` to
     drop any `file:` scheme and prefix the company folder: `/en/…` →
     `/<companyKey>/en/…` (the logo/brand link included). Do this for
     **every copied page, not just nav/footer/welcome** — the home page's
     category cards, "Browse" links, and hero CTAs also carry bare `/en/…`
     links that drop the company folder. After rewrite, **no** copied doc
     may contain a `file:` link or a bare `/en/…` link. (The worker now
     also self-heals a stray root-locale link — `/en/*`→`/<companyKey>/en/*`
     — so navigation no longer falls out of the folder, but scoping the
     links avoids a redirect flash and keeps the content correct.)
   - **Filter/facet slugs → the enrichment vocabulary.** The home "Browse
     by category" cards (and any curated filter links) encode the filter in
     the href as `…/search?facetFilters={"productCategory":{"<slug>":true}}`.
     A label-only rewrite renamed the card text (e.g. "Sedans", "SUVs") but
     left the **base slugs** (`coffee`, `machine`, `accessory`, `lifestyle`)
     in the href — so clicking a card filters on a value no asset carries
     and returns **0** results. Rewrite each card's `productCategory` (and
     campaign/channel) slug from the source-derived category contract, then
     hand that exact contract to Step 5 so the cards and tagged assets agree
     by construction. Never publish a card whose slug is not in the contract.
4. **Publish** — publish **only `/<companyKey>/...` paths** via Helix
   Admin (`admin.hlx.page` preview+publish with `HLX_ADMIN_TOKEN`), over
   exactly the documents copied in Step 3 and rewritten in step 3 above —
   **including the login page `/<companyKey>/public/welcome` and the
   `/<companyKey>/config` tree — which MUST include
   `/<companyKey>/config/access/application` and
   `/<companyKey>/config/access/users`** (without these the foldered
   portal's login is broken/unbranded). **The worker reads the
   COMPANY-scoped access sheets** (`companyBasePath()/config/access/*`, not
   the root ones) for login and permission gating, so if those sheets are
   missing/unpublished under `/<companyKey>` — or landed as `.xlsx` media
   instead of a `.json` sheet — login fails with "User not allowed to
   access this application" (verified live). This is **ours**, not excat's. It is **never**
   `not-applicable` — Step 3 already proved content exists. Build the
   publish list from the copied `/<companyKey>/...` paths — never "the
   whole site," never a root path. **Guard:** before publishing, assert
   every path is prefixed with `customer.daFolder`; abort if any isn't
   (the `guard-da-publish.sh` hook enforces this independently). Poll each
   job to completion and report confirmed per-path success/failure.
5. **Apply the demo scope config (`demo-company-set`)** — edit
   `cloudflare/src/config.js`: set **`DEMO_COMPANY: '<companyKey>'`** and
   **`DEMO_BASE_PATH: '/<companyKey>'`** (the same key as the branch, the
   DA folder, and the asset company). This is **mandatory and must be
   committed to the PR** — the per-PR worker (I3) is built from this file,
   so it is what makes the preview's company filter, `/<company>` routing,
   and `/<company>/public/welcome` login actually work.
   `.claude/skills/rebrand-portal/scripts/assets/enrich-assets.js` also writes both keys in Step 5, but
   do it here too so a frontend-only demo (no assets) still gets a scoped,
   working preview. Mark `demo-company-set` `done`.
6. **Land as one PR** — on `customer.demoBranch`. Finish tokens, assets,
   content, **and the `config.js` scope edit** first, stage everything,
   then commit → push → open the PR as one sequence. **The PR diff MUST
   include `cloudflare/src/config.js`** — if it doesn't, the deployed
   preview worker keeps the wrong company and root routing (the exact
   failure this flow fixes); verify the diff before opening. Per I3,
   **opening** the PR (not merging) is the finish line — the branch
   preview serves it; do not merge, never close/delete it (I5). If CI
   blocks, only fix checks that fail on your branch but pass on `main`.

Mark `rebranded`, `demo-company-set`, `published`, and `landed-via-pr`
`done` as each completes.

