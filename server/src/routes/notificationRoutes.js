/**
 * notificationRoutes.js — In-App Notification Routes
 *
 * Endpoints:
 *  GET    /api/notifications              — List paginated notifications
 *  GET    /api/notifications/unread-count — Fast unread notification count
 *  PATCH  /api/notifications/:id/read     — Mark single notification as read
 *  PATCH  /api/notifications/read-all     — Mark all notifications as read
 *  DELETE /api/notifications/:id          — Delete a notification
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const router = express.Router();

// All notification endpoints require authentication
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
