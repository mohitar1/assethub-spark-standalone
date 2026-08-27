# Fragment

Includes content from another page as a reusable component. Fragments allow you to maintain content in one place and use it across multiple pages.

## When to Use

- Reusing the same content on multiple pages
- Maintaining consistent messaging across the site
- Creating modular content that can be updated centrally
- Building complex pages from smaller, manageable pieces

## Authoring

### Basic Structure

| fragment |
|----------|
| [Fragment Name](/path/to/fragment) |

The fragment block contains a single link to the fragment page.

## Examples

### Including a Disclaimer Fragment

| fragment |
|----------|
| [Legal Disclaimer](/fragments/legal-disclaimer) |

### Including Brand Guidelines

| fragment |
|----------|
| [Brand Guidelines](/fragments/brand-guidelines) |

### Including Contact Information

| fragment |
|----------|
| [Contact Support](/fragments/contact-support) |

## Creating Fragment Pages

Fragments are regular pages stored in a dedicated location (typically `/fragments/`). To create a fragment:

1. Create a new page in the `/fragments/` folder
2. Add the content you want to reuse
3. Preview and publish the fragment page
4. Reference it using the Fragment block on other pages

### Fragment Page Structure

Fragment pages are authored like any other page:

```
Your reusable content here.

This can include:
- Text and headings
- Images
- Other blocks (cards, accordions, etc.)
- Links

---

| Metadata |  |
|----------|--|
| robots   | noindex |
```

> **Tip:** Add `robots: noindex` to fragment metadata to prevent them from appearing in search results.

## Behavior

- Fragment content replaces the Fragment block when the page loads
- Section styling from the fragment is inherited by the containing section
- Fragments load asynchronously (the page may render before fragments appear)
- Fragments can contain any content, including other blocks

## Common Fragment Locations

| Location | Purpose |
|----------|---------|
| `/fragments/` | General reusable content |
| `/fragments/disclaimers/` | Legal and compliance text |
| `/fragments/brand/` | Brand-specific content |

## Tips

- Keep fragments focused on a single purpose
- Use descriptive names for fragment pages
- Store fragments in organized folders
- Remember to publish fragments after editing them
- Test fragments on multiple pages after updates
- Add `robots: noindex` metadata to prevent search indexing

## Fragment vs Copy-Paste

| Aspect | Fragment | Copy-Paste |
|--------|----------|------------|
| Updates | Change once, updates everywhere | Must update each page |
| Consistency | Guaranteed identical | May drift over time |
| Maintenance | Lower effort | Higher effort |
| Best for | Repeated content | One-time use |

## Using Fragments in Tabs

Fragments can be loaded inside tabs using special syntax. See [Tabs](tabs.md) for details:

```
((fragment)): [link text](/path/to/fragment)
```

## Related

- [Tabs](tabs.md) - Can load fragments in tab panels
- [Note](note.md) - For simple callout content (doesn't need a fragment)
