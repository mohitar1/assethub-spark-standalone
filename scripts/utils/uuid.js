/**
 * UUID generation utilities
 * Shared across frontend components for generating unique identifiers
 */

/**
 * Generate a UUID v4 string
 * Uses crypto.randomUUID() if available (modern browsers), with fallback for older browsers
 *
 * @returns {string} UUID v4 string (e.g., '550e8400-e29b-41d4-a716-446655440000')
 *
 * @example
 * const id = generateUUID();
 * console.log(id); // '550e8400-e29b-41d4-a716-446655440000'
 */
export function generateUUID() {
  // Use native crypto.randomUUID if available (modern browsers, Workers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers - generates RFC 4122 compliant UUID v4
  // Bitwise operations are intentional for UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate if a string is a valid UUID v4 format
 *
 * @param {string} uuid - String to validate
 * @returns {boolean} True if valid UUID v4 format
 *
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUUID('not-a-uuid'); // false
 */
export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
}
