/**
 * Email validation utilities
 * Provides functions for cleaning and validating email addresses
 */

/**
 * Basic email validation regex
 * Matches: user@domain.tld
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Clean email address by removing trailing punctuation and whitespace
 *
 * @param {string} email - Email address to clean
 * @returns {string} Cleaned email address (lowercase, trimmed, no trailing punctuation)
 *
 * @example
 * cleanEmail('User@Example.com; ') // 'user@example.com'
 * cleanEmail('test@test.com,') // 'test@test.com'
 */
export function cleanEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email
    .toLowerCase()
    .trim()
    .replace(/[;,\s]+$/, ''); // Remove trailing semicolons, commas, spaces
}

/**
 * Validate email address format
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid format
 *
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid@') // false
 * isValidEmail('no-at-sign.com') // false
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  return EMAIL_REGEX.test(email);
}

/**
 * Clean and validate email address
 * Returns cleaned email if valid, null if invalid
 *
 * @param {string} email - Email address to clean and validate
 * @param {Object} [options] - Options
 * @param {boolean} [options.warnOnInvalid=false] - Log warning for invalid emails
 * @param {string} [options.context=''] - Context for warning message
 * @returns {string|null} Cleaned email if valid, null if invalid
 *
 * @example
 * cleanAndValidateEmail('User@Example.com; ') // 'user@example.com'
 * cleanAndValidateEmail('invalid@', { warnOnInvalid: true }) // null (with warning)
 */
export function cleanAndValidateEmail(email, options = {}) {
  const { warnOnInvalid = false, context = '' } = options;

  if (!email || typeof email !== 'string') {
    return null;
  }

  const cleaned = cleanEmail(email);

  if (!isValidEmail(cleaned)) {
    if (warnOnInvalid) {
      const contextMsg = context ? `[${context}] ` : '';
      console.warn(
        `${contextMsg} Invalid email address: "${email}"${cleaned !== email ? ` (cleaned: "${cleaned}")` : ''}`,
      );
    }
    return null;
  }

  return cleaned;
}

/**
 * Clean and validate array of email addresses
 * Filters out invalid emails and returns cleaned valid ones
 *
 * @param {string[]} emails - Array of email addresses
 * @param {Object} [options] - Options
 * @param {boolean} [options.warnOnInvalid=false] - Log warning for invalid emails
 * @param {string} [options.context=''] - Context for warning messages
 * @returns {string[]} Array of cleaned valid emails
 *
 * @example
 * cleanAndValidateEmails(['User@Example.com;', 'invalid@', 'test@test.com'])
 * // ['user@example.com', 'test@test.com']
 */
export function cleanAndValidateEmails(emails, options = {}) {
  if (!Array.isArray(emails)) {
    return [];
  }

  return emails.map((email) => cleanAndValidateEmail(email, options)).filter((email) => email !== null);
}
