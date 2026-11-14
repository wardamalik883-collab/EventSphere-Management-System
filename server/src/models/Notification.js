/**
 * Notification.js — In-App Notification model
 *
 * Stores notifications for users regarding applications, schedules, booth changes, and reminders.
 */

const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'system',
  'application_update',
  'booth_assigned',
  'session_reminder',
  'expo_reminder',
  'schedule_change',
  'registration_confirmed',
  'registration_cancelled',
  'expo_update',
  'announcement',
  'status_update',
  'general',
];

const RELATED_TYPES = [
  'Expo',
  'Session',
  'Booth',
  'ExhibitorApplication',
  'AttendeeRegistration',
  'Feedback',
  null,
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPES,
        message: '{VALUE} is not a valid notification type. Allowed: ' + NOTIFICATION_TYPES.join(', '),
      },
      default: 'general',
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    relatedType: {
      type: String,
      enum: {
        values: RELATED_TYPES,
        message: '{VALUE} is not a valid related entity type',
      },
      default: null,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

// Fast lookup for a user's unread / recent notifications
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Fast duplicate check for reminders and event notifications
notificationSchema.index({ recipient: 1, type: 1, relatedId: 1 });

notificationSchema.statics.TYPES = NOTIFICATION_TYPES;
notificationSchema.statics.RELATED_TYPES = RELATED_TYPES;

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

