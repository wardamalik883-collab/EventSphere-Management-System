/**
 * userController.js — User & Profile Management Controllers
 *
 * Implements:
 *  - getMe: View own profile
 *  - updateMe: Update permitted profile fields (whitelisted, no role escalation)
 *  - updateAvatar: Upload and associate avatar image with profile
 *  - getAllUsers: Admin user list with search, filtering, and pagination
 *  - getUserById: Admin user detail lookup
 *  - updateUserStatus: Admin account activation/deactivation (prevents deactivating last admin)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const { escapeRegex } = require('../utils/sanitize');

/**
 * GET /api/users/me
 * Retrieves caller's profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: user.toSafeObject ? user.toSafeObject() : user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me
 * Updates caller's permitted profile fields
 */
const updateMe = async (req, res, next) => {
  try {
    const user = req.user;
    const { name, phone, avatarUrl } = req.body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Name must be at least 2 characters long',
        });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Name cannot exceed 100 characters',
        });
      }
      user.name = name.trim();
    }

    // Update phone if provided
    if (phone !== undefined) {
      user.phone = typeof phone === 'string' ? phone.trim() : '';
    }

    // Update avatarUrl if provided directly
    if (avatarUrl !== undefined) {
      user.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
    }

    // Explicitly prevent mass-assignment of role, isActive, or password
    // (req.body.role, req.body.isActive, req.body.password are ignored)

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/me/avatar
 * Uploads a profile picture and stores its path in avatarUrl
 */
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Please provide an image file with key "avatar"',
      });
    }

    const user = req.user;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Optionally cleanup old local avatar if it was stored locally
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const oldPath = path.resolve(__dirname, '../../', user.avatarUrl.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (unlinkErr) {
          // Log but do not fail the request
          console.warn('[AVATAR] Could not remove old avatar:', unlinkErr.message);
        }
      }
    }

    user.avatarUrl = avatarUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        avatarUrl,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users
 * Admin-only: Paginated user list with search and filter
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    // Search by name or email with regex escaping against ReDoS
    if (req.query.search && typeof req.query.search === 'string') {
      const sanitizedSearch = escapeRegex(req.query.search.trim());
      if (sanitizedSearch) {
        const searchRegex = new RegExp(sanitizedSearch, 'i');
        filter.$or = [{ name: searchRegex }, { email: searchRegex }];
      }
    }

    // Filter by role
    if (req.query.role && User.ROLES.includes(req.query.role)) {
      filter.role = req.query.role;
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Execute query with projection excluding password
    const [users, totalDocs] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      meta: {
        page,
        limit,
        totalDocs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Admin-only: Retrieve user details by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      data: {
        user: user.toSafeObject ? user.toSafeObject() : user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/status
 * Admin-only: Activate or deactivate a user account
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid user ID format',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Please provide a valid boolean isActive field (true or false)',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'User not found',
      });
    }

    // Safety check: Prevent deactivating the last active administrator
    if (targetUser.role === 'admin' && isActive === false) {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        isActive: true,
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Operation forbidden: Cannot deactivate the last active administrator account',
        });
      }
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: targetUser.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
  getAllUsers,
  getUserById,
  updateUserStatus,
};
