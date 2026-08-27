/**
 * AuthZ Test Suite — Phase A: Attribute Verification
 *
 * Impersonates each test user via SUDO cookies and verifies that /api/user
 * returns the expected roles, countries, customers, and brands. This validates
 * that the permission sheets (companies, users, restricted-brands) resolve
 * correctly for each user profile.
 */

/* eslint-disable no-restricted-syntax */
import {
  describe, it, expect, beforeAll,
} from 'vitest';
import { testUsers } from './test-users.js';
import { getUserAttributes, getSessionCookie } from './helpers.js';
import { getBaseUrl, getCurrentEnv } from '../shared/env.js';

const cookie = process.env.TEST_SESSION_COOKIE;

if (!cookie) {
  describe('authz – attribute check', () => {
    it.skip('requires TEST_SESSION_COOKIE (with sudo permission)', () => {});
  });
} else {
  const baseUrl = getBaseUrl();
  const env = getCurrentEnv();

  // eslint-disable-next-line no-console
  console.log(`\n  AuthZ attribute tests → ${baseUrl}  (env: ${env})\n`);

  describe('authz – attribute check', () => {
    // Verify the session cookie is valid and has sudo permission
    let callerAttributes;

    beforeAll(async () => {
      const res = await fetch(new URL('/api/user', baseUrl), {
        headers: { Cookie: `Session=${getSessionCookie()}` },
        redirect: 'manual',
      });

      if (res.status !== 200) {
        throw new Error(
          `Session cookie invalid (GET /api/user returned ${res.status}).\n`
          + 'Get a fresh cookie and re-export TEST_SESSION_COOKIE.',
        );
      }

      callerAttributes = await res.json();
      if (!callerAttributes.permissions?.includes('sudo')) {
        throw new Error(
          'Session cookie user does not have "sudo" permission.\n'
          + `Current user: ${callerAttributes.email}\n`
          + 'AuthZ tests require a session from a sudo-enabled user.',
        );
      }

      // eslint-disable-next-line no-console
      console.log(`  Sudo user: ${callerAttributes.email}\n`);
    });

    for (const user of testUsers) {
      describe(user.name, () => {
        let attrs;

        beforeAll(async () => {
          attrs = await getUserAttributes(user);
        });

        it('impersonation is active (email matches)', () => {
          expect(attrs.email).toBe(user.email);
        });

        if (user.expectedAttributes.roles !== undefined) {
          it(`has expected roles: [${user.expectedAttributes.roles.join(', ')}]`, () => {
            const expected = user.expectedAttributes.roles;
            if (expected.length === 0) {
              expect(attrs.roles).toEqual([]);
            } else {
              for (const role of expected) {
                expect(attrs.roles, `Missing role "${role}"`).toContain(role);
              }
              expect(
                attrs.roles.length,
                `Expected exactly [${expected}] but got [${attrs.roles}] — unexpected extra roles`,
              ).toBe(expected.length);
            }
          });
        }

        if (user.expectedAttributes.countries !== undefined) {
          it(`has expected countries: [${user.expectedAttributes.countries.join(', ')}]`, () => {
            const expected = user.expectedAttributes.countries;
            if (expected.length === 0) {
              expect(attrs.countries).toEqual([]);
            } else {
              for (const country of expected) {
                expect(attrs.countries, `Missing country "${country}"`).toContain(country);
              }
            }
          });
        }

        if (user.expectedAttributes.customers !== undefined) {
          it(`has expected customers: [${user.expectedAttributes.customers.join(', ')}]`, () => {
            const expected = user.expectedAttributes.customers;
            if (expected.length === 0) {
              expect(attrs.customers || []).toEqual([]);
            } else {
              for (const customer of expected) {
                expect(attrs.customers, `Missing customer "${customer}"`).toContain(customer);
              }
            }
          });
        }

        if (user.expectedAttributes.brands !== undefined) {
          it(`has expected brands: [${user.expectedAttributes.brands.join(', ')}]`, () => {
            const expected = user.expectedAttributes.brands;
            if (expected.length === 0) {
              expect(attrs.brands || []).toEqual([]);
            } else {
              for (const brand of expected) {
                expect(attrs.brands, `Missing brand "${brand}"`).toContain(brand);
              }
            }
          });
        }
      });
    }
  });
}
