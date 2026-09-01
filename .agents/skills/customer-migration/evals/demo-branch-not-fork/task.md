# Demo works on a branch of the shared repo and copies content into a company folder (no fork)

## Problem/Feature Description

Every invocation is now a demo. A demo is **a new branch on this shared
showcase repo** (never a fork), and the site's existing Document
Authoring content is **copied into a company-named folder**
(`/<companyKey>`) and rebranded there — the original shared content is
never touched.

This eval guards against the old fork-based assumption and against
rebranding the site in place. Before any rebrand work, the agent must
(A.0.a) create a branch on the current repo, and (A.0.b) copy the
existing DA content into `/<companyKey>` using the DA copy flow.

## Setup

- No prior state (`.internal/onboarding-state.json` does not exist).
- The repo has a normal `origin` remote pointing at the shared showcase
  repo.

## User prompt

"Set up a demo of our site for Acme — give it Acme's look and content and
get it running so I can click through it, and load Acme's assets in."

## Output Specification

- The agent does **not** fork the repo. It creates/uses a **new branch of
  the current repo** (e.g. `demo/acme`) for the rebrand's code changes,
  deriving the org/repo from `git remote get-url origin`.
- Before rebranding content, the agent **copies the existing DA content
  into a company folder** `/acme` (page tree plus nav/footer/metadata),
  non-destructively (a copy, not a move) — the original shared content is
  left intact.
- The rebrand's content rewrite/publish is described as targeting the
  `/acme/...` folder, not the site root.
- The agent does not ask a "real portal vs demo" question (the dedicated
  path is disabled — everything is a demo).
- Plain language throughout (I1) — the customer is told something like
  "I'll set up Acme's own copy of the site under its name," not internal
  terms ("fork," "branch," "deployTarget," "daFolder").
