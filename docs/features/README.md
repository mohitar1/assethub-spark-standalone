# Feature Documentation Guidelines

This directory contains comprehensive documentation for major features in the Spark application. Each feature is organized in its own folder with supporting assets.

**Quick Start:** New to documenting features? See [QUICK-START.md](./QUICK-START.md) or use the `/document-feature` command in Cursor.

## Directory Structure

Each feature should follow this structure:

```
docs/features/
├── {feature-name}/
│   ├── README.md               # Main feature documentation
│   ├── requirements.md         # (Optional) Business & functional requirements
│   ├── api.md                  # (If applicable) API endpoints, request/response formats
│   ├── demo-script.md          # (Optional) Demo walkthrough
│   ├── images/                 # Screenshots, diagrams, architecture, UI mockups
│   │   ├── workflow.png
│   │   ├── architecture-diagram.png
│   │   └── screenshot.png
│   └── examples/               # (Optional) Code examples, sample data
│       ├── sample-request.json
│       └── sample-response.json
```

## Naming Conventions

### Folder Names

- Use **kebab-case** for folder names: `rights-requests`, `saved-searches`, `analytics-reports`
- Keep names concise but descriptive
- Avoid abbreviations unless widely understood

### Main Documentation File

- Always name the main documentation file **`README.md`**
- This ensures GitHub/GitLab auto-renders it when browsing the folder
- It's a universal convention that developers expect

### Asset Files

- Use descriptive names for images: `request-modal.png`, `workflow-diagram.svg`
- Include dates for time-sensitive screenshots: `dashboard-2024-02.png`
- Use hyphens to separate words: `user-flow-diagram.png`
- For demos: `demo-script.md` (as sibling to README.md)

## File Formats

### Images

Store in `images/` folder:
- **Screenshots**: PNG or JPG
- **Diagrams**: SVG (preferred for scalability) or PNG
- **Architecture diagrams**: SVG or PNG, or link to Lucidchart/Miro/Figma
- **Icons**: SVG
- **Animated demos**: GIF (keep file size reasonable, < 5MB)
- **Video recordings**: NEVER commit - link to SharePoint/external hosting instead

### Videos and Recordings

- **Demo videos**: Host externally (SharePoint, Loom, YouTube unlisted), link from demo-script.md
- **Keep videos short**: 2-5 minutes ideal, max 10 minutes
- **NEVER commit video files**: Always link to SharePoint or external hosting
- **Provide context**: Add written description or transcript in demo-script.md

### Code Examples

- JSON for API requests/responses
- JavaScript/TypeScript for code samples
- YAML for configuration examples

### Demo Scripts

- Place `demo-script.md` as sibling to `README.md` in feature folder
- Step-by-step walkthrough for showcasing the feature
- Less rigorous than test scripts (happy path focused)
- Include setup steps, user actions, and expected outcomes
- Link to video recordings on SharePoint or external hosting if available

### Requirements Documents

- Markdown format (`requirements.md`)
- **Business Requirements**: Why are we building this? What problem does it solve?
- **Functional Requirements**: What should it do? User stories and acceptance criteria
- **Non-Functional Requirements**: Performance, security, scalability, accessibility
- **Out of Scope**: What this feature explicitly does NOT do
- **Keep updated**: Mark requirements as "Implemented", "In Progress", or "Future"

### API Documentation

- Create separate `api.md` file if feature has backend endpoints
- **All Endpoints**: Document every API endpoint with full details
- **Authentication**: Session requirements, permissions, authorization
- **Request/Response**: Complete request body and response format examples
- **Query Parameters**: All supported params, default values, validation
- **Error Responses**: HTTP status codes, error formats, common failures
- **Side Effects**: KV writes, emails sent, notifications triggered
- **Rate Limits**: If applicable
- **Code Examples**: curl, JavaScript, or language-specific examples

## What to Document

Each feature README should include:

### Always Required

1. **Overview** - High-level description and purpose
2. **User Roles & Permissions** - Who can access/use the feature (or "None" if no restrictions)
3. **Workflow** - Step-by-step user journey
4. **Key Implementation Details** - Important technical notes

### Required When Applicable

Include these sections **if they apply** to your feature:

- **APIs** - Required if feature has backend endpoints
  - Create separate `api.md` file for detailed API documentation
  - Include summary/link in README.md
- **Data Storage** - Required if feature stores data
  - KV stores, database tables, schemas, data retention
- **Pages/Components** - Required if feature has UI
  - EDS pages, blocks, client-side code
- **External Integrations** - Required if calling external services
  - Third-party APIs, webhooks, authentication
- **Notifications** - Required if feature sends notifications
  - Email templates, in-app notification messages (persistent), toast notifications (temporary), triggers
- **Security & Permissions** - Required if feature has authorization logic
  - Permission checks, data isolation, security considerations
- **Background Jobs** - Required if feature has scheduled tasks
  - Cron jobs, queue workers, scheduled functions

### Optional (But Recommended)

- **Requirements Document** - Business requirements, user stories, acceptance criteria
- **Architecture Diagrams** - Visual system overview (in `images/` or link to Lucidchart/Miro)
- **Testing Strategies** - How to test the feature (thorough test cases)
- **Demo Script** - Quick walkthrough for showcasing the feature (happy path)
- **Demo Recording** - Video demonstration of the feature (link to SharePoint)
- **Known Limitations** - Current constraints or edge cases
- **Future Enhancements** - Planned improvements
- **Troubleshooting** - Common issues and solutions
- **Performance Considerations** - Optimization notes, benchmarks

## Referencing Assets

Use **relative paths** to reference images and files within the same feature:

```markdown
![Request Modal](./images/request-modal.png)
![Architecture Diagram](./images/architecture-diagram.svg)
[Sample Request](./examples/sample-request.json)
[Demo Script](./demo-script.md)
```

Or link to external diagrams:

```markdown
[Architecture Diagram (Lucidchart)](https://lucid.app/documents/view/...)
[System Design (Miro)](https://miro.com/app/board/...)
```

## Cross-Feature References

When referencing other feature docs, use relative paths from `docs/features/`:

```markdown
See also: [Saved Searches](../saved-searches/README.md)
Related: [Notifications System](../notifications/README.md)
```

## Best Practices

### Documentation Quality

✅ **Do:**
- Write for your audience (developers, not just yourself)
- Include code examples with syntax highlighting
- Add screenshots for UI-heavy features
- Document the "why" not just the "what"
- Keep it updated when implementation changes
- Use tables for structured data (permissions, endpoints)
- Include all sections that apply to your feature (APIs, data storage, etc.)
- Be explicit about what's stored where (KV, database, cache)
- Document error handling and edge cases

❌ **Don't:**
- Include sensitive data (passwords, API keys, real user emails)
- Copy/paste large code blocks (link to source files instead)
- Use absolute URLs for internal resources
- Let documentation drift from implementation
- Over-document obvious things
- Skip sections just because they seem "optional" - if you store data, document it!

### Image Guidelines

✅ **Do:**
- Store all images (screenshots, diagrams, architecture) in `images/` folder
- For complex/living architecture diagrams, prefer linking to Lucidchart/Miro over static images
- Crop images to show relevant content only
- Annotate screenshots with arrows/labels when helpful
- Use consistent image sizes when possible
- Compress images before committing (use tools like ImageOptim)
- Include alt text for accessibility

❌ **Don't:**
- Create separate `architecture/` or `diagrams/` folders - use `images/` for all visuals
- Commit uncompressed, full-screen 4K screenshots
- Include personally identifiable information in screenshots
- Use images when text would be clearer
- Forget to update images when UI changes

### Demo Guidelines

✅ **Do:**
- Place `demo-script.md` as sibling to `README.md` (not in subfolder)
- Keep demo scripts focused on happy path (not comprehensive testing)
- Include setup/prerequisites at the beginning
- Show the most common/important user flows
- Host video recordings on SharePoint (or Loom, YouTube unlisted) and link from demo-script.md
- Provide written description or transcript of video demos
- Update demos when UI or workflow changes significantly

❌ **Don't:**
- Create a separate `demos/` folder - keep demo-script.md at root level
- NEVER commit video files to git - always host on SharePoint/externally and link
- Include test user credentials in demo scripts (use placeholders)
- Make demos overly long (keep under 5 minutes if possible)
- Use demo scripts as a replacement for proper testing documentation

### Requirements Guidelines

✅ **Do:**
- Write requirements early, before or during initial development
- Use clear, testable acceptance criteria
- Distinguish between "must have" and "nice to have"
- Link requirements to user stories or business goals
- Track implementation status (mark as implemented/pending)
- Update when scope changes or requirements evolve

❌ **Don't:**
- Write vague requirements like "should be fast" (be specific)
- Mix requirements with implementation details (keep them separate)
- Let requirements doc become stale after implementation
- Forget to document what's explicitly out of scope

### Version Control

- Commit images with meaningful messages: `docs: add rights request workflow diagram`
- Update documentation in the same PR as code changes when possible
- Use `.gitkeep` files to track empty folders (like `images/` before adding images)

## Maintenance

### Regular Reviews

- Review feature docs quarterly or when major changes occur
- Mark deprecated features clearly
- Archive obsolete documentation to `docs/archive/` rather than deleting

### Keeping Docs Current

When making code changes:
1. Check if feature documentation exists
2. Update docs in the same PR if implementation changes
3. Add new screenshots if UI changed
4. Update API examples if endpoints changed

## Creating a New Feature Doc

### Quick Start

1. **Create the folder structure:**
   ```bash
   mkdir -p docs/features/my-feature/images
   touch docs/features/my-feature/README.md
   touch docs/features/my-feature/requirements.md
   touch docs/features/my-feature/api.md           # If feature has APIs
   touch docs/features/my-feature/demo-script.md
   touch docs/features/my-feature/images/.gitkeep
   ```

2. **Capture requirements early:** Document business needs and user stories before building

3. **Start with a template:** Copy structure from an existing feature like `rights-requests/`

4. **Write incrementally:** Don't wait until feature is "done" - document as you build

5. **Add a demo if helpful:** Create a quick demo script for stakeholder presentations

6. **Get feedback:** Have another developer review for clarity

### Documentation Checklist

Before submitting your feature documentation, verify:

**Always Required:**
- [ ] Overview section explaining purpose
- [ ] User Roles & Permissions documented
- [ ] Workflow/user journey described
- [ ] Key implementation details included

**Check If Applicable:**
- [ ] APIs section (if backend endpoints exist)
- [ ] Data Storage section (if storing data anywhere)
- [ ] Pages/Components section (if feature has UI)
- [ ] External Integrations section (if calling external services)
- [ ] Notifications section (if sending emails, in-app messages, or toast notifications)
- [ ] Security & Permissions section (if authorization logic exists)
- [ ] Background Jobs section (if scheduled tasks exist)

**Recommended:**
- [ ] Requirements document (business need, user stories, acceptance criteria)
- [ ] Architecture diagrams for complex features (in images/ or link to Lucidchart/Miro)
- [ ] Testing strategies documented (thorough test cases)
- [ ] Demo script for showcasing feature (happy path walkthrough)
- [ ] Demo recording link (SharePoint)
- [ ] Troubleshooting section for common issues
- [ ] Screenshots for UI features
- [ ] Code examples with syntax highlighting

### Template Outline

```markdown
# Feature Name

## Overview
Brief description and purpose

## User Roles & Permissions
Who can use this feature (or "None - available to all users")

## Workflow
Step-by-step user journey

## APIs (if applicable)
Endpoints, request/response formats, authentication

## Data Storage (if applicable)
KV stores, database tables, schemas

## Pages/Components (if applicable)
EDS pages, blocks, client-side components

## External Integrations (if applicable)
Third-party services, APIs, webhooks

## Notifications (if applicable)
- Email notifications (templates, triggers)
- In-app notification messages (persistent, stored in notification center)
- Toast notifications (temporary UI popups)

## Security & Permissions (if applicable)
Authorization logic, data isolation

## Key Implementation Details
Important technical notes, code structure

## Testing (recommended)
How to test this feature (thorough test cases)

## Demo (optional)
Quick walkthrough for showcasing the feature
- See [demo-script.md](./demo-script.md)

## Known Limitations (if any)
Current constraints or edge cases

## Troubleshooting (if applicable)
Common issues and solutions

## Related Documentation
Links to related docs
```

## Examples

Current feature documentation:

- _(Add features as they are documented)_

## Questions?

If you're unsure about how to document a feature:
1. Look at existing feature docs for patterns
2. Ask the team in your PR
3. Start simple - you can always add more detail later

---

**Last Updated:** 2026-02-03  
**Maintained By:** Development Team
