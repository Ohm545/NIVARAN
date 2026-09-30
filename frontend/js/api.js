/**
 * NIVARAN — Centralised API Layer
 *
 * All fetch() calls go through this file.
 * Never call fetch() directly in page or component files.
 */

const BASE_URL = '/api';

/**
 * Custom error class that carries the HTTP status code.
 * Allows callers to distinguish 401, 403, 404, 422, 500 etc.
 */
export class ApiError extends Error {
  constructor(message, status, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields; // validation field errors from 422
  }
}

/**
 * Core request wrapper.
 * @param {string} path        - API path, e.g. '/auth/login'
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>}     - Parsed JSON data field
 */
async function request(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Network error. Please check your connection.', 0);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(`Server error (${response.status}).`, response.status);
  }

  if (!response.ok) {
    const message = json?.error?.message || `HTTP error ${response.status}`;
    const fields  = json?.error?.fields  || null;

    // Auto-redirect on 401 (session expired) — except on the login page
    if (response.status === 401 && !window.location.pathname.endsWith('login.html')) {
      localStorage.removeItem('token');
      window.location.replace('login.html');
    }

    throw new ApiError(message, response.status, fields);
  }

  return json.data;
}

// ── Convenience methods ───────────────────────────────────────

export const api = {
  get(path) {
    return request(path, { method: 'GET' });
  },

  post(path, body) {
    return request(path, { method: 'POST', body: JSON.stringify(body) });
  },

  put(path, body) {
    return request(path, { method: 'PUT', body: JSON.stringify(body) });
  },

  patch(path, body = {}) {
    return request(path, { method: 'PATCH', body: JSON.stringify(body) });
  },

  delete(path) {
    return request(path, { method: 'DELETE' });
  },
};
