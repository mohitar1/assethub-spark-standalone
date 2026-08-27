/* eslint-env node */
import {
  describe, it, expect, vi,
} from 'vitest';
import {
  parseEmailInput,
  cleanEmail,
  isValidEmail,
  cleanAndValidateEmail,
  cleanAndValidateEmails,
} from '../email-validator.js';

describe('parseEmailInput', () => {
  it('should split by comma', () => {
    expect(parseEmailInput('a@b.com, c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('should split by semicolon', () => {
    expect(parseEmailInput('a@b.com; c@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('should split by whitespace and newline', () => {
    expect(parseEmailInput('a@b.com  c@d.com')).toEqual(['a@b.com', 'c@d.com']);
    expect(parseEmailInput('a@b.com\nc@d.com')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('should trim each token and filter empty', () => {
    expect(parseEmailInput('  a@b.com  ,  ,  c@d.com  ')).toEqual(['a@b.com', 'c@d.com']);
  });

  it('should return empty array for null/undefined', () => {
    expect(parseEmailInput(null)).toEqual([]);
    expect(parseEmailInput(undefined)).toEqual([]);
  });

  it('should return empty array for non-string input', () => {
    expect(parseEmailInput(123)).toEqual([]);
    expect(parseEmailInput([])).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(parseEmailInput('')).toEqual([]);
    expect(parseEmailInput('   , ; \n  ')).toEqual([]);
  });
});

describe('cleanEmail', () => {
  it('should convert to lowercase', () => {
    expect(cleanEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('should trim whitespace', () => {
    expect(cleanEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should remove trailing semicolons and commas', () => {
    expect(cleanEmail('user@example.com;')).toBe('user@example.com');
    expect(cleanEmail('user@example.com,')).toBe('user@example.com');
    expect(cleanEmail('user@example.com; ')).toBe('user@example.com');
  });

  it('should return empty string for null/undefined/non-string', () => {
    expect(cleanEmail(null)).toBe('');
    expect(cleanEmail(undefined)).toBe('');
    expect(cleanEmail(123)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('should accept valid email formats', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('no-at-sign.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe('cleanAndValidateEmail', () => {
  it('should clean and return valid email', () => {
    expect(cleanAndValidateEmail('User@Example.COM;')).toBe('user@example.com');
    expect(cleanAndValidateEmail('  test@test.com,  ')).toBe('test@test.com');
  });

  it('should return null for invalid email', () => {
    expect(cleanAndValidateEmail('invalid@')).toBe(null);
    expect(cleanAndValidateEmail('no-at-sign.com')).toBe(null);
    expect(cleanAndValidateEmail('')).toBe(null);
    expect(cleanAndValidateEmail(null)).toBe(null);
  });

  it('should not warn by default', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cleanAndValidateEmail('invalid@');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should warn when warnOnInvalid is true', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cleanAndValidateEmail('invalid@', { warnOnInvalid: true });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Invalid email address: "invalid@"'));
    warn.mockRestore();
  });

  it('should include context in warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cleanAndValidateEmail('invalid@', { warnOnInvalid: true, context: 'Share collection' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Share collection]'));
    warn.mockRestore();
  });
});

describe('cleanAndValidateEmails', () => {
  it('should clean and validate array, filter invalid', () => {
    const emails = ['User@Example.COM;', 'test@test.com', 'invalid@', 'another@valid.com,'];
    expect(cleanAndValidateEmails(emails)).toEqual([
      'user@example.com',
      'test@test.com',
      'another@valid.com',
    ]);
  });

  it('should return empty array for non-array input', () => {
    expect(cleanAndValidateEmails(null)).toEqual([]);
    expect(cleanAndValidateEmails(undefined)).toEqual([]);
    expect(cleanAndValidateEmails('string')).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(cleanAndValidateEmails([])).toEqual([]);
  });

  it('should pass options to cleanAndValidateEmail', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cleanAndValidateEmails(['valid@test.com', 'invalid@'], {
      warnOnInvalid: true,
      context: 'Test',
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[Test]'));
    warn.mockRestore();
  });
});

describe('parseEmailInput + cleanAndValidateEmails (share flow)', () => {
  it('should parse textarea value and return only valid emails', () => {
    const raw = 'user1@example.com, user2@test.com; invalid@\n  user3@co.uk  ';
    const tokens = parseEmailInput(raw);
    const valid = cleanAndValidateEmails(tokens);
    expect(tokens).toEqual(['user1@example.com', 'user2@test.com', 'invalid@', 'user3@co.uk']);
    expect(valid).toEqual([
      'user1@example.com',
      'user2@test.com',
      'user3@co.uk',
    ]);
  });
});
