# NON-DEMO (DISABLED) — Dedicated real-portal onboarding + deploy

> ⛔ **DISABLED. Do not run any of this for a demo.** Everything below is
> the *dedicated real-portal* path: standing up a customer's own separate
> environment (Node/tier/boot), collecting Cloudflare/Content-Hub
> credentials, and deploying to a hosted `.aem.live` address. The demo
> flow (see `SKILL.md`) reuses the **existing** environment end to end and
> never needs any of this — no credential collection, no boot tier, no
> deploy. This material is preserved here, disabled, for the day the
> dedicated path is re-enabled. The demo must never route into it.
>
> If a customer explicitly asks for their own real, separate portal, tell
> them plainly it's temporarily unavailable and offer the demo instead
> (`SKILL.md`, entry flow) — do **not** execute anything in this file.

---

## Companion file: customer-config intake (Phase B only)

`.internal/customer-config.json` (also gitignored, same convention) holds
non-secret Cloudflare identity/resource values the customer must look up
themselves. Generated in the deploy stage (`deploy.md`, step D.2), and
only when the customer actually wants to deploy — not needed to run
locally. Not used by Phase A.

---


# Phase B — Backend onboarding

Get the customer's forked copy of Assets Hub Spark booting locally, with
a correctly reported auth state and real search working against their
own Adobe Content Hub environment — and make sure every file in the repo
that currently identifies the *upstream template* (its GitHub org/repo,
Cloudflare worker/account/resource ids, domain) instead identifies the
*customer's own fork*. Never creates cloud resources itself, never
deploys, and never stores or transmits real secret values (I2) — edits
local, gitignored files, writes non-secret resource identifiers the
customer supplies, and tells the customer where to put actual secrets.

Branding/content is Phase A, not repeated here. This phase runs
independently of whether Phase A ran (the entry flow already resolved
that); branding remains available later if skipped.

**Never hardcode this template's own identity.** Nothing in this phase's
own logic should assume the literal strings `assethub-spark`,
`aem-showcase`, `spark-eds`, `spark.aem.media`, or any other value found
in the inventory below. Always *derive* the current ("old") values by
reading the fork's own files at run time, and *derive* the new values
from what the customer supplies.

## B.1: Node version check (`node-version-check`)

Read `.nvmrc` at the repo root for the required Node major version. Run
`node --version` and compare. If it doesn't match, stop and tell the
customer to switch (e.g. `nvm use`) before continuing — do not proceed on
a mismatched version, since `npm install` will emit engine warnings and
dependencies (wrangler, vite, etc.) may misbehave silently.

Once matched: if `cloudflare/node_modules` is missing, run `npm install`
at the repo root (recurses into `cloudflare/` via `postinstall`). Mark
step `done`.

## B.2: Fork identity resolution (`fork-identity-resolved`)

Do not ask the customer for their GitHub org/repo — derive it:

```
git remote get-url origin
```

Parse `{org}/{repo}` from the URL. Write these into `customer.githubOrg`
/ `customer.githubRepo` in the state file (skip re-deriving if Phase A
already populated these). Mark step `done`.

If there is no `origin` remote, ask the customer directly instead, then
proceed the same way.

## B.3: AEM Code Sync verification (`code-sync-verified`)

Probe `https://main--{repo}--{org}.aem.page/en/` (a content path, **not**
the bare `/`, which 404s even when Code Sync works — see `local-run-plan.md`
for why). `curl -sI` for headers is enough. Judge by the response:

- **200** → installed and working. Mark `done`.
- **404 with an `x-error: Lambda:` header** → installed, just nothing
  published at this path yet. Don't tell them to install anything;
  content publishes separately (Phase A or their own DA). Mark `done`.
- **404 without that header** (or "site not found") → genuinely not
  installed. The customer must install the AEM Code Sync GitHub App on
  their fork themselves (the agent can't install a GitHub App on their
  org) — point them to aem.live docs (look up the URL). Mark `blocked`
  and stop; a fork without Code Sync silently serves the template's demo
  content via the `aem up` fallback proxy.

## B.4: Helix URL and README correction (`helix-url-and-readme-corrected`)

Always runs, whatever the customer wants next — no Cloudflare account,
credentials, or intake file needed. A pure text substitution from B.2/B.3
values; it matters even for a preview-only customer, so their `aem up`
and README point at their own fork.

Using the org/repo from B.2:

- Repoint `AEM_PAGES_URL` in `local.sh` (the line with its `:-` default)
  to `https://main--{repo}--{org}.aem.page`.
- Repoint `HELIX_ORIGIN` in **both** `[env.production.vars]` and
  `[env.branch.vars]` of `cloudflare/wrangler.toml` to
  `https://main--{repo}--{org}.aem.live`.
- Correct `README.md`'s Live/Preview URLs and its `AEM_PAGES_URL` example
  row to the same values.

Do not touch `local.sh`'s placeholder `git remote add origin` line — it
only runs inside a guard for repos with no `origin` at all, which is not
this customer's situation (they have a real fork with a real remote).

Show the customer the before/after for these few lines, apply it, and
mark step `done`.

## B.5: Local-run tier choice (`tier-selected`, sets `scopeChoice`)

**Branch on `customer.deployTarget`** (set at entry, always `"shared"`
while the dedicated path is disabled — never re-ask it here):

- **`"shared"` (demo — the active path)** — **no tier menu.** The demo
  runs a **minimal local run** whose only purpose is to verify the
  company asset filter (Phase C's `DEMO_COMPANY`) locally. Set
  `scopeChoice` to `"local-no-login"` directly (no menu, no question) and
  mark `tier-selected` `done`, then run only the minimum:
  - **B.1** (node + `npm install`) and **B.4** (Helix URL/README
    correction) — as written.
  - **B.7** (Content Hub creds) — required, since Phase C's enrichment and
    the local filter check both need real search against Content Hub.
  - **B.9** in `local-no-login` mode — apply the `DISABLE_AUTHENTICATION`
    bypass so the operator can browse the local run without a login
    (`auth-mode-applied` → `done`). No Entra/real sign-in for a demo. (If
    the branch is later merged for a shareable link, the deploy stage's
    D.1 gate re-comments this bypass before it goes live.)
  - **B.11** (minimal `npm run dev` boot) — just enough to view the
    company-scoped search; this is where Phase C's C.8 verification runs.
  - **Skip the entire deploy stage** unless the customer later opts to
    merge the branch for a shareable link (Phase C completion offer).
  - **B.2/B.3 caveat:** B.2 still resolves org/repo; for B.3, since this
    is the shared showcase repo (Code Sync already installed), never tell
    the customer to install a GitHub App — treat the 200/404-Lambda check
    as `done` on its own.
  Set `phases["backend-onboarding"].status` to `"done"` once the minimal
  run is verified.
- **`"dedicated"` (real portal) — disabled for now.** This branch is
  dormant reference material; the entry flow never sets `"dedicated"`
  while the dedicated path is off. (If somehow reached: it would go
  straight to `"local-no-login"` with no menu, deferring Entra to
  `deploy.md` D.6.5.)

The three-way menu below is **unreachable in normal operation** — the
active demo path uses the minimal run above, and the dedicated path is
disabled. It's kept only as a **compatibility fallback**, if
`deployTarget` is somehow unset here (should not happen):

There are three genuinely different ways to run this locally, at very
different setup cost. Offer all three in plain outcome language (I1). Use
wording like:

> "There are three ways I can get this running for you:
>
> **1. Just show me the new look** — I'll start it up so you can click
> through your updated pages right away. Nothing needed from you.
> Search and sign-in won't work yet — it's a visual preview.
>
> **2. Get it actually working, skip sign-in for now** — real search,
> real assets and thumbnails, browsing your own content, running on your
> machine without making you set up a login. I'll need two values from
> your Adobe Content Hub for this. (Reports and notifications still need
> the deployed version — those won't work locally.)
>
> **3. The full experience, with real sign-in** — same as option 2, plus
> your real Microsoft sign-in so it behaves exactly like production. This
> needs a bit of setup on Microsoft's side from you or your IT team.
>
> Most people start with 1 or 2. Which sounds right?"

Map the answer and record it in
`phases["backend-onboarding"].scopeChoice`: option 1 → `"preview"`,
option 2 → `"local-no-login"`, option 3 → `"local-login"`. Mark
`tier-selected` `done`.

**Honest limits for options 2 and 3 — state at choice time (call this
"the local limits" where referenced later).** These genuinely work:
search, asset thumbnails and previews, the collections list, and the
header/user widget (shows a "Local Dev" user). These do **not** work
locally and need the deployed backend: notifications (the bell), the
reports/asset-activity dashboards, and search/analytics reports — they
error or come back empty; opening a collection you don't own can be
denied. Don't oversell option 2 as "everything works."

### If `"preview"`

Running `npx aem up` alone serves the site's raw EDS pages directly and
does not start the Cloudflare Worker at all — `local.sh` runs the AEM dev
server and the worker as two independent processes, and everything in
`cloudflare/src/auth.js`/`index.js` (session cookies, Entra login,
`DISABLE_AUTHENTICATION`) lives only inside the worker. So preview needs
no secrets, no Content Hub credentials, no Entra app, and no deploy steps.
Start it, let them click around, and stop here. Per I4, if `"preview"` is
all they want the phase is `done`; if they signalled they want more, leave
it `in_progress`.

### If `"local-no-login"`

Proceed through the local-run steps: B.7 (Content Hub creds) → B.9
(apply the auth bypass) → B.11 (boot & verify). **Skip the entire deploy
stage** — none of the Cloudflare-account intake, identity rename, or
remote push is needed to run locally. Placeholder resource ids in
`wrangler.toml` are fine for local dev (miniflare simulates the
bindings).

### If `"local-login"`

**Fallback-path option only** — never reachable for a normal dedicated
customer under the branch above, since that branch always resolves to
`"local-no-login"` directly. Proceed: B.7 (Content Hub creds) → B.9 (real
Entra, bypass left off) → B.11 (boot & verify). Same skip of the deploy
stage.

### Re-entry / changing the choice later

If the customer previously chose a lighter option and now wants more
(same session or a future one): read `scopeChoice`, proceed directly to
the next needed step for the new tier, saying only the outcome (I1) —
*"Good — since you're already running locally, next I'll wire up real
search, which needs two values from your Content Hub."* Update
`scopeChoice`. A later request to actually deploy moves into the deploy
stage (below), which is otherwise never entered.

# Phase B — local run (B.7-B.11)

These steps get the portal running locally at the tier B.5 selected.
They are reached for `"local-no-login"` and `"local-login"` (and are
what a later upgrade from `"preview"` runs). None of them needs a
Cloudflare account, the intake file, or the identity rename — those are
deploy-only (the separate stage further below).

## B.7: Content Hub credential collection (`content-hub-creds-collected`)

**First, branch on `customer.deployTarget`** (set at entry, step 2 — never
re-ask it here):

- **`"shared"` (demo)** — skip the rest of this step's collection
  entirely. Confirm the values already present in `cloudflare/.secrets`
  and `customer.aemEnvId` (the same shared environment other demo forks
  already use) still work — a quick probe (C.2's read check is enough,
  called early) rather than a fresh ask. Mark step `done` once confirmed.
- **`"dedicated"` (real portal)** — proceed with the rest of this step
  exactly as below: real, new credentials for this customer's own
  environment.

As mentioned at the tier choice, real search needs two values from the
customer's Content Hub — collect them now. Ask for:

- **`AEM_ENV_ID`** — their AEM Program + Environment ID, `pXXXX-eYYYY`.
- **Content Hub OAuth Server-to-Server credentials** — client ID and
  secret, from an Adobe Developer Console project with access to that
  delivery environment's Dynamic Media / Content Hub API.

Per I2, don't take secret values in chat:

1. Tell them to create `cloudflare/.secrets` (gitignored) from the
   template documented in `cloudflare/README.md` / root `README.md`.
2. Tell them exactly which two lines to add: `SPARK_DM_CLIENT_ID="..."`
   and `SPARK_DM_CLIENT_SECRET="..."`.
3. Confirm they've done it — don't read the file's contents to "verify."

**If the customer pastes a secret into chat anyway (I2):** tell them that
value is now compromised and to rotate/regenerate it in the Adobe Developer
Console, then put the *new* value into the gitignored **`cloudflare/.secrets`**
file themselves (the same file and line — `SPARK_DM_CLIENT_SECRET="..."` — as
the normal flow; name that file specifically, not a generic "secrets manager"
or ".env"). When you say this, **do not repeat the pasted value back** — refer
to it as "that client secret", never re-type the characters (re-typing it to
say "revoke this" still exposes it in the transcript). Do not use the pasted
value for anything. And do **not** offer to write the secret into `.secrets`
*for* them — the customer always places secret values themselves; you only
tell them the file and line. Offering to "drop it in for you" defeats I2.

For local dev these go in the **`cloudflare/.secrets` file** — do **not**
reach for `wrangler secret put` / a remote secrets store here. That's a
deploy-time mechanism (the deploy stage's D-steps), needs the customer's
Cloudflare account, and does nothing for `wrangler dev`, which reads
`.secrets` locally.

The `cloudflare/.secrets` file must **exist** or `wrangler dev` won't
even boot (its `predev` hook hard-fails on a missing file) — so this
step is mandatory for both `"local-no-login"` and `"local-login"`, not
optional.

Also check whether `cloudflare/.secrets` has a `SPARK_COOKIE_SECRET`
line — required by `cloudflare/src/auth.js`'s `REQUIRED_ENV_VARS`
regardless of auth-bypass state. If missing, generate one locally with
`openssl rand -base64 32` and have the customer add it themselves.

Write only the non-secret `aemEnvId` into `customer.aemEnvId`. Mark step
`done` once the customer confirms all three lines are in place.

## B.9: Auth mode — apply the customer's tier choice (`auth-mode-applied`)

This step **acts** on the tier choice (bypass mechanism + why it's safe
locally: `local-run-plan.md`).

**Note:** under the normal branch resolved in B.5, `scopeChoice` is
always `"local-no-login"` for a dedicated customer — the `"local-login"`
case below is a fallback-menu-only path (see B.5) and shouldn't occur in
practice. Real Microsoft/Entra sign-in for a dedicated customer is set up
later, at deploy time (`deploy.md` D.6.5), not here.

**If `scopeChoice` is `"local-no-login"`:** uncomment the
`DISABLE_AUTHENTICATION` block in `cloudflare/src/auth.js` (~161-172,
those lines only). Tell the customer this makes everyone a local-only
fake admin — fine locally, must be re-commented before deploy (D.1
enforces it). Restate the local limits from B.5. Set
`customer.authBypassActive` to `true`.

**If `scopeChoice` is `"local-login"`:** leave `auth.js` untouched. Walk
the customer through their own Entra app registration (steps:
`deploy-plan.md` Entra section) and have them place the resulting
`MICROSOFT_ENTRA_TENANT_ID`/`CLIENT_ID` into `wrangler.toml`'s `vars`
(and `SPARK_MICROSOFT_ENTRA_CLIENT_SECRET` into `cloudflare/.secrets` for
SMTP). Set `customer.authBypassActive` to `false`.

Then set the local run environment for `npm run dev`, regardless of
branch:

- `AEM_PAGES_URL` = `https://main--{repo}--{org}.aem.page` (from B.2/B.3).
- `AEM_ENV_ID` = the value from B.7.
- `DISABLE_AUTHENTICATION` = `true` (this only takes effect for
  `"local-no-login"`, where the block is now uncommented; harmless
  otherwise).

Note `wrangler.toml`'s `HELIX_ORIGIN` isn't consulted by `local.sh` for
local dev (the local worker always targets the local `aem up` server) —
it matters only for CI/deploy, handled in B.4 and the deploy rename. Mark
step `done`.

## B.11: Boot verification (`boot-verified`)

**Before booting — offer to sync with `main` (ask, never auto).** The
local `aem up` server serves the site's content from the fork's published
`main` state (per I3, and the origin B.4 repointed), so the customer
booting "to see their site" should be on the latest code first. Fetch and
check whether the current branch is behind `origin/main`
(`git fetch origin` then compare, e.g. `git rev-list --count HEAD..origin/main`):

- If behind → tell the customer plainly ("your checkout is N commits
  behind the latest — want me to update it so the preview reflects the
  newest changes?") and, only if they agree, `git pull`/merge `origin/main`.
  **Never auto-merge**: it can conflict or pull in changes they didn't
  ask for — the customer decides, consistent with the agent-prepares /
  customer-decides posture. If they decline, proceed on the current
  checkout and note the preview may be stale.
- If up to date (or a merge would conflict) → say so and continue; don't
  force it.

Then run `npm run dev` with the environment from B.9. Wait for both the
AEM dev server and the Cloudflare worker dev server to report ready (watch
for the script's own "Ready on http://localhost:{port}" line). Open the
**worker** port in the browser (not the aem-up port) — that's the one
that serves `/api/*`.

Once up, verify, in order:

1. **The server is serving this repo's own local files**, not a stale or
   unrelated cached directory — confirm a distinctive string from a
   local file actually appears in the served output.
2. Auth behavior matches the chosen tier: `"local-no-login"` should let
   you reach the app as the fake dev user with no login prompt;
   `"local-login"` should redirect to Microsoft sign-in.
3. A real search request returns results sourced from the customer's own
   Content Hub environment, and at least one asset thumbnail renders.

If search fails, check in order: wrong/missing
`SPARK_DM_CLIENT_ID`/`SECRET`, wrong `AEM_ENV_ID`, or the Content Hub
technical account lacking access to that delivery environment.

Mark step `done` once verified. Per I4, if the customer only wanted a
local run, set `phases["backend-onboarding"].status` to `"done"`. Offer
the deploy stage below only if they want it; never force it.

---

# Phase B — deploy stage (deploy-only, opt-in)

**Only for a customer who wants to deploy**, offered *after* a tier is
running locally, never as a prerequisite. Per I4, a local-only customer
leaves every deploy step `pending` — a valid end state — and never enters
this stage.

When the customer opts into deploying, follow **`deploy.md`** (companion
file in this skill directory): steps D.1–D.8 — bypass gate, Cloudflare
intake file, repo identity rename, remote secrets, remote D1 migration,
CI token, deploy via merge, and later-updates. Throughout, the agent only
*prepares*; the **customer performs** every step that handles a real
secret, runs under their own Cloudflare/GitHub session, or mutates
production — the agent never deploys, pushes, or merges their `main`
itself. Return here for the completion report when done.

## Phase B completion report

Summarize plainly: the tier that's running and verified; for a deploy,
every identity value renamed and where, and that the auth bypass is
re-commented; the true auth state; the known PDF-preview gap
(`adobe-pdf-viewer.js`); any intake fields left blank; the update paths
from D.8; and the state/intake file locations.

---


---

# Appendix — deploy stage (deploy.md)

# Customer Migration — deploy stage (deploy-only, opt-in)

> **Dedicated provisioning is disabled for now — do not run D.2–D.8.**
> Every invocation is a demo (`customer.deployTarget == "shared"`). The
> only live path from Phase C's "put it on a shareable link" offer is
> **D.1 (bypass gate) → D.7 (merge the demo branch)** so the shared
> preview serves the demo. D.2–D.6 and D.8 (new Cloudflare account,
> KV/D1, remote secrets, CI token, real-auth D.6.5) provision a
> customer's own isolated environment and are **dormant reference
> material** while the dedicated path is off. Do not enter them.

Companion to `SKILL.md`. Open and follow this **only** when a customer
has explicitly opted into putting the demo on a shareable link, *after*
the minimal local run is already verified (SKILL.md Phase B / Phase C.8).
A local-only customer never enters this file; its steps stay `pending` in
the state file, which is a valid end state (SKILL.md invariant I4).
References to `I1`–`I4` and step ids (B.x) are to `SKILL.md`.

**Who runs what (governs every step here).** The agent *prepares* — exact
commands, edited config, a ready PR — but the **customer performs** any
step that (a) handles a real secret value (I2), (b) runs under their own
Cloudflare/GitHub session, or (c) mutates their production environment.
Per step: make it a single unambiguous command (or one-click merge),
verify the pre-state, confirm the result after the customer reports back.
The agent never performs the privileged action itself, and never pushes
or merges to the customer's `main`.

## D.1: Bypass gate (`deploy-bypass-gated`)

Do this **first**, before anything else in this stage, **regardless of
which path below applies** — a fabricated admin user is a real risk the
moment anything is public, demo or not; this step is never skipped
either way. If `customer.authBypassActive` is `true`, the repo is
**not** deploy-ready: re-comment the `DISABLE_AUTHENTICATION` block in
`cloudflare/src/auth.js` (lines ~161-172) — the exact inverse of the edit
B.9 made — set `customer.authBypassActive` to `false`, and tell the
customer real login is now required, which is why the Entra registration
(D.6 / the note below) matters. Refuse to proceed with deploy while the
bypass is active. Mark step `done` once re-commented.

## Which path applies (`customer.deployTarget`)

`customer.deployTarget` is always `"shared"` (dedicated is disabled — see
the banner at the top of this file). The only steps to run are:

- **`"shared"` (demo — the only active path)** — reuse the same shared
  Cloudflare account/AEM environment already used for other demos.
  **Skip D.2–D.6 and D.8 entirely** — nothing is provisioned. After D.1,
  go straight to **D.7 (merge the demo branch)** so the shared preview
  serves the demo. If the shared repo's CI deploy token is somehow
  missing, that is the one exception where a minimal D.6 (CI token) may
  be needed before D.7 — otherwise skip it.
- **`"dedicated"` (real portal) — disabled.** D.2–D.8 are dormant
  reference material; do not enter them while the dedicated path is off.

## D.2: Intake file generation (`intake-file-generated`)

**Only for `deployTarget == "dedicated"`.** Skip this and D.3–D.5
entirely for `"shared"` — see above.


Several values need the customer to run a command or look something up
in their own Cloudflare account first — not answerable one-at-a-time in
chat, and needed only for deploy (local dev uses simulated bindings, so
these are irrelevant to running locally). Generate
`.internal/customer-config.json` pre-populated with these fields, each
`null` until filled in:

```json
{
  "cloudflareAccountId": null,
  "workersDevSubdomain": null,
  "workerName": null,
  "productionDomain": null,
  "kvNamespaceId": null,
  "d1DatabaseIds": {
    "userLogins": null,
    "auditEvents": null,
    "searchEvents": null
  },
  "secretsStoreId": null
}
```

Give the customer the per-field lookup instructions from the intake-file
table in `docs/onboarding/deploy-plan.md` — the
**customer runs** the `wrangler` commands under their own account (CLI
where unambiguous, dashboard only where no CLI getter exists). Three
carry a gotcha worth stating inline:

- `workersDevSubdomain` — dashboard only; account-level. If never set,
  they must set it now.
- `d1DatabaseIds` — `wrangler d1 create <name>` **once per binding**
  (three names) → three *distinct* ids.
- `productionDomain` — optional; may stay on `*.workers.dev` for now.

Have them fill it in at their own pace. Mark step `blocked` until they
confirm, then re-read, confirm every field is non-null (except
`productionDomain` if intentionally skipped), mark `done`.

## D.3: Repo identity rename (`repo-identity-rename-applied`)

Repoint every remaining file that identifies the upstream template's
*Cloudflare account* rather than this customer's own — everything here
depends on the intake file (D.2). One bulk, previewed,
single-confirmation pass (not file-by-file): every change is a mechanical
substitution of already-known values.

**Gather the substitution map** (old → new), reading old values live
from the files:

- Cloudflare worker name / account id: read `wrangler.toml`'s `name` /
  `account_id` → new values from the intake file.
- Production domain / workers.dev subdomain: read the current
  route/domain literals → new values from the intake file.
- KV namespace id, three D1 database ids, Secrets Store id: read current
  ids in `wrangler.toml` → new values from the intake file. The three D1
  bindings must end up with three *distinct* ids (per D.2 — the template
  currently shares one across all three).
- `AEM_ENV_ID`: read the current value in `wrangler.toml` → new value
  from `customer.aemEnvId`.

Mirror var changes into **both** `[env.production.vars]` and
`[env.branch.vars]` — the toml warns to keep them in sync.

**Files to update:** the complete inventory lives in
`docs/onboarding/deploy-plan.md` §B (functional/CI) and §C (docs) —
re-derive by searching rather than trusting the list verbatim. `README.md` and `local.sh`'s `AEM_PAGES_URL` are **not** here
(B.4 handled them). Three items from that inventory need explicit care:

- **Security-relevant, don't miss:** `cloudflare/src/index.js` CORS
  `allowedOrigins` and `cloudflare/src/user.js` `liveHosts` — if the
  fork's real production host isn't listed, requests are treated as
  preview and locked behind the `preview` permission.
- **Do not touch** `cloudflare/src/origin/__tests__/dm-analytics-search-type.test.js`
  — its domain-looking strings are arbitrary referer-parse test input.
- `blocks/search-results/components/adobe-pdf-viewer.js` has a separate
  placeholder (`REPLACE_WITH_SPARK_PDF_EMBED_CLIENT_ID`) needing the
  customer's own Adobe PDF Embed client id — note as a completion-report
  follow-up, not a blocker.

**Process:** build the full (file, line, old, new) list, show one diff,
one confirmation, apply all. After renaming both `package.json`s,
regenerate lockfiles via `npm install` — don't hand-edit them. Mark
step `done`.

## D.4: Push secrets to the remote Secrets Store (`remote-secrets-pushed`)

**Only for `deployTarget == "dedicated"`.** For `"shared"`, the deployed
worker already has these secrets set (they're the same account other
demos already deploy through) — skip straight to D.6.

Critical distinction: the `cloudflare/.secrets` file (from B.7) populates
only the **local** simulated store — it never reaches the deployed
worker, and nothing pushes it automatically. The deployed worker's
secrets are set by a **manual, per-secret** command the **customer runs**
under their own `wrangler` session — agent supplies the `<name>`, customer
enters the value (I2).

For each secret the deploy needs, against the Secrets Store id now in
`wrangler.toml`:

```
npx wrangler secrets-store secret create <store-id> --scopes workers --name <SPARK_NAME>
```

Secrets to push: `SPARK_COOKIE_SECRET`, `SPARK_HELIX_ORIGIN_AUTHENTICATION`,
`SPARK_DM_CLIENT_ID`, `SPARK_DM_CLIENT_SECRET`, and — since deploy means
real login is active — `SPARK_MICROSOFT_ENTRA_CLIENT_SECRET` (needed for
`/auth/*` and SMTP). Note `--scopes workers` and **no** `--local` (that
would target the local store again). Mark step `done` once the customer
confirms all are set.

## D.5: Migrate the remote D1 databases (`remote-d1-migrated`)

**Only for `deployTarget == "dedicated"`.** For `"shared"`, the remote
databases already have their schema applied (same shared account) —
skip straight to D.6.

Local D1 setup uses `--local`; the real production databases need the
schema applied explicitly, and there is no migrations framework wired
up. The **customer runs**, once per database, under their own session:

```
npx wrangler d1 execute <db-name> --remote --file cloudflare/schema/<file>.sql
```

for `user_logins.sql`, `audit_events.sql`, `search_events.sql` against
the three databases. Only production has D1 (branch/preview deploys have
none), so this targets the production databases. Mark step `done` once
the customer confirms.

## D.6: Set the CI deploy token (`ci-token-set`)

Deploy runs in GitHub Actions and needs exactly one repo secret,
`CLOUDFLARE_API_TOKEN`, on **this fork's own repo** — GitHub Actions
secrets are per-repo, so even a fork sharing a Cloudflare account needs
its own copy of the value.

- **`deployTarget == "dedicated"`** — the **customer adds**
  `CLOUDFLARE_API_TOKEN` to their fork's GitHub repo secrets (Settings →
  Secrets and variables → Actions → New repository secret), scoped to
  deploy Workers on their own account. The agent can't and shouldn't set
  this. Mark step `done` once confirmed.
- **`deployTarget == "shared"`** — this is not a new value to create:
  the same Cloudflare account already deploys other demo forks, so the
  token already exists somewhere. Check whether this specific fork's
  repo secrets already have `CLOUDFLARE_API_TOKEN` set; if not, the
  **operator** (whoever has access to the shared account/another demo
  fork already using it) copies that existing value in — nothing new is
  looked up or created in Cloudflare itself. Still I2: the agent never
  handles the actual value, only confirms the secret name exists. Mark
  step `done` once confirmed present.

## D.7: Deploy via merge (`deployed-via-merge`)

Applies to both paths, unchanged. Deploy is CI-driven, not a script: `.github/workflows/release.yaml` runs
`wrangler deploy --env production` on push to `main`, and `build.yaml`
auto-deploys a per-PR branch worker on pull requests. So **deploying =
merging to `main`**.

Do **not** use `npm run deploy` / `cloudflare/scripts/deploy.sh` — it's
stale (no `--env`, hardcoded upstream identity) and diverges from the CI
path. Tell the customer this explicitly if they reach for it.

The agent prepares and verifies the PR (all deploy steps above done,
bypass re-commented, CI token set) and confirms it's ready; the
**customer merges** — the agent never pushes or merges to their `main`.
Once merged, watch the Actions run and confirm the deploy succeeded.
Mark step `done`, and set `phases["backend-onboarding"].status` to
`"done"`.

## D.8: Updating values later

Tell the customer how to change a value after the initial setup — the
path differs by what kind of value it is:

- **A non-secret var** (e.g. `AEM_ENV_ID`, a domain/route,
  `MICROSOFT_ENTRA_CLIENT_ID`, session expiry): edit it in
  `wrangler.toml` — in **both** `[env.production.vars]` and
  `[env.branch.vars]`, which the toml itself warns to keep in sync — then
  **re-deploy by merging to `main`**.
- **A secret** (`SPARK_DM_CLIENT_SECRET`, `SPARK_COOKIE_SECRET`,
  `SPARK_MICROSOFT_ENTRA_CLIENT_SECRET`, etc.): update it **directly in
  the Secret Store, no redeploy needed** — re-run the D.4 command
  (`wrangler secrets-store secret create/update <store-id> --scopes workers --name <SPARK_NAME>`).
  Editing local `cloudflare/.secrets` does **not** touch the deployed
  store — separate copies that can silently drift.
- **A D1 schema change**: re-run the D.5 remote `wrangler d1 execute
  --remote` against the affected database — there's no migrations
  framework to do this automatically.

This step is informational; mark `done` once conveyed. Then return to
`SKILL.md`'s Phase B completion report.
