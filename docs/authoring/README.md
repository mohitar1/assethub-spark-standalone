# Spark Content Authoring Guide

This guide helps content authors create and manage informational pages on the Spark portal.

## About This Guide

Spark is built on Adobe Experience Manager Edge Delivery Services (EDS) using **Document Authoring**. This guide focuses on Spark-specific patterns and blocks. For general Document Authoring concepts, refer to the [Document Authoring documentation](https://docs.da.live/).

## Prerequisites

Before you begin, ensure you have:

- Access to the Spark content repository in Document Authoring
- The AEM Sidekick browser extension installed
- Appropriate permissions to create and publish content

## Guide Contents

### Getting Started

- [Getting Started](getting-started.md) - Document Authoring basics and your first page

### Page Structure

- [Page Structure](page-structure.md) - Sections, metadata, and page organization

### Blocks Reference

Blocks are reusable content components. Each block has specific authoring syntax and options.

| Block | Description |
|-------|-------------|
| [Cards](blocks/cards.md) | Content cards with images and links |
| [Carousel](blocks/carousel.md) | Rotating image/content slider |
| [Accordion](blocks/accordion.md) | Expandable/collapsible content sections |
| [Tabs](blocks/tabs.md) | Tabbed content panels |
| [FAQ](blocks/faq.md) | Tabbed accordion for FAQ pages |
| [Note](blocks/note.md) | Callout boxes for important information |
| [Fragment](blocks/fragment.md) | Include reusable content from other pages |
| [Team Cards](blocks/team-cards.md) | Team member display grid |
| [Buttons](blocks/buttons.md) | Call-to-action link styling |

See the [Blocks Overview](blocks/README.md) for general information on how blocks work.

### Additional Topics

- [Images and Media](images-and-media.md) - Working with images, optimization, and alt text
- [Localization](localization.md) - Creating content for multiple locales
- [Best Practices](best-practices.md) - Tips for effective content authoring

## Quick Reference

### Creating a Section Break

Insert a horizontal line or type `---` on its own line to create a new section.

### Creating a Block

1. Insert a table
2. Merge the first row and type the block name (e.g., `Cards`)
3. Add content in the rows below

### Preview and Publish

Use the AEM Sidekick extension to:
- **Preview** - See your changes before publishing
- **Publish** - Make content live on the site

## Need Help?

- [Document Authoring Docs](https://docs.da.live/) - General authoring reference
- [AEM Edge Delivery Services](https://www.aem.live/docs/) - Platform documentation
