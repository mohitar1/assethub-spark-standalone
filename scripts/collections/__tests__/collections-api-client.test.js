/**
 * @vitest-environment jsdom
 */

/**
 * Tests for collections-api-client.js - ContentAI search methods
 */

import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { DynamicMediaCollectionsClient } from '../collections-api-client.js';

// Mock dependencies
vi.mock('../../../blocks/search-results/clients/dynamicmedia-client.js', () => ({
  getContentAIClient: vi.fn(),
}));

// Suppress console output during tests
vi.spyOn(console, 'trace').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('DynamicMediaCollectionsClient - ContentAI search methods', () => {
  let client;

  beforeEach(() => {
    // Create a client and mock its makeRequest method
    client = new DynamicMediaCollectionsClient({});
    client.makeRequest = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchCollections', () => {
    it('should search collections with default options', async () => {
      client.makeRequest.mockResolvedValue({
        data: {
          hits: { results: [{ id: 'col1' }, { id: 'col2' }] },
          search_metadata: { totalCount: { total: 10 } },
          cursor: 'next-cursor',
        },
      });

      const result = await client.searchCollections();

      expect(client.makeRequest).toHaveBeenCalledWith({
        url: '/adobe/assets/contentai/collections/search',
        method: 'POST',
        data: expect.objectContaining({
          limit: 24,
          orderBy: 'repositoryMetadata.repo:modifyDate desc',
          query: expect.arrayContaining([
            expect.objectContaining({
              match: expect.objectContaining({
                text: '',
                fields: ['collectionMetadata.title', 'collectionMetadata.description'],
              }),
            }),
          ]),
        }),
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.cursor).toBe('next-cursor');
    });

    it('should search collections with custom query', async () => {
      client.makeRequest.mockResolvedValue({
        data: {
          hits: { results: [] },
          search_metadata: { totalCount: { total: 0 } },
        },
      });

      await client.searchCollections({ query: '  test query  ' });

      expect(client.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            query: expect.arrayContaining([
              expect.objectContaining({
                match: expect.objectContaining({ text: 'test query' }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should include cursor when provided', async () => {
      client.makeRequest.mockResolvedValue({
        data: { hits: { results: [] }, search_metadata: {} },
      });

      await client.searchCollections({ cursor: 'page2-cursor' });

      expect(client.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cursor: 'page2-cursor' }),
        }),
      );
    });

    it('should include custom limit and orderBy', async () => {
      client.makeRequest.mockResolvedValue({
        data: { hits: { results: [] }, search_metadata: {} },
      });

      await client.searchCollections({ limit: 20, orderBy: 'custom:order asc' });

      expect(client.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            limit: 20,
            orderBy: 'custom:order asc',
          }),
        }),
      );
    });

    it('should include pin filter when specified', async () => {
      client.makeRequest.mockResolvedValue({
        data: { hits: { results: [] }, search_metadata: {} },
      });

      await client.searchCollections({ pin: true });

      expect(client.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pin: true }),
        }),
      );
    });

    it('should include favorite filter when specified', async () => {
      client.makeRequest.mockResolvedValue({
        data: { hits: { results: [] }, search_metadata: {} },
      });

      await client.searchCollections({ favorite: false });

      expect(client.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ favorite: false }),
        }),
      );
    });

    it('should handle empty response gracefully', async () => {
      client.makeRequest.mockResolvedValue({
        data: {},
      });

      const result = await client.searchCollections();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.cursor).toBeUndefined();
    });

    it('should wrap Error in descriptive message', async () => {
      client.makeRequest.mockRejectedValue(new Error('Network error'));

      await expect(client.searchCollections()).rejects.toThrow(
        'Failed to search collections: Network error',
      );
    });

    it('should re-throw non-Error exceptions', async () => {
      client.makeRequest.mockRejectedValue('string error');

      await expect(client.searchCollections()).rejects.toBe('string error');
    });
  });

  describe('searchAssetsInCollection', () => {
    let mockContentAIClient;

    beforeEach(async () => {
      mockContentAIClient = {
        searchAssets: vi.fn().mockResolvedValue({ hits: { results: [] } }),
      };
      const { getContentAIClient } = await import('../../../blocks/search-results/clients/dynamicmedia-client.js');
      getContentAIClient.mockReturnValue(mockContentAIClient);
    });

    it('should throw error when collectionId is missing', async () => {
      await expect(client.searchAssetsInCollection('test')).rejects.toThrow(
        'collectionId is required for searchAssetsInCollection',
      );
    });

    it('should search assets with collectionId', async () => {
      mockContentAIClient.searchAssets.mockResolvedValue({ hits: { results: [] } });

      await client.searchAssetsInCollection('query', { collectionId: 'col123' });

      expect(mockContentAIClient.searchAssets).toHaveBeenCalledWith('query', {
        collectionId: 'col123',
        facets: [],
        facetFilters: [],
        filters: [],
        hitsPerPage: 24,
        cursor: undefined,
        skipFacetsRequest: true,
      });
    });

    it('should pass all options to searchAssets', async () => {
      mockContentAIClient.searchAssets.mockResolvedValue({ hits: { results: [] } });

      await client.searchAssetsInCollection('search term', {
        collectionId: 'col456',
        hitsPerPage: 50,
        facets: ['facet1'],
        facetFilters: ['filter1'],
        filters: ['preset1'],
        cursor: 'page-cursor',
      });

      expect(mockContentAIClient.searchAssets).toHaveBeenCalledWith('search term', {
        collectionId: 'col456',
        facets: ['facet1'],
        facetFilters: ['filter1'],
        filters: ['preset1'],
        hitsPerPage: 50,
        cursor: 'page-cursor',
        skipFacetsRequest: true,
      });
    });

    it('should return response from searchAssets', async () => {
      const mockResponse = { hits: { results: [{ id: 'asset1' }] }, facets: [] };
      mockContentAIClient.searchAssets.mockResolvedValue(mockResponse);

      const result = await client.searchAssetsInCollection('', { collectionId: 'col1' });

      expect(result).toEqual(mockResponse);
    });

    it('should wrap Error in descriptive message', async () => {
      mockContentAIClient.searchAssets.mockRejectedValue(new Error('API error'));

      await expect(
        client.searchAssetsInCollection('', { collectionId: 'col1' }),
      ).rejects.toThrow('Failed to search assets in collection: API error');
    });

    it('should re-throw non-Error exceptions', async () => {
      mockContentAIClient.searchAssets.mockRejectedValue({ code: 500 });

      await expect(
        client.searchAssetsInCollection('', { collectionId: 'col1' }),
      ).rejects.toEqual({ code: 500 });
    });
  });

  describe('transformSearchHitToAsset', () => {
    it('should transform hit with full metadata', () => {
      const hit = {
        assetId: 'urn:aaid:aem:123',
        assetMetadata: {
          'dc:title': 'Asset Title',
        },
        repositoryMetadata: {
          'repo:name': 'file.jpg',
          'repo:repositoryId': 'repo-123',
          'dc:format': 'image/jpeg',
        },
      };

      const result = client.transformSearchHitToAsset(hit);

      expect(result).toEqual({
        assetId: 'urn:aaid:aem:123',
        id: 'urn:aaid:aem:123',
        name: 'Asset Title',
        title: 'Asset Title',
        type: 'image/jpeg',
        repositoryId: 'repo-123',
        repoName: 'file.jpg',
        format: 'image/jpeg',
        _searchHit: hit,
      });
    });

    it('should fall back to repo:name when dc:title missing', () => {
      const hit = {
        assetId: 'urn:aaid:aem:456',
        assetMetadata: {},
        repositoryMetadata: {
          'repo:name': 'fallback-name.png',
        },
      };

      const result = client.transformSearchHitToAsset(hit);

      expect(result.name).toBe('fallback-name.png');
      expect(result.title).toBe('fallback-name.png');
    });

    it('should use default values when metadata missing', () => {
      const hit = {
        assetId: 'urn:aaid:aem:789',
      };

      const result = client.transformSearchHitToAsset(hit);

      expect(result.name).toBe('Untitled Asset');
      expect(result.title).toBe('Untitled Asset');
      expect(result.type).toBe('asset');
      expect(result.repositoryId).toBeUndefined();
      expect(result.repoName).toBeUndefined();
    });

    it('should handle empty metadata objects', () => {
      const hit = {
        assetId: 'test-id',
        assetMetadata: {},
        repositoryMetadata: {},
      };

      const result = client.transformSearchHitToAsset(hit);

      expect(result.assetId).toBe('test-id');
      expect(result.name).toBe('Untitled Asset');
      expect(result.type).toBe('asset');
    });

    it('should preserve original hit in _searchHit', () => {
      const hit = {
        assetId: 'preserve-test',
        customField: 'custom value',
      };

      const result = client.transformSearchHitToAsset(hit);

      // eslint-disable-next-line no-underscore-dangle
      expect(result._searchHit).toBe(hit);
      // eslint-disable-next-line no-underscore-dangle
      expect(result._searchHit.customField).toBe('custom value');
    });
  });

  describe('transformSearchResultsToInternal', () => {
    it('should transform complete search results', () => {
      const searchResponse = {
        hits: {
          results: [
            { assetId: 'asset1', assetMetadata: { 'dc:title': 'Asset 1' }, repositoryMetadata: {} },
            { assetId: 'asset2', assetMetadata: { 'dc:title': 'Asset 2' }, repositoryMetadata: {} },
          ],
        },
      };
      const collectionId = 'col-123';
      const collectionMetadata = {
        collectionMetadata: {
          title: 'My Collection',
          description: 'Collection description',
        },
        repositoryMetadata: {
          'repo:modifyDate': '2024-06-15T10:00:00Z',
          'repo:createDate': '2024-01-01T00:00:00Z',
          'repo:createdBy': 'user@example.com',
          'repo:modifiedBy': 'editor@example.com',
        },
      };

      const result = client.transformSearchResultsToInternal(
        searchResponse,
        collectionId,
        collectionMetadata,
      );

      expect(result.id).toBe('col-123');
      expect(result.name).toBe('My Collection');
      expect(result.description).toBe('Collection description');
      expect(result.lastUpdated).toBe('2024-06-15T10:00:00Z');
      expect(result.dateCreated).toBe('2024-01-01T00:00:00Z');
      expect(result.createdBy).toBe('user@example.com');
      expect(result.modifiedBy).toBe('editor@example.com');
      expect(result.contents).toHaveLength(2);
      expect(result.contents[0].assetId).toBe('asset1');
      expect(result.favorite).toBe(false);
      // eslint-disable-next-line no-underscore-dangle
      expect(result._searchData).toBe(searchResponse);
      // eslint-disable-next-line no-underscore-dangle
      expect(result._collectionMetadata).toBe(collectionMetadata);
    });

    it('should handle missing hits gracefully', () => {
      const searchResponse = {};
      const collectionId = 'col-empty';
      const collectionMetadata = {
        collectionMetadata: {},
        repositoryMetadata: {},
      };

      const result = client.transformSearchResultsToInternal(
        searchResponse,
        collectionId,
        collectionMetadata,
      );

      expect(result.contents).toEqual([]);
    });

    it('should use defaults when metadata missing', () => {
      const searchResponse = { hits: { results: [] } };
      const collectionId = 'col-defaults';
      const collectionMetadata = {};

      const result = client.transformSearchResultsToInternal(
        searchResponse,
        collectionId,
        collectionMetadata,
      );

      expect(result.name).toBe('Untitled Collection');
      expect(result.description).toBe('');
      expect(result.createdBy).toBe('');
      expect(result.modifiedBy).toBe('');
      // lastUpdated and dateCreated should have ISO date format
      expect(result.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should calculate dateLastUsed from modifyDate', () => {
      const modifyDate = '2024-06-15T10:00:00Z';
      const searchResponse = { hits: { results: [] } };
      const collectionMetadata = {
        collectionMetadata: {},
        repositoryMetadata: { 'repo:modifyDate': modifyDate },
      };

      const result = client.transformSearchResultsToInternal(
        searchResponse,
        'col-date',
        collectionMetadata,
      );

      expect(result.dateLastUsed).toBe(new Date(modifyDate).getTime());
    });

    it('should transform all hits through transformSearchHitToAsset', () => {
      const searchResponse = {
        hits: {
          results: [
            { assetId: 'a1' },
            { assetId: 'a2' },
            { assetId: 'a3' },
          ],
        },
      };

      const result = client.transformSearchResultsToInternal(
        searchResponse,
        'col-transform',
        { collectionMetadata: {}, repositoryMetadata: {} },
      );

      expect(result.contents).toHaveLength(3);
      expect(result.contents[0].assetId).toBe('a1');
      expect(result.contents[1].assetId).toBe('a2');
      expect(result.contents[2].assetId).toBe('a3');
      // Each should have the standard transformed structure
      result.contents.forEach((asset) => {
        expect(asset).toHaveProperty('id');
        expect(asset).toHaveProperty('name');
        expect(asset).toHaveProperty('_searchHit');
      });
    });
  });
});
