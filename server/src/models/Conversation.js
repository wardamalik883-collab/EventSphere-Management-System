/**
 * Conversation.js — Messaging Conversation model
 *
 * Represents a conversation thread between exactly two participants.
 * Supported participant role pairs:
 *  - attendee  ↔ exhibitor  (attendee contacts an exhibitor)
 *  - organizer ↔ exhibitor  (organizer contacts an exhibitor in their expo)
 *  - exhibitor ↔ exhibitor  (optional future use; not restricted at model level)
 *
 * To prevent duplicate threads, participants are stored in a consistent
 * sorted order and a compound unique index enforces uniqueness per
 * participant-pair + expo combination.
 */

const mongoose = require('mongoose');

const CONVERSATION_STATUSES = ['open', 'closed'];

const conversationSchema = new mongoose.Schema(
  {
    /**
     * Exactly 2 participant User references.
     * Stored in ascending ObjectId string order so the unique index is deterministic.
     */
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      validate: {
        validator: (arr) => arr.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
    },

    /** Optional subject / topic line for the conversation */
    subject: {
      type: String,
      required: [true, 'Conversation subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },

    /**
     * Optional link to the expo this conversation is about.
     * Used to scope organizer–exhibitor conversations.
     */
    relatedExpo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: CONVERSATION_STATUSES,
        message: '{VALUE} is not a valid status. Allowed: ' + CONVERSATION_STATUSES.join(', '),
      },
      default: 'open',
      index: true,
    },

    /** Denormalised timestamp of the most recent message — used for sorting */
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },

    /** Total message count — maintained by the message controller */
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Fast participant membership lookup
conversationSchema.index({ participants: 1 });

// Unique: one open conversation per participant-pair + expo
// (participants[0] and participants[1] must be stored in sorted order by the controller)
conversationSchema.index(
  { 'participants.0': 1, 'participants.1': 1, relatedExpo: 1 },
  { unique: true }
);

conversationSchema.statics.STATUSES = CONVERSATION_STATUSES;

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
