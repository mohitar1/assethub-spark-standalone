# AuthZ Test Coverage Analysis

Assessment of what the authz tests prove, where the gaps are, and what to watch for.

Last updated: 2025-02-17

## Summary

The AuthZ test suite validates the 5 authorization rules that control ContentAI search visibility, plus attribute resolution from the permission sheets. It uses **13 test user personas** impersonated via SUDO cookies, covering every major code path in `searchContentAIAuthorization` (dm.js) and `getUserAttributes` (user.js).

### What it catches

- **Sheet misconfiguration**: attribute tests verify each user resolves to the expected roles, countries, customers, and brands. Exact role counts prevent accidental role over-grants.
- **Filter removal or bypass**: search tests confirm zero results for unauthorized users and filtered results for restricted users.
- **EmployeeType gating**: a dedicated negative test proves that a known domain (example.com) with the wrong employeeType gets zero roles and zero search results.
- **Comparative privilege escalation**: admin vs partner and admin vs employee comparisons prove the admin actually sees MORE, not just something.
- **Data integrity**: all search results are verified to have `custom:assetStatus: approved`.

### What it does NOT catch

- **Collection search authorization** — the `collectionsSearchContentAIAuthorization` function (ACL-based owner/editor/viewer model) is a separate codepath not covered here.
- **Customer domain resolution** — all test customer associations come from the users sheet, not the companies.customer sheet. The `companies.customer[domain]` path (user.js line 45-47) is untested at the integration level (covered by unit tests in dm.test.js).
- **Download authorization** — not in scope.
- **Real-world concurrent roles** — no test user holds multiple roles simultaneously (e.g. partner + customer domain).

## Per-Rule Coverage

### Rule 1: No roles — STRONG

**Users tested**: `not@onboarded.com` (unknown domain), `test@example.com` with employeeType `99` (known domain, wrong type)

**What it proves**: Two distinct paths both result in zero roles and zero search results. The first tests an unknown domain; the second tests the employeeType gating logic where the domain IS recognized but the type doesn't match.

**Code paths validated**: `user.roles.length === 0` → impossible filter injection (dm.js line 906-916); employeeType !== companies sheet value → role denied (user.js line 59-62).

### Rule 2: Admin bypass — STRONG

**Users tested**: `admin@example.com` (resolves to roles `['employee', 'admin']` — gets employee from domain + admin from users sheet)

**What it proves**:
1. Admin gets results (non-zero).
2. Admin sees assets from multiple countries (no country filter active).
3. **Comparative**: Admin sees more country diversity than a partner. This is a hard assertion that admin privilege is strictly greater, not just non-empty.
4. Attribute test verifies exact role count (`['employee', 'admin']`), catching any changes to role resolution.

**Code paths validated**: `user.roles.includes('admin')` → early return with no filters (dm.js line 918-922).

### Rule 3: Restricted brands — STRONG

**Users tested**: `admin@example.com` vs `test@example.com` (employee, no brand access) vs `burn@example.com` (employee, has burn access)

**What it proves (3 layers)**:

1. **Broad scan**: admin vs employee across top 50 results. Asserts employee sees zero restricted brand assets. Reports which brands admin sees that employee doesn't.
2. **Per-brand keyword search** (13 brands): For each restricted brand, searches as employee and hard-asserts no `custom:brand/{name}` assets appear. Separately checks admin to confirm tagged content exists. This catches brands that are rare in broad results.
3. **Attribute verification**: Confirms brand access is correctly resolved — `burn@example.com` has `brands: ['burn']`, `test@example.com` has `brands: []`.

**Code paths validated**: `deniedBrands` NOT filter construction (dm.js line 926-941); restricted-brands sheet resolution (user.js line 93-99).

### Rule 4: Partner country filtering — STRONG

**Users tested**: France partner (static), Generic US partner (dynamic), APAC multi-country partner (dynamic), Employee (skip), Contingent Worker (skip), Agency (skip)

**What it proves**:
1. **Static check** (France): Every result inspected — at least one of the asset's `custom:country` values must match `['fr', 'all-countries']` (OR match, since ContentAI term filters use OR semantics for multi-valued fields). Also verifies `all-countries` tagged assets appear, validating dm.js line 949 (`countries.push('all-countries')`).
2. **Dynamic check** (Generic, APAC): Resolves the user's actual countries from `/api/user`, then validates every search result — at least one country in the asset must match the resolved country list + `all-countries`. This catches partners whose sheet countries we don't hardcode.
3. **Skip proof**: Employee, CW, and Agency all see multiple countries, proving the exemption at dm.js line 944 works correctly.

**Code paths validated**: Partner country filter injection (dm.js line 943-966); `all-countries` addition (dm.js line 949); role-based skip (dm.js line 944); IDP country fallback (user.js line 86-88).

### Rule 5: Customer content — MODERATE

**Users tested**: `customer-a@example.com` (has customer `customer-a`) vs `test@example.com` (no customer association)

**What it proves**:
- **Hard assertion (negative)**: `test@example.com` does NOT see `custom:contentType=customers` assets when searching for customer-specific content.
- **Soft assertion (positive)**: `customer-a@example.com` gets results for their customer-specific content, but customer-typed content presence is a warning, not a hard failure.

**Code paths validated**: Customer NOT filter (dm.js line 972-982); customer OR clause (dm.js line 984-998).

### Data integrity — NEW

**What it proves**:
1. All search results from admin have `custom:assetStatus: approved`. Validates the forced filter at dm.js line 1151.
2. EmployeeType mismatch (example.com domain + type `99`) produces zero search results, confirming the gating works end-to-end through both attribute resolution and search.

### Attribute checks — STRONG

**What it proves**: For all 13 users, `/api/user` returns the expected email, roles, countries, customers, and brands. Role counts are exact (no extra roles allowed). This catches:
- Sheet changes that break resolution
- Domain matching regressions
- EmployeeType gating regressions
- Users sheet override issues

## Warnings

| Warning | Severity | Notes |
|---------|----------|-------|
| Session tokens expire | **HIGH** | Tests require a fresh `TEST_SESSION_COOKIE` with `sudo` permission. Expired tokens cause all tests to fail with unhelpful errors. The `beforeAll` check catches this early. |
| Restricted brand content may be sparse | MEDIUM | If no restricted brand assets exist in ContentAI, the per-brand keyword tests pass vacuously (employee can't see what doesn't exist). The admin check reports which brands have content. |
| Customer content positive test is soft | MEDIUM | If customer-typed content doesn't exist for the search term, the positive test only warns. The negative test is always hard. |
| Search limit capped at 50 | LOW | ContentAI rejects `limit > 50`. Broad scans cover only the top 50 results. Per-brand keyword searches compensate. |
| `none` country handling is assumed | LOW | Assets with `custom:country: 'none'` are skipped during country validation. If the upstream behavior changes, these could silently pass. |

## Remaining Gaps

| Gap | Impact | Effort to fix |
|-----|--------|---------------|
| Collection search auth (`collectionsSearchContentAIAuthorization`) not tested | Collection ACL could break without detection | High — requires collection setup, different test approach (ACL not role-based) |
| No test for `companies.customer[domain]` path | Customer domain lookup from companies sheet untested at integration level | Medium — need a real customer domain in the test sheet |
| No multi-role user (e.g. partner + customer) | Interaction between role filters untested | Medium — need a test user with both roles configured |
| Customer content positive assertion is soft | If customer content exists but filter breaks, we'd miss it | Low — make hard assertion once known customer assets are identified |
| Partner zero-countries safety net (dm.js line 958-964) | `___does_not_exist___` filter untested | Low — would need a partner domain with no countries AND no IDP fallback |

## What Changed (this update)

1. **Added "Wrong EmployeeType" user** — tests the negative path of employeeType matching. `test@example.com` with type `99` gets no roles, no results.
2. **Added exact role count assertions** — attribute tests now verify users have exactly the expected roles, catching accidental over-grants.
3. **Added admin vs partner comparative** — proves admin sees more country diversity than a partner (not just "something").
4. **Added `all-countries` verification** — France partner test checks for `all-countries` tagged assets, validating dm.js line 949.
5. **Added dynamic country validation** — Generic and APAC partners now resolve their actual countries from `/api/user` and validate search results against them.
6. **Added data integrity tests** — verifies all results have `approved` status; verifies employeeType gating end-to-end.
7. **Fixed admin expected roles** — `admin@example.com` resolves to `['employee', 'admin']` (employee from domain + admin from users sheet).
8. **Fixed country filter OR semantics** — country validation now uses `some()` (any match) instead of `every()` (all match), matching ContentAI's actual OR-based term filter behavior.
9. **Moved shared env config** — `getBaseUrl`/`getCurrentEnv` moved from `integration/setup/env.js` to `shared/env.js` for cleaner reuse.
10. **Total test users**: 13 (was 12). **Total test scenarios**: ~70 (was ~56).
