/**
 * Shared API Client utilities
 * Common request handling for DynamicMedia and ContentAI clients
 */

/**
 * Generic request method using fetch API
 * @param {Object} config - Request configuration
 * @param {string} config.url - Request URL (without /api prefix)
 * @param {string} [config.method='GET'] - HTTP method
 * @param {Object} [config.data] - Request body data
 * @param {Object} [config.params] - URL query parameters
 * @param {Object} [config.headers={}] - Additional headers
 * @param {boolean} [config.allowUndefinedResponse=false] - Allow undefined response
 * @returns {Promise<*>} Response data
 */
export default async function makeRequest(config) {
  const {
    url,
    method = 'GET',
    data,
    params,
    headers = {},
    allowUndefinedResponse = false,
  } = config;

  try {
    const fetchHeaders = { ...headers };

    if (method === 'POST' || method === 'PUT') {
      fetchHeaders['Content-Type'] = 'application/json';
    }

    const fetchConfig = {
      method,
      headers: fetchHeaders,
    };

    if (data) {
      fetchConfig.body = JSON.stringify(data);
    }

    // Construct URL with params
    let fetchUrl = `/api${url}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        fetchUrl += `?${searchParams.toString()}`;
      }
    }

    const response = await fetch(fetchUrl, fetchConfig);

    if (!response.ok) {
      if (allowUndefinedResponse && response.status !== 200) {
        return undefined;
      }
      throw new Error(`Request failed: ${response.statusText}`);
    }

    // Handle different response types
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // Handle empty responses
    if (contentLength === '0' || response.status === 204) {
      return allowUndefinedResponse ? undefined : {};
    }

    // Handle JSON responses
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    // Handle text responses
    if (contentType && (contentType.includes('text/') || contentType.includes('application/text'))) {
      const text = await response.text();
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          return JSON.parse(text);
        } catch {
          return allowUndefinedResponse ? undefined : text;
        }
      }
      return allowUndefinedResponse ? undefined : text;
    }

    // For unknown content types, attempt JSON parsing
    try {
      return response.json();
    } catch {
      return allowUndefinedResponse ? undefined : {};
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Request failed');
  }
}
