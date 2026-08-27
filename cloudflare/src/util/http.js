import { jwtVerify, SignJWT } from 'jose';

/**
 * Sets an HTTP cookie on the response with security-first defaults.
 *
 * @param {Response} response - The HTTP response object to set the cookie on
 * @param {string} name - The name of the cookie
 * @param {string} value - The value of the cookie
 * @param {Object} options - Cookie configuration options
 * @param {string} [options.Domain] - The domain scope for the cookie (optional)
 * @param {string} [options.Path='/'] - The path scope for the cookie (defaults to '/')
 * @param {boolean} [options.HttpOnly=true] - Whether the cookie should be HttpOnly (defaults to true)
 * @param {boolean} [options.Secure=true] - Whether the cookie should be sent only over HTTPS (defaults to true)
 * @param {string|boolean} [options.SameSite='Strict'] - SameSite attribute for CSRF protection, use false to omit (defaults to 'Strict')
 * @param {string} [options.Expires] - Expiration date string for the cookie (optional)
 * @param {string} [options.MaxAge] - Max age in seconds for the cookie (optional)
 * @param {string} [options.Partitioned] - Whether the cookie should be partitioned (optional)
 *
 * @example
 * // Set a secure session cookie
 * setCookie(response, 'session', 'abc123', {
 *   Path: '/',
 *   SameSite: 'Lax'
 * });
 *
 * @example
 * // Set a cookie with custom expiration
 * setCookie(response, 'preference', 'darkmode', {
 *   Expires: 'Thu, 01 Jan 2025 00:00:00 GMT'
 * });
 */
export function setCookie(response, name, value, options = {}) {
  response.headers.append(
    'Set-Cookie',
    `${name}=${value}; ` +
      `${options.Domain ? `Domain=${options.Domain}; ` : ''}` +
      `Path=${options.Path || '/'};` +
      // use HttpOnly and Secure by default
      `${options.HttpOnly === false ? '' : ' HttpOnly;'}` +
      `${options.Secure === false ? '' : ' Secure;'} ` +
      `${options.SameSite === false ? '' : `SameSite=${options.SameSite || 'Strict'};`}` +
      `${options.Expires ? ` Expires=${options.Expires};` : ''}` +
      `${options.MaxAge ? ` Max-Age=${options.MaxAge};` : ''}` +
      `${options.Partitioned ? ` Partitioned;` : ''}`,
  );
}

/**
 * Deletes an HTTP cookie on the response.
 *
 * @param {Response} response - The HTTP response object to delete the cookie on
 * @param {string} name - The name of the cookie to delete
 *
 * @example
 * // Delete a cookie
 * deleteCookie(response, 'session');
 */
export function deleteCookie(response, name) {
  setCookie(response, name, '', {
    Path: '/',
    Secure: false,
    SameSite: false,
    Expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
  });
}

export async function createSignedCookie(response, secret, name, payload, options = {}) {
  const key = new TextEncoder().encode(secret);

  const jwt = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(key);

  setCookie(response, name, jwt, options);
}

export async function validateSignedCookie(request, secret, name) {
  const jwt = request.cookies[name];
  if (!jwt) {
    request.error = `No signed cookie '${name}' found`;
    return null;
  }

  try {
    const key = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(jwt, key);
    return payload;
  } catch (error) {
    request.error = `Error validating signed cookie '${name}': ${error.message}`;
    return null;
  }
}

export function isValidUrl(url) {
  try {
    return new URL(url);
  } catch (_) {
    return null;
  }
}
