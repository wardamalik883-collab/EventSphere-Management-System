/**
 * messagingController.js — In-App Messaging Controller
 *
 * Implements secure conversation and message management.
 *
 * Supported participant pairs:
 *  - attendee  → exhibitor  (attendee contacts an exhibitor)
 *  - organizer → exhibitor  (organizer contacts exhibitor in their expo)
 *  - exhibitor → attendee / organizer  (exhibitor replies or initiates)
 *
 * Security rules:
 *  - sender is always req.user._id — never from request body.
 *  - Only participants can read or reply to a conversation.
 *  - Organizers may only start a conversation about an expo they own.
 *  - Duplicate conversations (same pair + expo) return the existing one (200).
 *  - Message body is validated: required, 1–2000 chars, whitespace-only rejected.
 *  - Private contact details are never included in responses.
 *
 * Endpoints:
 *  POST  /api/messages/conversations                   — Start a conversation
 *  GET   /api/messages/conversations                   — List my conversations
 *  GET   /api/messages/conversations/:id               — Conversation + message history
 *  POST  /api/messages/conversations/:id/reply         — Send a reply
 *  PATCH /api/messages/conversations/:id/read          — Mark messages as read
 */

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const ExhibitorProfile = require('../models/ExhibitorProfile');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Expo = require('../models/Expo');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Sort two ObjectIds as strings for consistent compound index key */
function sortedParticipants(id1, id2) {
  const s1 = id1.toString();
  const s2 = id2.toString();
  return s1 <= s2 ? [id1, id2] : [id2, id1];
}

/** Safe user projection for responses (no password, no private email) */
const USER_PUBLIC_FIELDS = 'name role avatarUrl';

// ─── POST /api/messages/conversations ────────────────────────────────────────

/**
 * Start a new conversation or return the existing one.
 * Body: { recipientId, subject, body, expoId? }
 */
exports.startConversation = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const senderRole = req.user.role;
    const { recipientId, subject, body, expoId } = req.body;

    // ── Validation ──────────────────────────────────────────────────────
    if (!recipientId || !isValidObjectId(recipientId)) {
      return res.status(400).json({ success: false, message: 'Valid recipientId is required' });
    }

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot message yourself' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (subject.trim().length > 200) {
      return res.status(400).json({ success: false, message: 'Subject cannot exceed 200 characters' });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    if (body.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 2000 characters' });
    }

    // ── Recipient must exist and be active ──────────────────────────────
    const recipient = await User.findById(recipientId).select('name role isActive').lean();
    if (!recipient || !recipient.isActive) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    // ── Role-based permission checks ────────────────────────────────────
    // Attendees may only message exhibitors
    if (senderRole === 'attendee' && recipient.role !== 'exhibitor') {
      return res.status(403).json({
        success: false,
        message: 'Attendees can only send messages to exhibitors',
      });
    }

    // Organizers may only message exhibitors who have an application to their expo
    if (senderRole === 'organizer') {
      if (recipient.role !== 'exhibitor') {
        return res.status(403).json({
          success: false,
          message: 'Organizers can only message exhibitors',
        });
      }
      if (!expoId || !isValidObjectId(expoId)) {
        return res.status(400).json({
          success: false,
          message: 'expoId is required when an organizer starts a conversation',
        });
      }
      // Verify organizer owns the expo
      const expo = await Expo.findById(expoId).select('organizer').lean();
      if (!expo) {
        return res.status(404).json({ success: false, message: 'Expo not found' });
      }
      if (expo.organizer.toString() !== senderId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only contact exhibitors in your own expos',
        });
      }
      // Verify exhibitor has an application for this expo
      const hasApp = await ExhibitorApplication.exists({ expo: expoId, exhibitor: recipientId });
      if (!hasApp) {
        return res.status(403).json({
          success: false,
          message: 'Exhibitor has no application in this expo',
        });
      }
    }

    // Exhibitors may message attendees or organizers (bidirectional reply)
    if (senderRole === 'exhibitor') {
      if (!['attendee', 'organizer', 'admin'].includes(recipient.role)) {
        return res.status(403).json({
          success: false,
          message: 'Exhibitors can send messages to attendees or organizers',
        });
      }
    }

    // ── Duplicate conversation check ─────────────────────────────────────
    const [p0, p1] = sortedParticipants(senderId, recipientId);
    const expoFilter = expoId && isValidObjectId(expoId) ? expoId : null;

    let conversation = await Conversation.findOne({
      'participants.0': p0,
      'participants.1': p1,
      relatedExpo: expoFilter,
      status: 'open',
    });

    let isNew = false;
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [p0, p1],
        subject: subject.trim(),
        relatedExpo: expoFilter,
        lastMessageAt: new Date(),
        messageCount: 1,
      });
      isNew = true;
    } else {
      // Update lastMessageAt and increment count
      await Conversation.findByIdAndUpdate(conversation._id, {
        $inc: { messageCount: 1 },
        lastMessageAt: new Date(),
      });
    }

    // ── Create the first / new message ───────────────────────────────────
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      body: body.trim(),
    });

    return res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? 'Conversation started successfully' : 'Message sent to existing conversation',
      data: {
        conversation: {
          _id: conversation._id,
          subject: conversation.subject,
          relatedExpo: conversation.relatedExpo,
          status: conversation.status,
          lastMessageAt: message.createdAt,
        },
        message: {
          _id: message._id,
          body: message.body,
          sender: senderId,
          createdAt: message.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/messages/conversations ─────────────────────────────────────────

/**
 * List all conversations the authenticated user participates in.
 * Returns last message preview and unread count.
 * Query: page, limit
 */
exports.listConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [conversations, total] = await Promise.all([
      Conversation.find({ participants: userId })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('participants', USER_PUBLIC_FIELDS)
        .populate('relatedExpo', 'title')
        .lean(),
      Conversation.countDocuments({ participants: userId }),
    ]);

    // For each conversation: get last message + count unread messages sent by others
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const [lastMsg, unreadCount] = await Promise.all([
          Message.findOne({ conversation: conv._id })
            .sort({ createdAt: -1 })
            .select('body sender createdAt isRead')
            .populate('sender', 'name')
            .lean(),
          Message.countDocuments({
            conversation: conv._id,
            isRead: false,
            sender: { $ne: userId },
          }),
        ]);

        const otherParticipant = conv.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );

        return {
          _id: conv._id,
          subject: conv.subject,
          status: conv.status,
          relatedExpo: conv.relatedExpo
            ? { _id: conv.relatedExpo._id, title: conv.relatedExpo.title }
            : null,
          otherParticipant: otherParticipant
            ? { _id: otherParticipant._id, name: otherParticipant.name, role: otherParticipant.role, avatarUrl: otherParticipant.avatarUrl }
            : null,
          lastMessage: lastMsg
            ? {
                body: lastMsg.body.length > 100 ? lastMsg.body.slice(0, 100) + '…' : lastMsg.body,
                senderName: lastMsg.sender ? lastMsg.sender.name : '',
                createdAt: lastMsg.createdAt,
                isRead: lastMsg.isRead,
              }
            : null,
          unreadCount,
          messageCount: conv.messageCount,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: enriched,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/messages/conversations/:id ─────────────────────────────────────

/**
 * Get full conversation details + paginated message history.
 * Only participants may access.
 */
exports.getConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(id)
      .populate('participants', USER_PUBLIC_FIELDS)
      .populate('relatedExpo', 'title startDate endDate')
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Participant check
    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied: not a participant' });
    }

    // Paginated messages
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [messages, totalMessages] = await Promise.all([
      Message.find({ conversation: id })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate('sender', USER_PUBLIC_FIELDS)
        .lean(),
      Message.countDocuments({ conversation: id }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Conversation retrieved successfully',
      data: {
        conversation: {
          _id: conversation._id,
          subject: conversation.subject,
          status: conversation.status,
          participants: conversation.participants.map((p) => ({
            _id: p._id,
            name: p.name,
            role: p.role,
            avatarUrl: p.avatarUrl || '',
          })),
          relatedExpo: conversation.relatedExpo || null,
          messageCount: conversation.messageCount,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
        },
        messages: messages.map((m) => ({
          _id: m._id,
          body: m.body,
          sender: m.sender
            ? { _id: m.sender._id, name: m.sender.name, role: m.sender.role, avatarUrl: m.sender.avatarUrl || '' }
            : null,
          isRead: m.isRead,
          readAt: m.readAt,
          createdAt: m.createdAt,
        })),
        pagination: {
          total: totalMessages,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalMessages / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/messages/conversations/:id/reply ──────────────────────────────

/**
 * Send a reply to an existing conversation.
 * Only participants of the conversation may reply.
 * Body: { body }
 */
exports.replyToConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { body } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Validate body
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Message body is required' });
    }
    if (body.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 2000 characters' });
    }

    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (conversation.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This conversation is closed' });
    }

    // Participant check
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied: not a participant' });
    }

    const message = await Message.create({
      conversation: id,
      sender: userId,
      body: body.trim(),
    });

    // Update conversation metadata
    await Conversation.findByIdAndUpdate(id, {
      $inc: { messageCount: 1 },
      lastMessageAt: message.createdAt,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', USER_PUBLIC_FIELDS)
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: {
        _id: populatedMessage._id,
        body: populatedMessage.body,
        sender: populatedMessage.sender
          ? {
              _id: populatedMessage.sender._id,
              name: populatedMessage.sender.name,
              role: populatedMessage.sender.role,
              avatarUrl: populatedMessage.sender.avatarUrl || '',
            }
          : null,
        isRead: populatedMessage.isRead,
        createdAt: populatedMessage.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/messages/conversations/:id/read ──────────────────────────────

/**
 * Mark all unread messages in a conversation as read (from other participants).
 * Only the authenticated participant can mark messages as read.
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Participant check
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied: not a participant' });
    }

    const now = new Date();
    const result = await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: userId }, // only mark messages from others as read
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: now },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: { markedCount: result.modifiedCount },
    });
  } catch (err) {
    next(err);
  }
};
