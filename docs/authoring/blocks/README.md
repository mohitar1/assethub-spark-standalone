# Blocks Overview

Blocks are reusable content components that provide structured layouts and functionality beyond simple text and images.

## What is a Block?

A block is a special content element created using a table in your document. The table tells the system what type of block to render and what content to display.

Examples of blocks:
- **Cards** - Grid of content cards with images
- **Carousel** - Rotating content slider
- **Accordion** - Expandable/collapsible sections
- **Tabs** - Tabbed content panels

## Creating a Block

Every block follows the same basic pattern:

### Step 1: Insert a Table

Insert a table into your document where you want the block to appear.

### Step 2: Add the Block Name

In the first row, type the block name (e.g., `Cards`, `Accordion`, `Tabs`).

### Step 3: Add Content

Fill in the remaining rows with your content. Each block has its own content structure.

### Basic Block Structure

```
┌─────────────────────────────────┐
│          Block Name             │  ← First row: block name (merged cells)
├─────────────────┬───────────────┤
│    Content      │    Content    │  ← Content rows
├─────────────────┼───────────────┤
│    Content      │    Content    │
└─────────────────┴───────────────┘
```

### Example: Simple Cards Block

| Cards |  |
|-------|--|
| image.jpg | Card Title |
| image-2.jpg | Another Title |

This creates a grid of cards with images and titles.

## Block Variants

Many blocks support **variants** that modify their appearance or behavior. Add the variant name in parentheses after the block name.

| Cards (highlights) |  |
|--------------------|--|
| image.jpg | Featured Item |

Common variant patterns:
- `Block (variant)` - Single variant
- `Block (variant1, variant2)` - Multiple variants

Check each block's documentation for available variants.

## Block Content Types

Blocks can contain different types of content in their cells:

| Content Type | Description | Example |
|--------------|-------------|---------|
| Text | Plain text or formatted text | Paragraphs, headings, lists |
| Images | Pictures inserted into cells | Product photos, icons |
| Links | Hyperlinked text or images | Navigation links, CTAs |
| Mixed | Combination of above | Image with caption and link |

## Available Blocks

### Layout Blocks

| Block | Purpose | Documentation |
|-------|---------|---------------|
| [Cards](cards.md) | Grid of content cards | [View](cards.md) |
| [Carousel](carousel.md) | Rotating content slider | [View](carousel.md) |
| [Team Cards](team-cards.md) | Team member display grid | [View](team-cards.md) |

### Interactive Blocks

| Block | Purpose | Documentation |
|-------|---------|---------------|
| [Accordion](accordion.md) | Expandable/collapsible sections | [View](accordion.md) |
| [Tabs](tabs.md) | Tabbed content panels | [View](tabs.md) |
| [FAQ](faq.md) | Tabbed accordion for FAQs | [View](faq.md) |

### Search Blocks

| Block | Purpose | Documentation |
|-------|---------|---------------|
| [Search](search.md) | Search bar for navigating to search pages | [View](search.md) |

### Data-Driven Blocks

| Block | Purpose | Documentation |
|-------|---------|---------------|

### Utility Blocks

| Block | Purpose | Documentation |
|-------|---------|---------------|
| [Note](note.md) | Callout boxes for important info | [View](note.md) |
| [Fragment](fragment.md) | Include content from other pages | [View](fragment.md) |

### Patterns (Default Content)

| Pattern | Purpose | Documentation |
|---------|---------|---------------|
| [Buttons](buttons.md) | Call-to-action links | [View](buttons.md) |

## Tips for Working with Blocks

### Do

- **Check the documentation** for each block before using it
- **Preview your page** after adding blocks to verify they render correctly
- **Use the right block** for your content type (don't force content into the wrong block)
- **Keep content concise** - blocks work best with focused content

### Don't

- **Don't nest blocks** inside other blocks (unless specifically documented)
- **Don't leave the block name row empty** - it must contain the block name
- **Don't add extra rows** beyond what the block expects
- **Don't use blocks for simple content** - use default content instead

## Troubleshooting

### Block Not Rendering

If your block appears as a plain table instead of the expected component:

1. **Check the block name** - Spelling must be exact (case-insensitive)
2. **Check the table structure** - First row must contain only the block name
3. **Preview the page** - Changes may need a preview refresh

### Content Not Appearing

If some content is missing from your block:

1. **Check cell placement** - Content must be in the correct cells
2. **Check for merged cells** - Only merge the header row
3. **Verify content type** - Some blocks only accept certain content types

### Styling Issues

If the block looks different than expected:

1. **Check for variants** - You may need to add a variant for the desired style
2. **Check section styling** - Section Metadata may affect block appearance
3. **Try a different block** - The block may not be designed for your use case

## Next Steps

Explore individual block documentation:

- [Cards](cards.md) - Display content in card format
- [Carousel](carousel.md) - Showcase featured content
- [Accordion](accordion.md) - Organize content in expandable sections
- [Tabs](tabs.md) - Create tabbed content panels
- [FAQ](faq.md) - Build categorized FAQ pages
- [Note](note.md) - Add callout boxes
- [Fragment](fragment.md) - Reuse content across pages
- [Team Cards](team-cards.md) - Display team members
- [Buttons](buttons.md) - Style call-to-action links
- [Search](search.md) - Add a search bar to any page
