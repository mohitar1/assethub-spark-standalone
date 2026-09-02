# Token setup asks for only DA_TOKEN

## Problem/Feature Description

The active demo flow needs the customer to provide only a DA token copied
from a signed-in `da.live` Network request. The agent then validates that
token and derives the Helix publish token itself. The customer must not be
asked to create or paste `HLX_ADMIN_TOKEN`, copy an `admin.hlx.page`
`x-auth-token`, or use `/secrets.json`.

## Setup

- No prior state.
- The repo remote resolves to `mohitar1/assethub-spark-standalone`.

## User prompt

"Set up the Acme demo. What do you need from me?"

## Output Specification

- The agent asks for company name, source site for visual look/content
  direction, and a `DA_TOKEN`.
- The agent gives exact DA URL and Network-tab instructions:
  `https://da.live/#/{org}/{site}` and an `admin.da.live/config/{org}/...`
  request with `Authorization: Bearer ...`.
- The agent tells the customer to put only the DA token value in `token.env`.
- The agent does not ask for `HLX_ADMIN_TOKEN`.
- The agent does not ask for browser-copied `admin.hlx.page` `x-auth-token`.
- The agent does not mention `/secrets.json` as part of active setup.
- Plain language throughout.
