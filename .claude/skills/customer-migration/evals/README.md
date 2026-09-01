# customer-migration evals

Behavioral evals for the `customer-migration` skill. Each eval pins one
behavior — mostly an invariant that has regressed or would be expensive if it
did — so future skill edits can be checked against a baseline instead of by
hand.

They run **locally** with a small `claude`-CLI runner (see `runner/`). No Tessl,
no plugin packaging. The spec files follow the same `task.md` + `criteria.json`
convention as the `adobe/skills` monorepo evals (EDS `weighted_checklist`
format), so they'd port to Tessl unchanged if this skill is ever contributed
upstream.

## Layout

```
evals/
  <eval-name>/
    task.md          # Problem/Feature Description + User prompt + Output Specification
    criteria.json    # weighted_checklist; max_score values sum to 100
    fixture/         # (optional) seeded workspace: .internal/onboarding-state.json, *_STATE.md markers, stubs
    persona.md       # (optional) how the simulated customer answers
  runner/            # the local runner (see runner/README.md)
```

## Running

```bash
cd runner
node run.mjs --eval <eval-name> --label baseline        # one run
node run.mjs --eval <eval-name> --n 3 --label baseline   # average of 3
node run.mjs --all --n 3 --label baseline                # every eval, 3 reps each
```

`--all` discovers every eval directory automatically (no name list to keep in
sync) and prints a combined summary table after running each one. See
`runner/README.md` for exact semantics (partial-failure handling, etc.).

Results land in `runner/results/<label>/` (gitignored). See `runner/README.md`
for flags and how a run is scored.

## Design rule

Criteria **assert on objective end-state wherever possible** — a value in
`.internal/onboarding-state.json`, whether a secret string appears in a file,
whether the PR is open — not on the agent's phrasing. This keeps the suite
robust to wording changes and makes the judge's job binary.

Every eval also carries a "no internal terms" (I1) check, the invariant most
likely to regress silently across the whole skill.

**As of 2026-08-16, this rule is enforced in the grading step itself, not
just in criteria wording.** A checklist item whose truth is a pure workspace/
transcript fact (a JSON key's value, a literal string's presence) can carry a
`check` field in `criteria.json`; the runner evaluates it in plain JS against
the workspace snapshot instead of asking the judge model. This removes judge
variance for exactly the criteria most likely to suffer from it — see
`runner/README.md`'s "Deterministic checks" section for the field format and
when *not* to use it (criteria with a legitimate either/or — e.g. "sets
`status: blocked` in the file, OR says so in prose" — must stay judge-graded,
since a single fact-check can't express "either of these").

## Coverage

| Eval | Guards | Invariant / Step | Type |
|---|---|---|---|
| `entry-language-plain-not-internal-terms` | Entry question/picker uses plain outcome language, no internal terms leaked | I1 | fixture + persona |
| `demo-branch-not-fork` | Demo creates a **new branch** on the shared showcase repo (never a fork) and copies existing DA content into `/<company>` before rebranding | Step 2–3 | no fixture (first invocation) |
| `dedicated-path-disabled` | The dedicated/real-portal path is disabled: an explicit "real portal / dedicated migration" request is handled as a demo, never routed to provisioning | Entry step 2 | no fixture (first invocation) |
| `demo-and-copy-before-any-design-tool` | Fresh request: agent confirms the demo, resolves the branch, and **copies DA content into `/<company>` before** invoking the design tool or editing CSS; never asks a Settings/permissions question | Hard gate / Steps 1–3 | no fixture (first invocation) |
| `existing-brand-branch-asks-continue-or-new` | An existing `demo/<brand>` branch triggers a **continue-vs-new ASK** — never silent reuse, never delete (I5); fresh path = new non-colliding branch + new PR | Step 2 / I5 | fixture |
| `rebrand-scoped-to-folder` | Rebrand rewrites/publishes only within the `/<company>` folder (`daFolder`); never touches docs outside it | Step 3–4 | fixture |
| `never-delete-pr-on-restart` | A "start fresh"/redo request never closes or deletes an existing PR/branch; asks first, then new branch + new PR, old one preserved | I5 | fixture |
| `pr-preview-is-deliverable-no-merge` | The demo is delivered from the open PR + its branch-preview URL; merge is not required/preferred; agent doesn't push to merge | I3 | fixture |
| `worker-config-scoped-in-pr` | The demo scope (`DEMO_COMPANY` + `DEMO_BASE_PATH` = companyKey) is written to `cloudflare/src/config.js` and committed to the PR, since the per-PR worker is built from it; not a local-only edit | Step 4 (item 5) / I3 | fixture + deterministic checks |
| `login-page-copied-and-rebranded` | The login/`welcome` page and `config` folder are copied, rebranded, and published **under `/<company>`**, so the foldered portal's login is present and on-brand | Step 3–4 / G5 | fixture |
| `copy-verified-path-by-path` | The DA copy is full-tree (incl. `public`/`config`) and verified **path-by-path**, never by a document count that masks a missing subtree | Step 3 / G4 | fixture |
| `rebrand-color-gate-before-assets` | Stale background/filter colours (`--light-color`, facets-panel hardcoded cream, search UI old reds) block Step 5 until fixed and preview-verified | Step 4g → Step 5 gate | fixture + deterministic checks |
| `assets-from-existing-secrets` | Step 5 reuses the existing env — creds from `cloudflare/.secrets`, env id from repo config; never collects creds, picks a tier, boots, or deploys | Step 5 | fixture |
| `collections-from-searchable-assets` | Step 6 creates company-scoped collections from already-searchable assets via `scripts/agent/create-collections.js`; no hand-rolled API, no new creds, no backend boot/deploy | Step 6 | fixture + deterministic checks |
| `design-plugin-disabled-guides-enable` | Design-plugin gate: installed-but-not-enabled → guide *enable*, don't hand-roll a rebrand | Operator setup | fixture |
| `design-plugin-missing-guides-install` | Design-plugin gate: not installed → guide add-marketplace + install (distinct from "just enable"), don't hand-roll | Operator setup | fixture |
| `resume-verifies-not-assumes` | Resume spot-checks a `done` step against real repo content instead of blindly trusting the state file; surfaces contradictions rather than silently proceeding or redoing work | Entry step 1 | fixture |

Each eval guards a behavior that has regressed in a real session or a
branch of demo logic that is easy to get wrong. Criteria assert on
objective end-state (a value in `.internal/onboarding-state.json`, a
string's presence, whether a PR is open) wherever possible, plus an I1
"no internal terms" check.

> **Note.** Evals track the current demo-only flow (`SKILL.md`). The old
> backend/tier/deploy evals were removed when that machinery moved to the
> disabled `NON-DEMO-DISABLED.md`; if the dedicated path is ever
> re-enabled, add evals alongside it then.
