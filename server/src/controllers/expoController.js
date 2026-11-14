/**
 * expoController.js — Expo Management CRUD Controller
 *
 * Implements create, read, update, and delete operations for Expo resources.
 *
 * RBAC Rules:
 *  - POST   /api/expos          — organizer, admin
 *  - GET    /api/expos          — organizer (own), admin (all), public (published)
 *  - GET    /api/expos/:id      — organizer (own), admin (all), public (if published)
 *  - PATCH  /api/expos/:id      — organizer (own), admin (any)
 *  - DELETE /api/expos/:id      — organizer (own), admin (any)
 *
 * Security:
 *  - Organizer ID is always taken from req.user._id — never trusted from request body.
 *  - Prevents IDOR: organizers can only modify/delete their own expos.
 *  - Deletion is blocked when related records exist (applications, booths, sessions, registrations).
 *  - Input is validated; invalid/missing ObjectIds return 400/404.
 */

const mongoose = require('mongoose');
const Expo = require('../models/Expo');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const Session = require('../models/Session');
const AttendeeRegistration = require('../models/AttendeeRegistration');
const { escapeRegex } = require('../utils/sanitize');

/** Allowed fields for status transitions (enforced transitions) */
const VALID_STATUS_TRANSITIONS = {
  draft: ['draft', 'published', 'cancelled'],
  published: ['published', 'ongoing', 'cancelled', 'draft'],
  ongoing: ['ongoing', 'completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

/** Fields a client can supply when creating or updating an expo */
const ALLOWED_WRITE_FIELDS = [
  'title', 'description', 'theme', 'category',
  'startDate', 'endDate', 'location', 'status', 'bannerUrl', 'capacity',
];

/**
 * Validate that a string is a well-formed MongoDB ObjectId.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Pick only allowed fields from a source object.
 */
function pickAllowedFields(source, allowed) {
  const result = {};
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  });
  return result;
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * POST /api/expos
 * Create a new expo. Organizer ID is taken exclusively from req.user._id.
 * @access organizer, admin
 */
exports.createExpo = async (req, res, next) => {
  try {
    const fields = pickAllowedFields(req.body, ALLOWED_WRITE_FIELDS);

    // Always assign organizer from authenticated user (never from body)
    fields.organizer = req.user._id;

    // Admins creating on behalf of an organizer may pass organizerId
    // but only admins can override — organizers always use own ID
    if (req.user.role === 'admin' && req.body.organizerId) {
      if (!isValidObjectId(req.body.organizerId)) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Invalid organizerId format',
        });
      }
      fields.organizer = req.body.organizerId;
    }

    const expo = await Expo.create(fields);

    return res.status(201).json({
      success: true,
      message: 'Expo created successfully',
      data: expo,
    });
  } catch (error) {
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Expo validation failed',
        errors,
      });
    }
    next(error);
  }
};

// ─── LIST ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/expos
 * List expos. Admin sees all; organizer sees own; unauthenticated/other roles see published only.
 *
 * Query params: page, limit, search, status, category, sort
 * @access public (published only), organizer (own), admin (all)
 */
exports.listExpos = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category,
      sort = '-createdAt',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    // Role-based scope
    if (!req.user) {
      // Public: only published expos
      filter.status = 'published';
    } else if (req.user.role === 'organizer') {
      // Organizer: only their own expos
      filter.organizer = req.user._id;
    } else if (req.user.role === 'admin') {
      // Admin: all expos (no extra filter)
    } else {
      // Exhibitor / Attendee: published expos only
      filter.status = 'published';
    }

    // Additional filters (can narrow down from role scope)
    const isPrivileged = req.user && (req.user.role === 'admin' || req.user.role === 'organizer');
    if (status) {
      const validStatuses = Expo.STATUSES || ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: `Invalid status '${status}'. Allowed: ${validStatuses.join(', ')}`,
        });
      }
      // Non-privileged users (public, attendee, exhibitor) cannot view draft expos
      if (!isPrivileged && status === 'draft') {
        return res.status(403).json({
          success: false,
          status: 'error',
          statusCode: 403,
          message: 'Access denied: You do not have permission to view draft expos',
        });
      }
      filter.status = status;
    }

    if (category && typeof category === 'string') {
      filter.category = { $regex: escapeRegex(category.trim()), $options: 'i' };
    }

    if (search && typeof search === 'string') {
      filter.title = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    // Sorting (prefix - for descending)
    const sortOrder = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    sortOrder[sortField] = sort.startsWith('-') ? -1 : 1;

    const [expos, total] = await Promise.all([
      Expo.find(filter)
        .sort(sortOrder)
        .skip(skip)
        .limit(limitNum)
        .populate('organizer', 'name email avatarUrl')
        .lean(),
      Expo.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Expos retrieved successfully',
      data: expos,
      meta: {
        page: pageNum,
        limit: limitNum,
        totalDocs: total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────

/**
 * GET /api/expos/:id
 * Retrieve a single expo by ID.
 * - Public / attendee / exhibitor: published expos only
 * - Organizer: own expos only
 * - Admin: any expo
 * @access public (published), organizer (own), admin (any)
 */
exports.getExpoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid expo ID format',
      });
    }

    const expo = await Expo.findById(id)
      .populate('organizer', 'name email phone avatarUrl')
      .lean();

    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Role-based visibility
    if (!req.user) {
      if (expo.status !== 'published') {
        return res.status(404).json({
          success: false,
          status: 'error',
          statusCode: 404,
          message: 'Expo not found',
        });
      }
    } else if (req.user.role === 'organizer') {
      if (expo.organizer._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          status: 'error',
          statusCode: 403,
          message: 'Access denied: You can only view your own expos',
        });
      }
    } else if (req.user.role !== 'admin') {
      // exhibitor / attendee
      if (expo.status !== 'published' && expo.status !== 'ongoing') {
        return res.status(404).json({
          success: false,
          status: 'error',
          statusCode: 404,
          message: 'Expo not found',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Expo retrieved successfully',
      data: expo,
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * PATCH /api/expos/:id
 * Update an expo. Organizer can only update own expos; admin can update any.
 * Validates status transitions.
 * @access organizer (own), admin (any)
 */
exports.updateExpo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid expo ID format',
      });
    }

    const expo = await Expo.findById(id);

    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Ownership check for organizers
    if (req.user.role === 'organizer') {
      if (expo.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          status: 'error',
          statusCode: 403,
          message: 'Access denied: You can only update your own expos',
        });
      }
    }

    const updates = pickAllowedFields(req.body, ALLOWED_WRITE_FIELDS);

    // Prevent changing organizer via update
    delete updates.organizer;

    // Validate status transition if status is being changed
    if (updates.status && updates.status !== expo.status) {
      const allowedNext = VALID_STATUS_TRANSITIONS[expo.status] || [];
      if (!allowedNext.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: `Invalid status transition from '${expo.status}' to '${updates.status}'. Allowed transitions: ${allowedNext.join(', ')}`,
        });
      }
    }

    // Apply updates
    Object.assign(expo, updates);

    try {
      await expo.save();
    } catch (saveError) {
      if (saveError.name === 'ValidationError') {
        const errors = Object.values(saveError.errors).map((e) => ({
          field: e.path,
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Expo validation failed',
          errors,
        });
      }
      throw saveError;
    }

    // Re-fetch with populated organizer for response
    const updated = await Expo.findById(id).populate('organizer', 'name email avatarUrl').lean();

    return res.status(200).json({
      success: true,
      message: 'Expo updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/expos/:id
 * Delete an expo. Blocked if related records exist (applications, booths, sessions, registrations).
 * Organizer can only delete own expos; admin can delete any.
 * @access organizer (own), admin (any)
 */
exports.deleteExpo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid expo ID format',
      });
    }

    const expo = await Expo.findById(id);

    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Ownership check for organizers
    if (req.user.role === 'organizer') {
      if (expo.organizer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          status: 'error',
          statusCode: 403,
          message: 'Access denied: You can only delete your own expos',
        });
      }
    }

    // Data integrity: check for related records before deletion
    const [appCount, boothCount, sessionCount, registrationCount] = await Promise.all([
      ExhibitorApplication.countDocuments({ expo: id }),
      Booth.countDocuments({ expo: id }),
      Session.countDocuments({ expo: id }),
      AttendeeRegistration.countDocuments({ expo: id }),
    ]);

    const relatedCounts = {
      exhibitorApplications: appCount,
      booths: boothCount,
      sessions: sessionCount,
      attendeeRegistrations: registrationCount,
    };

    const totalRelated = appCount + boothCount + sessionCount + registrationCount;

    if (totalRelated > 0) {
      return res.status(422).json({
        success: false,
        status: 'error',
        statusCode: 422,
        message:
          'Cannot delete expo: related records exist. Remove all exhibitor applications, booths, sessions, and attendee registrations before deleting this expo, or archive it by setting status to "cancelled".',
        data: { relatedCounts },
      });
    }

    await Expo.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Expo deleted successfully',
      data: { deletedId: id },
    });
  } catch (error) {
    next(error);
  }
};
