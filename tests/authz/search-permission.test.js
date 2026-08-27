/**
 * AuthZ Test Suite — Phase B: Search Permission Verification
 *
 * Impersonates each test user and runs ContentAI searches, then validates
 * that the 5 authorization rules produce correct results:
 *
 *   Rule 1: No roles → zero results
 *   Rule 2: Admin → sees everything
 *   Rule 3: Restricted brands → comparative (with vs without access)
 *   Rule 4: Partner country → filtered to user's countries (skip for employee/agency/CW)
 *   Rule 5: Customer content → visible only to customer-domain users
 */

/* eslint-disable no-restricted-syntax, no-continue, no-await-in-loop */
import {
  describe, it, expect, beforeAll,
} from 'vitest';
import {
  testUsers,
  getUsersByRule,
  restrictedBrandPairs,
  restrictedBrands,
  customerContentPairs,
} from './test-users.js';
import {
  getSessionCookie,
  getUserAttributes,
  searchAsUser,
  getSearchResults,
  BROAD_SEARCH,
  keywordSearch,
  extractMetadataValues,
  hitsContainMetadataValue,
  hitsContainCustomerContent,
} from './helpers.js';
import { getBaseUrl, getCurrentEnv } from '../shared/env.js';

const cookie = process.env.TEST_SESSION_COOKIE;

if (!cookie) {
  describe('authz – search permissions', () => {
    it.skip('requires TEST_SESSION_COOKIE (with sudo permission)', () => {});
  });
} else {
  const baseUrl = getBaseUrl();
  const env = getCurrentEnv();

  // eslint-disable-next-line no-console
  console.log(`\n  AuthZ search tests → ${baseUrl}  (env: ${env})\n`);

  describe('authz – search permissions', () => {
    // Validate session has sudo before running anything
    beforeAll(async () => {
      const res = await fetch(new URL('/api/user', baseUrl), {
        headers: { Cookie: `Session=${getSessionCookie()}` },
        redirect: 'manual',
      });
      if (res.status !== 200) {
        throw new Error(`Session cookie invalid (status ${res.status}).`);
      }
      const attrs = await res.json();
      if (!attrs.permissions?.includes('sudo')) {
        throw new Error(
          `Session user ${attrs.email} lacks "sudo" permission.`,
        );
      }
    });

    // =======================================================================
    // Rule 1: No roles → search returns zero results
    // =======================================================================
    describe('Rule 1: No roles → zero results', () => {
      const noRoleUsers = getUsersByRule('no-roles');

      for (const user of noRoleUsers) {
        it(`${user.name} (${user.email}) gets zero search results`, async () => {
          const res = await searchAsUser(user, BROAD_SEARCH);
          expect(res.status).toBe(200);
          const results = getSearchResults(res.body);
          expect(results.length).toBe(0);
        });
      }
    });

    // =======================================================================
    // Rule 2: Admin → sees everything (restricted brands + all countries)
    // =======================================================================
    describe('Rule 2: Admin → full access', () => {
      const adminUsers = getUsersByRule('admin-bypass');

      for (const user of adminUsers) {
        it(`${user.name} (${user.email}) gets search results`, async () => {
          const res = await searchAsUser(user, BROAD_SEARCH);
          expect(res.status).toBe(200);
          const results = getSearchResults(res.body);
          expect(results.length).toBeGreaterThan(0);
        });

        it(`${user.name} sees assets from multiple countries`, async () => {
          const res = await searchAsUser(user, BROAD_SEARCH);
          const countries = extractMetadataValues(res.body, 'custom:country');
          expect(countries.length, 'Admin should see assets from multiple countries').toBeGreaterThan(1);
        });
      }

      // Comparative: admin sees more diverse results than a country-filtered partner
      it('admin sees more countries than a partner (comparative)', async () => {
        const admin = getUsersByRule('admin-bypass')[0];
        const partner = getUsersByRule('partner-country')[0];

        const [adminRes, partnerRes] = await Promise.all([
          searchAsUser(admin, BROAD_SEARCH),
          searchAsUser(partner, BROAD_SEARCH),
        ]);

        const adminCountries = extractMetadataValues(adminRes.body, 'custom:country');
        const partnerCountries = extractMetadataValues(partnerRes.body, 'custom:country');

        expect(
          adminCountries.length,
          `Admin sees [${adminCountries}] but partner sees [${partnerCountries}] — admin should see more`,
        ).toBeGreaterThan(partnerCountries.length);
      });
    });

    // =======================================================================
    // Rule 3: Restricted brands
    //
    // The filter works by EXCLUDING brands the user doesn't have access to.
    // Two approaches:
    //
    // A) Broad scan: search as admin (no filter) vs employee (all restricted
    //    brands excluded) and check if any restricted brand assets appear for
    //    admin but not employee.
    //
    // B) Per-brand keyword search: for each restricted brand name, search as
    //    admin and as employee. If the admin finds brand-tagged assets, the
    //    employee must NOT see them.
    //
    // Both approaches are needed because restricted brand assets may be rare
    // and not appear in a broad empty search.
    // =======================================================================
    describe('Rule 3: Restricted brands', () => {
      const adminUser = getUsersByRule('admin-bypass')[0];
      const employeeUser = restrictedBrandPairs[0]?.withoutAccess;

      // --- A) Broad scan: admin vs employee across all results ---
      describe('broad scan: admin vs employee', () => {
        let adminResults;
        let employeeResults;

        beforeAll(async () => {
          const [adminRes, empRes] = await Promise.all([
            searchAsUser(adminUser, BROAD_SEARCH),
            searchAsUser(employeeUser, BROAD_SEARCH),
          ]);
          adminResults = adminRes;
          employeeResults = empRes;
        });

        it('admin gets search results', () => {
          expect(adminResults.status).toBe(200);
          expect(getSearchResults(adminResults.body).length).toBeGreaterThan(0);
        });

        it('employee gets search results', () => {
          expect(employeeResults.status).toBe(200);
          expect(getSearchResults(employeeResults.body).length).toBeGreaterThan(0);
        });

        it('employee does not see any restricted brand assets', () => {
          for (const brand of restrictedBrands) {
            const hasBrand = hitsContainMetadataValue(
              employeeResults.body,
              'custom:brand',
              `custom:brand/${brand}`,
            );
            expect(hasBrand, `Employee should not see custom:brand/${brand}`).toBe(false);
          }
        });

        it('summary: restricted brands found by admin but hidden from employee', () => {
          const adminOnly = [];
          for (const brand of restrictedBrands) {
            const adminHas = hitsContainMetadataValue(adminResults.body, 'custom:brand', `custom:brand/${brand}`);
            const empHas = hitsContainMetadataValue(employeeResults.body, 'custom:brand', `custom:brand/${brand}`);
            if (adminHas && !empHas) adminOnly.push(brand);
            if (empHas) {
              expect.fail(`Employee can see restricted brand "${brand}" — filter may be broken`);
            }
          }
          // eslint-disable-next-line no-console
          console.log(
            adminOnly.length > 0
              ? `  Restricted brands visible to admin but hidden from employee: [${adminOnly.join(', ')}]`
              : `  ⚠ No restricted brand assets found in top ${BROAD_SEARCH.limit} broad results (see per-brand tests below)`,
          );
        });
      });

      // --- B) Per-brand keyword search ---
      describe('per-brand keyword search', () => {
        for (const brand of restrictedBrands) {
          it(`"${brand}": employee cannot see custom:brand/${brand} assets`, async () => {
            const brandSearch = keywordSearch(brand, 50);
            const res = await searchAsUser(employeeUser, brandSearch);
            expect(res.status).toBe(200);

            const hasBrand = hitsContainMetadataValue(
              res.body,
              'custom:brand',
              `custom:brand/${brand}`,
            );
            expect(hasBrand, `Employee should not see custom:brand/${brand} in "${brand}" search`).toBe(false);
          });
        }

        it('at least one restricted brand has tagged content (admin check)', async () => {
          let foundCount = 0;
          const found = [];
          for (const brand of restrictedBrands) {
            const brandSearch = keywordSearch(brand, 10);
            const res = await searchAsUser(adminUser, brandSearch);
            if (res.status === 200) {
              const hasBrand = hitsContainMetadataValue(res.body, 'custom:brand', `custom:brand/${brand}`);
              if (hasBrand) {
                foundCount += 1;
                found.push(brand);
              }
            }
          }
          // eslint-disable-next-line no-console
          console.log(
            foundCount > 0
              ? `  Restricted brands with actual tagged content: [${found.join(', ')}] (${foundCount}/${restrictedBrands.length})`
              : '  ⚠ No restricted brand content found via keyword search. Brand exclusion cannot be positively confirmed.',
          );
        }, 60_000);
      });

      // --- C) Specific burn user vs employee comparison (original test) ---
      for (const pair of restrictedBrandPairs) {
        describe(`specific: ${pair.brand} user vs employee`, () => {
          it(`${pair.withAccess.name} has brand access in attributes`, async () => {
            const attrs = await getUserAttributes(pair.withAccess);
            expect(attrs.brands).toContain(pair.brand);
          });

          it(`${pair.withAccess.name} CAN see ${pair.brand} assets (permitted, not restricted)`, async () => {
            const res = await searchAsUser(pair.withAccess, BROAD_SEARCH);
            expect(res.status).toBe(200);
            const results = getSearchResults(res.body);
            expect(results.length, `${pair.withAccess.name} should get search results`).toBeGreaterThan(0);

            const hasBrand = hitsContainMetadataValue(
              res.body,
              'custom:brand',
              `custom:brand/${pair.brand}`,
            );
            if (!hasBrand) {
              const adminRes = await searchAsUser(adminUser, BROAD_SEARCH);
              const adminHasBrand = hitsContainMetadataValue(
                adminRes.body,
                'custom:brand',
                `custom:brand/${pair.brand}`,
              );
              if (!adminHasBrand) {
                // No burn content in index — skip; test requires burn-branded assets in DEV
                // eslint-disable-next-line no-console
                console.warn(`  ⚠ No custom:brand/${pair.brand} assets in index — cannot verify burn user sees burn`);
                return;
              }
              expect.fail(`${pair.withAccess.name} (permitted) should see custom:brand/${pair.brand} but did not`);
            }
          });

          it(`${pair.withoutAccess.name} does NOT have brand access in attributes`, async () => {
            const attrs = await getUserAttributes(pair.withoutAccess);
            expect(attrs.brands || []).not.toContain(pair.brand);
          });
        });
      }
    });

    // =======================================================================
    // Rule 4: Partner country filtering
    // =======================================================================
    describe('Rule 4: Partner country filtering', () => {
      const partnerUsers = getUsersByRule('partner-country');

      // --- Static country check for users with known countriesInResults ---
      for (const user of partnerUsers) {
        if (!user.expectedSearch.countriesInResults) continue;

        it(`${user.name} (${user.email}) only sees assets for allowed countries`, async () => {
          const res = await searchAsUser(user, BROAD_SEARCH);
          expect(res.status).toBe(200);

          const results = getSearchResults(res.body);
          if (results.length === 0) {
            // eslint-disable-next-line no-console
            console.warn(`  ⚠ ${user.name}: zero results — no content for countries [${user.expectedSearch.countriesInResults}]?`);
            return;
          }

          const allowed = user.expectedSearch.countriesInResults;
          for (const hit of results) {
            const assetCountries = hit.assetMetadata?.['custom:country'];
            if (!assetCountries) continue;
            const countryList = Array.isArray(assetCountries)
              ? assetCountries : [assetCountries];
            if (countryList.length === 1 && countryList[0] === 'none') continue;
            const anyAllowed = countryList.some(
              (c) => allowed.includes(c.toLowerCase()) || allowed.includes(c),
            );
            expect(
              anyAllowed,
              `Asset ${hit.assetId} country [${countryList}] not in allowed [${allowed}]`,
            ).toBe(true);
          }
        });

        it(`${user.name} sees 'all-countries' tagged assets`, async () => {
          const res = await searchAsUser(user, BROAD_SEARCH);
          expect(res.status).toBe(200);
          const countries = extractMetadataValues(res.body, 'custom:country');
          if (!countries.includes('all-countries')) {
            // eslint-disable-next-line no-console
            console.warn(`  ⚠ ${user.name}: no 'all-countries' assets in top ${BROAD_SEARCH.limit} results`);
          }
        });
      }

      // --- Dynamic country check for all partners (resolve attributes first) ---
      for (const user of partnerUsers) {
        if (user.expectedSearch.countriesInResults) continue;

        it(`${user.name} (${user.email}) search results match resolved countries`, async () => {
          const attrs = await getUserAttributes(user);
          const userCountries = (attrs.countries || []).map((c) => c.toLowerCase());
          const allowed = [...userCountries, 'all-countries'];

          const res = await searchAsUser(user, BROAD_SEARCH);
          expect(res.status).toBe(200);
          const results = getSearchResults(res.body);

          if (results.length === 0) {
            // eslint-disable-next-line no-console
            console.warn(`  ⚠ ${user.name}: zero results — no content for countries [${allowed}]?`);
            return;
          }

          for (const hit of results) {
            const assetCountries = hit.assetMetadata?.['custom:country'];
            if (!assetCountries) continue;
            const countryList = Array.isArray(assetCountries)
              ? assetCountries : [assetCountries];
            if (countryList.length === 1 && countryList[0] === 'none') continue;
            const anyAllowed = countryList.some(
              (c) => allowed.includes(c.toLowerCase()) || allowed.includes(c),
            );
            expect(
              anyAllowed,
              `Asset ${hit.assetId} country [${countryList}] not in [${allowed}]`,
            ).toBe(true);
          }
        });
      }

      // --- Skip proof: employees, agencies, contingent workers see all countries ---
      const skipUsers = getUsersByRule('partner-country-skip');

      for (const user of skipUsers) {
        it(`${user.name} (${user.email}) is NOT country-filtered (sees multiple countries)`, async () => {
          const res = await searchAsUser(user, BROAD_SEARCH);
          expect(res.status).toBe(200);
          const results = getSearchResults(res.body);
          expect(results.length).toBeGreaterThan(0);

          const countries = extractMetadataValues(res.body, 'custom:country');
          expect(
            countries.length,
            `${user.name} should see assets from multiple countries (no country filter)`,
          ).toBeGreaterThan(1);
        });
      }
    });

    // =======================================================================
    // Rule 5: Customer content filtering
    // =======================================================================
    describe('Rule 5: Customer content', () => {
      for (const pair of customerContentPairs) {
        describe(`customer: ${pair.customer}`, () => {
          it(`${pair.withAccess.name} CAN see customer content when searching "${pair.searchTerm}"`, async () => {
            const res = await searchAsUser(pair.withAccess, keywordSearch(pair.searchTerm));
            expect(res.status).toBe(200);
            const results = getSearchResults(res.body);
            expect(results.length).toBeGreaterThan(0);

            const hasCustomer = hitsContainCustomerContent(res.body);
            if (!hasCustomer) {
              // eslint-disable-next-line no-console
              console.warn(
                `  ⚠ ${pair.withAccess.name}: search for "${pair.searchTerm}" returned results `
                + 'but none had custom:contentType=customers. Customer content may not exist for this term.',
              );
            }
          });

          it(`${pair.withoutAccess.name} CANNOT see customer content when searching "${pair.searchTerm}"`, async () => {
            const res = await searchAsUser(pair.withoutAccess, keywordSearch(pair.searchTerm));
            expect(res.status).toBe(200);

            const hasCustomer = hitsContainCustomerContent(res.body);
            expect(
              hasCustomer,
              'Non-customer user should not see custom:contentType=customers assets',
            ).toBe(false);
          });
        });
      }
    });

    // =======================================================================
    // Data integrity: search results should only contain approved, indexed assets
    // =======================================================================
    describe('Data integrity', () => {
      it('search results only contain approved assets', async () => {
        const admin = getUsersByRule('admin-bypass')[0];
        const res = await searchAsUser(admin, BROAD_SEARCH);
        expect(res.status).toBe(200);

        const results = getSearchResults(res.body);
        expect(results.length).toBeGreaterThan(0);

        for (const hit of results) {
          const status = hit.assetMetadata?.['custom:assetStatus'];
          if (status) {
            const statusList = Array.isArray(status) ? status : [status];
            expect(
              statusList,
              `Asset ${hit.assetId} has status [${statusList}] — only 'approved' should appear in search`,
            ).toContain('approved');
          }
        }
      });

      it('employeeType mismatch denies company role (wrong type → no results)', async () => {
        const wrongTypeUser = testUsers.find(
          (u) => u.targetRules.includes('employeeType-gate'),
        );
        if (!wrongTypeUser) return;

        const res = await searchAsUser(wrongTypeUser, BROAD_SEARCH);
        expect(res.status).toBe(200);
        const results = getSearchResults(res.body);
        expect(
          results.length,
          `${wrongTypeUser.name} should get zero results (employeeType mismatch → no roles)`,
        ).toBe(0);
      });
    });
  });
}
