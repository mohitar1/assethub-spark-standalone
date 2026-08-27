/**
 * Tests for ContentAI functions in asset-transformers.js
 */

import {
  describe, it, expect,
} from 'vitest';
import {
  extractKeywords,
  populateAssetFromContentAIHit,
  parseContentAIResponse,
} from '../asset-transformers.js';

describe('contentai-asset-transformer', () => {
  describe('extractKeywords', () => {
    it('should return empty string for non-array input', () => {
      expect(extractKeywords(null)).toBe('');
      expect(extractKeywords(undefined)).toBe('');
      expect(extractKeywords('string')).toBe('');
      expect(extractKeywords(123)).toBe('');
    });

    it('should extract plain string values', () => {
      const result = extractKeywords(['keyword1', 'keyword2']);
      expect(result).toBe('keyword1, keyword2');
    });

    it('should extract value from objects with value property', () => {
      const result = extractKeywords([
        { value: 'keyword1' },
        { value: 'keyword2' },
      ]);
      expect(result).toBe('keyword1, keyword2');
    });

    it('should filter by English language', () => {
      const result = extractKeywords([
        { value: 'english', '@lang': 'en' },
        { value: 'japanese', '@lang': 'ja' },
        { value: 'no-lang' },
      ]);
      expect(result).toBe('english, no-lang');
    });

    it('should extract value after colon', () => {
      const result = extractKeywords(['prefix:value1', 'prefix:value2']);
      expect(result).toBe('value1, value2');
    });

    it('should extract last part after slash', () => {
      const result = extractKeywords(['path / to / value']);
      expect(result).toBe('value');
    });

    it('should handle combined colon and slash extraction', () => {
      const result = extractKeywords(['category:path / to / keyword']);
      expect(result).toBe('keyword');
    });

    it('should filter out null results', () => {
      const result = extractKeywords([
        { notValue: 'skip' },
        'valid',
      ]);
      expect(result).toBe('valid');
    });

    it('should return empty string for empty array', () => {
      expect(extractKeywords([])).toBe('');
    });

    it('should handle objects with empty value', () => {
      const result = extractKeywords([{ value: '' }]);
      expect(result).toBe('');
    });
  });

  describe('populateAssetFromContentAIHit', () => {
    it('should extract core identifiers', () => {
      const hit = {
        assetId: 'urn:aaid:aem:123',
        repositoryMetadata: {
          'repo:name': 'test-file.jpg',
        },
        assetMetadata: {
          'dc:title': 'Test Title',
        },
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.assetId).toBe('urn:aaid:aem:123');
      expect(result.name).toBe('test-file.jpg');
      expect(result.title).toBe('Test Title');
      expect(result.alt).toBe('Test Title');
    });

    it('should use title as alt when title exists', () => {
      const hit = {
        assetId: 'urn:aaid:aem:123',
        repositoryMetadata: {
          'repo:name': 'test-file.jpg',
        },
        assetMetadata: {
          'dc:title': 'My Title',
        },
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.alt).toBe('My Title');
    });

    it('should use N/A as alt when no title (fallback via safeStringField)', () => {
      const hit = {
        assetId: 'urn:aaid:aem:123',
        repositoryMetadata: {
          'repo:name': 'test-file.jpg',
        },
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      // alt is dcTitle || repoName, both are 'N/A' by default via safeStringField
      // So it becomes 'N/A' || 'test-file.jpg' => 'N/A' (truthy)
      expect(result.alt).toBe('N/A');
    });

    it('should format dates correctly', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {
          'repo:createDate': '2024-01-15T10:30:00Z',
          'repo:modifyDate': '2024-02-20T15:45:00Z',
        },
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.createDate).toBe('15 Jan 2024');
      expect(result.modifyDate).toBe('20 Feb 2024');
    });

    it('should return N/A for invalid dates', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {},
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.createDate).toBe('N/A');
    });

    it('should format file size', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {
          'repo:size': 1048576, // 1 MB
        },
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.formattedSize).toBe('1 MB');
    });

    it('should handle zero file size', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {
          'repo:size': 0,
        },
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.formattedSize).toBe('0 Bytes');
    });

    it('should handle missing metadata gracefully', () => {
      const hit = {
        assetId: 'test',
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.assetId).toBe('test');
      expect(result.name).toBe('N/A');
    });

    it('should extract dimensions', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {},
        assetMetadata: {
          'tiff:ImageWidth': 1920,
          'tiff:ImageLength': 1080,
        },
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.imageWidth).toBe('1920');
      expect(result.imageHeight).toBe('1080');
    });

    it('should use lowercase tiff fields as fallback', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {
          'tiff:imageWidth': 800,
          'tiff:imageLength': 600,
        },
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.imageWidth).toBe('800');
      expect(result.imageHeight).toBe('600');
    });

    it('should extract description from dc:description', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {},
        assetMetadata: {
          'dc:description': 'DC Description',
        },
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.description).toBe('DC Description');
    });

    it('should return N/A when dc:description is missing', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {},
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.description).toBe('N/A');
    });

    it('should handle expiration date', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {},
        assetMetadata: {
          'pur:expirationDate': '2025-12-31T23:59:59Z',
        },
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.expirationDate).toBe('31 Dec 2025');
      expect(result.expired).toBe('1');
    });

    it('should set expired to 0 when no expiration', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {},
        assetMetadata: {},
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.expired).toBe('0');
    });

    it('should extract keywords', () => {
      const hit = {
        assetId: 'test',
        repositoryMetadata: {},
        assetMetadata: {
          'xcm:keywords': ['category:keyword1', 'category:keyword2'],
          'xcm:machineKeywords': [{ value: 'machine1' }, { value: 'machine2' }],
        },
      };

      const result = populateAssetFromContentAIHit(hit);

      expect(result.xcmKeywords).toBe('keyword1, keyword2');
      expect(result.xcmMachineKeywords).toBe('machine1, machine2');
    });
  });

  describe('parseContentAIResponse', () => {
    it('should return empty result for null response', () => {
      const result = parseContentAIResponse(null);

      expect(result).toEqual({
        hits: [],
        facets: {},
        facetStats: {},
        totalCount: 0,
        cursor: null,
      });
    });

    it('should return empty result for undefined response', () => {
      const result = parseContentAIResponse(undefined);

      expect(result).toEqual({
        hits: [],
        facets: {},
        facetStats: {},
        totalCount: 0,
        cursor: null,
      });
    });

    it('should extract hits from response', () => {
      const response = {
        hits: {
          results: [{ assetId: '1' }, { assetId: '2' }],
        },
        search_metadata: {
          totalCount: { total: 100 },
        },
      };

      const result = parseContentAIResponse(response);

      expect(result.hits).toHaveLength(2);
      expect(result.totalCount).toBe(100);
    });

    it('should extract cursor from response', () => {
      const response = {
        hits: { results: [] },
        search_metadata: {},
        cursor: 'next-page-cursor',
      };

      const result = parseContentAIResponse(response);

      expect(result.cursor).toBe('next-page-cursor');
    });

    it('should parse CATEGORY facets', () => {
      const response = {
        hits: { results: [] },
        search_metadata: {},
        facets: [
          {
            type: 'CATEGORY',
            id: 'brand',
            values: [
              { value: 'Acme Corp', count: 50 },
              { value: 'Sprite', count: 30 },
            ],
          },
        ],
      };

      const result = parseContentAIResponse(response);

      expect(result.facets.brand).toEqual({
        'Acme Corp': 50,
        Sprite: 30,
      });
    });

    it('should parse STAT facets', () => {
      const response = {
        hits: { results: [] },
        search_metadata: {},
        facets: [
          {
            type: 'STAT',
            id: 'repo-createDate',
            values: {
              min: '2020-01-01T00:00:00Z',
              max: '2024-12-31T23:59:59Z',
            },
          },
        ],
      };

      const result = parseContentAIResponse(response);

      expect(result.facetStats['repo-createDate']).toEqual({
        min: '2020-01-01T00:00:00Z',
        max: '2024-12-31T23:59:59Z',
      });
    });

    it('should handle empty facets array', () => {
      const response = {
        hits: { results: [] },
        search_metadata: {},
        facets: [],
      };

      const result = parseContentAIResponse(response);

      expect(result.facets).toEqual({});
      expect(result.facetStats).toEqual({});
    });

    it('should handle missing values in CATEGORY facet', () => {
      const response = {
        hits: { results: [] },
        search_metadata: {},
        facets: [
          {
            type: 'CATEGORY',
            id: 'test-facet',
            values: [
              { value: 'valid', count: 10 },
              { count: 5 }, // missing value
              { value: 'another' }, // missing count
            ],
          },
        ],
      };

      const result = parseContentAIResponse(response);

      expect(result.facets['test-facet']).toEqual({
        valid: 10,
      });
    });

    it('should handle non-array facets', () => {
      const response = {
        hits: { results: [] },
        search_metadata: {},
        facets: 'not-an-array',
      };

      const result = parseContentAIResponse(response);

      expect(result.facets).toEqual({});
    });

    it('should handle missing hits.results', () => {
      const response = {
        hits: {},
        search_metadata: { totalCount: { total: 0 } },
      };

      const result = parseContentAIResponse(response);

      expect(result.hits).toEqual([]);
    });

    it('should handle missing search_metadata.totalCount', () => {
      const response = {
        hits: { results: [] },
        search_metadata: {},
      };

      const result = parseContentAIResponse(response);

      expect(result.totalCount).toBe(0);
    });
  });
});
