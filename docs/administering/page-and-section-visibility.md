# Page and Section Visibility

Authors can control who sees specific pages and sections based on user roles. This works alongside the existing [permission configuration](./permission-configuration.md) that controls asset access.

## Overview

There are two levels of visibility control:

| Level | Model | Default | Configured via |
|-------|-------|---------|----------------|
| **Page** | Exclusion | Visible to everyone | `exclude-roles` page metadata |
| **Section** | Inclusion | Visible to everyone | `roles` section metadata |

Users with the `admin` role always see all pages and sections, regardless of visibility settings.


## Page-Level Visibility

Pages are **visible to all authenticated users by default**. Authors can exclude specific roles by adding `exclude-roles` to the page metadata. Excluded users are redirected to the 404 page — they never see the page content.

### How to configure

In the page's metadata table (at the bottom of the document), add a row:

| Key | Value |
|-----|-------|
| `exclude-roles` | `agency, partner:us, partner:ca` |

### How it works

Enforcement happens at two layers:

1. **Server-side (Cloudflare worker):** Before the page HTML is returned to the browser, the worker reads the `exclude-roles` metadata. If the user matches an excluded role, they receive a redirect to `/404.html` — the page content is never served.

2. **Client-side (defense-in-depth):** After the user session loads, the page metadata is checked again. If the user is excluded, they are redirected to `/404.html`.

### Examples

| `exclude-roles` value | Effect |
|----------------------|--------|
| `agency` | Hides the page from all agency users. |
| `partner` | Hides the page from all partners, regardless of country. |
| `partner:us` | Hides the page from US partners only. Partners from other countries can still see it. |
| `partner:us, partner:ca` | Hides the page from US and CA partners. |
| `agency, partner:us` | Hides the page from all agency users and US partners. |
| `contingent-worker, agency` | Hides the page from contingent workers and agency users. |


## Section-Level Visibility

Sections are **visible to all authenticated users by default**. If a section has a `roles` metadata property, it is **only visible to the listed roles** — all other users will not see that section. The rest of the page remains visible.

### How to configure

In the section metadata block, add a row:

| Key | Value |
|-----|-------|
| `roles` | `employee, partner:us` |

### How it works

During page load, before sections become visible, the system checks each section for a `roles` metadata property. Sections where the user does not match any of the listed roles are removed from the page. This happens before the content is displayed, so excluded users never see a flash of restricted content.

> **Note:** Section-level visibility is enforced client-side only. The page HTML (including all sections) is served to the browser. If the content is highly sensitive, use page-level visibility instead, which prevents the HTML from being served at all.

### Examples

| `roles` value | Effect |
|---------------|--------|
| `employee` | Only employees can see this section. |
| `partner` | Only partners (any country) can see this section. |
| `partner:us, partner:ca` | Only US and CA partners can see this section. |
| `employee, agency` | Employees and agency users can see this section. |
| `employee, partner:mx` | Employees and Mexican partners can see this section. |


## Role Syntax

Both page-level and section-level visibility use the same role syntax.

| Syntax | Meaning |
|--------|---------|
| `agency` | All agency users |
| `employee` | All employees |
| `contingent-worker` | All contingent workers |
| `partner` | All partners, any country |
| `partner:us` | Partners from US only |
| `partner:us, partner:ca` | Partners from US or CA |

Multiple entries can be combined with commas. For page-level (`exclude-roles`), matching **any** entry means the user is excluded. For section-level (`roles`), matching **any** entry means the user can see the section.

> **Note:** The available roles are the same as those used for content permissions. See [Permission Configuration — Available roles](./permission-configuration.md#available-roles) for details.


## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User has the `admin` role | Always sees all pages and sections, regardless of visibility settings. |
| User has multiple roles (e.g. `employee` and `partner`) | For page exclusion: excluded if **any** role matches. For section inclusion: visible if **any** role matches. |
| Partner has multiple countries (e.g. `us, mx`) | Matches if **any** of their countries appears in the configuration. |
| Sudo / impersonation active | Visibility is evaluated against the simulated user's roles and countries, not the original user's. |
| No metadata set | Page and section are visible to all authenticated users. |
| Empty metadata value | Treated the same as no metadata — visible to everyone. |


## Common Tasks


### Hide a page from external partners

Add to page metadata:

| Key | Value |
|-----|-------|
| `exclude-roles` | `agency, partner` |

This keeps the page visible to employees and contingent workers only.

### Show a section only to partners from specific countries

Add to section metadata:

| Key | Value |
|-----|-------|
| `roles` | `partner:us, partner:ca, partner:mx` |

Only partners from US, CA, and MX will see this section. Employees, agencies, and partners from other countries will not.

### Show a section only to internal users

Add to section metadata:

| Key | Value |
|-----|-------|
| `roles` | `employee, contingent-worker` |

### Combine page and section restrictions

You can use both on the same page. For example, exclude agencies from the entire page, then further restrict one section to US partners only:

**Page metadata:**

| Key | Value |
|-----|-------|
| `exclude-roles` | `agency` |

**Section metadata (on the restricted section):**

| Key | Value |
|-----|-------|
| `roles` | `partner:us` |

The result: agencies cannot see the page at all. Employees, contingent workers, and non-US partners see the page but not the restricted section. US partners see everything.
