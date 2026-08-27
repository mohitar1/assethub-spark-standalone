# Carousel

Creates a horizontal scrolling carousel with navigation controls for showcasing featured content. Cards display an image on top with a title below on a dark background.

## When to Use

- Featuring new or highlighted content ("What's New")
- Showcasing multiple items in limited space
- Campaign or collection highlights
- Content that benefits from visual browsing

## Authoring

### Basic Structure

| carousel |  |
|----------|--|
| image1.jpg | Title 1 |
| image2.jpg | Title 2 |
| image3.jpg | Title 3 |
| image4.jpg | Title 4 |

### Content Structure

| Column | Purpose |
|--------|---------|
| First column | Slide image |
| Second column | Slide title (can include a link) |

Each row becomes one carousel slide. Add as many rows as needed.

### Making Slides Clickable

To make a slide clickable, add a link to the title:

| carousel |  |
|----------|--|
| campaign.jpg | [Holiday Campaign 2025](/campaigns/holiday-2025) |

The entire slide becomes clickable and opens the link in a new tab.

## Variants

| Variant | Description |
|---------|-------------|
| (default) | Dark card: image on top, black content bar with a single white title. Best for "What's New"-style featured content. |
| `(tiles)` | Light card: transparent content area with visible title, description, and link, matching the site's `.home .cards` tile styling. Best for navigation-style carousels like category or brand tiles. |
| `(bold)` | Heavier (bold) text weight for the slide description. |

## Examples

### What's New Carousel

| carousel |  |
|----------|--|
| lemonade.jpg | [Minute Maid Lemonade](/campaigns/minute-maid) |
| artd.jpg | [ARTD Portfolio](/campaigns/artd) |
| fifa.jpg | [FIFA 26 Slim Can](/campaigns/fifa) |
| holiday.jpg | [Road to FIFA](/campaigns/road-to-fifa) |

### Tiles Carousel

Use the `(tiles)` variant for navigation-style content like categories or brands,
where a visible description and link help orient the reader:

| carousel (tiles) |  |
|----------|--|
| coffee.jpg | Coffee<br>Bagged coffee, pods, and signature roasts.<br>[Browse →](/en/search?category=coffee) |
| machines.jpg | Machines<br>Espresso machines and smart brewing gear.<br>[Browse →](/en/search?category=machine) |

## Live Examples

- Home page carousel: [da.live/edit#/.../index](https://da.live/edit#/aem-showcase/assethub-spark/en/index)

## Tips

- Use high-quality images with consistent dimensions
- Keep titles short (1-2 lines work best)
- Add at least 4-5 slides to make the carousel useful
- Always include links to make slides actionable
- Consider the mobile experience where only 1 slide shows at a time
- Images are automatically optimized for web delivery

## Related

- [Cards](cards.md) - For non-scrolling grid layouts
- [Cards (highlights)](cards.md#highlights-variant) - Similar visual style without scrolling
