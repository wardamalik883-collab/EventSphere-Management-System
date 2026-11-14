/**
 * ExhibitorApplication.js — Exhibitor Application model
 *
 * Represents an application submitted by an exhibitor to participate in an expo.
 * Organizers review and approve or reject applications.
 */

const mongoose = require('mongoose');

const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const BOOTH_SIZES = ['small', 'medium', 'large', 'custom'];

const exhibitorApplicationSchema = new mongoose.Schema(
  {
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      required: [true, 'Expo ID is required'],
      index: true,
    },
    exhibitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Exhibitor User ID is required'],
      index: true,
    },
    exhibitorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExhibitorProfile',
      required: [true, 'Exhibitor Profile ID is required'],
    },
    boothPreference: {
      size: {
        type: String,
        enum: {
          values: BOOTH_SIZES,
          message: '{VALUE} is not a valid booth size. Allowed: ' + BOOTH_SIZES.join(', '),
        },
        default: 'medium',
      },
      preferredLocation: {
        type: String,
        trim: true,
        default: '',
      },
      specialRequirements: {
        type: String,
        trim: true,
        default: '',
      },
    },
    status: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: '{VALUE} is not a valid status. Allowed: ' + APPLICATION_STATUSES.join(', '),
      },
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications for the same expo by the same exhibitor
exhibitorApplicationSchema.index({ expo: 1, exhibitor: 1 }, { unique: true });
exhibitorApplicationSchema.index({ expo: 1, status: 1 });

exhibitorApplicationSchema.statics.STATUSES = APPLICATION_STATUSES;
exhibitorApplicationSchema.statics.BOOTH_SIZES = BOOTH_SIZES;

const ExhibitorApplication = mongoose.model(
  'ExhibitorApplication',
  exhibitorApplicationSchema
);

module.exports = ExhibitorApplication;
