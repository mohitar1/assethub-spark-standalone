# AuthZ Tests

Tests that validate the 5 authorization rules applied to search results by the Cloudflare worker. Each test impersonates a different user profile via SUDO cookies and verifies that search results match expected permissions. Currently uses **13 test user personas**.

## What is being tested

The worker applies authorization filters in `searchContentAIAuthorization` ([cloudflare/src/origin/dm.js](../../cloudflare/src/origin/dm.js)) based on user attributes resolved from permission sheets. These tests verify:

| Rule | Description | How tested |
|------|-------------|------------|
| 1. No roles | Unknown domain users get zero search results | `not@onboarded.com` returns 0 results; `test@example.com` with wrong employeeType also returns 0 |
| 2. Admin bypass | Admin users see everything, no filters | `admin@example.com` sees multiple countries; comparative test proves admin sees more than a partner |
| 3. Restricted brands | Users without brand access can't see those brand's assets | Per-brand keyword search across 13 brands as admin vs employee; `burn@example.com` (has Burn) vs `test@example.com` (doesn't) |
| 4. Partner country | Partners see only their country's assets; employees/agencies are not filtered | France partner: static check for `fr` + `all-countries`; Generic/APAC partners: dynamic check using resolved countries; Employee/CW/Agency: skip proof |
| 5. Customer content | `contentType=customers` assets visible only to customer-associated users | `customer-a@example.com` sees their customer-specific content; others don't |

Additionally, **data integrity** tests verify all search results have `custom:assetStatus: approved` and that employeeType mismatches produce zero results end-to-end.

## How it works

1. Your session cookie is sent with `SUDO_*` cookies (`SUDO_EMAIL`, `SUDO_COUNTRY`, `SUDO_EMPLOYEE_TYPE`)
2. The worker's `handleSudo()` in [cloudflare/src/user.js](../../cloudflare/src/user.js) overrides the user identity
3. `getUserAttributes()` re-resolves roles, countries, customers, and brands from the permission sheets
4. `searchContentAIAuthorization()` applies filters based on those attributes
5. Tests assert the resolved attributes and search results match expectations

The session cookie must belong to a user with the `sudo` permission.

## Running

```bash
export TEST_SESSION_COOKIE="<cookie from a sudo-enabled user>"
npx vitest run --project authz-tests
```

To target a specific environment:

```bash
TEST_ENV=preview npx vitest run --project authz-tests
TEST_ENV=local npx vitest run --project authz-tests
```

The HTML report is written to `tests/authz/report/index.html` (gitignored).

## Test structure

| File | Purpose |
|------|---------|
| `test-users.js` | 13 test user personas — edit this to add/change users |
| `helpers.js` | `makeImpersonatedRequest()`, search helpers, metadata extractors |
| `attribute-check.test.js` | Phase A: verifies `/api/user` returns expected roles/countries/customers/brands with exact counts |
| `search-permission.test.js` | Phase B: runs searches and validates each authZ rule + data integrity |
| `COVERAGE.md` | Detailed coverage analysis — strengths, gaps, and warnings |

## Editing test users

All test users are defined in `test-users.js`. Each user has:

- **`email`** — must use a domain that exists in the companies sheet (`/config/access/companies`) for role resolution to work
- **`country`** — sets the `SUDO_COUNTRY` cookie; relevant for partner country filtering and IDP fallback
- **`employeeType`** — must match the companies sheet value exactly (`'10'` for employee, `'11'` for contingent worker, `'99'` for external)
- **`targetRules`** — which authZ rules this user tests (used by `getUsersByRule()` to group tests)
- **`expectedAttributes`** — what `/api/user` should return (roles, countries, customers, brands). Role counts are exact — any extra roles cause a failure.
- **`expectedSearch`** — what the search results should look like

To add a new test user, add an entry to the `testUsers` array. If it tests restricted brands or customer content comparatively, also add an entry to `restrictedBrandPairs` or `customerContentPairs`.

### Where the user data comes from

The test users map to entries configured in the permission simulator, documented in the [Spark Demo and Validation Script — Access Control](https://wiki.corp.adobe.com/display/WEM/Spark+-+Demo+and+Validation+Script#SparkDemoandValidationScript-AccessControl) wiki page.

The relevant permission sheets are:

- `/config/access/companies` — maps email domains to roles (employee, partner, agency, customer, contingent-worker)
- `/config/access/users` — per-email overrides for roles, countries, customers
- `/config/access/restricted-brands` — maps brands to specific users/domains who can see them

If a permission sheet changes (e.g. a new partner domain is added, or a restricted brand is renamed), the corresponding test user in `test-users.js` may need updating.

## Interpreting results

**Warnings you might see:**

- `⚠ No assets tagged custom:brand/X found in top 50 results` — The restricted brand filter is applied, but no assets with that brand tag exist in the result set. The filter is working; there's just no data to prove it visually. Not a failure.
- `⚠ search returned results but none had custom:contentType=customers` — The customer content filter is applied, but the search term didn't match any customer-typed assets. Not a failure.
- `⚠ zero results — no content for countries [X]?` — The partner country filter returned nothing. This could mean there's genuinely no content tagged for that country, or it could indicate a configuration issue.
- `⚠ no 'all-countries' assets in top 50 results` — The `all-countries` tag wasn't found in results. Usually fine if results are sparse.

**Common failures:**

- `Missing role "employee"` — The `employeeType` value in `test-users.js` doesn't match the companies sheet. Check that the value is the raw number (`'10'`, not `'Employee (10)'`).
- `unexpected extra roles` — The user resolved more roles than expected. Update `expectedAttributes.roles` in `test-users.js` or investigate if a sheet change granted unexpected access.
- `Session user lacks "sudo" permission` — Your session cookie is from a user without `sudo`. Get a cookie from a sudo-enabled account.
- `Session cookie appears expired` — The JWT has expired. Get a fresh cookie from the browser.
