/**
 * expoService.js — Expo Management API Service
 *
 * Provides typed wrappers over the EventSphere /api/expos REST endpoints.
 * All requests include the authenticated user's JWT via api.js token injection.
 */

import api from './api';

/**
 * Create a new expo.
 * @param {Object} expoData - Expo fields to create
 * @returns {Promise<Object>} Created expo data
 */
export const createExpo = (expoData) => api.post('/expos', expoData);

/**
 * List expos with optional filters.
 * @param {Object} params - Query params: page, limit, search, status, category, sort
 * @returns {Promise<Object>} { data: expos[], meta: pagination }
 */
export const listExpos = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/expos${qs ? `?${qs}` : ''}`);
};

/**
 * Get a single expo by ID.
 * @param {string} id - Expo MongoDB ObjectId
 * @returns {Promise<Object>} Expo data
 */
export const getExpoById = (id) => api.get(`/expos/${id}`);

/**
 * Update an expo (partial update).
 * @param {string} id - Expo ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated expo data
 */
export const updateExpo = (id, updates) => {
  // api.js doesn't have a patch method — use a custom fetch with PATCH
  const BASE_URL = process.env.REACT_APP_API_URL || '';
  const TOKEN_KEY = 'eventsphere_token';
  const token = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();

  return fetch(`${BASE_URL}/api/expos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({ message: 'Unexpected server response' }));
    if (!res.ok) {
      const err = new Error(data.message || `Request failed: ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  });
};

/**
 * Delete an expo.
 * @param {string} id - Expo ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteExpo = (id) => api.delete(`/expos/${id}`);
