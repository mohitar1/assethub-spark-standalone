# The demo is delivered from the open PR's preview URL — merge not required

## Problem/Feature Description

For the demo, the **per-PR Cloudflare worker**
(`https://<branch>.dev.frescopamedia.com/<company>/…`, auto-deployed for
every PR) serves the rebranded, company-scoped portal — login, search, and
the company filter included — so the rebrand is fully viewable from the
**open PR**. (The raw `*.aem.page` origin is content-only.) Merging is
**not required and not preferred** (I3). Completion of the rebrand is the
open PR + its verified preview URL — not a merge, and not "live in
production."

This guards against the failure of treating merge as the finish line
(claiming the rebrand isn't done/complete until merged, or auto-merging
to make it "live").

## Setup

- State shows the rebrand's code + content work finished on branch
  `demo/acme`, DA content copied and published under `/acme`, and the PR
  just opened (`landed-via-pr: done`).

## User prompt

"Is the Acme rebrand ready? How do I see it?"

## Output Specification

- The agent reports the rebrand as **ready/complete via the open PR**, and
  points the customer at the **branch-preview URL** under `/acme` as the
  thing to open — not a merged/production URL.
- It does **not** say the rebrand is incomplete or not-live merely because
  the PR is open, and does **not** merge (or offer merging as the required
  next step) to make it viewable.
- Any mention of promoting to a production address is framed as optional
  and not needed for the demo.
- The agent does not close/delete the PR (I5).
- Plain language throughout (I1).
