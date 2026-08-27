import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

// collections-utils reads window.user — stub it before importing
vi.stubGlobal('window', { user: { email: 'owner@example.com' } });

const { mergeCollectionSegments } = await import('../add-to-collection-modal.js');

// Minimal raw API hit that transformApiCollectionToInternal can consume
function makeHit(id, title = `Collection ${id}`) {
  return {
    collectionId: id,
    collectionMetadata: { title },
    repositoryMetadata: {},
  };
}

describe('mergeCollectionSegments', () => {
  let seen;

  beforeEach(() => {
    seen = new Set();
  });

  it('returns empty array when both segments are empty', () => {
    expect(mergeCollectionSegments([], [], seen)).toEqual([]);
  });

  it('transforms and returns items from the createdByMe segment', () => {
    const result = mergeCollectionSegments([makeHit('a'), makeHit('b')], [], seen);
    expect(result.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('transforms and returns items from the public segment', () => {
    const result = mergeCollectionSegments([], [makeHit('x'), makeHit('y')], seen);
    expect(result.map((c) => c.id)).toEqual(['x', 'y']);
  });

  it('deduplicates when the same id appears in both segments', () => {
    const result = mergeCollectionSegments([makeHit('dup')], [makeHit('dup')], seen);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dup');
  });

  it('createdByMe items appear before public items in output', () => {
    const result = mergeCollectionSegments([makeHit('mine')], [makeHit('pub')], seen);
    expect(result.map((c) => c.id)).toEqual(['mine', 'pub']);
  });

  it('filters out ids already in the seen set', () => {
    seen.add('existing');
    const result = mergeCollectionSegments([makeHit('existing'), makeHit('new')], [], seen);
    expect(result.map((c) => c.id)).toEqual(['new']);
  });

  it('adds new ids to the seen set', () => {
    mergeCollectionSegments([makeHit('a')], [makeHit('b')], seen);
    expect(seen.has('a')).toBe(true);
    expect(seen.has('b')).toBe(true);
  });

  it('handles load-more dedup: ids from first page are already in seen', () => {
    seen.add('a');
    seen.add('b');
    const result = mergeCollectionSegments([makeHit('b'), makeHit('c')], [], seen);
    expect(result.map((c) => c.id)).toEqual(['c']);
  });
});
