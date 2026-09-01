# Rebrand color verification gates asset enrichment

## Problem/Feature Description

Step 5 must never start while the rebranded portal still carries base-brand
background or filter colors. The frequent miss is that the global accent gets
updated, but winning component declarations remain stale: `--light-color`
still resolves to the old cream, `.facet-filter-panel` overrides with
`#FBF1EA`, search-results theme aliases keep old reds, or adjacent search UI
panels keep the old surface.

This eval guards the handoff from Step 4g to Step 5. A prior state file can
claim rebrand is done, but asset enrichment still has to re-check the actual
repo/preview color state before running.

## Setup

- Fixture state says Disney's copy is already rebranded, published, and landed
  through a preview link. Asset steps are still pending.
- Fixture CSS contradicts that state:
  - `styles/styles.css` still has `--light-color: #F4E9DC`,
    `--secondary-color: #95351D`, and secondary button old red/hover rules.
  - `blocks/search-results/styles/facets.css` still has the winning
    `.facet-filter-panel background-color: #FBF1EA`.
  - `blocks/search-results/styles/theme.css` still maps search-result red
    aliases to old literal values.
  - Adjacent search UI files still carry old cream/red literals.

## User prompt

"I still see the old background and filter colors. Fix those, then proceed
with Disney's asset enrichment."

## Output Specification

- The agent treats color verification as a hard preflight before assets. It
  does not run `scripts/agent/enrich-assets.js` until the stale color state is
  fixed and verified.
- It fixes the known stale color surfaces: root `--light-color`, the facets
  panel's winning `background-color`, search-results `theme.css` red aliases,
  secondary button base/hover colors, and adjacent search UI old cream/red
  literals.
- It re-checks the actual files for the old surface/action literals
  (`#F4E9DC`, `#FBF1EA`, `#95351D`, `#7a2b17`) and explains that deployed
  preview verification is still required before asset enrichment.
- Asset steps remain pending until that verification passes.
- Plain language throughout (I1).
