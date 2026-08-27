import { describe, expect, it, vi } from 'vitest';
import { cleanAndValidateEmail, cleanAndValidateEmails, cleanEmail, isValidEmail } from '../email-validator.js';

describe('cleanEmail', () => {
  it('should convert to lowercase', () => {
    expect(cleanEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('should trim whitespace', () => {
    expect(cleanEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should remove trailing semicolons', () => {
    expect(cleanEmail('user@example.com;')).toBe('user@example.com');
    expect(cleanEmail('user@example.com;;')).toBe('user@example.com');
  });

  it('should remove trailing commas', () => {
    expect(cleanEmail('user@example.com,')).toBe('user@example.com');
    expect(cleanEmail('user@example.com,,')).toBe('user@example.com');
  });

  it('should remove trailing spaces after punctuation', () => {
    expect(cleanEmail('user@example.com; ')).toBe('user@example.com');
    expect(cleanEmail('user@example.com,  ')).toBe('user@example.com');
  });

  it('should handle combination of issues', () => {
    expect(cleanEmail('  User@Example.COM;, ')).toBe('user@example.com');
  });

  it('should return empty string for null/undefined', () => {
    expect(cleanEmail(null)).toBe('');
    expect(cleanEmail(undefined)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(cleanEmail(123)).toBe('');
    expect(cleanEmail({})).toBe('');
  });
});

describe('isValidEmail', () => {
  it('should validate correct email formats', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user_name@example-domain.com')).toBe(true);
  });

  it('should reject emails without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('should reject emails without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('should reject emails without TLD', () => {
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('should reject emails with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
    expect(isValidEmail('user@ example.com')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });

  it('should reject non-string input', () => {
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail({})).toBe(false);
  });
});

describe('cleanAndValidateEmail', () => {
  it('should clean and validate correct emails', () => {
    expect(cleanAndValidateEmail('User@Example.COM;')).toBe('user@example.com');
    expect(cleanAndValidateEmail('  test@test.com,  ')).toBe('test@test.com');
  });

  it('should return null for invalid emails', () => {
    expect(cleanAndValidateEmail('invalid@')).toBe(null);
    expect(cleanAndValidateEmail('no-at-sign.com')).toBe(null);
    expect(cleanAndValidateEmail('')).toBe(null);
  });

  it('should not warn by default for invalid emails', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanAndValidateEmail('invalid@');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should warn when warnOnInvalid is true', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanAndValidateEmail('invalid@', { warnOnInvalid: true });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid email address: "invalid@"'));
    consoleSpy.mockRestore();
  });

  it('should include context in warning message', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanAndValidateEmail('invalid@', {
      warnOnInvalid: true,
      context: 'Rights Requests',
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Rights Requests]'));
    consoleSpy.mockRestore();
  });

  it('should show cleaned email in warning if different', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanAndValidateEmail('Invalid@;', { warnOnInvalid: true });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('(cleaned: "invalid@")'));
    consoleSpy.mockRestore();
  });
});

describe('cleanAndValidateEmails', () => {
  it('should clean and validate array of emails', () => {
    const emails = ['User@Example.COM;', 'test@test.com', 'invalid@', 'another@valid.com,'];

    const result = cleanAndValidateEmails(emails);

    expect(result).toEqual(['user@example.com', 'test@test.com', 'another@valid.com']);
  });

  it('should return empty array for non-array input', () => {
    expect(cleanAndValidateEmails(null)).toEqual([]);
    expect(cleanAndValidateEmails(undefined)).toEqual([]);
    expect(cleanAndValidateEmails('not an array')).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(cleanAndValidateEmails([])).toEqual([]);
  });

  it('should filter out all invalid emails', () => {
    const emails = ['invalid@', 'no-at-sign.com', ''];

    expect(cleanAndValidateEmails(emails)).toEqual([]);
  });

  it('should pass options to cleanAndValidateEmail', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const emails = ['valid@test.com', 'invalid@'];
    cleanAndValidateEmails(emails, {
      warnOnInvalid: true,
      context: 'Test Context',
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Test Context]'));
    consoleSpy.mockRestore();
  });
});

describe('Real-world scenarios', () => {
  it('should handle permissions sheet email with semicolon', () => {
    const email = 'sstults@example.com;';

    expect(cleanAndValidateEmail(email)).toBe('sstults@example.com');
  });

  it('should handle copy-pasted email list', () => {
    const emails = ['user1@example.com;', 'user2@example.com,', '  user3@example.com  ', 'User4@Example.COM'];

    const result = cleanAndValidateEmails(emails);

    expect(result).toEqual(['user1@example.com', 'user2@example.com', 'user3@example.com', 'user4@example.com']);
  });

  it('should reject malformed emails from permissions sheet', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const emails = ['valid@example.com', 'invalid@', '@domain.com', 'no-domain@', 'good.user@company.com;'];

    const result = cleanAndValidateEmails(emails, {
      warnOnInvalid: true,
      context: 'Permissions',
    });

    expect(result).toEqual(['valid@example.com', 'good.user@company.com']);

    expect(consoleSpy).toHaveBeenCalledTimes(3); // 3 invalid emails
    consoleSpy.mockRestore();
  });
});
