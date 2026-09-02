# Customer Migration Improvements

## Goal

- Make `customer-migration` easy for users who do not know DA, Helix, PR previews, asset setup, or publish permissions.
- Keep the agent workflow deterministic.
- Delete stale manual-token and fallback paths.

## Decisions

- Ask the user for **one token only**:

```env
DA_TOKEN=<token copied from da.live>
```

- The skill generates `HLX_ADMIN_TOKEN` itself.
- Reuse a still-valid `HLX_ADMIN_TOKEN` if one already exists.
- If no valid `HLX_ADMIN_TOKEN` exists, mint a new one from `DA_TOKEN`.
- No fallback to browser-copied `admin.hlx.page` `x-auth-token`.
- No `/secrets.json`.
- No manual `HLX_ADMIN_TOKEN` setup in the active flow.
- If token minting fails, stop and ask for a DA token from a user with the required site admin/config rights.

## Current State

- Strong operator gates already exist:
  - demo-only flow
  - copy DA content before design
  - publish only company-scoped paths
  - open PR preview is the deliverable
  - assets blocked until rebrand verification passes
  - collections created only from searchable assets

- User-facing setup is still too heavy:
  - asks for both `DA_TOKEN` and `HLX_ADMIN_TOKEN`
  - includes stale/manual Helix token guidance
  - includes too many credential paths
  - does not make the minimal user action obvious enough

## Keep

- Deterministic token validation/minting.
- Simple guided docs.
- Eval coverage for setup behavior.
- Asset intake prompt.
- "Done means" checklist.
- PR preview explanation.

## Drop

- Standalone token validator script as a separate option.
- Guided token helper as a separate user-facing tool.
- Auto-mint from browser `x-auth-token`.
- Browser-assisted token extraction.
- Full OAuth/device-flow exploration.
- Manual `admin.hlx.page` `x-auth-token` instructions.
- `/secrets.json` discussion in the active flow.

## User Token Flow

- User opens:

```text
https://da.live/#/{org}/{site}
```

- Example:

```text
https://da.live/#/mohitar1/assethub-spark-standalone
```

- User steps:
  - Sign in to DA for the EDS site.
  - Open DevTools -> Network.
  - Trigger any DA request, e.g.:

```text
https://admin.da.live/config/{org}/...
```

  - Copy the request header:

```text
Authorization: Bearer eyJ...
```

  - Paste only the token value into `token.env`:

```env
DA_TOKEN=eyJ...
```

## Token Script

- Add a script consumed by the skill:

```text
.claude/skills/customer-migration/scripts/ensure-eds-tokens.sh
```

- Invocation:

```bash
.claude/skills/customer-migration/scripts/ensure-eds-tokens.sh \
  <org> <site> \
  --token-file token.env
```

- Behavior:
  - read `DA_TOKEN`
  - validate DA access
  - check existing `HLX_ADMIN_TOKEN`
  - reuse existing `HLX_ADMIN_TOKEN` if status check passes
  - mint new `HLX_ADMIN_TOKEN` from `DA_TOKEN` only if missing/stale
  - write/update `HLX_ADMIN_TOKEN` in `token.env`
  - verify Helix status with the final token
  - never print token values

- DA validation:

```bash
GET https://admin.da.live/list/{org}/{site}
Authorization: Bearer $DA_TOKEN
```

- Existing Helix token validation:

```bash
GET https://admin.hlx.page/status/{org}/{site}/main/
x-auth-token: $HLX_ADMIN_TOKEN
```

- Helix token mint:

```bash
POST https://admin.hlx.page/config/{org}/sites/{site}/apiKeys.json
Authorization: Bearer $DA_TOKEN
Content-Type: application/json

{ "description": "customer-migration rebrand", "roles": ["admin"] }
```

- Token file output:

```env
DA_TOKEN=<existing user-provided value>
HLX_ADMIN_TOKEN=<existing valid token or newly minted response.value>
```

## Failure Behavior

- DA validation fails:

```text
DA_TOKEN is expired or does not have access to this DA site.
```

- Helix token exists but verification fails:
  - Try minting a replacement from `DA_TOKEN`.

- Helix mint fails or returns no `value`:

```text
DA_TOKEN works for DA, but this user cannot mint the publish token for this site. Use a DA token from a user with required site admin/config rights.
```

- No fallback:
  - do not ask for `HLX_ADMIN_TOKEN`
  - do not ask for browser `x-auth-token`
  - do not suggest `/secrets.json`
  - do not suggest alternate manual token paths

## Permission Model

- Required:
  - `DA_TOKEN` can read/write DA content for `{org}/{site}`
  - same user can mint a Helix Admin API key for `{org}/{site}`

- Publish-capable non-admin users may publish content.
- Minting an Admin API key may require stronger site/config permission than direct publish.
- Active guidance should say:

```text
Use a DA token from a user who can manage this EDS site's publish/admin access.
```

## SKILL.md Changes

- Update Step 4a:
  - token setup asks for `DA_TOKEN` only
  - exact DA URL uses `{org}/{site}`
  - exact Network-tab instructions use `admin.da.live/config/{org}/...`
  - run `ensure-eds-tokens.sh` before copy/publish
  - publish steps use generated/reused `HLX_ADMIN_TOKEN`

- Keep:
  - no secrets in chat
  - `token.env` gitignored
  - DA copy uses packaged copy script
  - publish scope guard
  - PR preview as deliverable
  - `x-content-source-authorization: Bearer $DA_TOKEN` on preview/live calls

- Remove:
  - two-token user setup
  - manual `HLX_ADMIN_TOKEN` instructions
  - `admin.hlx.page` browser `x-auth-token` copy
  - `/secrets.json` notes from active flow
  - fallback token paths

## README

- Add a user-readable README for the skill:

```text
.claude/skills/customer-migration/README.md
```

- Purpose:
  - explain what the demo does
  - explain what the user must provide
  - explain what the agent does automatically
  - explain what "done" means
  - link to the architecture artifact

- Architecture link:

```text
/Users/mohitar/Downloads/customer-migration-architecture.html
```

- Sections:
  - Overview
  - What You Provide
  - What The Agent Does
  - Token Setup
  - Assets
  - Collections
  - Preview Link
  - Done Means
  - Common Failures

- Wording:
  - terse
  - user-facing
  - no skill internals
  - no step ids
  - no tool names unless the user must run/open them

## User Guidance

- Add "What I need from you":
  - company name
  - source site for visual look
  - one `DA_TOKEN`
  - asset source choice

- Example:

```text
I need the company name, the site to match visually, and one DA token. Later I need to know whether the assets are already in Adobe or whether I should pull sample images from a source page.
```

- Asset intake prompt:

```text
Are the assets already in Adobe under this company's folder, or should I pull sample images from a source page like https://example.com/products?
```

- "Done means":
  - portal link opens
  - copied pages load under company folder
  - login page loads under company folder
  - search shows only company assets
  - filters have non-zero counts
  - collections open with company assets
  - no merge required for the demo

## Workflow Changes

- Entry:
  - derive `{org}/{site}` from git remote when possible
  - ask only for `DA_TOKEN`
  - require the source site used for visual look and content direction
  - run token script once `token.env` exists

- Step 3:
  - use `DA_TOKEN` for DA copy
  - no Helix token needed for copy

- Step 4:
  - ensure token script passed before publish
  - publish with final `HLX_ADMIN_TOKEN`
  - keep DA bearer forwarded as content-source authorization

- Step 5:
  - keep rebrand verification gate before assets
  - keep category-card slug and enrichment vocabulary aligned
  - keep representative asset replacement for copied card visuals

- Step 6:
  - keep collections after assets are searchable
  - create company-scoped collections only
  - run automatically after Step 5 for `full` and `assets-only` flows
  - do not wait for a separate user request once assets are searchable
  - leave `collections-created` as `not-requested` only for `frontend-only`

## Evals

- Add `only-da-token-required`:
  - asks for `DA_TOKEN` only
  - does not ask for `HLX_ADMIN_TOKEN`
  - does not ask for browser `x-auth-token`
  - gives exact DA URL and Network-tab instructions

- Add `ensures-eds-tokens`:
  - runs `ensure-eds-tokens.sh`
  - reuses existing valid `HLX_ADMIN_TOKEN`
  - mints replacement if missing/stale
  - verifies Helix status before publish

- Add `collections-auto-after-assets`:
  - after asset search/facet verification passes, agent runs collections creation
  - agent does not stop at `search-scoped`
  - `collections-created` is marked done only after visible collection verification
  - `frontend-only` remains the only flow where collections are `not-requested`

- Update existing setup evals:
  - fail if active flow asks user to manually create `HLX_ADMIN_TOKEN`
  - fail if active flow mentions `/secrets.json`
  - fail if active flow suggests browser `admin.hlx.page` token fallback

## Script Tests

- Mock `curl` and cover:
  - missing token file
  - missing `DA_TOKEN`
  - DA validate success
  - DA validate failure
  - existing `HLX_ADMIN_TOKEN` valid
  - existing `HLX_ADMIN_TOKEN` stale
  - Helix mint success with `value`
  - Helix mint `401`
  - Helix mint `403`
  - Helix mint response without `value`
  - token file update preserves `DA_TOKEN`
  - token values are never printed

## Validation

```bash
cd .claude/skills/customer-migration/evals/runner
node run.mjs --eval only-da-token-required --label token-flow
node run.mjs --eval ensures-eds-tokens --label token-flow
node run.mjs --eval demo-and-copy-before-any-design-tool --label token-flow
node run.mjs --eval pr-preview-is-deliverable-no-merge --label token-flow
```

## Final Deliverables

- Updated `SKILL.md`.
- New `ensure-eds-tokens.sh`.
- New `.claude/skills/customer-migration/README.md`.
- Updated evals.
- Script tests.

## Open Questions

- Should generated API key descriptions include the company slug?
  - Example: `customer-migration rebrand acme-demo`
  - Value: easier cleanup/audit in Admin API key lists.
