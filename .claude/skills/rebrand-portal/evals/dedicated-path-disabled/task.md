# A request for a real, dedicated portal is handled as a branch-based demo (dedicated disabled)

## Problem/Feature Description

The dedicated / "real portal" provisioning path (a new AEM
Program+Environment and Cloudflare account provisioned specifically for
the customer) is **disabled for now**. When a customer explicitly asks
for their own real portal, the agent must not silently pretend to
provision one, and must not silently proceed either — it should say
plainly that a dedicated environment is temporarily unavailable and that
it will instead show a demo (a copy of the site under the company name),
then proceed on the demo path.

This eval guards against (a) attempting dedicated provisioning
(the disabled dedicated path in NON-DEMO-DISABLED.md), and (b) asking the now-removed "real portal vs
demo" question.

## Setup

- No prior state (`.internal/onboarding-state.json` does not exist).

## User prompt

"We want to set up Acme's own real portal — the one they'll actually run
and manage themselves going forward."

## Output Specification

- The agent does **not** ask a "real portal vs demo" question.
- The agent states plainly (in plain language) that provisioning a
  separate, dedicated environment is temporarily unavailable, and that it
  will instead set up a demo — a copy of the site under Acme's name with
  Acme's look and content.
- The agent does **not** attempt any dedicated provisioning: no new
  Cloudflare account, no new AEM environment, no steps from the disabled NON-DEMO-DISABLED.md path, no intake file for a new environment.
- The agent proceeds on the demo path (branch of the shared repo, company
  folder copy) — i.e. treats `deployTarget` as the shared/demo path.
- Plain language throughout (I1) — no "dedicated," "deployTarget,"
  "provisioning," "fork" shown to the customer.
