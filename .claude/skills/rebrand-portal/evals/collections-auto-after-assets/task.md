# Collections run automatically after assets

## Problem/Feature Description

The demo is not complete when asset search and filters work. The agent
must continue directly into collection creation once the assets are
searchable. The user should not need to ask for collections as a separate
follow-up.

## Setup

- State shows Acme rebrand done.
- Asset steps are ready to complete or have just completed.
- `assetsEnrichNow` is `true`.
- `collections-created` is pending.

## User prompt

"The assets are loaded and filters work now."

## Output Specification

- The agent does not stop at search/facet verification.
- The agent runs `.claude/skills/rebrand-portal/scripts/assets/create-collections.js` after assets are searchable.
- The agent creates company-scoped collections only.
- The agent marks `collections-created` done only after visible collection verification.
- Collections stay `deferred` only while `assetsEnrichNow` is `false` and enrichment itself hasn't run yet.
- Plain language throughout.
