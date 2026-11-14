/**
 * ExhibitorProfile.js — Exhibitor Profile model
 *
 * Represents company details, products/services, and documents
 * for an exhibitor user.
 */

const mongoose = require('mongoose');

const productSubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Product description cannot exceed 1000 characters'],
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const documentSubSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'Document URL is required'],
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const exhibitorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Associated User ID is required'],
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters long'],
      maxlength: [200, 'Company name cannot exceed 200 characters'],
      index: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
      default: '',
    },
    companyDescription: {
      type: String,
      required: [true, 'Company description is required'],
      trim: true,
      maxlength: [3000, 'Company description cannot exceed 3000 characters'],
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      index: true,
    },
    contactPerson: {
      name: {
        type: String,
        trim: true,
        default: '',
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
      },
      phone: {
        type: String,
        trim: true,
        default: '',
      },
    },
    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    products: [productSubSchema],
    documents: [documentSubSchema],
    /**
     * Task 11: Optional city/country location for directory filtering.
     * Additive field — no existing code is affected.
     */
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
      default: '',
      index: true,
    },

  },
  {
    timestamps: true,
  }
);

const ExhibitorProfile = mongoose.model('ExhibitorProfile', exhibitorProfileSchema);

module.exports = ExhibitorProfile;
