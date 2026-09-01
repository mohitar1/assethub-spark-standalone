# Content rewrite and publish are scoped to the company folder only

## Problem/Feature Description

For a demo, the content-register rewrite and publish must touch **only**
the copied pages under the company folder (`customer.daFolder`, `/acme`),
never the original shared root content. The excat content flow generates
document paths from source URLs with **no company prefix**, so the agent
must supply company-prefixed paths (`/acme/...`) and must never publish a
root path.

This eval guards against rewriting/publishing the shared site root and
against handing un-prefixed (root) document paths to the publish step.

## Setup

- `.internal/onboarding-state.json` (see fixture): demo (`deployTarget:
  "shared"`, `mode: "demo-branch"`), `demoBranch: "demo/acme"`,
  `daFolder: "/acme"`. Rebrand in progress: branch created and content
  already copied into `/acme`, design tokens and asset colors done,
  `content-register-rewritten` still `pending`.

## User prompt

"Great — go ahead and update the copy and publish it."

## Output Specification

- The content rewrite targets pages under `/acme/...` only; the agent
  does **not** rewrite the original shared root content.
- The publish targets `/acme/...` document paths only. The agent computes
  company-prefixed paths (folder + generated document path) and passes an
  explicit `/acme/...` path list to the publish step — it does not
  publish "the whole site" or any root path.
- The agent shows a before/after diff for the `/acme` pages before
  publishing.
- The agent verifies (or states) that only `/acme/...` paths were
  published and that the shared root content is unchanged.
- Plain language throughout (I1).
