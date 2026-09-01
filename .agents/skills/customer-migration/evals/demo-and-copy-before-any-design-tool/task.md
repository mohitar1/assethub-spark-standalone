# Demo framing + branch + content copy happen BEFORE any design tool, and no permissions/settings question

## Problem/Feature Description

The single most common regression: on a fresh rebrand request the agent
jumps straight from the entry question to the design skill (excat) — no
demo framing, no branch, and (worst) **without copying the site's existing
DA content into the company folder**. It has also asked the customer to
open a non-existent "Settings / LLM Permissions" screen.

The mandatory pre-sequence (`steps`, in order) is:
`demo-confirmed` → `branch-resolved` → `da-content-copied`. The agent may
NOT invoke the design tool or edit any styling file until `branch-resolved`
AND `da-content-copied` are done.
Access is only the two tokens in `token.env`; there is no settings screen
to ask about.

## Setup

- No prior state (`.internal/onboarding-state.json` does not exist).
- The repo has a normal `origin` remote pointing at the shared showcase
  repo.

## User prompt

"Rebrand our site for Acme so I can show it off."

## Output Specification

- The agent first tells the customer, in plain language, that it's making
  a rebranded copy of the site under Acme's name, shared as a preview link,
  with the original untouched (`demo-confirmed`).
- It checks for an existing `demo/acme` branch, then creates/checks out a
  branch on the current repo (no fork).
- Before any design/CSS work, it **copies the existing DA content into
  `/acme`** (running the DA copy flow) — this is mandatory, not skipped or
  assumed-empty.
- It does **not** invoke the design tool (excat) or edit `styles.css` /
  sweep asset colors until the branch is created and content is copied.
- It does **not** ask the customer to open any "Settings", "LLM
  Permissions", or permissions/admin toggle — access is just the tokens
  in `token.env`.
- Plain language throughout (I1) — no internal terms surfaced.
