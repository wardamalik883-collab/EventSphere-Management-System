/**
 * directoryService.js — Exhibitor Directory API Service
 * Task 11: Public exhibitor directory and profile endpoints.
 */

import api from './api';

/**
 * List public exhibitor profiles with optional filters.
 * @param {object} params - { search, industry, location, expoId, page, limit, sort }
 */
export const listExhibitorDirectory = (params = {}) =>
  api.get('/exhibitors/directory', { params });

/**
 * Get a single public exhibitor profile by ExhibitorProfile ID.
 * @param {string} profileId - ExhibitorProfile _id
 */
export const getExhibitorPublicProfile = (profileId) =>
  api.get(`/exhibitors/directory/${profileId}`);
