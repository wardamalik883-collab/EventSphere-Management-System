/**
 * Expo.js — Expo/Trade Show Event model
 *
 * Represents an exhibition or trade show managed by an organizer.
 */

const mongoose = require('mongoose');

const EXPO_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];

const expoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Expo title is required'],
      trim: true,
      minlength: [3, 'Expo title must be at least 3 characters long'],
      maxlength: [200, 'Expo title cannot exceed 200 characters'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Expo description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    theme: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Expo category is required'],
      trim: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'End date must be greater than or equal to start date',
      },
    },
    location: {
      venue: {
        type: String,
        required: [true, 'Venue name is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        index: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
      },
      address: {
        type: String,
        trim: true,
        default: '',
      },
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: EXPO_STATUSES,
        message: '{VALUE} is not a valid status. Allowed statuses: ' + EXPO_STATUSES.join(', '),
      },
      default: 'draft',
      index: true,
    },
    bannerUrl: {
      type: String,
      trim: true,
      default: '',
    },
    capacity: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active expos by category and dates
expoSchema.index({ status: 1, category: 1, startDate: 1 });

expoSchema.statics.STATUSES = EXPO_STATUSES;

const Expo = mongoose.model('Expo', expoSchema);

module.exports = Expo;
