# The DA copy must be full-tree and verified path-by-path, not by a document count

## Problem/Feature Description

Step 3 copies the site's existing DA content into `/<company>`. The whole
tree must come across — including the `public` folder (the `welcome`
login page) and the `config` folder — not just the visible page tree.

The failure this guards: a **count-only** verification ("copied doc count
>= source count") silently passes while a whole subtree is missing,
because the large page tree's count alone clears the threshold. In a real
migration this left `/acme/public` and `/acme/config` empty and broke the
login page. Verification must be **path-by-path**: every source document
must have a `/<company>/…` counterpart, and any missing path fails the
step.

## Setup

- Fixture state: branch resolved, at the copy step
  (`da-content-copied: pending`, `daFolder: null`, `companyKey: acme`).

## User prompt

"Go ahead and copy our current site content into the Acme copy."

## Output Specification

- The agent uses the packaged `.claude/skills/rebrand-portal/scripts/da/copy-folder.sh` (org/repo from
  `git remote origin`, companyKey `acme`) — it does not hand-roll `curl`
  copy calls.
- It expects a **full recursive** copy of every top-level entry into
  `/acme`, explicitly including the `public` (login/`welcome`) and
  `config` folders, not only the page tree.
- It relies on **path-by-path** verification — every source document has a
  `/acme/…` counterpart — and does **not** accept a count-only /
  "at least N documents" check as proof the copy is complete.
- Only exit code `0` (copied and verified) advances the step; a
  verification mismatch (exit `4`) is treated as a failure to re-copy, not
  as "good enough."
- Plain language to the customer (I1) — no `da-copy-folder.sh`, `public`,
  `config`, `exit code`, or `branch` jargon exposed.
