# Backend deploy stage (Phase B, D.1–D.8): design plan

This document is the design plan behind the **deploy** half of Phase B —
steps D.1–D.8, implemented in `.claude/skills/rebrand-portal/deploy.md`
(a companion file the skill opens only when a customer opts into
deploying). It records the code-verified findings and full file inventory
that shaped those steps.

The **local-run** half (B.1–B.11) is documented in `local-run-plan.md`;
the **rebrand** phase in `rebrand-plan.md`; the entry flow in
`entry-flow-plan.md`. Deploy is opt-in and offered only *after* a local
tier is running — a local-only customer never enters this stage, and that
is a valid end state (invariant I4).

## Who runs what (the deploy boundary)

The agent *prepares* — exact commands, edited config, a ready PR — but the
**customer performs** every step that (a) handles a real secret value,
(b) runs under their own Cloudflare/GitHub session, or (c) mutates their
production environment. The agent never deploys, never pushes or merges to
the customer's `main`, and never sees a real secret value (invariant I2).
This boundary governs every step below.

## Scope finding — ~25 files carry the template's identity (code-verified)

A full repo grep plus a thorough audit turned up **~25 files** with
hardcoded identifiers specific to the template instance (repo name, GitHub
org, Cloudflare worker name/domain/account id, KV/D1/Secrets-Store
resource ids, Entra tenant/client ids, an Adobe PDF Embed client id, and
more), spanning functional code, CI workflows, package manifests, and
documentation.

Two anomalies surfaced during the audit — a Secrets Store id mismatch
between `wrangler.toml` and `cloudflare/README.md`, and three D1 bindings
sharing one `database_id` — turned out to be artifacts of the template's
own account setup, **not** something the skill diagnoses. The customer
provisions their **own** Cloudflare resources, so once every id in
`wrangler.toml` is the customer's own value there's nothing left to
reconcile. The one thing to enforce: the three D1 bindings must end up
with three **distinct** ids (D.2/D.3), avoiding the cross-contamination
the template itself has.

The rename applies generically: derive the "old identity" by reading the
fork's actual files (never hardcode `assethub-spark`/`aem-showcase`-style
literals in the skill), derive the "new identity" from the customer/repo,
then substitute. One pass — collect inputs once, preview the full diff,
single confirmation, apply everywhere (functional, CI, manifests, docs
together) — because these are mechanical substitutions, not judgment calls.

## Complete inventory of what must change for a fork (code-verified)

### A. Identity inputs the skill must obtain (asked or derived)

| Input | How obtained | Why |
|---|---|---|
| GitHub org + repo | Derived: `git remote get-url origin` | Drives Helix origin URLs everywhere (`{repo}--{org}`) |
| AEM Code Sync installed on fork | Derived: active probe of `https://main--{repo}--{org}.aem.page` | Confirms the Helix site the above URLs point to actually exists |
| Cloudflare account id | Asked — not derivable from anything in the repo | Replaces `wrangler.toml`'s `account_id` |
| Cloudflare `workers.dev` subdomain | Asked — account-level Cloudflare setting (Workers & Pages → Settings → "Your subdomain"), not something the skill invents or derives; account owner may need to set it first if never configured | Replaces `WORKER_DOMAIN` default in `deploy.sh`, and the `*.workers.dev` literals in `index.js` CORS allowlist, `user.js` live-host list, `tests/shared/env.js` |
| Desired worker name (default suggestion: derived from repo name) | Asked, with a sensible default | Replaces the template's worker name in `wrangler.toml`, `deploy.sh`, `package.json` names |
| Desired production domain (or defer, staying on `*.workers.dev` only) | Asked — real DNS/zone the customer owns, cannot be derived | Replaces the template's domain in `wrangler.toml` routes, `index.js` CORS, `user.js`, `deploy.sh`, `release.yaml`, docs |
| `AEM_ENV_ID`, Content Hub OAuth S2S client id/secret | Asked | Real search |
| Microsoft Entra tenant id + client id (only if/when the customer does their own Entra app registration — separate from the `DISABLE_AUTHENTICATION` gap) | Asked, explicitly optional/deferred — see Entra section below | Replaces the template's own tenant/client ids so a fork's real login doesn't authenticate against the template owner's Entra tenant |
| Customer's own KV namespace id (`AUTH_TOKENS`) | Asked — created by the customer in their own Cloudflare account, not derivable | Replaces the template's KV namespace id |
| Customer's own D1 database ids — three separate ids, one per binding (`USER_LOGINS`, `AUDIT_EVENTS`, `SEARCH_EVENTS`) | Asked — created by the customer, must be three distinct ids to avoid the cross-contamination risk the template itself has | Replaces the template's shared `database_id` across all three bindings |
| Customer's own Secrets Store id | Asked — created by the customer in their own account | Replaces the template's Secrets Store id; since it's the customer's own store, there's no README-vs-config mismatch to reconcile |

### B. Functional/CI files — must be corrected for the fork to run/deploy correctly

| File | Category |
|---|---|
| `cloudflare/wrangler.toml` | worker name, Cloudflare account id, D1 database ids (three, must be distinct), production route/zone, KV namespace id, Secrets Store id, `HELIX_ORIGIN` (repo+org), `AEM_ENV_ID`, `MICROSOFT_ENTRA_TENANT_ID`/`CLIENT_ID` |
| `cloudflare/scripts/deploy.sh` | `REPO`, `ORG`, `WORKER`, `WORKER_DOMAIN` — drives Helix origin + worker URL construction at deploy time |
| `.github/workflows/build.yaml` | Helix origin + route built from repo/org/domain — PR/branch CI deploys target wrong origin/domain if unchanged |
| `.github/workflows/release.yaml` | GitHub Environments UI shows wrong URL after prod deploy if unchanged |
| `local.sh` | `AEM_PAGES_URL` default, `AEM_ENV_ID` default, placeholder `git remote add origin` — local dev content source + env id defaults (note: `AEM_PAGES_URL` is corrected earlier by B.4, not here) |
| `package.json` (root), `cloudflare/package.json` | npm package identity |
| `package-lock.json`, `cloudflare/package-lock.json` | generated — regenerate via `npm install` after renaming `package.json`, don't hand-edit |
| `sonar-project.properties` | wrong value pushes analysis to wrong/inaccessible SonarQube project |
| `cloudflare/src/index.js` | **security-relevant**: CORS `allowedOrigins` — fork's real frontend origin gets CORS-rejected unless added |
| `cloudflare/src/user.js` | **security/access-relevant**: `liveHosts` array — if the fork's real production host isn't recognized as "live," every request is treated as preview and requires the `preview` permission, locking out most users from the fork's own production site |
| `cloudflare/src/api/notifications.js` | default from-email — fork should send from their own domain |
| `cloudflare/src/api/analytics.js` | fallback analytics account id (two occurrences) — wrong/inaccessible account if env var also unset |
| `blocks/search-results/components/adobe-pdf-viewer.js` | already has an explicit unfilled placeholder (`REPLACE_WITH_SPARK_PDF_EMBED_CLIENT_ID`) — PDF preview silently won't work for the fork's real domain until filled with the customer's own Adobe PDF Embed API client id, a separate credential to register, not derivable |
| `tests/shared/env.js` | `production`/`preview` base URLs, branch-URL template literal — fork's own integration/authz test suite silently tests the template owner's environments unless changed |
| `tests/integration/test-public-urls.sh` | default `HOST` — wrong default target unless overridden per-invocation |

### C. Documentation/cosmetic — wrong but not behavior-breaking; included in the same rename pass since it's the same mechanical substitution

`README.md`, `ARCHITECTURE.md`, `cloudflare/README.md`, `cloudflare/NOTES.md`,
`.cursor/rules/aem.mdc`, `.github/pull_request_template.md`,
`docs/api/API-SECURITY-REVIEW.md`, `docs/authoring/getting-started.md`,
`docs/authoring/localization.md`, `docs/administering/permission-configuration.md`,
`docs/authoring/blocks/*.md` (9 files), `docs/da-content/create-docs.py`,
`docs/da-content/create-sheets.py`, `tests/integration/README.md`,
`tests/integration/setup/auth.js`, `tests/integration/test-runner.test.js`,
`tests/authz/helpers.js` — all reference the template's repo/org/domain in
prose, example links, or human-facing instructional strings (console
messages, DA-upload print statements). None drive runtime behavior, but a
customer's own README/docs describing the template owner's demo instead of
their own fork is a real onboarding-quality problem, and every one is the
same handful of substitution values from section A — so they're fixed in
the same pass. (`README.md` and `local.sh`'s `AEM_PAGES_URL` are handled
earlier by B.4, since they need no Cloudflare-account data — see
`local-run-plan.md`.)

One exception found and correctly excluded: **test fixture URLs** in
`cloudflare/src/origin/__tests__/dm-analytics-search-type.test.js` use
domain-looking strings only as arbitrary test input to a referer-parsing
function that only inspects the path — functionally identical regardless of
domain. Not part of the rename; touching it would be cosmetic churn with
zero behavior change.

## Bypass gate before deploy (D.1)

The `DISABLE_AUTHENTICATION` block (full mechanism in `local-run-plan.md`)
must be **re-commented** before any deploy — a fabricated admin user must
never ship. D.1 does this first, the exact inverse of B.9's edit, sets
`customer.authBypassActive` to `false`, and refuses to proceed while the
bypass is active.

## Entra app registration — required before any real deploy (code-verified)

`cloudflare/src/auth.js`'s `REQUIRED_ENV_VARS`
(`MICROSOFT_ENTRA_TENANT_ID`, `MICROSOFT_ENTRA_CLIENT_ID`, `COOKIE_SECRET`)
is checked in the `authRouter`'s `before` middleware, which 503s on any
`/auth/*` request if missing — **independent of `DISABLE_AUTHENTICATION`**.
So a real deploy where the customer's own users log in genuinely needs a
real Entra app registration — a hard requirement, confirmed via
Microsoft's Entra documentation:

- An IT admin in the customer's own Microsoft 365/Entra tenant (any tier —
  no Entra ID P1/P2 required) goes to entra.microsoft.com → **App
  registrations → New registration**, and — critically — registers the
  redirect URI under the **Single-page application** platform (not "Web"),
  pointing at the customer's real login callback URL. This matches the
  code's flow exactly: redirect to `/authorize`, validate the returned
  `id_token` via JWKS, no client secret — the public-client/PKCE pattern,
  which Microsoft's docs require registered as SPA, not Web.
- The **Application (client) ID** and **Directory (tenant) ID** on the
  app's Overview map to `MICROSOFT_ENTRA_CLIENT_ID` /
  `MICROSOFT_ENTRA_TENANT_ID`. No extra API permission setup for basic
  sign-in (`User.Read` granted by default; `openid`/`profile`/`email`
  implicit).
- Separately, `cloudflare/README.md` documents that the **same app
  registration** is also used for SMTP OAuth2 email, needing a **Web**
  platform config (confidential client, client secret) with
  `SMTP.Send` + `offline_access` delegated permissions and admin consent,
  plus its own `localhost:3939` redirect for the one-time token setup
  script. One app registration can hold both an SPA entry (login) and a
  Web entry (SMTP) — not two registrations.

This is distinct from the auth-bypass gap (about dead code) and from
identity-rename (replacing the template's *placeholder* Entra values). The
skill doesn't perform the registration (customer's own tenant) — it gives
these steps and asks for the resulting ids.

## Intake file — non-secret identity/resource values (D.2)

Several values (Cloudflare account id, `workers.dev` subdomain, KV
namespace id, three D1 database ids, Secrets Store id) can't usefully be
"asked in chat" — the customer looks them up, and typing UUIDs back and
forth is error-prone. Design: a single gitignored
`.internal/customer-config.json` the skill generates pre-populated with
every field plus per-field lookup instructions, preferring the `wrangler`
CLI where authoritative:

| Field | How the customer gets it |
|---|---|
| `cloudflareAccountId` | `wrangler whoami`, or dashboard: Workers & Pages → Overview → Account Details |
| `workersDevSubdomain` | Dashboard only (no CLI getter): Workers & Pages → **Change** next to "Your subdomain" |
| `workerName` | Free choice — default derived from the repo name |
| `productionDomain` | Customer's own DNS zone added to Cloudflare (optional — may stay on `*.workers.dev`) |
| `kvNamespaceId` | `wrangler kv namespace create AUTH_TOKENS` — id in output |
| `d1DatabaseIds.userLogins` / `.auditEvents` / `.searchEvents` | `wrangler d1 create <name>` once per binding — each prints its own `database_id`; must be three distinct ids |
| `secretsStoreId` | `wrangler secrets-store store create` — id in output |
| `aemEnvId` | Customer's Adobe program/environment (`pXXXX-eYYYY`) |
| `microsoftEntraTenantId` / `microsoftEntraClientId` | From their Entra app registration's Overview page |

Real secrets (`DM_CLIENT_ID`/`SECRET`, the Entra client secret for SMTP)
are explicitly **not** in this file — those go straight into
`cloudflare/.secrets` by the customer, preserving the "agent never reads
secret values back" boundary (I2). This file holds only resource
identifiers and non-secret config, which the skill *can* read directly —
the equivalent of a dashboard URL, not a credential.

## Remote secrets, remote D1, CI token, deploy=merge (D.4–D.7)

- **D.4 — remote secrets:** `cloudflare/.secrets` populates only the
  **local** simulated store; nothing pushes it to the deployed worker. The
  customer runs `wrangler secrets-store secret create <store-id> --scopes
  workers --name <SPARK_NAME>` per secret (`--scopes workers`, **no**
  `--local`). Secrets: `SPARK_COOKIE_SECRET`,
  `SPARK_HELIX_ORIGIN_AUTHENTICATION`, `SPARK_DM_CLIENT_ID`,
  `SPARK_DM_CLIENT_SECRET`, `SPARK_MICROSOFT_ENTRA_CLIENT_SECRET`.
- **D.5 — remote D1:** local D1 uses `--local`; production databases need
  the schema applied explicitly (no migrations framework). Customer runs
  `wrangler d1 execute <db-name> --remote --file cloudflare/schema/<file>.sql`
  for the three schema files. Only production has D1.
- **D.6 — CI token:** the customer adds one repo secret,
  `CLOUDFLARE_API_TOKEN`, to their fork's GitHub Actions secrets.
- **D.7 — deploy = merge:** deploy is CI-driven —
  `.github/workflows/release.yaml` runs `wrangler deploy --env production`
  on push to `main`; `build.yaml` deploys a per-PR branch worker. So
  **deploying = merging to `main`**. Do **not** use `npm run deploy` /
  `cloudflare/scripts/deploy.sh` — stale (no `--env`, hardcoded upstream
  identity), diverges from the CI path. The agent prepares/verifies the
  PR; the customer merges.

## Updating values later (D.8)

- **Non-secret var:** edit `wrangler.toml` in **both**
  `[env.production.vars]` and `[env.branch.vars]` (the toml warns to keep
  them in sync), then re-deploy by merging.
- **Secret:** update directly in the Secret Store (re-run the D.4 command),
  **no redeploy needed** — this no-redeploy rotation is why the app uses
  Secret Store over baked-in worker secrets. Editing local
  `cloudflare/.secrets` does **not** touch the deployed store — separate
  copies that can drift.
- **D1 schema change:** re-run the D.5 remote execute — no migrations
  framework does it automatically.

## Verification

- Confirm the rename pass (D.3) catches every file in inventory §B without
  any file path hardcoded in the skill itself (it re-derives by searching).
- Confirm the three D1 bindings end up with three **distinct** ids.
- Confirm D.1 re-comments the bypass before deploy and refuses to proceed
  while `authBypassActive` is `true`.
- Confirm the skill never asks for a Cloudflare resource id directly in
  chat once the intake file exists — it points at the file instead.
- Dry-run resumability against hand-crafted `customer-config.json`
  fixtures (empty / partial / full) for `intake-file-generated` and
  `repo-identity-rename-applied`.
