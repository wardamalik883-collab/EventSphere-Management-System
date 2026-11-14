/**
 * User.js — User model for EventSphere Management
 *
 * Represents all authenticated participants across the system.
 * Supported roles:
 *  - 'admin'      : Platform-level administration
 *  - 'organizer'  : Organizes and manages expos, schedules, booths
 *  - 'exhibitor'  : Applies for expos, manages booth & company profile
 *  - 'attendee'   : Discovers events, registers, bookmarks sessions
 *
 * Implements bcrypt password hashing, credential comparison,
 * and safe serialization (password stripped).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'organizer', 'exhibitor', 'attendee'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    role: {
      type: String,
      required: [true, 'User role is required'],
      enum: {
        values: ROLES,
        message: '{VALUE} is not a valid user role. Allowed roles: ' + ROLES.join(', '),
      },
      default: 'attendee',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Hash password with bcrypt before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next ? next() : undefined;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (next) next();
});

// Instance method: Verify entered password against stored bcrypt hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method: Return safe user object omitting password
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    avatarUrl: this.avatarUrl,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Transform toJSON output to ensure password hash is never leaked
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

userSchema.statics.ROLES = ROLES;

const User = mongoose.model('User', userSchema);

module.exports = User;
