/**
 * Search response hit parsing for analytics market extraction.
 */

import { describe, expect, it } from 'vitest';
import { extractAssetMarketsFromHits, getSearchHitResults } from '../dm-analytics.js';

describe('getSearchHitResults', () => {
  it('reads ContentAI hits.results array', () => {
    const data = {
      hits: {
        results: [{ assetMetadata: { 'dc:title': 'Coffee' } }],
        total: 1,
      },
    };
    expect(getSearchHitResults(data)).toHaveLength(1);
  });

  it('reads Algolia results[0].hits array', () => {
    const data = {
      results: [{ hits: [{ objectID: 'abc' }] }],
    };
    expect(getSearchHitResults(data)).toHaveLength(1);
  });

  it('returns empty array when hits is an object without results', () => {
    expect(getSearchHitResults({ hits: { total: 0 } })).toEqual([]);
  });

  it('returns empty array for missing hits', () => {
    expect(getSearchHitResults({})).toEqual([]);
  });
});

describe('extractAssetMarketsFromHits', () => {
  it('collects allowedCountries from ContentAI hits.results', () => {
    const data = {
      hits: {
        results: [
          { assetMetadata: { allowedCountries: ['USA', 'Global'] } },
          { assetMetadata: { allowedCountries: 'EMEA' } },
          { assetMetadata: { allowedCountries: ['USA'] } },
        ],
        total: 3,
      },
    };
    expect(extractAssetMarketsFromHits(data)).toEqual(['USA', 'Global', 'EMEA']);
  });

  it('returns empty array for zero-result ContentAI response', () => {
    const data = {
      hits: { results: [], total: 0 },
      search_metadata: { totalCount: { total: 0 } },
    };
    expect(extractAssetMarketsFromHits(data)).toEqual([]);
  });
});
