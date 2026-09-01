# The login/welcome page must be copied, rebranded, and published under /<company>

## Problem/Feature Description

The portal's login page is the DA document `public/welcome`. In a foldered
demo the worker serves it from `/<company>/public/welcome` (the login base
is `DEMO_BASE_PATH`). If the copy/rebrand/publish scope only covers the
visible page tree and skips the `public` (and `config`) folders, the
foldered portal's login page is missing or shows the old brand — a real
failure from a prior migration where `/acme/public` and `/acme/config`
came across empty and login broke.

So the rebrand scope (Step 4) must:
- treat `/<company>/public/welcome` as one of the pages rewritten to the
  new brand (it carries brand logo/copy), and
- publish `/<company>/public/welcome` and `/<company>/config` alongside
  the rest of the `/<company>` documents.

## Setup

- Fixture state: DA content copied into `/acme`, now at the rebrand step
  (`rebranded: pending`, `intent: frontend-only`, `companyKey: acme`).

## User prompt

"Continue the Acme demo — finish the rebrand."

## Output Specification

- The agent includes the login/welcome page `/acme/public/welcome` in the
  content-rewrite page list (rebranding its logo/copy), not only the main
  page tree.
- The publish list includes `/acme/public/welcome` and `/acme/config`,
  each prefixed with the company folder — never a root `/public/welcome`
  or `/config` path.
- The agent verifies the login page renders with the new brand on the
  preview (the per-PR worker's `/acme/public/welcome`).
- Nothing outside `/acme` is rewritten or published (the shared root login
  page is untouched).
- Plain language to the customer (I1) — no `public/welcome`, `config`,
  `DEMO_BASE_PATH`, or `branch` jargon exposed.
