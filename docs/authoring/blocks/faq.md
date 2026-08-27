# FAQ

Creates a tabbed interface with accordion items inside each tab. Designed specifically for organizing Frequently Asked Questions into categories.

## When to Use

- FAQ pages with multiple categories
- Help documentation organized by topic
- Any Q&A content that needs both categorization (tabs) and expandable items (accordion)

## Authoring

### Basic Structure

| faq |  |
|-----|--|
| Tab 1 Title |  |
| Question 1 | Answer 1 |
| Question 2 | Answer 2 |
| Tab 2 Title |  |
| Question 3 | Answer 3 |
| Question 4 | Answer 4 |

### Content Structure

| Row Type | First Column | Second Column |
|----------|--------------|---------------|
| Tab header | Tab title | Empty (or leave blank) |
| FAQ item | Question | Answer |

**Key rule:** Rows with only one cell (or empty second cell) become tab headers. Rows with two cells become accordion items under the current tab.

## Examples

### Complete FAQ Example

| faq |  |
|-----|--|
| Search |  |
| Q1: I was expecting to see more assets than I am. Is it possible to see all assets? | A: Not all assets are visible to all Spark users due to legal, brand, or trademark restrictions. Your user profile may only grant access to assets you are permitted to view. |
| Q2: What do I do if the asset I want to download or order is not on the site? | A: Please contact assetmanagers@example.com and we'll help you locate the asset. |
| Q3: Where can I find older or historical assets? | A: Historical assets may be archived. Contact support for assistance locating older content. |
| Download |  |
| Q1: How do I download multiple assets at once? | A: Add assets to your cart, then proceed to download. You can select multiple renditions and formats. |
| Q2: Why do some assets require approval? | A: Certain assets have usage restrictions. The approval process ensures proper rights management. |

## Live Examples

- FAQ page: [da.live/edit#/.../help/faq](https://da.live/edit#/aem-showcase/assethub-spark/en/help/faq)

## Related

- [Accordion](accordion.md) - Simple expandable sections without tabs
- [Tabs](tabs.md) - Tabbed content without built-in accordion
