/**
 * messagingRoutes.js — In-App Messaging Routes
 *
 * All routes require authentication (protect middleware).
 * Permitted roles: attendee, exhibitor, organizer, admin.
 *
 * Routes:
 *  POST  /api/messages/conversations                   — Start a conversation
 *  GET   /api/messages/conversations                   — List my conversations
 *  GET   /api/messages/conversations/:id               — Conversation + message history
 *  POST  /api/messages/conversations/:id/reply         — Send a reply
 *  PATCH /api/messages/conversations/:id/read          — Mark messages as read
 */

const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  startConversation,
  listConversations,
  getConversation,
  replyToConversation,
  markAsRead,
} = require('../controllers/messagingController');

const router = express.Router();

// All messaging routes require authentication
// Admin is excluded from starting new conversations but can still use existing endpoints if needed
router.post(
  '/conversations',
  protect,
  authorize('attendee', 'exhibitor', 'organizer'),
  startConversation
);

router.get(
  '/conversations',
  protect,
  authorize('attendee', 'exhibitor', 'organizer', 'admin'),
  listConversations
);

router.get(
  '/conversations/:id',
  protect,
  authorize('attendee', 'exhibitor', 'organizer', 'admin'),
  getConversation
);

router.post(
  '/conversations/:id/reply',
  protect,
  authorize('attendee', 'exhibitor', 'organizer'),
  replyToConversation
);

router.patch(
  '/conversations/:id/read',
  protect,
  authorize('attendee', 'exhibitor', 'organizer', 'admin'),
  markAsRead
);

module.exports = router;
