# Tests

## Test Suites

### Integration Tests (`integration/`)

Smoke tests that hit real Spark endpoints (API + page loads) with a session cookie. Tests are defined declaratively in `test-config.js` — covers user, search, reporting, collections, rights requests, saved searches, notifications, content stores, and auto-generated Japanese localization variants.

```bash
# Production (default, opens HTML report)
TEST_SESSION_COOKIE="..." npm run test:integration

# Other environments
TEST_SESSION_COOKIE="..." npm run test:integration:local
TEST_SESSION_COOKIE="..." npm run test:integration:preview
BRANCH=feat TEST_SESSION_COOKIE="..." npm run test:integration:branch

# Terminal only, no browser
TEST_SESSION_COOKIE="..." npm run test:integration:no-report
```

See [`integration/README.md`](integration/README.md) for full details on adding tests and assertion options.

### AuthZ Tests (`authz/`)

Authorization rule verification using 13 test user personas. Tests that different user profiles see the correct search results based on the permission sheets (`/config/access/companies`, `/config/access/users`, `/config/access/restricted-brands`).

These tests use the worker's SUDO cookie mechanism to impersonate different user types (employee, partner, agency, customer, admin, no-roles) and validate the 5 authorization rules in `searchContentAIAuthorization`:

1. **No roles** — unknown domain users and employeeType mismatches get zero results
2. **Admin bypass** — admins see everything; comparative test proves admin sees more than a partner
3. **Restricted brands** — per-brand keyword search across 13 brands; admin vs employee comparison
4. **Partner country filtering** — partners see only their country's assets; employees/agencies skip the filter
5. **Customer content** — customer-specific assets visible only to associated users

The suite has two phases:

- **Attribute check** (`attribute-check.test.js`) — impersonate each user, verify `/api/user` returns expected roles, countries, customers, and brands with exact counts
- **Search permissions** (`search-permission.test.js`) — run searches as each user and validate results match the 5 authZ rules, plus data integrity checks

```bash
TEST_SESSION_COOKIE="..." npx vitest run --project authz-tests
```

See [`authz/README.md`](authz/README.md) for user editing, warnings, and [`authz/COVERAGE.md`](authz/COVERAGE.md) for detailed coverage analysis.

## Environment Variables

| Variable | Required by | Description |
|---|---|---|
| `TEST_SESSION_COOKIE` | All tests | Session cookie from an authenticated user. AuthZ tests require a user with `sudo` permission. |
| `TEST_ENV` | All tests | Target environment: `production` (default), `preview`, `local`, `branch:<name>`. |

## Running All Tests

```bash
npx vitest run
```

This runs all projects (unit, dom, integration, authz). To run a specific project:

```bash
npx vitest run --project integration-tests
npx vitest run --project authz-tests
npx vitest run --project unit-tests
npx vitest run --project dom-tests
```
