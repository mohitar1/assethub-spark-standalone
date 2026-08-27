import { describe, expect, it } from 'vitest';
import { convertRows, convertToMap, handleArrays } from '../helixutil.js';

describe('helixutil', () => {
  describe('handleArrays', () => {
    it('should split comma-separated string into array', () => {
      const obj = { tags: 'one, two, three' };
      handleArrays(obj, ['tags']);

      expect(obj.tags).toEqual(['one', 'two', 'three']);
    });

    it('should trim whitespace from array items', () => {
      const obj = { tags: '  one  ,  two  ,  three  ' };
      handleArrays(obj, ['tags']);

      expect(obj.tags).toEqual(['one', 'two', 'three']);
    });

    it('should set empty array for missing field', () => {
      const obj = { name: 'test' };
      handleArrays(obj, ['tags']);

      expect(obj.tags).toEqual([]);
    });

    it('should handle multiple array fields', () => {
      const obj = { tags: 'a,b', categories: 'x,y,z' };
      handleArrays(obj, ['tags', 'categories']);

      expect(obj.tags).toEqual(['a', 'b']);
      expect(obj.categories).toEqual(['x', 'y', 'z']);
    });

    it('should handle null arrays parameter', () => {
      const obj = { tags: 'a,b' };
      handleArrays(obj, null);

      expect(obj.tags).toBe('a,b'); // unchanged
    });

    it('should handle undefined arrays parameter', () => {
      const obj = { tags: 'a,b' };
      handleArrays(obj, undefined);

      expect(obj.tags).toBe('a,b'); // unchanged
    });
  });

  describe('convertToMap', () => {
    it('should convert rows to map by key field', () => {
      const rows = [
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' },
      ];

      const result = convertToMap(rows, { key: 'id' });

      expect(result).toEqual({
        a: { id: 'a', name: 'Alice' },
        b: { id: 'b', name: 'Bob' },
      });
    });

    it('should extract specific value field when specified', () => {
      const rows = [
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' },
      ];

      const result = convertToMap(rows, { key: 'id', value: 'name' });

      expect(result).toEqual({
        a: 'Alice',
        b: 'Bob',
      });
    });

    it('should process array fields in values', () => {
      const rows = [
        { id: 'a', tags: 'one,two' },
        { id: 'b', tags: 'three,four' },
      ];

      const result = convertToMap(rows, { key: 'id', arrays: ['tags'] });

      expect(result.a.tags).toEqual(['one', 'two']);
      expect(result.b.tags).toEqual(['three', 'four']);
    });

    it('should handle empty rows array', () => {
      const result = convertToMap([], { key: 'id' });
      expect(result).toEqual({});
    });

    it('should handle null rows', () => {
      const result = convertToMap(null, { key: 'id' });
      expect(result).toEqual({});
    });

    it('should handle undefined rows', () => {
      const result = convertToMap(undefined, { key: 'id' });
      expect(result).toEqual({});
    });
  });

  describe('convertRows', () => {
    it('should process array fields in each row', () => {
      const rows = [
        { id: 'a', tags: 'one,two' },
        { id: 'b', tags: 'three,four' },
      ];

      const result = convertRows(rows, { arrays: ['tags'] });

      expect(result[0].tags).toEqual(['one', 'two']);
      expect(result[1].tags).toEqual(['three', 'four']);
    });

    it('should return same array reference', () => {
      const rows = [{ id: 'a' }];
      const result = convertRows(rows, { arrays: [] });

      expect(result).toBe(rows);
    });

    it('should handle empty rows array', () => {
      const result = convertRows([], { arrays: ['tags'] });
      expect(result).toEqual([]);
    });

    it('should handle null rows', () => {
      const result = convertRows(null, { arrays: ['tags'] });
      expect(result).toEqual([]);
    });

    it('should handle undefined rows', () => {
      const result = convertRows(undefined, { arrays: ['tags'] });
      expect(result).toEqual([]);
    });

    it('should handle missing array fields gracefully', () => {
      const rows = [{ id: 'a', name: 'Alice' }];
      const result = convertRows(rows, { arrays: ['tags'] });

      expect(result[0].tags).toEqual([]);
      expect(result[0].name).toBe('Alice');
    });
  });
});
