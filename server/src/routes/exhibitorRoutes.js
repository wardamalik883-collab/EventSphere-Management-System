/**
 * exhibitorRoutes.js — Exhibitor Portal Routes
 *
 * Exhibitor endpoints (requires role: exhibitor):
 *   GET    /api/exhibitors/me                      — Get own profile
 *   POST   /api/exhibitors/profile                 — Create profile
 *   PUT    /api/exhibitors/profile                 — Update profile
 *   GET    /api/exhibitors/dashboard               — Exhibitor dashboard stats
 *   GET    /api/exhibitors/expos                   — Browse published expos
 *   POST   /api/exhibitors/applications            — Submit application
 *   GET    /api/exhibitors/applications            — List own applications
 *   GET    /api/exhibitors/applications/:id        — Get own application detail
 *
 * Organizer endpoints (requires role: organizer or admin):
 *   GET    /api/organizer/applications             — List applications for own expos
 *   GET    /api/organizer/applications/:id         — Get single application detail
 *   PATCH  /api/organizer/applications/:id/status  — Approve / reject application
 */

const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getMyProfile,
  createProfile,
  updateProfile,
  getExhibitorDashboard,
  browseExpos,
  submitApplication,
  listMyApplications,
  getMyApplicationById,
  listOrganizerApplications,
  getOrganizerApplicationById,
  reviewApplication,
} = require('../controllers/exhibitorController');

// ─── Exhibitor Router ─────────────────────────────────────────────────────────
const exhibitorRouter = express.Router();

// Profile
exhibitorRouter.get('/me',       protect, authorize('exhibitor'), getMyProfile);
exhibitorRouter.post('/profile', protect, authorize('exhibitor'), createProfile);
exhibitorRouter.put('/profile',  protect, authorize('exhibitor'), updateProfile);

// Dashboard
exhibitorRouter.get('/dashboard', protect, authorize('exhibitor'), getExhibitorDashboard);

// Browse expos (exhibitor + authenticated only — scope is already enforced in controller)
exhibitorRouter.get('/expos', protect, authorize('exhibitor'), browseExpos);

// Applications
exhibitorRouter.post('/applications',      protect, authorize('exhibitor'), submitApplication);
exhibitorRouter.get('/applications',       protect, authorize('exhibitor'), listMyApplications);
exhibitorRouter.get('/applications/:id',   protect, authorize('exhibitor'), getMyApplicationById);

// Task 08: Exhibitor Assigned Booths
const { getMyBooths } = require('../controllers/boothController');
exhibitorRouter.get('/my-booths',          protect, authorize('exhibitor'), getMyBooths);

// ─── Organizer Review Router ──────────────────────────────────────────────────
const organizerRouter = express.Router();

organizerRouter.get('/applications',              protect, authorize('organizer', 'admin'), listOrganizerApplications);
organizerRouter.get('/applications/:id',          protect, authorize('organizer', 'admin'), getOrganizerApplicationById);
organizerRouter.patch('/applications/:id/status', protect, authorize('organizer', 'admin'), reviewApplication);

module.exports = { exhibitorRouter, organizerRouter };
