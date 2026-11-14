/**
 * attendeeRoutes.js — Attendee Portal & Expo Registration Routes
 *
 * REST Endpoints:
 *   GET   /api/attendees/dashboard         — Attendee metrics & featured expos
 *   GET   /api/attendees/expos             — Browse published expos with search & filters
 *   GET   /api/attendees/registrations     — List logged-in attendee registrations
 *   POST  /api/attendees/registrations     — Register for an expo
 *   GET   /api/attendees/registrations/:id — Get registration details
 *   PATCH /api/attendees/registrations/:id/cancel — Cancel registration
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAttendeeDashboard,
  browseExpos,
  getMyRegistrations,
  registerForExpo,
  getRegistrationById,
  cancelRegistration,
} = require('../controllers/attendeeController');

// Optional auth helper to attach req.user if a valid token is provided
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

// GET /api/attendees/dashboard — Attendee dashboard stats
router.get('/dashboard', protect, authorize('attendee', 'admin'), getAttendeeDashboard);

// GET /api/attendees/expos — Browse published expos
router.get('/expos', optionalAuth, browseExpos);

// GET /api/attendees/registrations — List own registrations
router.get('/registrations', protect, authorize('attendee', 'admin'), getMyRegistrations);

// POST /api/attendees/registrations — Register for an expo
router.post('/registrations', protect, authorize('attendee', 'admin'), registerForExpo);

// GET /api/attendees/registrations/:id — View single registration
router.get('/registrations/:id', protect, authorize('attendee', 'admin'), getRegistrationById);

// PATCH /api/attendees/registrations/:id/cancel — Cancel registration
router.patch('/registrations/:id/cancel', protect, authorize('attendee', 'admin'), cancelRegistration);

module.exports = router;
