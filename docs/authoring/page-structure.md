# Page Structure

This guide explains how to organize content on your pages using sections, metadata, and default content.

## Page Anatomy

A typical Spark page consists of:

```
┌─────────────────────────────────┐
│           Header                │  ← Automatic (from header block)
├─────────────────────────────────┤
│                                 │
│         Section 1               │  ← Your content
│    (Hero, intro text, etc.)     │
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  ← Section break (---)
│                                 │
│         Section 2               │
│   (Cards, carousel, content)    │
│                                 │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  ← Section break (---)
│                                 │
│         Section 3               │
│      (More content...)          │
│                                 │
├─────────────────────────────────┤
│        Page Metadata            │  ← Required metadata table
├─────────────────────────────────┤
│           Footer                │  ← Automatic (from footer block)
└─────────────────────────────────┘
```

## Sections

Sections divide your page into distinct content areas. Each section can have its own styling and background.

### Creating Sections

To create a section break, add a horizontal line in your document:

- Type `---` (three hyphens) on its own line, or
- Insert a horizontal line from the menu

Everything between section breaks becomes one section.

### Section Metadata

You can style sections by adding a **Section Metadata** table at the end of the section (before the section break).

| Section Metadata |                |
|------------------|----------------|
| style            | light          |

#### Available Section Styles

**Background styles:**

| Style | Description |
|-------|-------------|
| `light` | Light gray background (#f5f5f5) |
| `highlight` | Same as light — light gray background |
| `white` | White background |
| `medium` | Medium gray background |
| `dark` | Dark background with white text for headings |
| `dark-blue` | Dark blue background with white headings, constrained images |
| `red` | Red background with white headings, constrained images |
| `dark-red` | Dark red background with white headings, constrained images |
| `light-blue` | Sky blue background |

**Hero styles** (full-bleed, no content container constraints):

| Style | Description |
|-------|-------------|
| `hero-white` | White background, full-width images with no padding |
| `hero-black` | Black background, full-width images with white headings |

**Layout modifiers** (combine with background styles):

| Style | Description |
|-------|-------------|
| `center` | Centers the content |
| `full-width` | Removes the max-width container (content spans full page width) |
| `spacing-top` | Adds extra padding at the top of the section |
| `spacing-bottom` | Adds extra padding at the bottom of the section |

#### Example: Section with Light Background

```
## Our Services

We offer a wide range of digital assets...

| Section Metadata |       |
|------------------|-------|
| style            | light |

---
```

#### Combining Styles

You can apply multiple styles by separating them with commas:

| Section Metadata |              |
|------------------|--------------|
| style            | light, center |

## Default Content

Default content is any text, images, or formatting that isn't inside a block. It renders directly as HTML.

### Supported Default Content

| Element | How to Create |
|---------|---------------|
| Headings | Use heading styles (Heading 1, Heading 2, etc.) |
| Paragraphs | Regular text |
| Bold text | Select text and apply bold |
| Italic text | Select text and apply italic |
| Links | Select text and add hyperlink |
| Bulleted lists | Use bullet list formatting |
| Numbered lists | Use numbered list formatting |
| Images | Insert image into document |

### Default Content vs Blocks

| Use Default Content When... | Use a Block When... |
|-----------------------------|---------------------|
| Simple text paragraphs | Structured layouts (cards, carousels) |
| Single images with captions | Image galleries or carousels |
| Basic lists | Interactive elements (tabs, accordion) |
| Headings and body copy | Special functionality needed |

## Page Metadata

Every page requires a **Metadata** table at the end of the document. This controls SEO, social sharing, and page behavior.

### Required Metadata Table

Add this table at the very end of your document:

| Metadata    |                              |
|-------------|------------------------------|
| title       | Your Page Title              |
| description | A brief description of the page for search engines |
| image       | /path/to/social-share-image.jpg |

### Common Metadata Properties

| Property | Purpose | Example |
|----------|---------|---------|
| `title` | Page title (browser tab, search results) | `About Spark` |
| `description` | SEO description (search result snippet) | `Learn about our digital asset platform` |
| `image` | Social sharing image (og:image) | `/images/about-hero.jpg` |

### Metadata Best Practices

- **Title**: Keep under 60 characters
- **Description**: Keep between 150-160 characters
- **Image**: Use images at least 1200x630 pixels for social sharing

## Complete Page Example

Here's an example of a complete page structure:

```
[Hero Block with background image]

---

## Welcome to Spark

Access thousands of brand-approved digital assets for your marketing needs.

| Section Metadata |       |
|------------------|-------|
| style            | light |

---

## Featured Collections

[Cards Block showing featured collections]

---

## Need Help?

Contact our support team for assistance with finding the right assets.

[Button or link to contact page]

| Section Metadata |            |
|------------------|------------|
| style            | light-blue |

---

| Metadata    |                                        |
|-------------|----------------------------------------|
| title       | Spark - Digital Asset Portal       |
| description | Access brand-approved digital assets for marketing |
| image       | /images/home-social.jpg                |
```

## Tips

1. **Start with a hero** - Most pages benefit from a Hero block at the top
2. **Use sections for visual rhythm** - Alternate between styled and unstyled sections
3. **Keep sections focused** - Each section should have one main purpose
4. **Don't over-style** - Too many different section styles can look chaotic
5. **Always add metadata** - Every page needs at minimum a title and description

## Next Steps

- [Blocks Overview](blocks/README.md) - Learn about available blocks
- [Hero Block](blocks/hero.md) - Create impactful page headers
- [Images and Media](images-and-media.md) - Working with images
