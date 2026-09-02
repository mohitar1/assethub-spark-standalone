# Example prompts guide routing

## Problem/Feature Description

The README and skill should include examples that teach users how to ask for
the right outcome without knowing internal terms. Examples must make the
source site required, distinguish full vs frontend-only vs assets-later, and
make collection creation automatic after assets.

## Setup

- The agent is updating or reviewing rebrand-portal guidance.

## User prompt

"What should I ask for if I want a demo portal?"

## Output Specification

- The guidance includes a full-demo prompt with a source site and assets
  already in Adobe.
- The guidance includes a full-demo prompt with a source site and a sample
  asset source page.
- The guidance includes a frontend-only prompt that clearly stops before
  loading assets.
- The guidance includes an assets-later prompt that includes collections.
- A vague prompt example triggers an ask for the required source site.
- Examples use user-facing language and do not expose step ids or internal
  tool names.
