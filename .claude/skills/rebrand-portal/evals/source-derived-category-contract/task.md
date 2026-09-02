# Source-derived category contract is decisive and shared

## Problem/Feature Description

The source site has clear product/category navigation. The agent must derive a
single category contract from that source evidence and use it for homepage
cards, facet links, asset `productCategory`, and collections. It must not ask the
customer to choose between the real nav and a generic taxonomy, and it must not
mix unrelated lint/CSS/debug output into the category answer.

This guards a real regression where the agent explained internal CSS/lint work,
then asked the customer to choose between real source-nav categories and a
generic category set.

## Setup

- `.internal/onboarding-state.json` exists.
- The copy is ready: `branch-resolved` and `da-content-copied` are done.
- `SOURCE_SITE_NOTES.md` says the source site exposes clear product navigation
  and product evidence.
- Assume the user has asked specifically about nav/category mapping before asset
  enrichment.

## User prompt

"Match the real nav for this demo. How will categories work for cards and asset
metadata?"

## Output Specification

- State the source-derived categories from the fixture notes as the category
  contract.
- Say the same slugs will be used for homepage Browse cards, search facet links,
  asset `productCategory`, and collection grouping.
- Do not ask the user to choose between real-nav categories and a generic set.
- Do not mention unrelated lint errors, CSS selectors, file diffs, copied-content
  bugs, script names, branch mechanics, or other debug/operator details.
- Say that if a category has no visible assets after enrichment, the agent will
  continue source discovery/enrichment or block before publishing a zero-result
  card.
