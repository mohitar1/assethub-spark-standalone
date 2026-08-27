/**
 * Unit tests for report-searches data-calculations utilities.
 * Focuses on processTopSearchData, which drives both the Top Searches and
 * Top 0-Result Searches tables.
 */

import { describe, it, expect } from 'vitest';
import { processTopSearchData } from '../data-calculations.js';

describe('processTopSearchData', () => {
  describe('rank assignment', () => {
    it('assigns rank starting at 1 for the first item', () => {
      const result = processTopSearchData({
        searchTerm: 'sprite', searchType: 'assets', uniqueSearchers: '5', totalSearches: '100',
      }, 0);
      expect(result.rank).toBe(1);
    });

    it('derives rank from the array index', () => {
      const result = processTopSearchData({
        searchTerm: 'fanta', searchType: 'assets', uniqueSearchers: '2', totalSearches: '50',
      }, 4);
      expect(result.rank).toBe(5);
    });
  });

  describe('field mapping', () => {
    it('maps searchTerm, searchType, uniqueSearchers and totalSearches', () => {
      const result = processTopSearchData({
        searchTerm: 'sample brand',
        searchType: 'templates',
        uniqueSearchers: '7',
        totalSearches: '200',
      }, 0);

      expect(result.searchTerm).toBe('sample brand');
      expect(result.searchType).toBe('templates');
      expect(result.uniqueSearchers).toBe(7);
      expect(result.totalSearches).toBe(200);
    });

    it('coerces numeric strings to numbers', () => {
      const result = processTopSearchData({
        searchTerm: 'test', searchType: 'products', uniqueSearchers: '42', totalSearches: '1337',
      }, 0);
      expect(result.uniqueSearchers).toBe(42);
      expect(result.totalSearches).toBe(1337);
    });

    it('defaults numeric fields to 0 when not parseable', () => {
      const result = processTopSearchData({
        searchTerm: 'test', searchType: 'all', uniqueSearchers: null, totalSearches: undefined,
      }, 0);
      expect(result.uniqueSearchers).toBe(0);
      expect(result.totalSearches).toBe(0);
    });
  });

  describe('missing / empty fields', () => {
    it('defaults searchTerm to empty string when absent', () => {
      const result = processTopSearchData({
        searchType: 'assets', uniqueSearchers: '1', totalSearches: '1',
      }, 0);
      expect(result.searchTerm).toBe('');
    });

    it('defaults searchType to empty string when absent', () => {
      const result = processTopSearchData({
        searchTerm: 'sprite', uniqueSearchers: '1', totalSearches: '1',
      }, 0);
      expect(result.searchType).toBe('');
    });

    it('handles a completely empty object', () => {
      const result = processTopSearchData({}, 0);
      expect(result).toEqual({
        rank: 1,
        searchTerm: '',
        searchType: '',
        uniqueSearchers: 0,
        totalSearches: 0,
      });
    });
  });

  describe('all valid searchType values', () => {
    const types = ['all', 'assets', 'templates', 'products'];
    types.forEach((type) => {
      it(`passes through searchType "${type}"`, () => {
        const result = processTopSearchData({
          searchTerm: 'x', searchType: type, uniqueSearchers: '1', totalSearches: '1',
        }, 0);
        expect(result.searchType).toBe(type);
      });
    });
  });

  describe('array mapping (simulated .map usage)', () => {
    it('produces correctly ranked items when used with Array.map', () => {
      const raw = [
        {
          searchTerm: 'sprite', searchType: 'assets', uniqueSearchers: '9', totalSearches: '500',
        },
        {
          searchTerm: 'sprite', searchType: 'templates', uniqueSearchers: '3', totalSearches: '200',
        },
        {
          searchTerm: 'fanta', searchType: 'assets', uniqueSearchers: '4', totalSearches: '150',
        },
      ];

      const results = raw.map(processTopSearchData);

      expect(results).toHaveLength(3);
      expect(results[0].rank).toBe(1);
      expect(results[1].rank).toBe(2);
      expect(results[2].rank).toBe(3);

      expect(results[0]).toMatchObject({
        searchTerm: 'sprite', searchType: 'assets', totalSearches: 500,
      });
      expect(results[1]).toMatchObject({
        searchTerm: 'sprite', searchType: 'templates', totalSearches: 200,
      });
    });

    it('returns an empty array for empty input', () => {
      expect([].map(processTopSearchData)).toEqual([]);
    });
  });
});
