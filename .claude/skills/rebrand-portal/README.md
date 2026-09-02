# Customer Demo Migration

## Overview

- Creates a company-specific demo portal from the existing AEM Edge Delivery site.
- Copies the existing authored content under the company's folder.
- Matches the company's look and content direction from its source site.
- Loads the company's assets so search, filters, and collections work.
- Shares the result as a portal link.
- Does not change the shared original site.
- Does not require a production merge for the demo.
- Requires the operator machine to have the design-matching tool ready before
  visual matching starts.

## Architecture

- Open the architecture view:

```text
.claude/skills/rebrand-portal/docs/rebrand-portal-architecture.html
```

## What You Provide

- Company name.
- Source site to match visually and use for content direction.
- One DA token.
- Asset source:
  - assets already in Adobe under the company's folder
  - or a source page to pull sample images from

## Example Prompts

- Full demo with assets already in Adobe:

```text
Create a demo portal for Acme using https://www.acme.com for the visual style and content direction. The assets are already in Adobe.
```

- Full demo by pulling sample assets:

```text
Create a demo portal for Acme using https://www.acme.com for the visual style and content direction. Pull sample assets from https://www.acme.com/products.
```

- Visual/content copy first, assets later:

```text
Create Acme's demo portal using https://www.acme.com for the visual style and content direction, but stop before loading assets.
```

- Assets later:

```text
Now load Acme's assets from Adobe and create the collections.
```

- Vague prompt:

```text
Rebrand this for Acme.
```

- Expected response:

```text
I need Acme's source site so I can match the look and content direction.
```

## Token Setup

- Create `token.env` in the project root:

```env
DA_TOKEN=<token copied from da.live>
```

- Get the token:
  - Open:

```text
https://da.live/#/{org}/{site}
```

  - Example:

```text
https://da.live/#/mohitar1/assethub-spark-standalone
```

  - Sign in.
  - Open DevTools -> Network.
  - Trigger any DA request, such as:

```text
https://admin.da.live/config/{org}/...
```

  - Copy the request header:

```text
Authorization: Bearer eyJ...
```

  - Paste only the token value:

```env
DA_TOKEN=eyJ...
```

- Do not paste tokens in chat.
- Do not add `HLX_ADMIN_TOKEN` yourself.
- The workflow validates the DA token, reuses an existing publish token if valid, or creates a new one automatically.

## What The Agent Does

- Validates DA access.
- Creates or reuses the publish token.
- Copies authored content into the company folder.
- Updates the copied content and site styling.
- Publishes only the company folder.
- Opens a pull request for the portal build.
- Loads and labels company assets.
- Replaces copied placeholder card visuals with real company assets.
- Creates company-scoped collections after assets are searchable.

## Assets

- If assets are already in Adobe, the workflow labels them so they appear in search and filters.
- If assets are not in Adobe, provide a source page with real product or campaign images.
- Good source page example:

```text
https://example.com/products
```

- The workflow does not invent asset categories. Category links and asset labels are kept aligned.

## Collections

- Collections are created automatically after assets are searchable.
- The workflow creates one collection per category.
- Collections contain only the company's assets.
- The user does not need to ask for this as a separate step.

## Portal Link

- The portal link is the demo deliverable.
- It includes the company folder, login, search, filters, and collections.
- The raw AEM content origin is not the portal link.
- A production merge is optional and not required for the demo.

## Done Means

- Portal link opens.
- Copied pages load under the company folder.
- Login page loads under the company folder.
- Search shows only this company's assets.
- Filters show non-zero counts.
- Category cards return matching assets.
- Collections open with company assets.
- The original shared site is unchanged.

## Common Failures

- DA token expired.
- DA token belongs to a user without access to the site.
- DA token works for content but cannot create the publish token.
- Source site was not provided.
- Assets are missing or the source page has too few usable images.
- Category card links and asset labels do not match.
- Collections were skipped after assets became searchable.
