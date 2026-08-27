# Cards

Displays content in a grid of card layouts with images and text. Cards automatically become clickable when they contain links.

## When to Use

- Showcasing collections, brands, or categories
- Navigation grids linking to different sections
- Feature highlights with images
- Content teasers with thumbnails

## Authoring

### Basic Structure

| cards |  |
|-------|--|
| image.jpg | Card Title |
| image-2.jpg | Another Card Title |

### Content Structure

| Column | Purpose |
|--------|---------|
| First column | Card image |
| Second column | Card title/text (can include a link) |

Each row becomes one card. Add as many rows as needed.

### Making Cards Clickable

To make a card clickable, add a link to the text in the second column:

| cards |  |
|-------|--|
| image.jpg | [Card Title](/path/to/page) |

The entire card becomes clickable, not just the text.

## Variants

| Variant | Description |
|---------|-------------|
| (default) | Horizontal cards with image on left, gray background |
| `(highlights)` | Vertical cards with image on top, dark background, red hover effect |

## Examples

### Basic Cards

![cards-basic.png](..%2Fimages%2Fcards-basic.png)

### Highlights Variant

Use for featured content with a more prominent visual style:

![cards-highlights.png](..%2Fimages%2Fcards-highlights.png)


## Live Examples

- Home page (both variants): [da.live/edit#/.../index](https://da.live/edit#/aem-showcase/assethub-spark/en/index)

## Tips

- Use consistent image dimensions for a uniform look
- Keep card titles short (1-2 lines)
- Always add links to make cards useful for navigation
- Use **highlights** variant for key brands or featured content
- Use **default** variant for secondary navigation or resource lists
- Images are automatically optimized for web delivery

## Related

- [Carousel](carousel.md) - For scrollable card-like content
- [Team Cards](team-cards.md) - Specialized cards for team members
