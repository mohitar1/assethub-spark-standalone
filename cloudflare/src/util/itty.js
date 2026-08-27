import { cors as ittyCors } from 'itty-router';

/**
 * Utility for itty-router cors() to configure an array of possible origins
 * where each entry can be a string, RegExp, or Function.
 *
 * Example usage:
 * ```
 * const { preflight, corsify } = cors({
 *   origin: allowOrigins(
 *     // string - exact match
 *     'https://example.com',
 *     // regular expression (make sure to end with $ to match the entire origin)
 *     /http:\/\/localhost:(3000|8787)$/,
 *     // function - custom check
 *     (origin) => origin.endsWith('foo.com')
 *   ),
 * });
 * ```
 *
 * @param {...string|RegExp|Function} allowedOrigins - The allowed origins
 * @returns {string|undefined} The allowed origin or undefined if not allowed
 */
function allowOrigins(...allowedOrigins) {
  return (origin) => {
    // iterate over the allowed origins
    if (!origin) {
      return undefined;
    }
    for (const allowed of allowedOrigins) {
      if (typeof allowed === 'string') {
        if (origin === allowed) {
          return origin;
        }
      } else if (allowed instanceof RegExp) {
        if (allowed.test(origin)) {
          return origin;
        }
      } else if (allowed instanceof Function) {
        if (allowed(origin)) {
          return origin;
        }
      }
    }
    return undefined;
  };
}

/**
 * Improved itty-router cors() to
 * 1. allow more flexible "origin' option: can be an array of strings, RegExps, or functions
 * 2. fixes "Can't modify immutable headers" issue (see https://github.com/kwhitley/itty-router/pull/268)
 *
 * @param {Object} options - itty-router cors() options
 * @returns {Object} - { preflight, corsify }
 */
export function cors(options) {
  // extra feature for more flexible origin handling
  options.origin = allowOrigins(...options.origin);

  const appendHeadersAndReturn = (response, headers) => {
    for (const [key, value] of Object.entries(headers)) {
      if (value) response.headers.append(key, value);
    }
    return response;
  };

  const getAccessControlOrigin = (request) => {
    const requestOrigin = request?.headers.get('origin');
    return options.origin(requestOrigin);
  };

  // fix taken from https://github.com/kwhitley/itty-router/pull/268
  // see also https://github.com/kwhitley/itty-router/issues/261
  const corsify = (response, request) => {
    // ignore if already has CORS headers
    if (response?.headers?.get('access-control-allow-origin') || response.status === 101) return response;

    return appendHeadersAndReturn(new Response(response.body, response), {
      'access-control-allow-origin': getAccessControlOrigin(request),
      'access-control-allow-credentials': options.credentials,
    });
  };

  return {
    preflight: ittyCors(options).preflight,
    corsify,
  };
}
