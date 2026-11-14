/**
 * expoRoutes.js — Expo Management Routes
 *
 * REST endpoints for expo CRUD operations.
 *
 * Route Overview:
 *   POST   /api/expos        — Create expo (organizer, admin)
 *   GET    /api/expos        — List expos (scoped by role)
 *   GET    /api/expos/:id    — Get expo details (role-scoped visibility)
 *   PATCH  /api/expos/:id    — Update expo (organizer owns, admin any)
 *   DELETE /api/expos/:id    — Delete expo (organizer owns, admin any)
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createExpo,
  listExpos,
  getExpoById,
  updateExpo,
  deleteExpo,
} = require('../controllers/expoController');

/**
 * Optional authentication middleware.
 * Attaches req.user if a valid token is present, but does NOT reject unauthenticated requests.
 * Used for endpoints that serve both public and authenticated users differently.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token — proceed as unauthenticated
  }

  const { verifyToken } = require('../utils/generateToken');
  const User = require('../models/User');

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Invalid or expired token — treat as unauthenticated
  }
  next();
};

// POST /api/expos — Create a new expo
router.post('/', protect, authorize('organizer', 'admin'), createExpo);

// GET /api/expos — List expos (role-scoped)
router.get('/', optionalAuth, listExpos);

// GET /api/expos/:id — Expo detail (role-scoped visibility)
router.get('/:id', optionalAuth, getExpoById);

// PATCH /api/expos/:id — Update expo
router.patch('/:id', protect, authorize('organizer', 'admin'), updateExpo);

// DELETE /api/expos/:id — Delete expo (with integrity checks)
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteExpo);

// ─── Task 08: Nested Expo Booths / Floor Plan ────────────────────────────────
const { getExpoBooths, createBooth } = require('../controllers/boothController');

// GET /api/expos/:expoId/booths — List booths / floor-plan data
router.get('/:expoId/booths', getExpoBooths);

// POST /api/expos/:expoId/booths — Create booth for this expo
router.post('/:expoId/booths', protect, authorize('organizer', 'admin'), createBooth);

// ─── Task 09: Nested Expo Sessions & Schedule ────────────────────────────────
const {
  createSession,
  getExpoSessions,
  getExpoSchedule,
} = require('../controllers/sessionController');

// POST /api/expos/:expoId/sessions — Create a session
router.post('/:expoId/sessions', protect, authorize('organizer', 'admin'), createSession);

// GET /api/expos/:expoId/sessions — List expo sessions (with filters)
router.get('/:expoId/sessions', optionalAuth, getExpoSessions);

// GET /api/expos/:expoId/schedule — Public chronological schedule grouped by date
router.get('/:expoId/schedule', optionalAuth, getExpoSchedule);

// ─── Task 12: Nested Expo Feedback ───────────────────────────────────────────
const { submitFeedback, getExpoFeedback } = require('../controllers/feedbackController');

// POST /api/expos/:expoId/feedback — Submit feedback for this expo
router.post('/:expoId/feedback', protect, submitFeedback);

// GET /api/expos/:expoId/feedback — Get public feedback & stats for this expo
router.get('/:expoId/feedback', optionalAuth, getExpoFeedback);

module.exports = router;

