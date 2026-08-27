/**
 * Search type detection from Referer (search analytics ingest gate).
 */

import { describe, expect, it } from 'vitest';
import { extractSearchContext } from '../dm-analytics.js';

function requestWithReferer(referer) {
  return {
    headers: {
      get: (name) => (name.toLowerCase() === 'referer' ? referer : null),
    },
  };
}

const contentAIQuery = {
  query: [{ and: [{ and: [{ match: { text: 'machines' } }] }] }],
};

describe('extractSearchContext search type from referer', () => {
  it('accepts Frescopa unified search page /en/search', () => {
    const request = requestWithReferer(
      'https://lookandfeel-improvements.spark.aem.media/en/search?query=machines',
    );
    extractSearchContext(request, contentAIQuery);
    expect(request.searchContext).toEqual({ searchTerm: 'machines', searchType: 'all' });
  });

  it('accepts typed /search/assets pages', () => {
    const request = requestWithReferer('https://spark.aem.media/en/search/assets?q=test');
    extractSearchContext(request, contentAIQuery);
    expect(request.searchContext?.searchType).toBe('assets');
  });

  it('rejects non-search pages', () => {
    const request = requestWithReferer('https://spark.aem.media/en/reports/searches');
    extractSearchContext(request, contentAIQuery);
    expect(request.searchContext).toBeUndefined();
  });

  it('rejects search-collections paths', () => {
    const request = requestWithReferer('https://spark.aem.media/en/search-collections');
    extractSearchContext(request, contentAIQuery);
    expect(request.searchContext).toBeUndefined();
  });
});
