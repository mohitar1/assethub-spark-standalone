/* eslint-disable import/prefer-default-export */
/**
 * Utilities for safe, privacy-conscious log formatting.
 * More helpers will be added here as the module grows.
 */

/**
 * Mask an email address for safe logging — shows first char and domain only.
 * Prevents full email addresses from appearing in plain text in log streams.
 *
 * @param {string} email
 * @returns {string} e.g. "john.smith@example.com" → "j***@example.com"
 *
 * @example
 * maskEmail('john.smith@example.com') // 'j***@example.com'
 * maskEmail('a@b.com')                  // 'a***@b.com'
 * maskEmail('@nodomain')                // '***'
 * maskEmail('')                         // '(none)'
 * maskEmail(undefined)                  // '(none)'
 */
export function maskEmail(email) {
  if (!email) return '(none)';
  const atIdx = email.indexOf('@');
  if (atIdx <= 0) return '***';
  return `${email[0]}***${email.slice(atIdx)}`;
}
