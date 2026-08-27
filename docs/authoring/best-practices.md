# Best Practices

This guide covers tips and recommendations for effective content authoring in Spark.

## General Authoring

### Do

- **Preview before publishing** - Always check your changes in preview mode
- **Use descriptive page names** - Page names become URLs (`about-us` not `page1`)
- **Keep content focused** - One main topic per page
- **Write for scanning** - Use headings, lists, and short paragraphs
- **Test on mobile** - Many users access Spark on smaller screens

### Don't

- **Don't publish without previewing** - Catch issues before they go live
- **Don't use special characters in page names** - Stick to lowercase letters and hyphens
- **Don't create overly long pages** - Break content into multiple pages if needed
- **Don't forget metadata** - Every page needs title and description

## Page Structure

### Section Organization

- **Start with the most important content** - Users may not scroll down
- **Use sections to create visual breaks** - Alternate between styled and unstyled sections
- **Keep sections focused** - Each section should have one purpose
- **Don't overuse styled sections** - Too many backgrounds can look chaotic

### Metadata

| Always Include | Recommended |
|----------------|-------------|
| `title` | `description` |

- Keep titles under 60 characters
- Keep descriptions between 150-160 characters
- Make titles unique and descriptive

## Working with Blocks

### Choosing the Right Block

| Content Type | Recommended Block |
|--------------|-------------------|
| Expandable Q&A | [Accordion](blocks/accordion.md) |
| Categorized FAQ | [FAQ](blocks/faq.md) |
| Image grid navigation | [Cards](blocks/cards.md) |
| Featured content slider | [Carousel](blocks/carousel.md) |
| Categorized content | [Tabs](blocks/tabs.md) |
| Important callouts | [Note](blocks/note.md) |
| Reusable content | [Fragment](blocks/fragment.md) |
| Team members | [Team Cards](blocks/team-cards.md) |

### Block Tips

- **Check block documentation first** - Each block has specific requirements
- **Use the correct table structure** - Blocks won't render if the structure is wrong
- **Don't nest blocks** - Unless specifically documented
- **Keep block content concise** - Blocks work best with focused content

### When NOT to Use Blocks

Use default content (paragraphs, headings, lists) for:
- Simple text content
- Single images with captions
- Basic lists
- Inline links

## Images

### Quality

- **Use high-resolution source images** - At least 750px wide for most blocks
- **Maintain consistent aspect ratios** - Especially in grids (Cards, Carousel)
- **Optimize before upload** - Keep files under 5MB

### Alt Text

- **Always add alt text** - Required for accessibility
- **Be descriptive but concise** - Under 125 characters
- **Skip "image of..." prefixes** - Just describe the content

### File Naming

- Use lowercase letters and hyphens
- Be descriptive: `acme-holiday-2025.jpg` not `IMG_1234.jpg`
- Avoid spaces and special characters

## Writing for the Web

### Headlines

- **Front-load important words** - Put key information first
- **Use sentence case** - "How to download assets" not "How To Download Assets"
- **Keep headlines short** - Under 70 characters for main headings

### Body Text

- **Write short paragraphs** - 2-4 sentences max
- **Use bullet points** - For lists of 3+ items
- **Break up long content** - Use subheadings every 2-3 paragraphs
- **Write in active voice** - "Click the button" not "The button should be clicked"

### Links

- **Use descriptive link text** - "View the FAQ" not "Click here"
- **Check all links work** - Before publishing
- **Open external links in new tabs** - When appropriate

## Buttons

### Primary vs Secondary

| Use Primary For | Use Secondary For |
|-----------------|-------------------|
| Main action (Sign In) | Alternative action (Register) |
| One per section | Supporting actions |
| Most important CTA | Less prominent options |

### Button Text

- **Use action verbs** - "Download", "Sign In", "Submit"
- **Keep text short** - 1-3 words is ideal
- **Be specific** - "Download PDF" better than "Download"

## Localization

- **Mirror folder structure** - Same hierarchy across languages
- **Use same page names** - `/en/help/faq` and `/ja/help/faq`
- **Keep block names in English** - `cards` not `カード`
- **Translate all visible text** - Including alt text and metadata

## Common Mistakes to Avoid

### Structure Mistakes

| Mistake | Solution |
|---------|----------|
| Missing block name row | First row must contain only the block name |
| Wrong number of columns | Check block documentation for requirements |
| Nested blocks | Avoid unless specifically supported |
| Missing section breaks | Use `---` to separate sections |

### Content Mistakes

| Mistake | Solution |
|---------|----------|
| Walls of text | Break into paragraphs with headings |
| Missing alt text | Add descriptions to all meaningful images |
| Vague link text | Use descriptive text like "View FAQ" |
| Inconsistent styling | Follow established patterns |

### Publishing Mistakes

| Mistake | Solution |
|---------|----------|
| Publishing without preview | Always preview first |
| Forgetting to publish images | Images must be published separately |
| Broken internal links | Check links point to published pages |
| Missing metadata | Add title and description to every page |

## Quality Checklist

Before publishing, verify:

- [ ] Page previews correctly
- [ ] All images display properly
- [ ] All links work
- [ ] Metadata (title, description) is set
- [ ] Content is proofread
- [ ] Mobile view looks good
- [ ] Blocks render as expected
- [ ] Alt text is added to images

## Getting Help

- **Document Authoring Docs** - [docs.da.live](https://docs.da.live/)
- **AEM Edge Delivery Services** - [aem.live/docs](https://www.aem.live/docs/)
- **This Guide** - [Blocks Overview](blocks/README.md), [Page Structure](page-structure.md)

## Related

- [Getting Started](getting-started.md) - Authoring basics
- [Page Structure](page-structure.md) - Sections and metadata
- [Blocks Overview](blocks/README.md) - Available blocks
- [Images and Media](images-and-media.md) - Image guidelines
- [Localization](localization.md) - Multi-language content
