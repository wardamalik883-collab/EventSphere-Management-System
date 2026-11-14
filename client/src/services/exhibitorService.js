/**
 * exhibitorService.js — Exhibitor Portal API Service
 *
 * Covers all HTTP requests for:
 *  - Exhibitor profile management (view, create, update)
 *  - Exhibitor dashboard statistics
 *  - Browsing available expos
 *  - Submitting & viewing exhibitor applications
 *  - Organizer application review (approve, reject)
 */

import api from './api';

// ─── Profile ─────────────────────────────────────────────────────────────────

export const getMyProfile = () => api.get('/exhibitors/me');

export const createProfile = (profileData) => api.post('/exhibitors/profile', profileData);

export const updateProfile = (profileData) => api.put('/exhibitors/profile', profileData);

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getExhibitorDashboardData = () => api.get('/exhibitors/dashboard');

// ─── Browse Expos ────────────────────────────────────────────────────────────

export const browseAvailableExpos = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/exhibitors/expos${qs ? `?${qs}` : ''}`);
};

// ─── Exhibitor Applications ──────────────────────────────────────────────────

export const submitApplication = (data) => api.post('/exhibitors/applications', data);

export const listMyApplications = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/exhibitors/applications${qs ? `?${qs}` : ''}`);
};

export const getMyApplicationById = (id) => api.get(`/exhibitors/applications/${id}`);

// ─── Organizer Review ────────────────────────────────────────────────────────

export const listOrganizerApplications = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/organizer/applications${qs ? `?${qs}` : ''}`);
};

export const getOrganizerApplicationById = (id) => api.get(`/organizer/applications/${id}`);

export const reviewApplication = (id, data) => api.patch(`/organizer/applications/${id}/status`, data);
