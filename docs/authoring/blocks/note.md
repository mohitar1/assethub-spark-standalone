# Note

Creates styled callout boxes with icons for highlighting important information, tips, or warnings.

## When to Use

- Drawing attention to important information
- Providing helpful tips or guidance
- Warning users about potential issues
- Highlighting prerequisites or requirements

## Authoring

### Basic Structure

| note |
|------|
| Your message here |

### With a Heading

| note |
|------|
| **Important** |
| Please read the following instructions carefully before proceeding. |

## Variants

| Variant | Icon | Description |
|---------|------|-------------|
| (default) | Info | Blue background with info icon (default style) |
| `(info)` | Info | Same as default - informational message |
| `(warning)` | Warning | Warning icon for cautionary messages |
| `(error)` | Error | Error icon for critical information |
| `(success)` | Success | Success icon for positive confirmations |
| `(no-icon)` | None | Removes the icon entirely |

## Examples

### Default Info Note

| note |
|------|
| Explore tabs below to access various content |

### Info Note (Explicit)

| note (info) |
|-------------|
| Need help? Don't hesitate to reach out to us at assetmanagers@example.com |

### Warning Note

| note (warning) |
|----------------|
| Some assets may require additional rights approval before use. |

### Error Note

| note (error) |
|--------------|
| This content store is no longer available. Please contact support. |

### Success Note

| note (success) |
|----------------|
| Your request has been submitted successfully. |

### Note Without Icon

| note (no-icon) |
|----------------|
| This is a simple callout without an icon. |

### Note with Heading and Content

| note (info) |
|-------------|
| **Before You Begin** |
| Make sure you have the necessary permissions to download assets from this content store. |

## Live Examples

- Content Stores page: [da.live/edit#/.../all-content-stores](https://da.live/edit#/aem-showcase/assethub-spark/en/help/meet-the-team)

## Tips

- Keep note content concise and scannable
- Use the appropriate variant for the message type
- Don't overuse notes - they lose impact if every section has one
- Use `(no-icon)` for subtle callouts that don't need visual emphasis
- Notes work well at the top of sections to set context

## Related

- [Accordion](accordion.md) - For expandable help content
- [Fragment](fragment.md) - For reusable note content across pages
