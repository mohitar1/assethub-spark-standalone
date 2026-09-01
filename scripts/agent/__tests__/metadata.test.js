import { describe, it, expect } from 'vitest';
import { getAssetMetadata, isAlreadyEnriched, fieldsFromMetadata } from '../metadata.js';
import { makeRes, makeClient } from './helpers.js';

describe('metadata', () => {
  describe('getAssetMetadata', () => {
    it('returns metadata plus the ETag header', async () => {
      const res = makeRes({
        body: { assetMetadata: { 'dc:title': 'A' }, repositoryMetadata: { 'dc:format': 'image/jpeg' } },
        headers: { ETag: '"v1"' },
      });
      const client = makeClient([res]);
      const out = await getAssetMetadata(client, 'asset-1');
      expect(out.etag).toBe('"v1"');
      expect(out.assetMetadata['dc:title']).toBe('A');
      expect(out.repositoryMetadata['dc:format']).toBe('image/jpeg');
    });

    it('throws on non-ok responses', async () => {
      const client = makeClient([makeRes({ status: 404, body: 'nope' })]);
      await expect(getAssetMetadata(client, 'x')).rejects.toThrow(/404/);
    });
  });

  describe('isAlreadyEnriched', () => {
    it('is true when company matches and a title is present', () => {
      expect(isAlreadyEnriched({
        company: 'santander',
        'dc:title': 'A',
        'dam:status': 'approved',
        allowedCountries: 'global',
      }, 'santander')).toBe(true);
    });
    it('is false when company differs', () => {
      expect(isAlreadyEnriched({ company: 'acme', 'dc:title': 'A' }, 'santander')).toBe(false);
    });
    it('is false when title missing/empty', () => {
      expect(isAlreadyEnriched({ company: 'santander', 'dc:title': '' }, 'santander')).toBe(false);
      expect(isAlreadyEnriched({ company: 'santander' }, 'santander')).toBe(false);
    });
    it('requires the stored category to match the current vocab when one is provided', () => {
      const metadata = {
        company: 'santander',
        'dc:title': 'Existing',
        'dam:status': 'approved',
        allowedCountries: 'global',
        productCategory: 'coffee',
      };
      expect(isAlreadyEnriched(metadata, 'santander', {
        productCategoryVocab: ['hatchback', 'sedan', 'suv'],
      })).toBe(false);
      expect(isAlreadyEnriched(metadata, 'santander', {
        productCategoryVocab: ['coffee', 'machine'],
      })).toBe(true);
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
