/**
 * analyticsRoutes.js — Platform & Expo Analytics Routes
 *
 * REST Endpoints:
 *  Admin Endpoints (role === 'admin'):
 *   GET /api/analytics/admin/overview — Platform-wide overview metrics
 *   GET /api/analytics/admin/trends   — Timeseries user & registration trends
 *
 *  Organizer Endpoints (role === 'organizer' or 'admin'):
 *   GET /api/analytics/organizer/overview — Scoped metrics for organizer's expos
 *   GET /api/analytics/organizer/trends   — Timeseries registration & application trends
 *
 *  Expo Performance Report (admin or owning organizer):
 *   GET /api/analytics/expos/:expoId — Comprehensive performance report for an individual expo
 */

const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAdminOverview,
  getAdminTrends,
  getOrganizerOverview,
  getOrganizerTrends,
  getExpoPerformanceReport,
} = require('../controllers/analyticsController');

const router = express.Router();

// All analytics endpoints require authentication
router.use(protect);

// ─── Admin Analytics Routes ──────────────────────────────────────────────────
router.get('/admin/overview', authorize('admin'), getAdminOverview);
router.get('/admin/trends', authorize('admin'), getAdminTrends);

// ─── Organizer Analytics Routes ──────────────────────────────────────────────
router.get('/organizer/overview', authorize('organizer', 'admin'), getOrganizerOverview);
router.get('/organizer/trends', authorize('organizer', 'admin'), getOrganizerTrends);

// ─── Expo Performance Report ─────────────────────────────────────────────────
router.get('/expos/:expoId', authorize('organizer', 'admin'), getExpoPerformanceReport);

module.exports = router;
