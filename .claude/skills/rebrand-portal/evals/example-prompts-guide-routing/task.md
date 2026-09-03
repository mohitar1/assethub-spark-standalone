# Example prompts guide routing

## Problem/Feature Description

The README and skill should include examples that teach users how to ask for
the right outcome without knowing internal terms. Examples must make the
source site required, show that every demo always includes assets (asking
only where they come from and whether to enrich now or defer), and make
collection creation automatic once enrichment completes.

## Setup

- The agent is updating or reviewing rebrand-portal guidance.

## User prompt

"What should I ask for if I want a demo portal?"

## Output Specification

- The guidance includes a demo prompt with a source site and assets already
  in Adobe, enriched immediately.
- The guidance includes a demo prompt with a source site and a sample asset
  source page (bring-in lane).
- The guidance includes a prompt that clearly defers enrichment to a later
  step, without ever saying assets are skipped entirely.
- The guidance includes a resumed/assets-later prompt that includes
  collections.
- A vague prompt example triggers an ask for the required source site.
- Examples use user-facing language and do not expose step ids or internal
  tool names.
