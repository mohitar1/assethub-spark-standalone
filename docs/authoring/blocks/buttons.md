# Buttons

Buttons are created using default content (not a block). A link placed on its own line automatically becomes a styled button.

## When to Use

- Call-to-action links (Sign In, Register, Submit)
- Navigation to important pages
- Download or action triggers
- Any link that needs visual prominence

## Authoring

Buttons are created by placing a link on its own line (in its own paragraph).

### Primary Button (Filled)

Place a bold link on its own line:

```
**[SIGN IN](https://example.com/signin)**
```

Result: Red filled button with white text

### Secondary Button (Outlined)

Place an italic link on its own line:

```
*[REGISTER](https://example.com/register)*
```

Result: White button with gray border

### Default Button

Place a plain link on its own line:

```
[Learn More](https://example.com/learn)
```

Result: Red filled button (same as primary)

## Examples

### Sign In and Register Buttons

```
**[SIGN IN](https://sso.example.com/login)**

*[REGISTER](https://example.com/register)*
```

### Call-to-Action Button

```
**[Content Store Request Form](https://example.com/request-form)**
```

### Multiple Buttons

Place each link on its own line:

```
**[Download Assets](/download)**

*[View Documentation](/docs)*

[Contact Support](/support)
```

## Button Styles

| Style | How to Create | Appearance |
|-------|---------------|------------|
| Primary | `**[Text](url)**` (bold) | Red filled, white text |
| Secondary | `*[Text](url)*` (italic) | White, gray border |
| Default | `[Text](url)` (plain) | Red filled, white text |


## Live Examples

- Welcome page buttons: [da.live/edit#/.../public/welcome](https://da.live/edit#/aem-showcase/assethub-spark/public/welcome)
- Content Stores page: [da.live/edit#/.../all-content-stores](https://da.live/edit#/aem-showcase/assethub-spark/all-content-stores)


## Related

- [Cards](cards.md) - For navigation with images
