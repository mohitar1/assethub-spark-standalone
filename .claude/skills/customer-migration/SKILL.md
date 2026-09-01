---
name: customer-migration
description: Produce a demo copy of the AEM Edge Delivery asset portal for a company, rebrand it, enrich company assets, and create scoped collections using the existing environment.
---

# Customer Migration — Demo

This skill produces a **demo**: a copy of an existing AEM Edge Delivery
site, rebranded for a company and filled with that company's own assets,
delivered as **one open pull request** whose branch-preview URL is the
shareable result. It never touches the shared original and it **reuses the
existing environment end to end** — the existing repo, its Document
Authoring (DA) content, its publish access, and its asset credentials.
Nothing is provisioned.

A **dedicated real portal** (a customer's own new environment + Cloudflare
+ deployment) is a different thing and is **temporarily disabled**. Every
invocation is a demo. The dedicated/backend/deploy material is preserved,
disabled, in **`NON-DEMO-DISABLED.md`** — do not run it, and do not let it
into the demo path.

## Invariants (apply throughout — never restated per step)

- **I1 — Outcomes only, never internal terms.** Never expose this skill's
  name, its steps, `intent`, branch/folder mechanics, or tool names
  (`excat`, `da-copy-folder.sh`) to the customer — in prose or in any UI
  you render. Say "give the site a fresh look," "make a copy under the
  company's name," "make the assets easy to find." Avoid jargon the
  customer didn't use — "rebrand," "branch," "publish," "scope."
- **I2 — Never handle raw secrets in chat.** Never accept, echo, or read
  back a pasted token or secret. Tell the customer where to put it; read
  it only from the gitignored file at call time. If a secret appears in
  chat, treat it as compromised — tell them to rotate it (by name only,
  never reproducing the value) and don't use it.
- **I3 — The demo is delivered from the OPEN PR, not a merge.** DA content
  goes live when published; repo code reaches *production* only on merge —
  but the demo does not need production. **Every PR auto-deploys a
  per-branch Cloudflare worker** (`.github/workflows/build.yaml` →
  `spark-eds-pr-<N>` on the `<branch>.dev.frescopamedia.com` route); that
  worker is the demo URL — it does login/auth, proxies the portal search,
  and applies the company scope from the PR's bundled
  `cloudflare/src/config.js`. (The raw
  `https://<branch>--<repo>--<org>.aem.page/<company>/…` is only the
  content origin — no login or search there — so never hand it out as the
  portal.) The result is fully viewable straight from the open PR.
  **Merging is not required and not preferred.** Only call something "live
  in production" once merged; never gate demo completion on a merge.
- **I4 — Deferring the assets step is a valid, complete end state.** A
  customer who only wants the look/content copy (not assets yet) is *done*
  when that's done. Never hold the demo open waiting on work the customer
  didn't ask for.
- **I5 — Never destroy a pull request or its branch.** Never run
  `gh pr close`, `git push --delete`, `git branch -D`, `--delete-branch`,
  or anything that closes/deletes a PR or a branch that has (or had) a PR
  — not on error, not on a "start fresh" request, not to "clean up." An
  open PR is the deliverable (I3). If the customer wants to start over,
  **ask first**, then create a **new** branch and a **new** PR, leaving
  the existing one untouched.
- **I6 — Company key must not collide with site/runtime paths.**
  `customer.companyKey` becomes both the DA folder (`/<companyKey>`) and
  the asset folder (`/content/dam/<companyKey>`). Reject empty slugs and
  reserved route names such as `en`, `ja`, `config`, `public`, `api`,
  `auth`, `tools`, `scripts`, `styles`, `blocks`, `icons`, and `fonts`.
  Use a specific slug instead, e.g. `acme-demo`.

## The demo — one sequence (the single source of truth)

Every demo is these steps, in this order. This ordered list **is** the
workflow; the state file's `steps` object mirrors it 1:1. Do not restate,
re-plan, or reorder it — run it and mark each step `done` as you go.

1. **`demo-confirmed`** — say plainly it's a demo copy (Step 1).
2. **`branch-resolved`** — resolve the company; check for an existing
   branch for it; if one exists, **ask** continue-vs-new; create/checkout
   (Step 2).
3. **`da-content-copied`** — **MANDATORY**: copy the site's existing DA
   content into `/<company>` (Step 3).
4. **`rebranded` → `demo-company-set` → `published` → `landed-via-pr`** —
   rebrand the `/<company>` content + repo design, set the demo scope in
   `cloudflare/src/config.js` (`DEMO_COMPANY` + `DEMO_BASE_PATH` =
   companyKey — this scopes the PR's preview worker: company filter,
   `/<company>` routing, and login base), publish `/<company>`, open one
   PR (Step 4).
5. **`assets-uploaded` → `assets-enriched` → `search-scoped`** — upload
   and enrich the company's assets so they're searchable, scoped to the
   company (Step 5).
6. **`collections-created`** — once the company's assets are searchable,
   group them into ready-made collections (one per category), each scoped
   to the company so it shows/hides with the demo company filter (Step 6).

> **⛔ The one hard gate.** You may NOT invoke the design tool
> (`excat-complete-design-expert`) or edit any styling file until both
> **`branch-resolved`** and **`da-content-copied`** are `done`. Jumping
> from the entry question straight to design — with no branch and no DA
> content copied — is the single failure this skill exists to prevent.

## State file

The whole demo reads and writes one gitignored file,
`.internal/onboarding-state.json` (covered by the existing `.internal`
ignore — do not add a new rule). It is the resumability record. **Copy
this schema verbatim when creating it — do not hand-author a different
shape from memory:**

```json
{
  "schemaVersion": 3,
  "intent": "full | frontend-only | assets-only",
  "customer": {
    "name": null,
    "companyKey": null,
    "demoBranch": null,
    "daFolder": null
  },
  "steps": {
    "demo-confirmed": "pending",
    "branch-resolved": "pending",
    "da-content-copied": "pending",
    "rebranded": "pending",
    "demo-company-set": "pending",
    "published": "pending",
    "landed-via-pr": "pending",
    "assets-uploaded": "pending",
    "assets-enriched": "pending",
    "search-scoped": "pending",
    "collections-created": "pending"
  }
}
```

Step values are `pending`, `done`, `blocked`, or `not-requested`
(assets steps and `collections-created` are `not-requested` when `intent`
is `frontend-only`).
`customer.companyKey` is the slug of `customer.name` (lowercase, hyphens);
`daFolder` is `/<companyKey>`. Asset credentials and the AEM env id are
**not** in state — they live in the existing environment (Step 5).

## Skill source of truth

Only **`.claude/skills/customer-migration`** is maintained. This repo's
skill discovery reads `.claude/skills`, so do **not** keep a second
`.agents/skills/customer-migration` copy. If that duplicate appears, remove
it before editing or running the workflow; a stale duplicate can bypass
new gates such as Step 4g's color verification before assets.

## Entry flow — run first, every invocation

1. **Load and verify state.** If `.internal/onboarding-state.json` exists,
   read it, but before trusting a step marked `done`, spot-check one
   concrete fact against the repo (e.g. `rebranded` done → does the demo
   branch exist and carry brand tokens). A state file can be stale or
   inherited from another branch/customer. If the check disagrees, treat
   that step as needing confirmation, not authoritative. Otherwise resume
   at the first non-`done` step and don't re-ask answered questions. If
   the file is absent, create it with the schema above.
   **Step 5 resume guard:** if the next runnable step is asset enrichment
   but Step 4g was not verified in the current session, run Step 4g first.
   A `done` state value is not enough to start assets when live CSS,
   copied docs, PR scope, or the facets panel can still carry stale base
   branding.

2. **Ask one customer-facing question** (unless the request already makes
   it unambiguous). Plain outcome language, no internal terms (I1). Never
   ask "demo vs real portal" — the dedicated path is disabled; every
   request is a demo. If the customer explicitly asks for their own real,
   separate portal, say plainly that a dedicated environment is
   temporarily unavailable and you'll show it as a demo instead — a fresh
   copy of the site under their company name — then proceed.

   Offer only outcomes the state supports. On a fresh request:
   - "Set up <Brand>'s own copy of the site under its name, give it
     <Brand>'s look and content, and load in <Brand>'s own assets so
     they're easy to find by searching and filtering" → `intent` = `full`.
   - "Just set up <Brand>'s copy with <Brand>'s look and content for now —
     I'll load <Brand>'s assets in a later step" → `intent` =
     `frontend-only` (assets steps and `collections-created` →
     `not-requested`).
   - "Something else" (free text).

   On a resumed request where the rebrand is already verified `done`,
   offer instead: "Load in <Brand>'s own assets so they're searchable" →
   `intent` = `assets-only` (route straight to Step 5, then Step 6).

   Never label an option with a step/phase name or a bare mechanic
   ("rebrand only," "publish"); every option states a concrete result the
   customer could see.

3. **Run the sequence** above from the first non-`done` step. Honor the
   hard gate. Do not narrate the step list back to the customer.

## Operator setup (not customer-facing)

These are for whoever runs the session, not the customer — I1 still
forbids naming any of this in customer-facing prose.

**excat design plugin.** Step 4 drives `excat-complete-design-expert` from
the `excat` plugin (`excat-marketplace`), published from the internal Adobe
repo **`Adobe-AEM-Foundation/aem-experience-catalyst`** (the marketplace is
`confidential: true`; there is no public remote-marketplace source). Treat
excat as a **pre-installed operator-environment dependency** — a machine's
own local clone. **Detect it; never invent, hardcode, or `marketplace add`
a filesystem path.** A path like
`/Users/<someone>/…/aem-excat-plugin/excat-marketplace` is valid only on the
machine it came from — it must **never** be written into this skill, the
repo, a fork, an eval, or a customer-facing message. Determine excat's
actual state with the live CLI, never a cached config — Claude Code and
Copilot CLI keep separate plugin registrations, so a plugin enabled in one
is invisible to the other. Detect which CLI is running (`claude` vs
`copilot`) and use its commands:

- **Skill invokable** (`copilot skill list` / `claude plugin list` shows
  it loaded) → proceed. This is the expected state; do nothing else.
- **Not registered** → do **not** guess a path or add one yourself. Ask the
  operator once for permission, then hand them the **official** setup for
  **their own clone** (never a `/Users/...` path you fabricated): clone
  `https://github.com/Adobe-AEM-Foundation/aem-experience-catalyst`, then
  from inside that clone run, for their CLI:
  - Copilot: `copilot plugin marketplace add ./resources/plugins/aem-excat-plugin/excat-marketplace`
    then `copilot plugin install excat@excat-marketplace`
  - Claude: `claude plugin marketplace add ./resources/plugins/aem-excat-plugin/excat-marketplace`
    then `claude plugin install excat@excat-marketplace`
  (The `./resources/...` path is **relative to the operator's own clone**,
  the only portable form — not an absolute machine path.)
- **Installed but not enabled** (Claude only) →
  `claude plugin enable excat@excat-marketplace --project`.

Re-verify it actually loaded afterward (an install may need a restart —
say so and wait). **Never hand-roll the rebrand instead of fixing the
tool** — manual `styles.css` edits are not a substitute and silently miss
the content rewrite and asset-color sweep. If the operator declines, mark
`rebranded` `blocked`, state the one command needed, and pause.

**Publish guard hook.** `hooks/guard-da-publish.sh` is a `PreToolUse` hook
that blocks any DA/Helix publish whose target path is not under
`customer.daFolder`. It's defense-in-depth for Step 4's folder-scope rule.
This repo registers it for Claude Code in `.claude/settings.json`; Copilot
CLI still needs explicit hook registration. See `hooks/README.md`.

---

# Step 1 — Confirm it's a demo (`demo-confirmed`)

Before anything mechanical, tell the customer in one plain sentence what
will happen: you'll make a copy of the site under their company's name,
give it their look and content, and share it as a preview link — the
original is never changed (I1, no internal terms). Mark `demo-confirmed`
`done`.

---

# Step 2 — Company and branch (`branch-resolved`)

**Resolve the company name → `customer.name`**, and its slug →
`customer.companyKey` (e.g. Disney → `disney`). If the entry answer named
a brand, use it; otherwise ask now. Apply I6 here: if the slug is empty or
reserved, pick a non-colliding company slug such as `<brand>-demo` before
creating any branch, DA folder, or AEM asset folder.

Resolve `{org}/{repo}` from `git remote get-url origin` — this shared
showcase repo itself, not a fork. The demo branch is `demo/<companyKey>`.

**Always check for an existing brand branch first, and ASK if one is
found — never silently reuse or recreate it.** Check local and remote:

```
git branch --list "demo/<companyKey>"
git ls-remote --heads origin "demo/<companyKey>"
```

- **None exists** → create and check out `demo/<companyKey>`.
- **One exists** → **stop and ask the customer** (do not choose for them;
  never delete it — I5):
  - **Continue on the existing one** — check it out and keep building on
    it (its open PR keeps updating).
  - **Start a fresh one** — create a new, non-colliding branch
    (`demo/<companyKey>-2`, `-3`, …), leaving the existing branch and its
    PR intact.
  Ask in plain outcome language (I1), e.g. "I already have a version of
  Disney's copy in progress — keep building on that one, or start a
  brand-new one and leave the existing as-is?" Honor the answer.

Record the chosen branch in `customer.demoBranch`. All rebrand **code**
edits happen on this branch. Mark `branch-resolved` `done`.

---

# Step 3 — Copy existing DA content into `/<companyKey>` (`da-content-copied`)

**This step is MANDATORY. It must not be skipped, deferred, or assumed
away.** The demo's whole point is rebranding a *copy of the real DA
content*, so you must actually look at the real content with an
authenticated call — never guess whether it exists. The failure this
prevents: assuming DA is empty (because the checkout has no `fstab.yaml`,
or "it's just a demo") and skipping the copy. **You may conclude DA is
empty only from a real authenticated `list` that returned zero documents.**

This needs `DA_TOKEN` in `token.env` — collect it now (Step 4a) if it
isn't there yet.

**Use the packaged script — do not hand-roll `curl`:**

```
scripts/da-copy-folder.sh <org> <repo> <companyKey>
```

`<org>/<repo>` from `git remote get-url origin`; `<companyKey>` the slug
from Step 2. It reads `DA_TOKEN` from `token.env` (never printed) and:

- **Authenticated recursive list** of `/<org>/<repo>`, following the
  `da-continuation-token` paging header — the whole tree, not one page.
- **Recursive folder copy** of **only the three portal content trees —
  `en`, `config`, `public`** (nothing else at the root: no sibling company
  demo folders like `/disney` or `/urbn`, no stray files). `en` carries the
  authored pages plus `nav`/`footer`/`metadata` and the `reports`/`my-dam`
  subtrees; **`public`** carries the login/`welcome` page; **`config`**
  carries site config incl. `config/access` (the access-control sheet).
  Each is copied into `/<companyKey>/...` via
  `POST https://admin.da.live/copy/{org}/{repo}/{path}` (multipart
  `destination` field). The DA copy API is recursive per folder and pages
  large trees with **HTTP 206 + a `continuationToken`** that must be
  re-POSTed until **204** — the script does this loop; a hand-written
  `curl` almost always forgets it and copies only part of the tree. It
  copies, never moves. Re-runs are idempotent (the company folder is
  skipped). (The allowlist is `en config public`; override only via the
  `DA_COPY_ALLOW` env var if a site genuinely has more.)
- **Verification + self-heal** is **path-by-path**, not a count: it re-lists
  `/<companyKey>` and asserts **every** source document (matched *with its
  exact extension*) has a `/<companyKey>/…` counterpart. The extension is
  load-bearing and must be preserved byte-for-byte by the copy: a `.docx`
  must land as `.docx`, and — critically — a DA **sheet** (`config/access/
  application.json`, `companies.json`, `users.json`, notification sheets,
  etc.) **must land as `.json`**. In DA a `.json` is a structured *sheet*
  (editable in the sheet editor, published as `/<path>.json`); an `.xlsx`
  is an opaque *media asset* that opens in the media viewer and is **never**
  published as `.json`. So an access sheet that arrives as `.xlsx` is a
  **broken** copy even though a file is present — it will not publish and
  the portal's auth/permission lookups will 404. Any document the bulk
  folder copy missed — classically the **`config`** subtree carrying the
  **`access`** sheet — is **repaired by an individual per-file copy** from
  its exact source path, preserving the extension (never re-authored, never
  converted to a different type). Only if something is *still* missing after
  the repair does it fail (exit `4`) and list the paths. A count-only check
  is what previously let `public`/`config` come across empty while the total
  still "passed" — never weaken it back to a count, and never hand-author a
  replacement doc in place of the copy.

**Exit codes decide what "empty" means — the guard against false-empty:**
- `0` — copied and verified. Set `customer.daFolder = "/<companyKey>"` and
  mark `da-content-copied` `done`.
- `3` — **and only `3`** means genuinely empty (list returned HTTP 200,
  zero documents). Only then may you say there's nothing to copy; say you
  confirmed it via the authenticated list (name the org/repo checked).
- `1` / `2` / `4` — a real failure (bad/expired `DA_TOKEN`, mis-resolved
  org/repo `404`/`403`, copy error, verification mismatch). A `404`/`403`
  is **never** "empty." Do not mark the step done, do not proceed to
  Step 4, do not treat a code-only rebrand as sufficient — fix the
  token/path and re-run.

**Sheet-format check (config/access must be a JSON sheet, not XLSX media).**
After the copy, list `/<companyKey>/config/access` and confirm every entry
is a **`.json`** file:
```
curl -s -H "Authorization: Bearer $DA_TOKEN" \
  "https://admin.da.live/list/{org}/{repo}/<companyKey>/config/access"
```
Each row's `ext` must be `json` (e.g. `application.json`). If you see an
`.xlsx`, the source itself is broken — an `.xlsx` in DA is an opaque *media*
asset (opens in the media viewer, served as `application/octet-stream`) and
is **never published as `/config/access/application.json`**, so the portal's
auth/permission lookups (the worker reads the company-scoped
`fetchHelixSheet(companyBasePath()+'/config/access/application')`) will
`404` and login/gating breaks. A correct sheet is a `.json` in the EDS
sheet shape `{"total":N,"limit":N,"offset":0,"data":[…],":type":"sheet"}`
that opens in DA's **sheet** editor. Do **not** "fix" this by copying an
`.xlsx` — fix the *source* `config/access/*` to be `.json` sheets (the copy
is faithful, so a `.json` source yields a `.json` sheet automatically). Do
not mark `da-content-copied` done while any `config/access` entry is `.xlsx`.

**Nav/UI note.** How the copied pages resolve nav/footer depends on the
project's EDS config (a fixed root `nav` path vs. a per-folder
`metadata`-declared path). If nav resolves from a fixed root path, the
copied `/<companyKey>/nav` won't be picked up without a per-folder
`metadata` override — check the project's `head.html`/metadata convention
and, if needed, write a `metadata` entry on `/<companyKey>` pointing
`nav`/`footer` at the copied docs. Confirm the copied pages render their
nav/footer before treating this step done.

---

# Step 4 — Rebrand `/<companyKey>` + repo, publish, open the PR

**Gate — do not start until both `customer.demoBranch` and
`customer.daFolder` are set** (Steps 2 and 3 `done`). Do not invoke
`excat-complete-design-expert` or touch any file until both are set.

## Step 4a — Content-authoring access (`token.env` — the only setup)

The only access setup is a gitignored `token.env` at the repo root, two
lines, `KEY=value`, no quotes:

- **`DA_TOKEN`** — read/write Document Authoring content (Step 3 copy,
  Step 4 rewrite/publish).
- **`HLX_ADMIN_TOKEN`** — call Helix Admin (preview, publish, status).

Send this exact message (don't paraphrase, don't add any settings/toggle/
permissions step — none exists for this flow):

> "Before I start, create a file called `token.env` in the project root
> with these two lines (I'll never ask you to paste these in chat):
> `DA_TOKEN=<your Document Authoring access token>`
> `HLX_ADMIN_TOKEN=<your Helix Admin token>`
> Let me know once it's there."

Then check the file exists (never read/log its contents — I2) and confirm
it's gitignored; if `.gitignore` lacks a `token.env` entry, add one.
Access is exactly these two tokens — there is no web app, settings screen,
or permissions/admin toggle to ask about. Never send the customer looking
for one.

**How the customer gets each value** (give these steps if asked):

- **`DA_TOKEN`** (Document Authoring / Adobe IMS token): sign in at
  `https://da.live`; DevTools → Application → Local Storage →
  `https://da.live`; copy the IMS access token (key containing
  `accessToken`/`access_token`). Short-lived — on `401`, re-auth and grab
  a fresh value.
- **`HLX_ADMIN_TOKEN`** (Helix Admin API key — not a site-access token):
  1. Get `{org}`/`{site}` from the Helix URL
     `https://main--{site}--{org}.aem.page`.
  2. Sign in at `https://admin.hlx.page/login/{org}/{site}/main` with an
     admin/config_admin account.
  3. DevTools → Cookies for `admin.hlx.page` → copy `auth_token`.
  4. Mint a reusable key:
     ```
     curl -s -X POST \
       -H "x-auth-token: <auth_token>" \
       -H "Content-Type: application/json" \
       -d '{ "description": "customer-migration rebrand", "roles": ["admin"] }' \
       https://admin.hlx.page/config/{org}/sites/{site}/apiKeys.json
     ```
     The response `value` is `HLX_ADMIN_TOKEN` (shown once — save it now).

Known quirk: a `admin.hlx.page` preview/publish can `401` even with a
valid `DA_TOKEN` — forward the token via an
`x-content-source-authorization` header rather than assuming it's wrong.

Also confirm the brand inputs before the delegation: the new brand name
(`customer.name`), the source site to extract the look from (if any), and
that the customer wants the full scope — design tokens AND asset colors
AND content-register rewrite AND publish AND landing via PR. Don't proceed
on a vague "update the styles."

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
   those backgrounds survive off-brand. Name the base brand slug present
   in the copied content (here `frescopa`) so the agent knows exactly what
   to replace.
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
     and `--welcome-tagline` (the panel tagline string). Leaving them
     unset keeps the frescopa coffee panel + "world's finest coffee"
     tagline on the customer's login.
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
        carries `aria-label="Frescopa"` (and `fill="#eaa33a"`) — a giveaway
        it wasn't replaced.
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
     campaign/channel) slug to the company's real category slug, and make
     that same list the **single source of truth** the enrichment step uses
     as its `--product-category-vocab` (Step 5), so the cards and the tagged
     assets agree by construction. Record the chosen category slug list to
     hand to Step 5.
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
   `scripts/agent/enrich-assets.js` also writes both keys in Step 5, but
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

## Step 4g — Verification (before declaring the rebrand done)

This section is a **hard gate before Step 5**, not optional cleanup. Do not
invoke `scripts/agent/enrich-assets.js`, create collections, or mark asset
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
   FAIL, not a pass. **Explicitly grep these exact base surface names — all
   verified still-cream live:** `--light-color` and its hex `#F4E9DC`
   (case-insensitive), the hardcoded facets/search-panel cream `#FBF1EA`,
   `frescopa-background` (the `.frescopa-background-*` section classes),
   and `backgrounds/big.svg`. Any of these still present with the
   frescopa cream value is the "filter background off-brand" gap.
   Every base surface token and decorative base-brand background must be
   gone. Also confirm the welcome-panel tokens were set (see item 5).
   Also grep the old action reds that commonly survive through component
   overrides: `#95351D`, `#7a2b17`, and every other red/gold value in the
   token diff. Any remaining hit must be either changed to a semantic token
   from the new palette or explicitly justified as a deliberate new-brand
   choice; do not classify these old brand reds as neutral chrome.
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
3. **Grep the base brand slug** (`frescopa`) — case-insensitive, across
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
   `--welcome-tagline`; otherwise the login's left panel keeps the frescopa
   coffee colour, bean mark, and "world's finest coffee" tagline (the CSS
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
the base brand's name (`Fréscopa`/`frescopa`), its old logo shortcode
(`:frescopa-icon:`), its taglines/contact (`assets@frescopa.coffee`,
"Premium coffee…"), or its copyright (`© … Fréscopa`). Any hit means that
doc was skipped in item 3 of the delegation — go rewrite it and republish.
Also assert **every** remaining icon shortcode in those docs resolves to an
**existing** `/icons/<companyKey>-*.svg` (a shortcode pointing at a missing
icon renders the empty circle seen live), and that the repo `favicon.svg`
no longer carries the base marker (`aria-label="Frescopa"` / `#eaa33a`).
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
search page with the filter panel open and verify the computed panel
background, secondary button hover state, and search-results theme tokens
come from the new palette/semantic variables. Do not proceed to Step 5
while any stale base-brand cream/red is visible there; this is the common
gap where the hero looks rebranded but the actual searchable-assets UI
still carries the old brand.

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
on the preview URL (no merge needed); the new brand name and content
highlights; any follow-up (e.g. a placeholder logo pending the real
asset). Then, unless `intent` is `full`, ask whether to load the assets in
now or stop here — stopping is a valid end state (I4).

---

# Step 5 — Upload and enrich the company's assets

## Step 5 preflight — rebrand verification gate

Before any `--dry-run` or live asset enrichment, assert all of these are
true in the current session: Step 4g passed on the deployed PR worker;
`cloudflare/src/config.js` is scoped to the company; the old cream/filter
values and old action reds are gone or intentionally justified; the
facets panel computed background and secondary hover state use the new
semantic palette; and the category-card slugs to hand to
`--product-category-vocab` are known. If any check is missing or stale, go
back to Step 4g and leave the asset steps pending. Do not treat asset
enrichment as a way to "move forward" past an unverified rebrand.

Make the customer's own assets show up in the portal and be **findable** —
searchable by what's written about each and filterable by facets
(Category, Campaign, Channel, Keywords) — and scope the portal to show
**only** this company's assets. Customer-facing wording stays outcomes-only
(I1): "bringing in <Brand>'s assets and making them easy to find by
searching and filtering on what's in each one." Two lanes:

- **Enrich-existing (default)** — the assets already sit in the company's
  AEM folder; this labels them so they surface in search and facets.
- **Bring-in (opt-in)** — the customer named a source website; pull sample
  images and linked documents from it into the folder first using the AEM UI's
  repository blob-upload API, then label them the same way.

## Existing environment — no collection, no provisioning

Step 5 **reuses the existing environment**. The asset controller
`scripts/agent/enrich-assets.js` resolves everything itself at call time:

- **Credentials** from `cloudflare/.secrets` (`SPARK_DM_CLIENT_ID`,
  `SPARK_DM_CLIENT_SECRET`, and/or a pre-issued `AUTHOR_SPARK_IMS_TOKEN`)
  — the existing repo already has these. **No new secret, no credential
  collection, no tier/boot/deploy.**
- **AEM env id** from the repo's own config
  (`cloudflare/src/config.js` → `AEM_ENV_ID`), via `resolveAemEnvId`.

If `cloudflare/.secrets` is missing the DM creds, the script errors
clearly — in that case ask the customer to fill `cloudflare/.secrets` per
`cloudflare/.secrets.example` (I2 — they add it themselves; never paste in
chat). **Do not** run any backend-onboarding/boot flow — that is the
disabled dedicated path.

## Run the controller

```
node scripts/agent/enrich-assets.js \
  --customer-key <companyKey> \
  [--dam-path /content/dam/<companyKey>] \
  [--bring-in --source-url <url>] \
  [--dry-run] [--force] \
  [--secrets-file cloudflare/.secrets]
```

- `<companyKey>` is the same slug as Steps 2–4 (`customer.companyKey`) —
  it drives both the DAM folder `/content/dam/<companyKey>` and the
  `company` scope value; they are the same value by construction. The
  controller rejects reserved route keys and any `--dam-path` outside
  `/content/dam/<companyKey>`.
- Default lane is enrich-existing; `--bring-in --source-url <url>` selects
  the cherry lane (auto-creates the folder through
  `/adobe/repository/content/dam;api=create;path=<companyKey>;intermediates=true`,
  then uploads each file with the repository create → block_upload →
  presigned-blob PUT → block_upload_finalize flow captured from the AEM UI
  HARs). **Always `--dry-run` first**
  (enumerate → read → generate → normalize, emitting intended writes
  without writing) — review the printed category/channel values — then run
  live. `--force` re-labels already-labelled assets. See
  `scripts/agent/README.md` for the full flag list and offline `--fixture`
  mode.

The controller does the per-asset work (bounded concurrency, idempotent):
**`assets-uploaded`/`assets-enriched`** — for each asset it generates a
title, description, keywords and, where inferable, category/campaign/
channel, stamps the company scope value, stamps
**`allowedCountries=global`**, marks it approved, writes the metadata
(bulk where possible, retrying on conflict), and relies on
**`dam:status=approved`** for Delivery visibility. Do not run a separate
asset publish stage. The `allowedCountries=global` stamp is not optional:
the worker's country authz clause
(`cloudflare/src/origin/dm.js`) hides any asset whose `allowedCountries`
doesn't include the viewer's country, so an untagged asset returns **0
results** for a country-scoped user (verified-broken live). Every enriched
asset is tagged `global` so it is visible regardless of country.

**Category and Channel are free text, not a fixed enum.** The portal's
search config declares them as plain string buckets — whatever distinct
values exist become the filter options. Default: keep the generator's own
guesses (`normalize.js` clamps length, does not drop). Only if the
customer explicitly gave a small fixed set do you pass
`--product-category-vocab` / `--channel-vocab` to map-or-drop against
exactly that list. **Never invent a curated vocabulary and silently apply
it** — that once made an entire run's Category/Channel come back empty.

**Exception — curated category cards make the vocab MANDATORY.** If Step 4
rewrote the home "Browse by category" cards to specific `productCategory`
slugs (it does), those slugs ARE the confirmed fixed set: pass them as
`--product-category-vocab "<that exact list>"` so every asset's
`productCategory` maps into a slug a card actually links to. Skipping this
is the "coffee (0)" failure verified live — the card links `productCategory:coffee`
while the assets carry free-text values, so every card returns 0. The card
slugs (Step 4) and the enrichment vocab (here) MUST be the same list.

## Scope the portal to this company (`search-scoped`)

So the demo shows **only** this company's assets, the scope lives in
`cloudflare/src/config.js`: `DEMO_COMPANY: '<companyKey>'` (search filter)
and `DEMO_BASE_PATH: '/<companyKey>'` (routing/login base) — default
`null`/`''` = unchanged. `scripts/agent/enrich-assets.js` writes both keys
automatically during enrichment; if Step 4 already set them (it should),
confirm they equal `<companyKey>`. The worker injects a
`company = <companyKey>` filter into every search. **This edit must be in
the PR** — the per-PR preview worker (I3) is built from this file, so it is
what scopes the shared preview URL, not just local dev. It also applies
locally on the next `npm run dev` restart. No production merge /
`wrangler deploy` is needed — the PR's own worker deploy already serves
it.

## Verify (before marking Step 5 done)

Confirm the **visible outcome** in the running portal, not just that calls
returned success:

1. Searching words from an asset's generated title/description returns it.
2. Open the Category filter (and Campaign/Channel/Keywords if configured)
   and confirm buckets exist for the written values with **non-zero
   counts** — e.g. `Movies & Shows (N)`, `N ≥ 1`, not `(0)`. A bucket
   stuck at `(0)` after labelling/approval is this step's known failure
   (values dropped or not indexed) — re-check the vocab decision and
   confirm the assets carry `dam:status=approved`, then retry after indexing.
3. **Every home category-card slug is a live, non-zero bucket.** For each
   `productCategory` slug the Step-4 category cards link to, click that card
   on the preview and confirm it returns **> 0** assets (not the "coffee
   (0)" failure). If any card yields 0, the card slug and the enrichment
   vocab disagree — reconcile them (same list) and re-enrich/republish.
4. **Country visibility.** Read one enriched asset's metadata and confirm
   `allowedCountries` includes `global`; confirm a country-scoped demo user
   (not just an admin) gets non-zero search results.
5. Filtering by a bucket narrows results to matching assets, and only this
   company's assets appear.

Mark `assets-uploaded`, `assets-enriched`, `search-scoped` `done` once all
pass.

**Completion report** (I1, outcomes only): which assets are now in the
portal and searchable; that filtering works (name the facets that lit up);
that the demo shows only this company's assets; any per-asset items that
couldn't be brought in. The demo is shareable **without merging** — the
open PR's branch-preview URL serves the rebranded, company-scoped portal;
that link is the deliverable. Promoting to production (merge) is optional
and not the finish line (I3); never close/delete the PR (I5).

---

# Step 6 — Build collections from the searchable assets (`collections-created`)

Once Step 5's assets are searchable, turn them into **ready-made
collections** so the demo opens with the company's assets already
organized — one collection per category (the same `productCategory` slugs
the home cards and enrichment vocab use). Customer-facing wording stays
outcomes-only (I1): "grouping <Brand>'s assets into collections so they're
ready to browse by category." Runs **after** `assets-enriched` and
`search-scoped` are `done` — the assets must be approved and index-visible
before they can be collected.

## Existing environment — no provisioning

Like Step 5, Step 6 **reuses the existing environment**. The controller
`scripts/agent/create-collections.js` resolves everything itself: DM
technical-account creds from `cloudflare/.secrets` (`SPARK_DM_CLIENT_ID`/
`SPARK_DM_CLIENT_SECRET`) and the AEM env id from `cloudflare/src/config.js`
(`AEM_ENV_ID`). Collections live on the **delivery / Content Hub tier**, so
this uses the **DM collections API — not the author API** Step 5 writes
metadata with. **No new secret, no provisioning, no author writes.**

## Run the controller

```
node scripts/agent/create-collections.js \
  --customer-key <companyKey> \
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
`not-requested` when `intent` is `frontend-only`).

**Completion report** (I1, outcomes only): which collections now exist and
what each groups; that they carry only this company's assets. The open PR's
branch-preview URL remains the deliverable (I3); never close/delete the PR
(I5).

---

# Publish guard hook (folder-scoped publish enforcement)

`hooks/guard-da-publish.sh` is a `PreToolUse` hook that **blocks any DA /
Helix publish whose target path is not under `customer.daFolder`**
(`/<companyKey>`), enforcing Step 4's folder-scope rule mechanically.
Fail-safe: before Step 3 sets `daFolder`, all DA/Helix publish writes are
blocked. It is **defense-in-depth, not a sandbox** — pattern-based over
each tool call's explicit path args (which is why Step 4 mandates passing
the `/<companyKey>/…` path list), so it can miss unusual command shapes or
paths a wrapper builds internally. It does not touch Step 5's AEM asset
publishes (different host). It is registered for Claude Code by
`.claude/settings.json`; Copilot CLI still needs explicit hook registration
(operator setup, like the excat plugin).
