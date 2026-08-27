# Search

A simple search bar that lets users enter queries and navigate to search result pages. Supports a dropdown for selecting different search destinations.

## When to Use

- Adding a search entry point on landing pages or hub pages
- Providing quick access to asset search from any page
- Creating a search gateway with multiple search destinations (e.g., All Assets, Templates, Videos)
- Embedding a search bar in hero sections or page headers

## Authoring

### Basic Structure

| Search |  |
|--------|--|

That's it — with no configuration, the block renders a search bar that uses the centrally configured search pages from the `configs` spreadsheet (`search-pages` sheet).

### Configuration

| Option | Description |
|--------|-------------|
| `paths` | A list of search destinations shown as a dropdown. Each item is in `Title: /path` format. If omitted, the block falls back to centrally configured search pages. |

### Custom Paths

To provide custom search destinations, add a `paths` row with a bulleted list:

| Search |  |
|--------|--|
| paths | - All Assets: /search/all |
|       | - Templates: /search/templates |
|       | - Videos: /search/videos |

Each list item follows the format `Label: /path`, where:
- **Label** — the text shown in the dropdown (e.g., "All Assets")
- **/path** — the search page URL to navigate to when searching

### How It Works

1. The block renders a search input field with an optional dropdown (if multiple paths are configured)
2. The dropdown automatically selects the option matching the current page URL
3. When the user types a query and clicks **Search** (or presses Enter), the browser navigates to the selected search page with a `?query=` parameter
4. If the current URL already has a `query` or `fulltext` parameter, the input is pre-populated with that value

### Without Dropdown

When only one path is configured (or no paths at all), the dropdown is hidden and the search bar appears with rounded corners as a standalone input.

## Examples

### Minimal (Default Config)

| Search |  |
|--------|--|

Uses search pages from the `configs` spreadsheet. No dropdown if only one search page is configured.

### With Custom Paths

| Search |  |
|--------|--|
| paths | - All Assets: /search/all |
|       | - Templates: /search/templates |

Renders a dropdown with "All Assets" and "Templates" options next to the search input.

## Live Examples

- Home page: [da.live/edit#/.../index](https://da.live/edit#/aem-showcase/assethub-spark/en/index)

## Tips

- If you don't need a dropdown, omit the `paths` row entirely — the block will use centrally configured search pages
- Paths are automatically localized (e.g., `/search/all` becomes `/en/search/all` for English locale)
- The search bar auto-focuses when the page loads, so users can start typing immediately
- On mobile (under 600px), the layout stacks vertically with the dropdown on top and a full-width search button
- URL parameters are preserved when navigating — existing filters won't be lost
