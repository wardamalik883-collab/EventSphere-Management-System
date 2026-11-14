/**
 * Booth.js — Exhibition Booth Inventory model
 *
 * Represents physical/logical booth spaces in an expo floor plan.
 * Organizers manage booths and allocate them to approved exhibitors.
 */

const mongoose = require('mongoose');

const BOOTH_STATUSES = ['available', 'reserved', 'allocated', 'occupied', 'maintenance'];
const BOOTH_TYPES = ['standard', 'corner', 'island', 'premium'];
const DIMENSION_UNITS = ['meters', 'feet'];

const boothSchema = new mongoose.Schema(
  {
    expo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expo',
      required: [true, 'Expo ID is required'],
      index: true,
    },
    boothNumber: {
      type: String,
      required: [true, 'Booth number/identifier is required'],
      trim: true,
      maxlength: [50, 'Booth number cannot exceed 50 characters'],
    },
    dimensions: {
      width: {
        type: Number,
        min: [1, 'Width must be at least 1'],
        default: 3,
      },
      length: {
        type: Number,
        min: [1, 'Length must be at least 1'],
        default: 3,
      },
      unit: {
        type: String,
        enum: {
          values: DIMENSION_UNITS,
          message: '{VALUE} is not a valid unit. Allowed: ' + DIMENSION_UNITS.join(', '),
        },
        default: 'meters',
      },
    },
    zone: {
      type: String,
      trim: true,
      default: 'General',
    },
    type: {
      type: String,
      enum: {
        values: BOOTH_TYPES,
        message: '{VALUE} is not a valid booth type. Allowed: ' + BOOTH_TYPES.join(', '),
      },
      default: 'standard',
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: BOOTH_STATUSES,
        message: '{VALUE} is not a valid booth status. Allowed: ' + BOOTH_STATUSES.join(', '),
      },
      default: 'available',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExhibitorApplication',
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate booth numbers in the same expo
boothSchema.index({ expo: 1, boothNumber: 1 }, { unique: true });
boothSchema.index({ expo: 1, status: 1 });

// Prevent duplicate booth allocations for the same exhibitor within an expo at DB constraint level
boothSchema.index(
  { expo: 1, assignedTo: 1 },
  { unique: true, partialFilterExpression: { assignedTo: { $type: 'objectId' } } }
);

boothSchema.statics.STATUSES = BOOTH_STATUSES;
boothSchema.statics.TYPES = BOOTH_TYPES;
boothSchema.statics.UNITS = DIMENSION_UNITS;

const Booth = mongoose.model('Booth', boothSchema);

module.exports = Booth;
