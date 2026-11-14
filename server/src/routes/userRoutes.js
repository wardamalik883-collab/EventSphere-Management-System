/**
 * userRoutes.js — User & Profile Management Routes
 *
 * Endpoints:
 *  - GET  /api/users/me        : Current authenticated user profile
 *  - PUT  /api/users/me        : Update caller's permitted profile fields
 *  - POST /api/users/me/avatar : Upload profile picture
 *  - GET  /api/users           : Admin-only: list all users (paginated, filtered, searched)
 *  - GET  /api/users/:id       : Admin-only: view user details
 *  - PUT  /api/users/:id/status: Admin-only: activate/deactivate user account
 */

const express = require('express');
const {
  getMe,
  updateMe,
  updateAvatar,
  getAllUsers,
  getUserById,
  updateUserStatus,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

const router = express.Router();

// ─── Current User Profile Routes (Protected for all roles) ───────────────────
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/me/avatar', protect, uploadAvatar, updateAvatar);

// ─── Admin User Management Routes (Admin only) ───────────────────────────────
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/:id/status', protect, authorize('admin'), updateUserStatus);

module.exports = router;
