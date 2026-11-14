/**
 * dashboardRoutes.js — Routes for Admin and Organizer Dashboards
 *
 * Enforces authentication and strict role-based access control (RBAC).
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getAdminDashboard,
  getOrganizerDashboard,
} = require('../controllers/dashboardController');

// Admin Dashboard — only accessible by users with role 'admin'
router.get('/admin', protect, authorize('admin'), getAdminDashboard);

// Organizer Dashboard — only accessible by users with role 'organizer'
router.get('/organizer', protect, authorize('organizer'), getOrganizerDashboard);

module.exports = router;
