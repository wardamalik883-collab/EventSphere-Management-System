/**
 * authRoutes.js — Authentication Routes
 *
 * Mounts:
 *  - POST /api/auth/register : Public registration
 *  - POST /api/auth/login    : Public login
 *  - GET  /api/auth/me       : Protected profile lookup
 *  - POST /api/auth/logout   : Client logout
 */

const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
