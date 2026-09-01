# Demo Flow — design notes

`SKILL.md` is authoritative. The demo is **one linear sequence**. Every request is a
demo; it **reuses the existing environment** and never provisions anything.
A dedicated real portal (new env + Cloudflare + deploy) is a different,
**disabled** path preserved in `NON-DEMO-DISABLED.md`.

## The sequence

The ordered `steps` in `SKILL.md` are the workflow:

1. **demo-confirmed** — one plain sentence: it's a demo copy under the
   company name (I1).
2. **branch-resolved** — resolve company; check for an existing
   `demo/<company>` branch (`git branch --list` + `git ls-remote`); if one
   exists, **ASK** continue-vs-new (never silent reuse, never delete —
   I5); create/checkout.
3. **da-content-copied** — **MANDATORY**: copy existing DA content →
   `/<company>` via `scripts/da-copy-folder.sh`. Only exit code `3` means
   genuinely empty; `404/403` is a real failure, never "empty."
4. **rebranded → published → landed-via-pr** — excat rebrands the
   `/<company>` page-URL list + repo design tokens; our asset-color sweep;
   we publish `/<company>` only; one PR. Merge NOT required (I3).
5. **assets-uploaded → assets-enriched → search-scoped** — upload/enrich
   the company's assets and scope the portal to the company.

**One hard gate:** no design tool / no styling edits until
`branch-resolved` AND `da-content-copied` are `done`.

## Responsibility split (verified)

- **We copy** the DA content into `/<company>` — excat cannot copy a
  folder. Done by `scripts/da-copy-folder.sh` (authenticated recursive
  list → recursive copy with the DA Copy API's 206→204 continuation loop →
  re-list verify).
- **excat rebrands** the `/<company>` pages via a **scoped page-URL
  update**: we hand `excat-complete-design-expert` the explicit
  `/<company>/…` URL list + scope restrictions (only those pages; not
  root/nav/footer/templates/shared blocks; identify files first; report
  modified files). Global design tokens/CSS from a source URL are the
  deliberate site-wide exception.
- **We publish** `/<company>` (Helix Admin, `HLX_ADMIN_TOKEN`), scoped —
  enforced by `hooks/guard-da-publish.sh`.

## Existing environment — what each step reuses (no provisioning)

| Step | Uses | Source |
|---|---|---|
| branch | existing repo | `git remote origin` |
| copy DA | `DA_TOKEN` | `token.env` + `da-copy-folder.sh` |
| publish | `HLX_ADMIN_TOKEN` | `token.env` |
| rebrand design | `excat-complete-design-expert` | excat plugin |
| assets | `scripts/agent/enrich-assets.js` | creds from `cloudflare/.secrets`; env id from `cloudflare/src/config.js` (`AEM_ENV_ID`) |

Step 5 needs **zero** credential collection — the controller resolves creds
from `cloudflare/.secrets` and the env id from existing config. That is why
the whole backend "collect creds / pick tier / boot / deploy" machinery is
non-demo and lives disabled in `NON-DEMO-DISABLED.md`.

## What was removed to keep this simple/deterministic

- SKILL.md collapsed from a 3-phase file to a single demo flow: one
  sequence, one small state schema, one hard gate.
- Backend (Phase B) + deploy stage + `deploy.md` + the customer-config
  intake moved into `NON-DEMO-DISABLED.md` (kept, disabled, out of the
  path).
- Removed the "Settings / LLM Permissions" concept entirely — access is
  only the two `token.env` tokens; there is no settings/permissions screen.
- Consolidated 5 overlapping plan docs into this one file.
- Removed the duplicate `.agents/skills/customer-migration` tree; single
  source under `.claude/skills`.
