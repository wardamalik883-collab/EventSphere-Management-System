/**
 * AttendeeRegistration.js — Attendee Expo Registration model
 *
 * Tracks attendee participation and ticket/badge registration for an expo.
 */

const mongoose = require('mongoose');

const REGISTRATION_TYPES = ['standard', 'vip', 'student', 'press'];
const REGISTRATION_STATUSES = ['confirmed', 'checked_in', 'cancelled'];

const attendeeRegistrationSchema = new mongoose.Schema(
  {
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      required: [true, 'Expo ID is required'],
      index: true,
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attendee User ID is required'],
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    registrationType: {
      type: String,
      enum: {
        values: REGISTRATION_TYPES,
        message: '{VALUE} is not a valid registration type. Allowed: ' + REGISTRATION_TYPES.join(', '),
      },
      default: 'standard',
    },
    status: {
      type: String,
      enum: {
        values: REGISTRATION_STATUSES,
        message: '{VALUE} is not a valid registration status. Allowed: ' + REGISTRATION_STATUSES.join(', '),
      },
      default: 'confirmed',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendee registration for the same expo
attendeeRegistrationSchema.index({ expo: 1, attendee: 1 }, { unique: true });

attendeeRegistrationSchema.statics.TYPES = REGISTRATION_TYPES;
attendeeRegistrationSchema.statics.STATUSES = REGISTRATION_STATUSES;

const AttendeeRegistration = mongoose.model(
  'AttendeeRegistration',
  attendeeRegistrationSchema
);

module.exports = AttendeeRegistration;
