/**
 * feedbackRoutes.js — Expo Feedback Routes
 *
 * Endpoints:
 *  GET    /api/feedback/my-feedback         — Get authenticated user's feedback
 *  PATCH  /api/feedback/:id                 — Edit feedback (rating/comment)
 *  DELETE /api/feedback/:id                 — Delete feedback
 *  POST   /api/feedback/expo/:expoId        — Submit feedback for an expo (also mounted on /api/expos/:expoId/feedback)
 *  GET    /api/feedback/expo/:expoId        — Get public feedback for an expo
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  submitFeedback,
  getExpoFeedback,
  getMyFeedback,
  updateFeedback,
  deleteFeedback,
} = require('../controllers/feedbackController');

const router = express.Router();

// Direct feedback operations
router.get('/my-feedback', protect, getMyFeedback);
router.patch('/:id', protect, updateFeedback);
router.delete('/:id', protect, deleteFeedback);

// Expo-specific feedback routes on /api/feedback/expo/:expoId
router.post('/expo/:expoId', protect, submitFeedback);
router.get('/expo/:expoId', getExpoFeedback);

module.exports = {
  feedbackRouter: router,
  submitFeedback,
  getExpoFeedback,
};
