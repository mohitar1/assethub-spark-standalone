/**
 * Unit tests for resource-type-detector.js
 */

import { describe, it, expect } from 'vitest';
import { detectResourceType } from '../resource-type-detector.js';
import { RESOURCE_TYPES } from '../analytics-constants.js';

describe('detectResourceType', () => {
  describe('XML filename detection', () => {
    it('detects template from .xml extension', () => {
      const asset = { name: 'template.xml' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('XML filename');
    });

    it('detects template from uppercase .XML extension', () => {
      const asset = { name: 'template.XML' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('XML filename');
    });

    it('detects template from mixed case extension', () => {
      const asset = { name: 'template.XmL' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('XML filename');
    });

    it('does not detect template from non-xml extension', () => {
      const asset = { name: 'image.jpg' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).not.toContain('XML filename');
    });
  });

  describe('contentType metadata detection', () => {
    it('detects template from contentType containing "template"', () => {
      const asset = { contentType: 'chili-template' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('contentType metadata');
    });

    it('detects template from contentType with uppercase TEMPLATE', () => {
      const asset = { contentType: 'TEMPLATE' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('contentType metadata');
    });

    it('detects template from contentType with mixed case', () => {
      const asset = { contentType: 'TeMpLaTe' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('contentType metadata');
    });

    it('does not detect template from non-template contentType', () => {
      const asset = { contentType: 'image/jpeg' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).not.toContain('contentType metadata');
    });
  });

  describe('category detection (legacy fallback)', () => {
    it('detects template from category containing "template"', () => {
      const asset = { category: 'Marketing Template' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('category');
    });

    it('detects template from category with uppercase TEMPLATE', () => {
      const asset = { category: 'TEMPLATE' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('category');
    });

    it('does not detect template from non-template category', () => {
      const asset = { category: 'Images' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).not.toContain('category');
    });
  });

  describe('multiple detection methods', () => {
    it('detects template with all three methods', () => {
      const asset = {
        name: 'template.xml',
        contentType: 'chili-template',
        category: 'Marketing Template',
      };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toHaveLength(3);
      expect(result.reasons).toContain('XML filename');
      expect(result.reasons).toContain('contentType metadata');
      expect(result.reasons).toContain('category');
    });

    it('detects template with only XML filename', () => {
      const asset = {
        name: 'template.xml',
        contentType: 'image/jpeg',
        category: 'Images',
      };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons).toContain('XML filename');
    });

    it('detects template with only contentType', () => {
      const asset = {
        name: 'file.jpg',
        contentType: 'template',
        category: 'Images',
      };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons).toContain('contentType metadata');
    });

    it('detects template with only category', () => {
      const asset = {
        name: 'file.jpg',
        contentType: 'image/jpeg',
        category: 'Template Assets',
      };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons).toContain('category');
    });
  });

  describe('asset detection (default)', () => {
    it('returns asset when no template indicators present', () => {
      const asset = {
        name: 'image.jpg',
        contentType: 'image/jpeg',
        category: 'Photos',
      };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).toHaveLength(0);
    });

    it('returns asset for empty object', () => {
      const asset = {};
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).toHaveLength(0);
    });

    it('returns asset for null', () => {
      const result = detectResourceType(null);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).toHaveLength(0);
    });

    it('returns asset for undefined', () => {
      const result = detectResourceType(undefined);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles asset with only name field', () => {
      const asset = { name: 'template.xml' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('XML filename');
    });

    it('handles asset with missing name but has contentType', () => {
      const asset = { contentType: 'template' };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.TEMPLATE);
      expect(result.reasons).toContain('contentType metadata');
    });

    it('handles asset with undefined fields', () => {
      const asset = { name: undefined, contentType: undefined, category: undefined };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).toHaveLength(0);
    });

    it('handles asset with null fields', () => {
      const asset = { name: null, contentType: null, category: null };
      const result = detectResourceType(asset);
      expect(result.type).toBe(RESOURCE_TYPES.ASSET);
      expect(result.reasons).toHaveLength(0);
    });
  });
});
