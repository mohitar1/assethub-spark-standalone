/**
 * AuthZ Test User Profiles
 *
 * Each user maps to entries in the permission sheets (/config/access/companies,
 * /config/access/users, /config/access/restricted-brands). Edit emails, domains,
 * countries, and employeeType values here if the sheets change.
 *
 * The SUDO cookies sent during tests are: SUDO_EMAIL, SUDO_COUNTRY, SUDO_EMPLOYEE_TYPE.
 * The domain is derived from the email, so the email domain must match the companies sheet.
 *
 */

// employeeType values that match the companies sheet
export const EMPLOYEE_TYPE = {
  EMPLOYEE: '10',
  CONTINGENT_WORKER: '11',
  EXTERNAL: '99',
};

export const testUsers = [
  // =========================================================================
  // Rule 1: No roles — unknown domain, should get zero search results
  // =========================================================================
  {
    name: 'No Roles - Not Onboarded',
    email: 'not@onboarded.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EXTERNAL,
    targetRules: ['no-roles'],
    expectedAttributes: {
      roles: [],
      countries: [],
      customers: [],
    },
    expectedSearch: {
      hasResults: false,
    },
  },

  {
    name: 'Wrong EmployeeType - Denied Role',
    email: 'test@example.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EXTERNAL,
    targetRules: ['no-roles', 'employeeType-gate'],
    expectedAttributes: {
      roles: [],
      countries: [],
      customers: [],
      brands: [],
    },
    expectedSearch: {
      hasResults: false,
    },
  },

  // =========================================================================
  // Rule 2: Admin bypass — sees everything, no filters
  // =========================================================================
  {
    name: 'Admin - Full Access',
    email: 'admin@example.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EMPLOYEE,
    targetRules: ['admin-bypass'],
    expectedAttributes: {
      roles: ['employee', 'admin'],
    },
    expectedSearch: {
      hasResults: true,
      seesRestrictedBrands: true,
      seesAllCountries: true,
      seesCustomerContent: true,
    },
  },

  // =========================================================================
  // Rule 3: Restricted brands — compare two employees with different brand access
  // =========================================================================
  {
    name: 'Employee - Has Burn Brand Access',
    email: 'burn@example.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EMPLOYEE,
    targetRules: ['restricted-brands'],
    expectedAttributes: {
      roles: ['employee'],
      brands: ['burn'],
    },
    expectedSearch: {
      hasResults: true,
      seesRestrictedBrands: true,
      knownVisibleAssets: ['SMR-14-Nov-3', 'Cugs-Check'],
    },
  },
  {
    name: 'Employee - No Restricted Brand Access',
    email: 'test@example.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EMPLOYEE,
    targetRules: ['restricted-brands', 'partner-country-skip'],
    expectedAttributes: {
      roles: ['employee'],
      brands: [],
      customers: [],
    },
    expectedSearch: {
      hasResults: true,
      seesRestrictedBrands: false,
      seesAllCountries: true,
      seesCustomerContent: false,
    },
  },

  // =========================================================================
  // Rule 4: Partner country filtering — partners see only their countries
  // =========================================================================
  {
    name: 'Partner - France Only',
    email: 'user@french-partner.com',
    country: 'FR',
    employeeType: EMPLOYEE_TYPE.EXTERNAL,
    targetRules: ['partner-country'],
    expectedAttributes: {
      roles: ['partner'],
      countries: ['fr'],
    },
    expectedSearch: {
      hasResults: true,
      countriesInResults: ['fr', 'all-countries'],
    },
  },
  {
    name: 'Partner - Generic (US)',
    email: 'user@partner.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EXTERNAL,
    targetRules: ['partner-country'],
    expectedAttributes: {
      roles: ['partner'],
      // country comes from SUDO_COUNTRY via IDP fallback or sheet
    },
    expectedSearch: {
      hasResults: true,
      // results filtered to the user's country + all-countries
    },
  },
  {
    name: 'Partner - APAC Multi-Country',
    email: 'user@apac-partner.com',
    country: 'AU',
    employeeType: EMPLOYEE_TYPE.EXTERNAL,
    targetRules: ['partner-country'],
    expectedAttributes: {
      roles: ['partner'],
      // multiple APAC countries from the sheet
    },
    expectedSearch: {
      hasResults: true,
      // results filtered to APAC countries + all-countries
    },
  },

  // =========================================================================
  // Rule 4 (skip proof): Employees, agencies, CW skip country filtering
  // =========================================================================
  {
    name: 'Contingent Worker - Skips Country Filter',
    email: 'test@example.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.CONTINGENT_WORKER,
    targetRules: ['partner-country-skip'],
    expectedAttributes: {
      roles: ['contingent-worker'],
    },
    expectedSearch: {
      hasResults: true,
      seesAllCountries: true,
    },
  },
  {
    name: 'Agency - Skips Country Filter',
    email: 'agency@agency.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EXTERNAL,
    targetRules: ['partner-country-skip'],
    expectedAttributes: {
      roles: ['agency'],
    },
    expectedSearch: {
      hasResults: true,
      seesAllCountries: true,
      seesCustomerContent: false,
    },
  },

  // =========================================================================
  // Rule 5: Customer content — mcdonalds@example.com sees McDonald's content
  // =========================================================================
  {
    name: 'Employee - Sees McDonald\'s Customer Content',
    email: 'mcdonalds@example.com',
    country: 'US',
    employeeType: EMPLOYEE_TYPE.EMPLOYEE,
    targetRules: ['customer-content'],
    expectedAttributes: {
      roles: ['employee'],
      customers: ['mcdonald-s'],
    },
    expectedSearch: {
      hasResults: true,
      seesAllCountries: true,
      seesCustomerContent: true,
      // search for "McDonald's" with this user should return customer content
    },
  },
  // Compare against: 'Employee - No Restricted Brand Access' (test@example.com)
  // who has customers: [] and should NOT see McDonald's customer content
];

/**
 * Helper to get users by target rule for grouped test assertions.
 */
export function getUsersByRule(rule) {
  return testUsers.filter((u) => u.targetRules.includes(rule));
}

/**
 * Restricted brand comparison pairs.
 * Each pair has a user WITH brand access and a user WITHOUT.
 */
export const restrictedBrandPairs = [
  {
    brand: 'burn',
    withAccess: testUsers.find((u) => u.email === 'burn@example.com'),
    withoutAccess: testUsers.find((u) => u.email === 'test@example.com' && u.employeeType === EMPLOYEE_TYPE.EMPLOYEE),
  },
];

/**
 * All restricted brands to test.
 * The admin user (no brand filter) should be able to see assets tagged with
 * these brands. A regular employee (all restricted brands excluded) should not.
 *
 * The test searches for each brand name as a keyword. If any results come back,
 * it checks the custom:brand metadata to confirm the filter is working.
 */
export const restrictedBrands = [
  'burn',
  'chill-out',
  'deep-spring',
  'full-throttle',
  'gladiator',
  'kirks',
  'monster',
  'mother',
  'moxie',
  'nalu',
  'nos',
  'relentless',
  'roar',
];

/**
 * Customer content comparison pairs.
 * Each pair has a user WITH customer access and a user WITHOUT.
 */
export const customerContentPairs = [
  {
    customer: 'mcdonald-s',
    searchTerm: "McDonald's",
    withAccess: testUsers.find((u) => u.email === 'mcdonalds@example.com'),
    withoutAccess: testUsers.find((u) => u.email === 'test@example.com' && u.employeeType === EMPLOYEE_TYPE.EMPLOYEE),
  },
];
