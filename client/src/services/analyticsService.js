/**
 * analyticsService.js — Platform & Expo Analytics API Client
 * Task 13: Admin & Organizer analytics, timeseries trends, expo performance reports.
 */

import api from './api';

/**
 * Get platform-wide overview metrics for Admin.
 * @param {object} [params] - { period, startDate, endDate }
 */
export const getAdminOverview = (params = {}) =>
  api.get('/analytics/admin/overview', { params });

/**
 * Get platform timeseries trends (user signups, attendee registrations, expos created).
 * @param {object} [params] - { period, startDate, endDate }
 */
export const getAdminTrends = (params = {}) =>
  api.get('/analytics/admin/trends', { params });

/**
 * Get organizer-scoped overview metrics.
 * @param {object} [params] - { expoId, period, startDate, endDate }
 */
export const getOrganizerOverview = (params = {}) =>
  api.get('/analytics/organizer/overview', { params });

/**
 * Get organizer timeseries trends (registrations, applications).
 * @param {object} [params] - { expoId, period, startDate, endDate }
 */
export const getOrganizerTrends = (params = {}) =>
  api.get('/analytics/organizer/trends', { params });

/**
 * Get comprehensive performance report for an individual expo.
 * @param {string} expoId
 */
export const getExpoPerformanceReport = (expoId) =>
  api.get(`/analytics/expos/${expoId}`);
