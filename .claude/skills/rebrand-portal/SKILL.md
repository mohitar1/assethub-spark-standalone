---
name: rebrand-portal
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

Only **`.claude/skills/rebrand-portal`** is maintained. This repo's
skill discovery reads `.claude/skills`, so do **not** keep a second
`.agents/skills/rebrand-portal` copy. If that duplicate appears, remove
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
   - "Set up <Brand>'s own copy of the site under its name, match the look
     and content direction from <Brand>'s website, and load in <Brand>'s own
     assets so they're easy to find by searching, filtering, and browsing
     collections" → `intent` = `full`.
   - "Just set up <Brand>'s copy with <Brand>'s look and content direction
     from <Brand>'s website for now — I'll load <Brand>'s assets and
     collections in a later step" → `intent` = `frontend-only` (assets steps
     and `collections-created` → `not-requested`).
   - "Something else" (free text).

   On a resumed request where the rebrand is already verified `done`,
   offer instead: "Load in <Brand>'s own assets so they're searchable and
   grouped into collections" → `intent` = `assets-only` (route straight to
   Step 5, then Step 6).

   Never label an option with a step/phase name or a bare mechanic
   ("rebrand only," "publish"); every option states a concrete result the
   customer could see.

3. **Run the sequence** above from the first non-`done` step. Honor the
   hard gate. Do not narrate the step list back to the customer.

## Agent invocation examples (operator-facing)

Use these to route user prompts; do not recite this table to the customer.

| User says | Route |
|---|---|
| "Create a demo portal for Acme using `https://www.acme.com` for the visual style and content direction. The assets are already in Adobe." | `full`; source site present; enrich existing assets; automatically create collections after assets verify. |
| "Create a demo portal for Acme using `https://www.acme.com` for the visual style and content direction. Pull sample assets from `https://www.acme.com/products`." | `full`; source site present; bring in sample assets from the named asset source; enrich; automatically create collections after assets verify. |
| "Create Acme's demo portal using `https://www.acme.com` for the visual style and content direction, but stop before loading assets." | `frontend-only`; source site present; assets and collections are `not-requested`. |
| "Now load Acme's assets from Adobe and create the collections." | `assets-only`; resume at Step 5; enrich existing assets; automatically run Step 6 after assets verify. |
| "Rebrand this for Acme." | Missing required source site; ask for Acme's source site so the look and content direction can be matched. |

Every full/assets route ends with collections unless the state says
`intent` is `frontend-only`. Do not wait for the customer to ask for
collections after assets are searchable.

## Operator setup (not customer-facing)

These are for whoever runs the session, not the customer — I1 still
forbids naming any of this in customer-facing prose.

**Experience Catalyst plugin.** Step 4 drives
`excat-complete-design-expert` from the `excat` plugin
(`excat-marketplace`), published from the internal Adobe repo
**`Adobe-AEM-Foundation/aem-experience-catalyst`**. Treat Catalyst as an
operator-environment dependency. The agent should install/enable it when
possible; a human can follow the same steps if confirmation or local access
is required. Full setup: `docs/excat-setup.md`.

Before Step 4 design work, determine the live session state, not a stale
cache. Claude Code and Copilot CLI keep separate plugin registrations.
Check the active CLI:

```
claude plugin list
claude skill list
```

- **Skill invokable** — if `excat-complete-design-expert` is available in
  the current session, proceed directly.
- **Installed but not enabled** — enable the existing plugin, restart if
  needed, and recheck:
  `claude plugin enable excat@excat-marketplace --project`.
- **Not installed** — use an existing local
  `aem-experience-catalyst` clone if present; otherwise clone
  `https://github.com/Adobe-AEM-Foundation/aem-experience-catalyst.git`.
  From that clone, run `npm run install:all` inside
  `resources/plugins/aem-excat-plugin/excat-marketplace`, smoke-check
  `excat/tools/excatops-mcp` with `npx .`, then install with Claude Code
  using the **absolute** marketplace path:
  `/plugin marketplace add <absolute-clone-path>/resources/plugins/aem-excat-plugin/excat-marketplace`
  and `/plugin install excat@excat-marketplace`.

Never write a machine-specific `/Users/...` plugin path into the repo, a
fork, or customer-facing text. Re-verify with `/plugin list` and
`claude skill list` after install/enable. If Catalyst still is not
invokable, mark `rebranded` `blocked`, state the setup action needed, and
pause. **Never hand-roll the rebrand instead of fixing the tool** — manual
`styles.css` edits are not a substitute and silently miss the content
rewrite and asset-color sweep.

**Publish guard hook.** `hooks/guard-da-publish.sh` is a `PreToolUse` hook
that blocks any DA/Helix publish whose target path is not under
`customer.daFolder`. It's defense-in-depth for Step 4's folder-scope rule.
This repo registers it for Claude Code in `.claude/settings.json`; Copilot
CLI still needs explicit hook registration. See `hooks/README.md`.


# The steps — summaries + where the full detail lives

Each step below is a **summary only**. The full, mandatory checklist for a
step lives in its `docs/step-*.md` file. **Before executing a step, read
its doc — do not run the step from the summary alone.** Paths are given
repo-relative (as `.claude/skills/rebrand-portal/docs/...`) so they resolve
whether cwd is the repo root or the skill dir, matching the existing
`docs/asset-enrichment.md` reference style.

---

## Step 1 — Confirm it's a demo (`demo-confirmed`)

Tell the customer in one plain sentence what will happen (copy the site
under their name, give it their look/content, share a portal link; the
original is never changed — I1). Mark `demo-confirmed` `done`.

📄 Full detail: `.claude/skills/rebrand-portal/docs/step-1-2-branch.md`

## Step 2 — Company and branch (`branch-resolved`)

Resolve `customer.name` + `customer.companyKey` (apply I6 for empty/reserved
slugs). Resolve `{org}/{repo}` from the origin remote (this shared repo, not
a fork). Demo branch is `demo/<companyKey>`. **Always check for an existing
brand branch first and ASK continue-vs-new if one is found — never silently
reuse, recreate, or delete it (I5).** Record `customer.demoBranch`; mark
`branch-resolved` `done`.

📄 Full detail: `.claude/skills/rebrand-portal/docs/step-1-2-branch.md`

---

## Step 3 — Copy existing DA content into `/<companyKey>` (`da-content-copied`)

**MANDATORY — never skipped, deferred, or assumed away.** Copy the site's
real DA content into `/<companyKey>` with the packaged
`scripts/da/copy-folder.sh` (never hand-rolled). Conclude "empty" **only**
from exit code `3` (authenticated list, zero docs); `404`/`403` is never
empty. Path-by-path verification, extensions preserved (access sheets must
land as `.json`, not `.xlsx`). On success set `customer.daFolder =
"/<companyKey>"` and mark `da-content-copied` `done`.

📄 Full detail (script contract, exit codes, sheet-format & nav checks):
`.claude/skills/rebrand-portal/docs/step-3-da-copy.md`

---

## Step 4 — Rebrand `/<companyKey>` + repo, publish, open the PR

**Gate: do not start — do not invoke `excat-complete-design-expert` or touch
any file — until both `customer.demoBranch` and `customer.daFolder` are set
(Steps 2 & 3 `done`).** One comprehensive delegation: design tokens +
full-palette rebrand via Catalyst, brand-asset/logo swap (all instances),
content-register rewrite scoped to `/<companyKey>` only, publish only
`/<companyKey>/...` paths, set the demo scope in `cloudflare/src/config.js`
(`DEMO_COMPANY`/`DEMO_BASE_PATH` = companyKey), and land one PR (open, never
merge — I3; never close/delete — I5). Token setup is Step 4a (`token.env`,
`DA_TOKEN` only). Marks `rebranded`, `demo-company-set`, `published`,
`landed-via-pr`.

📄 Full detail (preflight, 4a token setup, 4b–4f delegation, all checklists):
`.claude/skills/rebrand-portal/docs/step-4-rebrand.md`

## Step 4g — Verification (hard gate before Step 5)

**A hard gate, not optional cleanup.** Verify against the deployed PR worker
in the current session: config.js scoped in the PR diff; background-color
*applied* check (computed == expected per landmark selector, zero
mismatches); full asset-color sweep; base-slug zero-residue; brand-residue
on copied DA docs; login two-panel/logo/favicon; link-scope & auth-gating;
facets-panel colors across every interactive state; folder-scope. If a
resumed state claims rebrand `done` but any 4g check fails, leave `assets-*`
pending and fix Step 4.

📄 Full detail (every checklist item + known repeat misses):
`.claude/skills/rebrand-portal/docs/step-4g-verification.md`

---

## Step 5 — Upload and enrich the company's assets

**Preflight gate: all Step 4g checks must have passed in this session
before any `--dry-run` or live enrichment.** Reuses the existing environment
(no provisioning): the controller
`scripts/assets/enrich-assets.js` resolves DM creds from
`cloudflare/.secrets` and the AEM env id from `cloudflare/src/config.js`.
Enrich (default) or bring-in (`--source-url`); always `--dry-run` first.
Pass the Step 4 category contract via `--categories <slugs>` (one shared
vocabulary, no hardcoded list); every asset is mapped to exactly one contract
category. The run emits `report.cards` (label + blurb + facet href + proxy
image per category) and a **card gate** that fails on a zero-asset category or
fewer than `MIN_CARDS` cards. Author the copied `/<companyKey>/en/index`
carousel + cards rows from `report.cards` (via `update-index-cards.js`),
preserving the block wrappers. Scope the portal via config.js.
Marks `assets-uploaded`, `assets-enriched`, `search-scoped`. Then continue
to Step 6 automatically (unless `intent` is `frontend-only`).

📄 Full detail (lanes, controller flags, enrichment path, card visuals,
verification): `.claude/skills/rebrand-portal/docs/step-5-assets.md`

---

## Step 6 — Build collections from the searchable assets (`collections-created`)

Runs **automatically after** `assets-enriched` + `search-scoped` for `full`
and `assets-only` flows — one collection per `productCategory`, company-
scoped, via `scripts/assets/create-collections.js` (existing env, DM
collections API, always `--dry-run` first). Leave `not-requested` only when
`intent` is `frontend-only`. Marks `collections-created`.

📄 Full detail (controller flags, company-filter stamping, verification):
`.claude/skills/rebrand-portal/docs/step-6-collections.md`
