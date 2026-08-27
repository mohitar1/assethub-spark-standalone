import { describe, it, expect } from 'vitest';
import { transformApiCollectionToInternal } from '../collections-utils.js';

describe('collections-utils', () => {
  describe('transformApiCollectionToInternal', () => {
    it('should return null for null input', () => {
      expect(transformApiCollectionToInternal(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(transformApiCollectionToInternal(undefined)).toBeNull();
    });

    it('should transform basic collection', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {
          title: 'My Collection',
          description: 'A test collection',
        },
        repositoryMetadata: {
          'repo:modifyDate': '2024-01-15T10:00:00Z',
          'repo:createDate': '2024-01-01T10:00:00Z',
          'repo:createdBy': 'user@example.com',
          'repo:modifiedBy': 'user@example.com',
        },
        itemCount: 5,
      };

      const result = transformApiCollectionToInternal(apiCollection);

      expect(result.id).toBe('col-123');
      expect(result.name).toBe('My Collection');
      expect(result.description).toBe('A test collection');
      expect(result.itemCount).toBe(5);
      expect(result.createdBy).toBe('user@example.com');
      expect(result.modifiedBy).toBe('user@example.com');
      expect(result.lastUpdated).toBe('2024-01-15T10:00:00Z');
      expect(result.dateCreated).toBe('2024-01-01T10:00:00Z');
    });

    it('should use fallback id field', () => {
      const apiCollection = {
        id: 'fallback-id',
        collectionMetadata: { title: 'Test' },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.id).toBe('fallback-id');
    });

    it('should use dam:collectionTitle as fallback for name', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {
          'dam:collectionTitle': 'DAM Collection Title',
        },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.name).toBe('DAM Collection Title');
    });

    it('should default to "Untitled Collection" when no title', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {},
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.name).toBe('Untitled Collection');
    });

    it('should use dam:collectionDescription as fallback', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {
          title: 'Test',
          'dam:collectionDescription': 'DAM description',
        },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.description).toBe('DAM description');
    });

    it('should handle Algolia hyphen format for repo metadata', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: { title: 'Test' },
        repositoryMetadata: {
          'repo-modifyDate': '2024-01-15T10:00:00Z',
          'repo-createDate': '2024-01-01T10:00:00Z',
          'repo-createdBy': 'algolia-user@example.com',
          'repo-modifiedBy': 'algolia-user@example.com',
        },
      };

      const result = transformApiCollectionToInternal(apiCollection);

      expect(result.lastUpdated).toBe('2024-01-15T10:00:00Z');
      expect(result.dateCreated).toBe('2024-01-01T10:00:00Z');
      expect(result.createdBy).toBe('algolia-user@example.com');
    });

    it('should fallback to jcr:lastModified for modifyDate', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {
          title: 'Test',
          'jcr:lastModified': '2024-01-15T10:00:00Z',
        },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.lastUpdated).toBe('2024-01-15T10:00:00Z');
    });

    it('should extract custom:acl from nested metadata', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {
          title: 'Test',
          'custom:metadata': {
            'custom:acl': ['user1', 'user2'],
          },
        },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.acl).toEqual(['user1', 'user2']);
    });

    it('should set default accessLevel to private', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: { title: 'Test' },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.accessLevel).toBe('private');
    });

    it('should preserve custom accessLevel', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {
          title: 'Test',
          accessLevel: 'public',
        },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.accessLevel).toBe('public');
    });

    it('should default itemCount to 0', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: { title: 'Test' },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.itemCount).toBe(0);
    });

    it('should include thumbnailUrl', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {
          title: 'Test',
          'dam:thumbnailUrl': 'https://example.com/thumb.jpg',
        },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.thumbnailUrl).toBe('https://example.com/thumb.jpg');
    });

    it('should calculate dateLastUsed from modifyDate', () => {
      const modifyDate = '2024-01-15T10:00:00Z';
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: { title: 'Test' },
        repositoryMetadata: { 'repo:modifyDate': modifyDate },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.dateLastUsed).toBe(new Date(modifyDate).getTime());
    });

    it('should initialize with empty contents and favorite false', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: { title: 'Test' },
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.contents).toEqual([]);
      expect(result.favorite).toBe(false);
    });

    it('should preserve original API data', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: { title: 'Test' },
        customField: 'custom value',
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.apiData).toBe(apiCollection);
    });

    it('should handle empty metadata objects', () => {
      const apiCollection = {
        collectionId: 'col-123',
        collectionMetadata: {},
        repositoryMetadata: {},
      };

      const result = transformApiCollectionToInternal(apiCollection);
      expect(result.id).toBe('col-123');
      expect(result.name).toBe('Untitled Collection');
      expect(result.description).toBe('');
    });
  });
});
