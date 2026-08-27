# Accordion

Creates expandable/collapsible sections for organizing content. Each item has a clickable label that reveals or hides the associated content.

## When to Use

- FAQ sections with questions and answers
- Long content that benefits from progressive disclosure
- Help documentation with expandable topics
- Any content where users may only need to see specific sections

## Authoring

### Basic Structure

| accordion |  |
|-----------|--|
| Label 1   | Content for item 1 |
| Label 2   | Content for item 2 |
| Label 3   | Content for item 3 |

### Content Structure

| Column | Purpose |
|--------|---------|
| First column | The clickable label/question (always visible) |
| Second column | The expandable content/answer (hidden until clicked) |

Each row becomes one accordion item. Add as many rows as needed.

### What You Can Include

**In the label (first column):**
- Plain text (recommended)
- Short phrases or questions

**In the body (second column):**
- Paragraphs of text
- Links
- Lists
- Images
- Multiple elements combined

## Examples

### FAQ Example

| accordion |  |
|-----------|--|
| What is Spark? | Spark is the digital asset management platform (the Assets Hub Spark demo), providing access to brand-approved marketing materials. |
| How do I download assets? | Use the search to find assets, add them to your cart, then proceed to download. You may need to specify intended use for certain assets. |
| Who do I contact for help? | Email assetmanagers@example.com or submit a Support Portal ticket. |

### Help Section Example

| accordion |  |
|-----------|--|
| Getting Started | Welcome to Spark! Start by using the search bar to find the content you need. Use filters to narrow down results by brand, campaign, or asset type. |
| Account Settings | Access your account settings by clicking on "My Account" in the header. Here you can update your preferences and view your download history. |
| Troubleshooting | If you're having issues, try clearing your browser cache and logging in again. For persistent problems, contact support. |

## Behavior

- **Collapsed by default** - All items start closed
- **Click to expand** - Click any label to reveal its content
- **Click to collapse** - Click an open label to hide its content
- **Multiple open** - Multiple items can be open simultaneously
- **Visual indicator** - Arrow icon shows expand/collapse state

## Live Examples

- Welcome page accordion: [da.live/edit#/.../public/welcome](https://da.live/edit#/aem-showcase/assethub-spark/public/welcome)
- FAQ page: [da.live/edit#/.../help/faq](https://da.live/edit#/aem-showcase/assethub-spark/help/faq)

## Tips

- Keep labels concise and scannable
- Front-load important words in labels (users scan the left side)
- Write labels as questions for FAQ-style content
- Don't nest accordions inside other accordions
- Consider using the [FAQ block](faq.md) if you need tabs with accordions

## Related

- [FAQ](faq.md) - Combines tabs with accordions for categorized FAQs
- [Tabs](tabs.md) - Alternative for content that users need to compare
