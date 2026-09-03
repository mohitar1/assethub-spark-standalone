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
- **I4 — Deferring asset enrichment is a valid, complete end state.**
  Every demo runs `full` (rebrand + assets are both always in scope), but
  if the customer answers Entry flow Q2 with "leave enrichment for a later
  step," the demo is *done* once rebrand + upload (if applicable) land —
  don't hold the demo open chasing enrichment the customer explicitly
  deferred. This is different from *never* wanting assets — that option no
  longer exists; deferral only postpones *when* enrichment runs.
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
   (if the assets aren't already in the company's folder) and, unless the
   customer chose to defer it (Entry flow Q2), enrich the company's assets
   so they're searchable, scoped to the company (Step 5).
6. **`collections-created`** — once the company's assets are searchable,
   group them into ready-made collections (one per category), each scoped
   to the company so it shows/hides with the demo company filter (Step 6).
   Runs whenever enrichment actually completes — immediately for an
   enrich-now demo, or on the later follow-up request if enrichment was
   deferred.

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
  "schemaVersion": 4,
  "intent": "full",
  "customer": {
    "name": null,
    "companyKey": null,
    "demoBranch": null,
    "daFolder": null,
    "assetsLane": null,
    "assetsEnrichNow": null
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

Every demo is `full` — there is no other `intent` value. Step values are
`pending`, `done`, `blocked`, or `deferred` (`assets-enriched`,
`search-scoped`, and `collections-created` are `deferred` when the
customer chose to leave enrichment for a later step — see Entry flow Q2 —
and resume to `pending` on a later "now enrich the assets" follow-up
request).
`customer.companyKey` is the slug of `customer.name` (lowercase, hyphens);
`daFolder` is `/<companyKey>`. `customer.assetsLane` is
`enrich-existing` or `bring-in` (Entry flow Q1); `customer.assetsEnrichNow`
is `true`/`false` (Entry flow Q2 — always `true` for `bring-in`, since
pulling in samples with no labeling afterward isn't a sensible outcome).
Asset credentials and the AEM env id are **not** in state — they live in
the existing environment (Step 5).

## Skill source of truth

Only **`.claude/skills/rebrand-portal`** is maintained. This repo's
skill discovery reads `.claude/skills`, so do **not** keep a second
`.agents/skills/rebrand-portal` copy. If that duplicate appears, remove
it before editing or running the workflow; a stale duplicate can bypass
new gates such as Step 4g's color verification before assets.

## Entry flow — run first, every invocation

0. **State Step 1 first, then confirm the company name.**
   On a brand-new request (no state file, or `demo-confirmed` not yet
   `done`): say the one plain sentence from Step 1 (what will happen, in
   outcome language), then resolve and **confirm** `customer.name` (Step 2)
   before doing anything else. Never open with a question, and never
   silently default or guess the company name/slug from the source URL
   (e.g. inferring "microsoft" from a microsoft.com link) — if a tool error
   or missing info blocks asking everything at once, fall back to asking
   one thing at a time in order (Step 1 statement → company name), never
   skip ahead. **Do not ask about assets here** (see Entry flow point 2
   below) — Steps 1–4 (confirm, branch, DA copy, rebrand/publish/PR) need
   nothing about asset source or timing; asking Q1/Q2 this early front-loads
   a decision the customer can't yet see the payoff for, and interrupts a
   flow that would otherwise run straight through to the open PR.

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

2. **Ask Q1/Q2 immediately before Step 5, not in the entry flow** (skip any
   question the request already answers unambiguously). Plain outcome
   language, no internal terms (I1). Never ask "demo vs real portal" — the
   dedicated path is disabled; every request is a demo. If the customer
   explicitly asks for their own real, separate portal, say plainly that a
   dedicated environment is temporarily unavailable and you'll show it as a
   demo instead — a fresh copy of the site under their company name — then
   proceed. Never ask a "full vs. branding-only" question either — every
   demo always includes assets; the only open questions are *where the
   assets come from* and *when enrichment runs*.

   If the original request already answered Q1/Q2 unambiguously (e.g. "the
   assets are already in AEM Assets, enrich them"), record the answer in
   state up front and skip straight through Steps 1–4 to Step 5 without
   re-asking — the point is to not ask *before the customer needs to
   decide*, not to force a redundant re-ask when they already decided.

   **Q1 — asset source (always ask unless the request already says).**
   Address the customer as "you"/"your" — the person answering is who you're
   asking, not a third party being described.
   - "Are your assets already uploaded in AEM Assets?" → `assetsLane` =
     `enrich-existing`.
   - "Should I pull in some sample assets from your website instead?" (needs
     a source URL) → `assetsLane` = `bring-in`; `assetsEnrichNow` = `true`
     (bring-in always enriches after upload — there's no sensible reason
     to upload samples and leave them unlabeled).

   **Q2 — enrichment timing (ask only when Q1 = `enrich-existing`, unless
   the request already says).**
   - "Should I also label them now so they're searchable, or leave that
     for a later step?" → `assetsEnrichNow` = `true` or `false`.

   On a resumed request where rebrand is already verified `done` and
   `assetsEnrichNow` was `false`, no question is needed for a follow-up
   like "now enrich Acme's assets and build the collections" — just set
   `assetsEnrichNow` = `true` and route straight to Step 5, then Step 6.

   Never label an option with a step/phase name or a bare mechanic
   ("rebrand only," "publish"); every option states a concrete result the
   customer could see. Never say "DAM folder," "Adobe" (as a stand-in for
   the asset system — say "AEM Assets"), or any other internal-system term
   in the option text — I1 applies to the templates above too, not just to
   ad-libbed phrasing.

3. **Run the sequence** from the first non-`done` step. Honor the hard
   gate. Do not narrate the step list back to the customer.

## Agent invocation examples (operator-facing)

Use these to route user prompts; do not recite this table to the customer.

| User says | Route |
|---|---|
| "Create a demo portal for Acme using `https://www.acme.com` for the visual style and content direction. The assets are already in Adobe, enrich them." | Source site present; `assetsLane = enrich-existing`, `assetsEnrichNow = true`; enrich existing assets; automatically create collections after assets verify. |
| "Create a demo portal for Acme using `https://www.acme.com` for the visual style and content direction. The assets are already in Adobe." | Source site present; `assetsLane = enrich-existing`; ask Q2 (enrich now or leave for later) — don't assume. |
| "Create a demo portal for Acme using `https://www.acme.com` for the visual style and content direction. Pull sample assets from `https://www.acme.com/products`." | Source site present; `assetsLane = bring-in`, `assetsEnrichNow = true` (bring-in always enriches); automatically create collections after assets verify. |
| "Create Acme's demo portal using `https://www.acme.com` for the visual style and content direction, but leave enrichment for a later step." | Source site present; ask Q1 if not already answered; `assetsEnrichNow = false`; rebrand + upload (if applicable) land, `assets-enriched`/`search-scoped`/`collections-created` stay `deferred`. |
| "Now enrich Acme's assets and create the collections." | Resume: `assetsEnrichNow = true`; route straight to Step 5, then Step 6. |
| "Rebrand this for Acme." | Missing required source site; ask for Acme's source site so the look and content direction can be matched. |

Every route ends with collections once enrichment actually runs — either
immediately, or on the later follow-up if the customer deferred it. Do
not wait for the customer to ask for collections after assets are
searchable.

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

Each step below is a **summary only — it is deliberately incomplete.** The
full, mandatory checklist for a step lives in its `docs/step-*.md` file, and
that checklist contains gates, exit-code rules, and verification items that
are **not** repeated in the summary. Acting from the summary alone will skip
them and is a defect.

> ⛔ **MANDATORY READ GATE — applies to every step below.** The FIRST action
> you take when you enter a step is to **Read that step's `docs/step-*.md`
> file in full** (use the Read tool on the path in the step's 📄 line). Do
> **not** run any command, edit any file, delegate to any tool, or write any
> customer-facing message for a step until you have read its doc **in this
> session**. The summary is a table of contents, not the instructions. If you
> find yourself about to act on a step and have not read its doc this turn,
> stop and read it first. This is the single most important rule in this
> file — the step docs carry the failure-derived checks that the evals
> assert, and skipping them reproduces exactly the live breakages they exist
> to prevent.

Paths are repo-relative (`.claude/skills/rebrand-portal/docs/...`) so they
resolve whether cwd is the repo root or the skill dir, matching the existing
`docs/asset-enrichment.md` reference style.

---

## Step 1 — Confirm it's a demo (`demo-confirmed`)

Tell the customer in one plain sentence what will happen (copy the site
under their name, give it their look/content, share a portal link; the
original is never changed — I1). Mark `demo-confirmed` `done`.

▶ **Read now, before acting:** `.claude/skills/rebrand-portal/docs/step-1-2-branch.md`

## Step 2 — Company and branch (`branch-resolved`)

Resolve `customer.name` + `customer.companyKey` (apply I6 for empty/reserved
slugs). Resolve `{org}/{repo}` from the origin remote (this shared repo, not
a fork). Demo branch is `demo/<companyKey>`. **Always check for an existing
brand branch first and ASK continue-vs-new if one is found — never silently
reuse, recreate, or delete it (I5).** Record `customer.demoBranch`; mark
`branch-resolved` `done`.

▶ **Read now, before acting:** `.claude/skills/rebrand-portal/docs/step-1-2-branch.md`

---

## Step 3 — Copy existing DA content into `/<companyKey>` (`da-content-copied`)

**MANDATORY — never skipped, deferred, or assumed away.** Copy the site's
real DA content into `/<companyKey>` with the packaged
`scripts/da/copy-folder.sh` (never hand-rolled). Conclude "empty" **only**
from exit code `3` (authenticated list, zero docs); `404`/`403` is never
empty. Path-by-path verification, extensions preserved (access sheets must
land as `.json`, not `.xlsx`). On success set `customer.daFolder =
"/<companyKey>"` and mark `da-content-copied` `done`.

▶ **Read now, before acting** (script contract, exit codes, sheet-format &
nav checks): `.claude/skills/rebrand-portal/docs/step-3-da-copy.md`

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

▶ **Read now, before acting** (preflight, 4a token setup, 4b–4f delegation,
all checklists): `.claude/skills/rebrand-portal/docs/step-4-rebrand.md`

## Step 4g — Verification (hard gate before Step 5)

**A hard gate, not optional cleanup.** Verify against the deployed PR worker
in the current session: config.js scoped in the PR diff; background-color
*applied* check (computed == expected per landmark selector, zero
mismatches); full asset-color sweep; base-slug zero-residue; brand-residue
on copied DA docs; login two-panel/logo/favicon; link-scope & auth-gating;
facets-panel colors across every interactive state; folder-scope. If a
resumed state claims rebrand `done` but any 4g check fails, leave `assets-*`
pending and fix Step 4.

▶ **Read now, before acting** (every checklist item + known repeat misses):
`.claude/skills/rebrand-portal/docs/step-4g-verification.md`

---

## Step 5 — Upload and enrich the company's assets

**Preflight gate: all Step 4g checks must have passed in this session
before any `--dry-run` or live enrichment.** If `assetsLane`/`assetsEnrichNow`
aren't already known from the original request, ask Q1/Q2 now (Entry flow
point 2) — this is where those answers are first needed. Reuses the existing environment
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
to Step 6 automatically — unless `assetsEnrichNow` is `false`, in which
case leave `assets-enriched`/`search-scoped`/`collections-created`
`deferred` and stop here (I4).

▶ **Read now, before acting** (lanes, controller flags, enrichment path,
card visuals, verification): `.claude/skills/rebrand-portal/docs/step-5-assets.md`

---

## Step 6 — Build collections from the searchable assets (`collections-created`)

Runs **automatically after** `assets-enriched` + `search-scoped` complete
— one collection per `productCategory`, company-scoped, via
`scripts/assets/create-collections.js` (existing env, DM collections API,
always `--dry-run` first). Leave `deferred` only while
`assets-enriched`/`search-scoped` are themselves `deferred`. Marks
`collections-created`.

▶ **Read now, before acting** (controller flags, company-filter stamping,
verification): `.claude/skills/rebrand-portal/docs/step-6-collections.md`
