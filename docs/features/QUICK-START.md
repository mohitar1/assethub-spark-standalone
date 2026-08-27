# Quick Start: Documenting a New Feature

Use this guide to quickly set up documentation for a new feature.

## TL;DR Command

In Cursor, use: `/document-feature`

This command will guide you through the entire documentation process.

---

## Manual Quick Start

### 1. Create the Structure

```bash
# Replace 'my-feature' with your feature name (kebab-case)
FEATURE_NAME="my-feature"

mkdir -p docs/features/$FEATURE_NAME/images
touch docs/features/$FEATURE_NAME/README.md
touch docs/features/$FEATURE_NAME/images/.gitkeep

# Add these if applicable:
touch docs/features/$FEATURE_NAME/requirements.md  # Business requirements
touch docs/features/$FEATURE_NAME/api.md           # If feature has APIs
touch docs/features/$FEATURE_NAME/demo-script.md   # Demo walkthrough
```

### 2. Copy Templates

**README.md** - Start with this template:

```markdown
# Feature Name

**Related Documentation:**
- [Requirements](./requirements.md) - (if applicable)
- [API Documentation](./api.md) - (if applicable)
- [Demo Script](./demo-script.md) - (if applicable)

## Overview
Brief description

## User Roles & Permissions
Who can use this

## User Experience
How users interact with it

## APIs (if applicable)
Brief summary, link to api.md

## Data Storage (if applicable)
KV stores, database tables

## Testing
How to test

## Troubleshooting
Common issues
```

### 3. Fill in Details

Use the comprehensive templates in [README.md](./README.md) for each file.

### 4. Checklist

Before submitting:

**Always Required:**
- [ ] Overview section
- [ ] User Roles & Permissions
- [ ] Workflow/user journey

**Required When Applicable:**
- [ ] api.md (if backend endpoints)
- [ ] Data Storage section (if storing data)
- [ ] Notifications section (if sending emails/in-app messages/toasts)

**Recommended:**
- [ ] requirements.md (business needs, user stories)
- [ ] demo-script.md (for showcasing)
- [ ] Screenshots in images/
- [ ] Architecture diagram (in images/ or link to Lucidchart)

---

## Examples

See complete example: `docs/features/rights-requests/`

## Full Guidelines

See [README.md](./README.md) for comprehensive documentation standards.

---

## AI Prompt (Copy/Paste)

If not using Cursor command, copy this prompt:

```
I need to document a new feature according to our project standards.

Feature name: [FEATURE_NAME]
Has APIs: [YES/NO]
Stores data: [YES/NO]
Has UI: [YES/NO]

Please:
1. Create the folder structure in docs/features/[feature-name]/
2. Create README.md using the template from docs/features/README.md
3. Create api.md if this feature has APIs
4. Create requirements.md with sections for business requirements, 
   functional requirements (with user stories), and non-functional requirements
5. Follow all guidelines in docs/features/README.md

Reference example: docs/features/rights-requests/
```

---

## Tips

- **Start with requirements.md** - Document the "why" before building
- **APIs get their own file** - Keep README focused on overview
- **Link to external tools** - Lucidchart for architecture, SharePoint for videos
- **Update as you build** - Don't wait until "done"
- **Get peer review** - Have another dev review for clarity
