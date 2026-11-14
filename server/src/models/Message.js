/**
 * Message.js — Individual Message model
 *
 * Represents a single message within a Conversation thread.
 * Validation:
 *  - body is required, 1–2000 characters, whitespace-only rejected.
 *  - sender must be a conversation participant (enforced in the controller).
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender User ID is required'],
      index: true,
    },

    body: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Chronological retrieval of messages in a conversation
messageSchema.index({ conversation: 1, createdAt: 1 });

// Count unread messages per conversation per sender (for unread badges)
messageSchema.index({ conversation: 1, isRead: 1, sender: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
