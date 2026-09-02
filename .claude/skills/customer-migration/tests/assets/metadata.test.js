import { describe, it, expect } from 'vitest';
import { isAlreadyEnriched, fieldsFromMetadata } from '../../scripts/assets/metadata.js';

describe('metadata', () => {
  describe('isAlreadyEnriched', () => {
    it('is true when company, title, visibility, and productCategory are present', () => {
      expect(isAlreadyEnriched({
        company: 'santander',
        'dc:title': 'A',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'products',
      }, 'santander')).toBe(true);
    });
    it('is false when company differs', () => {
      expect(isAlreadyEnriched({ company: 'acme', 'dc:title': 'A' }, 'santander')).toBe(false);
    });
    it('is false when title missing/empty', () => {
      expect(isAlreadyEnriched({ company: 'santander', 'dc:title': '' }, 'santander')).toBe(false);
      expect(isAlreadyEnriched({ company: 'santander' }, 'santander')).toBe(false);
    });
    it('is false when productCategory is missing', () => {
      expect(isAlreadyEnriched({
        company: 'santander',
        'dc:title': 'Existing',
        'dam:status': 'approved',
        allowedCountries: 'global',
      }, 'santander')).toBe(false);
    });
  });

  describe('fieldsFromMetadata', () => {
    it('recovers normalized report fields from existing metadata', () => {
      expect(fieldsFromMetadata({
        'dc:title': ' Existing ',
        'dc:description': 'Description',
        'dc:subject': ['swift', 'hatchback'],
        productCategory: 'hatchback',
        campaign: 'Launch',
        channel: 'web',
        brand: 'Maruti Suzuki',
      })).toEqual({
        title: 'Existing',
        description: 'Description',
        keywords: ['swift', 'hatchback'],
        productCategory: 'hatchback',
        campaign: 'Launch',
        channel: 'web',
        brand: 'Maruti Suzuki',
      });
    });
  });
});
