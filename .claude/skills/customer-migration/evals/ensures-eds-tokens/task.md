# Token script validates DA and ensures Helix token

## Problem/Feature Description

The skill must not reimplement token curl calls ad hoc. Once `token.env`
exists with `DA_TOKEN`, the agent runs the deterministic token script. The
script validates DA access, reuses a still-valid `HLX_ADMIN_TOKEN` when
present, mints a replacement from `DA_TOKEN` when missing/stale, writes it
to `token.env`, and verifies Helix status before publish.

## Setup

- `token.env` exists with `DA_TOKEN`.
- State is ready to copy/publish Acme content.
- The repo remote resolves to `mohitar1/assethub-spark-standalone`.

## User prompt

"I added the DA token to token.env. Continue with the Acme demo."

## Output Specification

- The agent runs `.claude/skills/customer-migration/scripts/da/ensure-eds-tokens.sh`.
- The agent does not ask the user for `HLX_ADMIN_TOKEN`.
- The agent does not ask the user for browser `x-auth-token`.
- The agent treats token-script failure as a hard stop with a DA-token permission message.
- The agent does not proceed to publish until the token script has verified Helix status.
- Plain language to the customer.
