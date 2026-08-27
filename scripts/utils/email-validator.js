/**
 * Email validation utilities (frontend).
 * Cleaning and validating email addresses for forms and UI.
 */

/** Basic email validation: user@domain.tld */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split pattern: comma, semicolon, whitespace, newline */
const EMAIL_INPUT_SPLIT = /[,;\s\n]+/;

/**
 * Parse a single input string into email-like tokens (trimmed, non-empty).
 * Use with cleanAndValidateEmails to get validated emails.
 * @param {string} value - Raw input (e.g. textarea value)
 * @returns {string[]} Array of trimmed non-empty tokens
 */
export function parseEmailInput(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }
  return value
    .split(EMAIL_INPUT_SPLIT)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

/**
 * Clean email: lowercase, trim, remove trailing punctuation/whitespace.
 * @param {string} email - Email address to clean
 * @returns {string} Cleaned email (or '' if invalid input)
 */
export function cleanEmail(email) {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email
    .toLowerCase()
    .trim()
    .replace(/[;,\s]+$/, '');
}

/**
 * Validate email format.
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email);
}

/**
 * Clean and validate; returns cleaned string or null if invalid.
 * @param {string} email - Email address to clean and validate
 * @param {Object} [options] - Options
 * @param {boolean} [options.warnOnInvalid=false] - Log warning for invalid emails
 * @param {string} [options.context=''] - Context for warning message
 * @returns {string|null} Cleaned email if valid, null if invalid
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
      const suffix = cleaned !== email ? ` (cleaned: "${cleaned}")` : '';
      // eslint-disable-next-line no-console
      console.warn(`${contextMsg}Invalid email address: "${email}"${suffix}`);
    }
    return null;
  }

  return cleaned;
}

/**
 * Clean and validate an array of emails; returns only valid, cleaned addresses.
 * @param {string[]} emails - Array of email addresses
 * @param {Object} [options] - Same options as cleanAndValidateEmail
 * @returns {string[]} Array of cleaned valid emails
 */
export function cleanAndValidateEmails(emails, options = {}) {
  if (!Array.isArray(emails)) {
    return [];
  }
  return emails
    .map((e) => cleanAndValidateEmail(e, options))
    .filter((e) => e !== null);
}
