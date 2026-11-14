/**
 * sessionRoutes.js — Session Management Routes
 *
 * REST endpoints for individual session operations:
 *   GET    /api/sessions/:id        — Get session detail
 *   PATCH  /api/sessions/:id        — Update session details
 *   DELETE /api/sessions/:id        — Delete session
 *   PATCH  /api/sessions/:id/cancel — Cancel session
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getSessionById,
  updateSession,
  deleteSession,
  cancelSession,
} = require('../controllers/sessionController');

// Optional auth helper to pass user context when present
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
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
    // Continue unauthenticated on invalid/expired token
  }
  next();
};

// GET /api/sessions/:id — View session details
router.get('/:id', optionalAuth, getSessionById);

// PATCH /api/sessions/:id — Update session
router.patch('/:id', protect, authorize('organizer', 'admin'), updateSession);

// DELETE /api/sessions/:id — Delete session
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteSession);

// PATCH /api/sessions/:id/cancel — Cancel session
router.patch('/:id/cancel', protect, authorize('organizer', 'admin'), cancelSession);

module.exports = router;
