# Entry flow: design plan

This document is the design plan behind the **entry flow** and shared
state model of `.claude/skills/rebrand-portal/SKILL.md` — the logic
that runs first on every invocation and routes between the rebrand phase
(`rebrand-plan.md`), the local-run phase (`local-run-plan.md`),
and the deploy stage (`deploy-plan.md`).

## The problem it fixes

`rebrand-portal` is one skill with two phases (rebrand, then backend),
but a customer may want only one: only the rebrand, only the backend
running, or the rebrand already done (done earlier, by the old
`catalyst-rebrand` skill, or manually in Catalyst).

The original entry model had a single source of truth for "is a phase
done": the skill's own `.internal/onboarding-state.json`. That breaks the
most common real case — *"the frontend is already done, just get it
running."* In a fresh session there is **no state file**, so the skill
created a fresh one with every step `pending`, read the rebrand phase as
not-done, and re-entered Phase A — re-offering the rebrand the customer
had just said was finished. There was no path that honored the customer's
word.

## The design principle

A phase's completion has **two** sources of truth; the old model used only
the first:

1. The skill's own state file (resume within/after its own runs).
2. The customer's explicit statement ("the frontend's already done").

A proper migration entry reconciles both at the start, once, before
routing.

**Decision (locked): always ask; no repo auto-detection.** When there is
no state file, the skill asks the customer whether the frontend is already
done rather than trying to infer it from the repo (comparing tokens/
content/commits against the template). Auto-detection was considered and
rejected: it adds heuristic logic that can misjudge, whereas one plain
question is simpler and safe. The question doubles as scope discovery for
the whole migration.

## The entry flow (SKILL.md "Entry flow — run first")

1. **Load state.** If the state file exists, any phase it marks `done` is
   authoritative — never re-run it; resume at the first non-`done` step
   otherwise. If it doesn't exist, create it.
2. **Ask what's wanted** (unless the request is already unambiguous —
   "just get it running" is backend-only). Exact customer-facing wording,
   no internal terms (invariant I1):

   > "Want me to give the site a new look (restyle/rebrand it), or is
   > that already done? Either way, I'll then get it running for you."

   Answer → `intent` + rebrand status:
   - "give it a new look" / yes → `intent` = `full`, rebrand runs.
   - "already done" / "skip that" / "just get it running" → mark rebrand
     `done`, `intent` = `backend-only`, skip Phase A.
   - "only the rebrand, nothing else" → `intent` = `frontend-only`; mark
     backend `not-requested` after Phase A.

   The "Either way, I'll then get it running for you" clause both tees up
   the backend and absorbs the "no rebrand at all, just run it" answer.
3. **Route** to the first genuinely-pending phase, rebrand before backend
   when both pending. Entering Phase B directly is safe: its early steps
   (B.1–B.4) re-derive everything from the repo at run time, independent
   of whether Phase A ran.

## Schema changes this required

- **`intent`** (top-level, `null` / `full` / `frontend-only` /
  `backend-only`) — records the customer's answer; revisitable (a
  `backend-only` customer can ask for the rebrand later).
- **`not-requested`** as a phase `status` value (alongside `in_progress`
  and `done`) — lets a phase record "the customer explicitly didn't want
  this," a valid end state distinct from an unfinished `in_progress`.
  Before this, there was no way to represent the frontend-already-done or
  rebrand-only cases.

## The invariants block (deduplication, not new logic)

The same cross-cutting rules were previously restated at nearly every
step. They're now stated once as I1–I4 near the entry flow, and steps
reference them:

- **I1** — outcomes only, never internal terms (phase/step/`scopeChoice`
  names) to the customer.
- **I2** — never handle raw secrets in chat.
- **I3** — content is live on publish; code is live only on merge.
- **I4** — skipping optional work (deploy, or a whole phase) is a valid
  end state, not an unfinished one.

## Verification

- With no state file and a customer who says the frontend is done: confirm
  the skill marks rebrand `done` and routes straight to backend, without
  re-offering Phase A.
- Confirm `intent` and `not-requested` are written and honored on a
  resumed session (a `backend-only` run doesn't later re-offer rebrand
  unless asked).
- Confirm each invariant is stated once and referenced, not restated
  per-step.
