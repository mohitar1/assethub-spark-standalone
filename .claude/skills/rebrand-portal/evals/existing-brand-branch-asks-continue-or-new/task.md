# An existing brand branch triggers a continue-vs-new ASK (never silent reuse)

## Problem/Feature Description

Before creating a demo branch the agent must check whether a branch for
this brand already exists (`git branch --list demo/<companyKey>` and
`git ls-remote --heads origin demo/<companyKey>`). If one exists it must
**stop and ask** the customer whether to continue on that one or start a
fresh branch — it must never silently reuse it, and never delete it (I5).

This guards against silently checking out (or clobbering) an in-progress
demo when the same brand is requested again.

## Setup

- State shows a rebrand already in progress for Acme with a demo branch
  `demo/acme` and an open PR (`landed-via-pr: done`).
- The repo `origin` remote points at the shared showcase repo.

## User prompt

"Let's do a demo of our site for Acme."

## Output Specification

- The agent recognizes there's already an Acme demo in progress and
  **asks** the customer whether to keep building on the existing one or
  start a brand-new one — it does not silently reuse or recreate it.
- It never proposes deleting/closing the existing branch or PR (I5).
- If "start fresh" were chosen, the proposed path is a new,
  non-colliding branch (e.g. `demo/acme-2`) plus a new PR, leaving the
  existing branch/PR intact.
- The agent does not jump to the design tool / CSS edits before the
  branch question is resolved.
- Plain language throughout (I1) — the customer is not shown "branch,"
  "PR," "daFolder," or other internal terms as mechanics.
