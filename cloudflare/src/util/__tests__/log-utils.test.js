import { describe, expect, it } from 'vitest';
import { maskEmail } from '../log-utils.js';

describe('log-utils', () => {
  describe('maskEmail', () => {
    it('masks the local part keeping only the first character and domain', () => {
      expect(maskEmail('john.smith@example.com')).toBe('j***@example.com');
    });

    it('works for short local parts (single char)', () => {
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('returns (none) for empty string', () => {
      expect(maskEmail('')).toBe('(none)');
    });

    it('returns (none) for undefined', () => {
      expect(maskEmail(undefined)).toBe('(none)');
    });

    it('returns (none) for null', () => {
      expect(maskEmail(null)).toBe('(none)');
    });

    it('returns *** when email starts with @ (no local part)', () => {
      expect(maskEmail('@nodomain.com')).toBe('***');
    });

    it('preserves the full domain including subdomain', () => {
      expect(maskEmail('user@mail.example.com')).toBe('u***@mail.example.com');
    });

    it('handles email with no @ symbol gracefully', () => {
      expect(maskEmail('notanemail')).toBe('***');
    });
  });
});
