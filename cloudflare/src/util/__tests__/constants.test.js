import { describe, expect, it } from 'vitest';
import { ASSET_URN_PREFIX, stripAssetUrn } from '../constants.js';

describe('ASSET_URN_PREFIX', () => {
  it('is the expected URN prefix string', () => {
    expect(ASSET_URN_PREFIX).toBe('urn:aaid:aem:');
  });
});

describe('stripAssetUrn', () => {
  it('strips the urn:aaid:aem: prefix from a full URN', () => {
    expect(stripAssetUrn('urn:aaid:aem:7c2eb8e8-7c55-4484-b236-bc9ccdb7117a')).toBe(
      '7c2eb8e8-7c55-4484-b236-bc9ccdb7117a',
    );
  });

  it('returns a bare UUID unchanged', () => {
    const uuid = '7c2eb8e8-7c55-4484-b236-bc9ccdb7117a';
    expect(stripAssetUrn(uuid)).toBe(uuid);
  });

  it('returns an empty string for null', () => {
    expect(stripAssetUrn(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(stripAssetUrn(undefined)).toBe('');
  });

  it('returns an empty string for empty string', () => {
    expect(stripAssetUrn('')).toBe('');
  });

  it('does not strip unrelated URN-like strings', () => {
    expect(stripAssetUrn('urn:other:prefix:abc')).toBe('urn:other:prefix:abc');
  });

  it('handles prefix-only string (no UUID after prefix)', () => {
    expect(stripAssetUrn('urn:aaid:aem:')).toBe('');
  });
});
