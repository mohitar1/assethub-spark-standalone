# Tabs

Creates a tabbed interface for organizing content into multiple panels. Users click tab buttons to switch between content sections.

## When to Use

- Organizing related content into categories
- Reducing page length by hiding content until needed
- Comparing different options or categories
- Content stores with multiple brand sections

## Authoring

### Basic Structure

| tabs |  |
|------|--|
| Tab 1 Title | Content for tab 1 |
| Tab 2 Title | Content for tab 2 |
| Tab 3 Title | Content for tab 3 |

### Content Structure

| Column | Purpose |
|--------|---------|
| First column | Tab button label |
| Second column | Tab panel content |

Each row becomes one tab. Add as many rows as needed.

### Using Fragments in Tabs

You can load content from other pages (fragments) instead of inline content. This is useful for reusable content or complex tab panels.

Use the special syntax `((fragment)):` followed by a link to the fragment:

| tabs |  |
|------|--|
| Brand A | ((fragment)): [/fragments/brand-a](/fragments/brand-a) |
| Brand B | ((fragment)): [/fragments/brand-b](/fragments/brand-b) |
| Brand C | ((fragment)): [/fragments/brand-c](/fragments/brand-c) |

## Examples

### Simple Tabs

| tabs |  |
|------|--|
| Overview | This product line includes our flagship beverages available worldwide. |
| Features | Key features include refreshing taste, iconic branding, and global availability. |
| Downloads | Access product images, logos, and marketing materials in the sections below. |

### Brand Tabs with Fragments

| tabs |  |
|------|--|
| Brand A | ((fragment)): [/fragments/brand-a](/fragments/brand-a) |
| Brand B | ((fragment)): [/fragments/brand-b](/fragments/brand-b) |

### Content with Cards Inside Tabs

Tab content can include other blocks. Create the tab content with cards:

| tabs |  |
|------|--|
| Images | Browse our image library for this campaign. [View all images](/search?type=images) |
| Videos | Find video assets and b-roll footage. [View all videos](/search?type=videos) |


## Live Examples

- Content Stores page: [da.live/edit#/.../all-content-stores](https://da.live/edit#/aem-showcase/assethub-spark/all-content-stores)

## Tips

- Keep tab labels short (1-3 words)
- Use consistent naming across tabs
- Don't create too many tabs (3-5 is ideal)
- First tab should contain the most important/common content
- Use fragments for complex or reusable tab content
- Tab content can include other blocks, text, images, and links

## Fragment Syntax

The fragment syntax must be exact:

```
((fragment)): [link text](/path/to/fragment)
```

- `((fragment)):` - Required prefix (with colon)
- Space after the colon
- Standard link in brackets and parentheses

## Related

- [Accordion](accordion.md) - For expandable/collapsible sections
- [FAQ](faq.md) - Combines tabs with accordions
- [Fragment](fragment.md) - For reusable content blocks
