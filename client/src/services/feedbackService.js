/**
 * feedbackService.js — Expo Feedback & Rating Service
 * Task 12: Feedback submission, expo reviews aggregation, user feedback management.
 */

import api from './api';

/**
 * Submit feedback/review for an expo.
 * @param {string} expoId
 * @param {object} data - { rating: 1..5, comment, category? }
 */
export const submitFeedback = (expoId, data) =>
  api.post(`/expos/${expoId}/feedback`, data);

/**
 * Get public aggregated feedback, ratings distribution, and reviews for an expo.
 * @param {string} expoId
 * @param {object} [params] - { page, limit, category }
 */
export const getExpoFeedback = (expoId, params = {}) =>
  api.get(`/expos/${expoId}/feedback`, { params });

/**
 * Get feedback submitted by the current authenticated user.
 */
export const getMyFeedback = () =>
  api.get('/feedback/my-feedback');

/**
 * Edit existing feedback.
 * @param {string} feedbackId
 * @param {object} data - { rating?, comment?, category? }
 */
export const updateFeedback = (feedbackId, data) =>
  api.patch(`/feedback/${feedbackId}`, data);

/**
 * Delete feedback.
 * @param {string} feedbackId
 */
export const deleteFeedback = (feedbackId) =>
  api.delete(`/feedback/${feedbackId}`);
