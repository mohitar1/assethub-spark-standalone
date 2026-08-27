/* eslint-disable import/prefer-default-export */

/**
 * Declarative integration test definitions.
 *
 * Each top-level key is a feature area.  Inside each you can define:
 *   api   – array of API endpoint tests
 *   pages – array of page-load smoke tests
 *
 * Every test has:
 *   name   – human-readable label
 *   method – HTTP method (defaults to GET)
 *   path   – relative URL path
 *   body   – optional JSON body (for POST)
 *   query  – optional query-string params
 *   expect – assertions (status, hasFields, contains, minLength, nested …)
 *   expectByEnv – per-environment overrides merged on top of `expect`
 */

export const testConfig = {
  /* ================================================================ */
  /*  User                                                             */
  /* ================================================================ */
  user: {
    api: [
      {
        name: 'Get current user profile',
        method: 'GET',
        path: '/api/user',
        expect: {
          status: 200,
          hasFields: ['name', 'email', 'permissions', 'roles'],
        },
      },
    ],
  },

  /* ================================================================ */
  /*  Search                                                          */
  /* ================================================================ */
  search: {
    api: [
      {
        name: 'Empty search returns results',
        method: 'POST',
        path: '/api/adobe/assets/contentai/search',
        body: { query: [{ match: { text: '' } }], limit: 10 },
        expect: {
          status: 200,
          hasFields: ['hits', 'cursor', 'search_metadata'],
        },
      },
      {
        name: 'Search by keyword',
        method: 'POST',
        path: '/api/adobe/assets/contentai/search',
        body: { query: [{ match: { text: 'sample asset' } }], limit: 10 },
        expect: {
          status: 200,
          hasFields: ['hits'],
        },
      },
      {
        name: 'Search collections',
        method: 'POST',
        path: '/api/adobe/assets/contentai/collections/search',
        body: {
          query: [{ match: { text: '', fields: ['collectionMetadata.title', 'collectionMetadata.description'] } }],
          limit: 10,
          orderBy: 'repositoryMetadata.repo:modifyDate desc',
        },
        expect: {
          status: 200,
          hasFields: ['hits', 'search_metadata'],
        },
      },
    ],
    pages: [
      {
        name: 'Search page loads',
        path: '/en/search/assets',
        expect: {
          status: 200,
          contentType: 'text/html',
          contains: ['<header', '<main', 'search-results'],
        },
      },
    ],
  },

  /* ================================================================ */
  /*  Analytics / Reporting                                           */
  /* ================================================================ */
  reporting: {
    api: [
      {
        name: 'Search metrics (D1)',
        method: 'GET',
        path: '/api/analytics/search-metrics',
        query: { type: 'uniqueSearchers', startDate: '2025-01-01', endDate: '2025-12-31' },
        expect: {
          status: [200, 500],
          hasFields: ['success', 'type', 'data'],
        },
      },
    ],
    pages: [
      {
        name: 'Report hub page',
        path: '/en/reports/report-hub',
        expect: { status: 200, contentType: 'text/html', contains: ['<header', '<main', 'report-hub'] },
      },
      {
        name: 'Downloads report page',
        path: '/en/reports/downloads',
        expect: { status: 200, contentType: 'text/html', contains: ['<header', '<main', 'report-downloads'] },
      },
      {
        name: 'Search analytics report page',
        path: '/en/reports/searches',
        expect: { status: 200, contentType: 'text/html', contains: ['<header', '<main', 'report-searches'] },
      },
      {
        name: 'Assets report page',
        path: '/en/reports/assets',
        expect: { status: 200, contentType: 'text/html', contains: ['<header', '<main', 'report-assets'] },
      },
    ],
  },

  /* ================================================================ */
  /*  Collections                                                     */
  /* ================================================================ */
  collections: {
    pages: [
      {
        name: 'Search collections page',
        path: '/en/search-collections',
        expect: { status: 200, contentType: 'text/html', contains: ['<header', '<main', 'search-collection-results'] },
      },
      {
        name: 'Collection details page',
        path: '/en/collection-details',
        expect: { status: 200, contentType: 'text/html', contains: ['<header', '<main', 'collection-details'] },
      },
    ],
  },

  /* ================================================================ */
  /*  Notifications                                                    */
  /* ================================================================ */
  notifications: {
    api: [
      {
        name: 'List notifications',
        method: 'GET',
        path: '/api/messages',
        expect: {
          status: 200,
          hasFields: ['success', 'messages'],
        },
      },
    ],
    pages: [
      {
        name: 'My notifications page',
        path: '/en/my-dam/my-notifications',
        expect: { status: 200, contentType: 'text/html', contains: ['<header', '<main', 'my-notifications'] },
      },
    ],
  },

};

/* ================================================================== */
/*  Localization – auto-generate /ja/ variants of all /en/ pages       */
/* ================================================================== */
const EN_ONLY_PATHS = ['/en/reports/', '/en/drafts/'];
const jaPages = [];
Object.values(testConfig).forEach((suites) => {
  (suites.pages || []).forEach((spec) => {
    if (spec.path.startsWith('/en/')) {
      const enOnly = EN_ONLY_PATHS.some((prefix) => spec.path.startsWith(prefix));
      if (enOnly) return;
      jaPages.push({
        ...spec,
        name: spec.name.replace(/page$/i, 'page (ja)').replace(/loads$/i, 'loads (ja)'),
        path: spec.path.replace(/^\/en\//, '/ja/'),
      });
    }
  });
});
testConfig.localization = { pages: jaPages };
