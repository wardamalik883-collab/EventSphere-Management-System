/**
 * Feedback.js — Attendee/User Feedback model
 *
 * Stores event reviews and ratings submitted by attendees and exhibitors.
 */

const mongoose = require('mongoose');

const FEEDBACK_CATEGORIES = [
  'overall',
  'organization',
  'venue',
  'sessions',
  'exhibitors',
  'other',
];

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      required: [true, 'Expo ID is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    category: {
      type: String,
      enum: {
        values: FEEDBACK_CATEGORIES,
        message: '{VALUE} is not a valid feedback category. Allowed: ' + FEEDBACK_CATEGORIES.join(', '),
      },
      default: 'overall',
      index: true,
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for querying feedback by expo and category; prevent duplicate feedback per user per expo
feedbackSchema.index({ expo: 1, category: 1 });
feedbackSchema.index({ expo: 1, user: 1 }, { unique: true });


feedbackSchema.statics.CATEGORIES = FEEDBACK_CATEGORIES;

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
