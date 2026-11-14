/**
 * sessionService.js — Schedule & Session Management Client Service
 *
 * Provides API wrappers for:
 *  - Listing sessions for an expo with search & filter params
 *  - Fetching grouped chronological schedule for attendees/public
 *  - Creating, updating, deleting, and cancelling sessions
 *  - Fetching individual session details
 */

import api from './api';

/**
 * Retrieve all sessions for a specific expo (with optional search/filters).
 * @param {string} expoId
 * @param {object} [params] - { search, category, status, speaker, date }
 */
export const getExpoSessions = (expoId, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/expos/${expoId}/sessions${qs ? `?${qs}` : ''}`);
};

/**
 * Fetch public chronological schedule grouped by date tabs.
 * @param {string} expoId
 * @param {object} [params] - { category, search }
 */
export const getExpoSchedule = (expoId, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/expos/${expoId}/schedule${qs ? `?${qs}` : ''}`);
};

/**
 * Create a new session for an expo.
 * @param {string} expoId
 * @param {object} sessionData
 */
export const createSession = (expoId, sessionData) =>
  api.post(`/expos/${expoId}/sessions`, sessionData);

/**
 * Get details for a single session.
 * @param {string} id
 */
export const getSessionById = (id) => api.get(`/sessions/${id}`);

/**
 * Update session details.
 * @param {string} id
 * @param {object} updates
 */
export const updateSession = (id, updates) => api.patch(`/sessions/${id}`, updates);

/**
 * Delete a session.
 * @param {string} id
 */
export const deleteSession = (id) => api.delete(`/sessions/${id}`);

/**
 * Cancel a session.
 * @param {string} id
 */
export const cancelSession = (id) => api.patch(`/sessions/${id}/cancel`);
