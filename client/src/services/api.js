/**
 * api.js — Centralised API service
 *
 * All HTTP calls to the EventSphere backend go through this module.
 * The base URL resolves to:
 *  - In development : CRA proxy forwards /api/* to http://localhost:5000
 *  - In production  : REACT_APP_API_URL environment variable
 *
 * Features:
 *  - Automatic JWT token retrieval from localStorage
 *  - Content-Type / Authorization header management
 *  - Consistent JSON response & error parsing
 */

const BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'eventsphere_token';

export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // silent fail if storage disabled
    }
  },
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // silent fail
    }
  },
};

/**
 * Shared fetch wrapper with consistent error handling and JWT injection.
 * @param {string} endpoint - Path relative to /api (e.g., '/health', '/dashboard/admin')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response body
 */
const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}/api${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = tokenStorage.get();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: 'Unexpected server response format' };
  }

  if (!response.ok) {
    const error = new Error(data.message || `API request failed with status ${response.status}`);
    error.status = response.status;
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) =>
    request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
      headers:
        body instanceof FormData
          ? { ...(options && options.headers) }
          : { 'Content-Type': 'application/json', ...(options && options.headers) },
    }),
  put: (endpoint, body, options) =>
    request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    }),
  patch: (endpoint, body, options) =>
    request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),
  delete: (endpoint, options) =>
    request(endpoint, { method: 'DELETE', ...options }),
};

export default api;
