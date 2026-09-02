# Source URL uses Experience Catalyst directly

## Problem/Feature Description

The rebrand phase has a source website URL and the Experience Catalyst design
skill is available. A generic `WebFetch` failure must not become a blocker or a
reason to ask the user for colors. The correct behavior is to invoke
`excat-complete-design-expert` directly in Complete Migration mode with the
source URL and copied company pages as verification targets.

This guards a real regression where the agent searched for a generic design
tool, found DesignSync, and asked how to source the look even though Catalyst was
the right tool.

## Setup

- `.internal/onboarding-state.json` exists.
- The copy is ready: `branch-resolved` and `da-content-copied` are done.
- `rebranded` is pending.
- `PLUGIN_STATE.md` says `excat-complete-design-expert` is invokable in this
  session.
- The source site is `https://urbnworld.com/`.
- Assume any generic WebFetch attempt failed before this turn.

## User prompt

"Continue the URBN demo using https://urbnworld.com/ for the look and content
direction."

## Output Specification

Proceed with the design handoff using `excat-complete-design-expert` in Complete
Migration mode. Pass the source URL and copied `/urbn/...` verification targets.
Do not ask how to source the look. Do not ask for colors or a palette. Do not
route to DesignSync. Do not treat WebFetch as a blocker. If setup is mentioned,
it should be only to say Catalyst is available and being used.
