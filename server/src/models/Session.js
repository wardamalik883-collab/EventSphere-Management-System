/**
 * Session.js — Expo Schedule / Session model
 *
 * Represents talks, keynotes, panels, or workshops taking place during an expo.
 */

const mongoose = require('mongoose');

const SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

const sessionSchema = new mongoose.Schema(
  {
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      required: [true, 'Expo ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
      default: '',
    },
    speaker: {
      name: {
        type: String,
        required: [true, 'Speaker name is required'],
        trim: true,
      },
      title: {
        type: String,
        trim: true,
        default: '',
      },
      company: {
        type: String,
        trim: true,
        default: '',
      },
      bio: {
        type: String,
        trim: true,
        default: '',
      },
    },
    room: {
      type: String,
      required: [true, 'Room/Hall identifier is required'],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Session start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'Session end time is required'],
      validate: {
        validator: function (value) {
          return !this.startTime || value > this.startTime;
        },
        message: 'End time must be strictly after start time',
      },
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      index: true,
    },
    capacity: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: SESSION_STATUSES,
        message: '{VALUE} is not a valid status. Allowed: ' + SESSION_STATUSES.join(', '),
      },
      default: 'scheduled',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for schedule queries
sessionSchema.index({ expo: 1, startTime: 1 });
sessionSchema.index({ expo: 1, room: 1, startTime: 1 });

sessionSchema.statics.STATUSES = SESSION_STATUSES;

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
