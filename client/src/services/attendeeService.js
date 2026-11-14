/**
 * attendeeService.js — Attendee Experience & Registration API Client Service
 *
 * Provides API wrappers for:
 *  - Attendee dashboard metrics & featured expos
 *  - Browsing published expos with filters & search
 *  - Fetching logged-in attendee registrations
 *  - Registering for an expo
 *  - Registration details inspection
 *  - Cancelling registrations
 */

import api from './api';

/**
 * Fetch attendee dashboard statistics and featured expos.
 */
export const getAttendeeDashboard = () => api.get('/attendees/dashboard');

/**
 * Browse published expos for attendees.
 * @param {object} [params] - { search, category, location, venue, date, sort, page, limit }
 */
export const browseAttendeeExpos = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/attendees/expos${qs ? `?${qs}` : ''}`);
};

/**
 * Get all registrations belonging to the authenticated attendee.
 * @param {object} [params] - { status, search }
 */
export const getMyRegistrations = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/attendees/registrations${qs ? `?${qs}` : ''}`);
};

/**
 * Register the logged-in attendee for an expo.
 * @param {object} data - { expoId, registrationType, notes }
 */
export const registerForExpo = (data) => api.post('/attendees/registrations', data);

/**
 * Retrieve single registration detail by ID.
 * @param {string} id
 */
export const getRegistrationById = (id) => api.get(`/attendees/registrations/${id}`);

/**
 * Cancel an active registration.
 * @param {string} id
 */
export const cancelRegistration = (id) => api.patch(`/attendees/registrations/${id}/cancel`);
