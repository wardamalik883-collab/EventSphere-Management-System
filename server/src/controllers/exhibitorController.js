/**
 * exhibitorController.js — Exhibitor Portal & Applications Controller
 *
 * Covers:
 *  - Exhibitor profile create / read / update (exhibitor-scoped)
 *  - Exhibitor dashboard statistics
 *  - Browse published expos (exhibitor-facing, read-only)
 *  - Submit application to an expo
 *  - View own applications list / detail
 *  - Organizer: list / detail / review (approve / reject) applications for OWN expos
 *
 * Security rules:
 *  - User IDs always from req.user._id — never from request body
 *  - Exhibitors can only read/update their own profile
 *  - Exhibitors can only view their own applications
 *  - Organizers can only review applications for their own expos
 *  - Application status is NEVER accepted from the applicant
 *  - Duplicate applications blocked at DB level (unique index) and controller level
 */

const mongoose = require('mongoose');
const ExhibitorProfile = require('../models/ExhibitorProfile');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Expo = require('../models/Expo');
const Notification = require('../models/Notification');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Create a notification (non-fatal – errors are swallowed so they never break main flow) */
async function createNotification(recipient, title, message, relatedId, relatedType) {
  try {
    await Notification.create({
      recipient,
      title,
      message,
      type: 'application_update',
      relatedId: relatedId || null,
      relatedType: relatedType || null,
    });
  } catch {
    // Notification failure must not break the primary operation
  }
}

// ─── Exhibitor Profile ────────────────────────────────────────────────────────

/**
 * GET /api/exhibitors/me
 * Retrieve the authenticated exhibitor's own profile.
 * Returns 404 if no profile exists yet (exhibitor should create one first).
 */
exports.getMyProfile = async (req, res, next) => {
  try {
    const profile = await ExhibitorProfile.findOne({ user: req.user._id })
      .populate('user', 'name email phone avatarUrl')
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Exhibitor profile not found. Please create your profile first.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Exhibitor profile retrieved successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/exhibitors/profile
 * Create the exhibitor's profile. One profile per exhibitor (enforced by unique index on user).
 */
exports.createProfile = async (req, res, next) => {
  try {
    // Reject if profile already exists
    const existing = await ExhibitorProfile.findOne({ user: req.user._id });
    if (existing) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'Exhibitor profile already exists. Use PUT to update it.',
      });
    }

    const {
      companyName,
      companyDescription,
      companyWebsite,
      industry,
      contactPerson,
      logoUrl,
    } = req.body;

    const profile = await ExhibitorProfile.create({
      user: req.user._id, // Always from token
      companyName,
      companyDescription,
      companyWebsite: companyWebsite || '',
      industry,
      contactPerson: contactPerson || {},
      logoUrl: logoUrl || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Exhibitor profile created successfully',
      data: profile,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Profile validation failed',
        errors,
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'Exhibitor profile already exists for this account.',
      });
    }
    next(error);
  }
};

/**
 * PUT /api/exhibitors/profile
 * Update the exhibitor's own profile. User field is immutable.
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await ExhibitorProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Exhibitor profile not found. Create it first with POST /api/exhibitors/profile.',
      });
    }

    // Whitelist allowed update fields
    const ALLOWED = ['companyName', 'companyDescription', 'companyWebsite', 'industry', 'contactPerson', 'logoUrl'];
    ALLOWED.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        profile[key] = req.body[key];
      }
    });

    // user field is immutable — always stays as req.user._id
    profile.user = req.user._id;

    try {
      await profile.save();
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
          message: 'Profile validation failed',
          errors,
        });
      }
      throw saveError;
    }

    const updated = await ExhibitorProfile.findById(profile._id)
      .populate('user', 'name email phone avatarUrl')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Exhibitor profile updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Exhibitor Dashboard ─────────────────────────────────────────────────────

/**
 * GET /api/exhibitors/dashboard
 * Real-data dashboard statistics for the authenticated exhibitor.
 */
exports.getExhibitorDashboard = async (req, res, next) => {
  try {
    const exhibitorId = req.user._id;
    const now = new Date();

    const [
      profile,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      cancelledApplications,
      recentApplications,
    ] = await Promise.all([
      ExhibitorProfile.findOne({ user: exhibitorId }).lean(),
      ExhibitorApplication.countDocuments({ exhibitor: exhibitorId }),
      ExhibitorApplication.countDocuments({ exhibitor: exhibitorId, status: 'pending' }),
      ExhibitorApplication.countDocuments({ exhibitor: exhibitorId, status: 'approved' }),
      ExhibitorApplication.countDocuments({ exhibitor: exhibitorId, status: 'rejected' }),
      ExhibitorApplication.countDocuments({ exhibitor: exhibitorId, status: 'cancelled' }),
      ExhibitorApplication.find({ exhibitor: exhibitorId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('expo', 'title category startDate endDate status location')
        .lean(),
    ]);

    // Compute profile completion percentage
    let profileCompletion = 0;
    if (profile) {
      const fields = ['companyName', 'companyDescription', 'industry', 'logoUrl', 'companyWebsite'];
      const filled = fields.filter((f) => profile[f] && String(profile[f]).trim() !== '').length;
      const contactFields = ['name', 'email', 'phone'];
      const contactFilled = contactFields.filter(
        (f) => profile.contactPerson && profile.contactPerson[f] && String(profile.contactPerson[f]).trim() !== ''
      ).length;
      profileCompletion = Math.round(((filled + contactFilled) / (fields.length + contactFields.length)) * 100);
    }

    // Find upcoming expos from approved applications
    const approvedExpoIds = recentApplications
      .filter((a) => a.status === 'approved' && a.expo)
      .map((a) => a.expo._id);

    const upcomingExpos = await Expo.find({
      _id: { $in: approvedExpoIds },
      startDate: { $gte: now },
    })
      .sort({ startDate: 1 })
      .limit(3)
      .select('title category startDate endDate status location')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Exhibitor dashboard retrieved successfully',
      data: {
        exhibitor: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          avatarUrl: req.user.avatarUrl,
        },
        profile: profile || null,
        profileCompletion,
        stats: {
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          cancelledApplications,
        },
        recentApplications,
        upcomingExpos,
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Browse Published Expos ───────────────────────────────────────────────────

/**
 * GET /api/exhibitors/expos
 * Browse published and ongoing expos available for exhibitors to apply to.
 * Supports: search, category, status filter (limited to published/ongoing), pagination.
 */
exports.browseExpos = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      sort = 'startDate',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Exhibitors can only see published or ongoing expos
    const filter = { status: { $in: ['published', 'ongoing'] } };

    if (search) filter.title = { $regex: search.trim(), $options: 'i' };
    if (category) filter.category = { $regex: category.trim(), $options: 'i' };

    const sortOrder = {};
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    sortOrder[sortField] = sort.startsWith('-') ? -1 : 1;

    const [expos, total] = await Promise.all([
      Expo.find(filter)
        .sort(sortOrder)
        .skip(skip)
        .limit(limitNum)
        .populate('organizer', 'name email')
        .lean(),
      Expo.countDocuments(filter),
    ]);

    // For authenticated exhibitors, mark which expos they've already applied to
    let appliedExpoIds = new Set();
    if (req.user) {
      const myApps = await ExhibitorApplication.find({ exhibitor: req.user._id })
        .select('expo')
        .lean();
      appliedExpoIds = new Set(myApps.map((a) => a.expo.toString()));
    }

    const exposWithStatus = expos.map((expo) => ({
      ...expo,
      hasApplied: appliedExpoIds.has(expo._id.toString()),
    }));

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Available expos retrieved successfully',
      data: exposWithStatus,
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

// ─── Applications ─────────────────────────────────────────────────────────────

/**
 * POST /api/exhibitors/applications
 * Submit an application to an expo.
 * Rules:
 *  - Exhibitor must have a profile
 *  - Expo must exist and be in published/ongoing status
 *  - No duplicate applications (unique index on expo+exhibitor)
 *  - Status is always set to 'pending' (never from body)
 */
exports.submitApplication = async (req, res, next) => {
  try {
    const exhibitorId = req.user._id;
    const { expoId, boothPreference } = req.body;

    // Validate expoId
    if (!expoId || !isValidObjectId(expoId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Valid expo ID is required',
      });
    }

    // Check exhibitor has a profile
    const profile = await ExhibitorProfile.findOne({ user: exhibitorId });
    if (!profile) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'You must create an exhibitor profile before applying to expos.',
      });
    }

    // Check expo exists and is accepting applications
    const expo = await Expo.findById(expoId);
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    if (!['published', 'ongoing'].includes(expo.status)) {
      return res.status(422).json({
        success: false,
        status: 'error',
        statusCode: 422,
        message: `This expo is not currently accepting applications (status: ${expo.status}).`,
      });
    }

    // Check for duplicate application
    const existing = await ExhibitorApplication.findOne({
      expo: expoId,
      exhibitor: exhibitorId,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'You have already submitted an application for this expo.',
      });
    }

    // Build booth preference (from body, with safe defaults)
    const booth = {
      size: boothPreference?.size || 'medium',
      preferredLocation: boothPreference?.preferredLocation || '',
      specialRequirements: boothPreference?.specialRequirements || '',
    };

    const VALID_SIZES = ExhibitorApplication.BOOTH_SIZES || ['small', 'medium', 'large', 'custom'];
    if (!VALID_SIZES.includes(booth.size)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: `Invalid booth size. Allowed: ${VALID_SIZES.join(', ')}`,
      });
    }

    const application = await ExhibitorApplication.create({
      expo: expoId,
      exhibitor: exhibitorId,         // Always from token
      exhibitorProfile: profile._id,
      boothPreference: booth,
      status: 'pending',              // Always starts as pending
    });

    // Notify the organizer
    await createNotification(
      expo.organizer,
      'New Exhibitor Application',
      `${req.user.name} (${profile.companyName}) applied to "${expo.title}".`,
      application._id,
      'ExhibitorApplication'
    );

    const populated = await ExhibitorApplication.findById(application._id)
      .populate('expo', 'title category startDate endDate status')
      .populate('exhibitor', 'name email')
      .populate('exhibitorProfile', 'companyName industry')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'You have already submitted an application for this expo.',
      });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Application validation failed',
        errors,
      });
    }
    next(error);
  }
};

/**
 * GET /api/exhibitors/applications
 * List the authenticated exhibitor's own applications.
 * Supports: page, limit, status filter, search by expo title.
 */
exports.listMyApplications = async (req, res, next) => {
  try {
    const exhibitorId = req.user._id;
    const { page = 1, limit = 10, status, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = { exhibitor: exhibitorId };

    if (status) {
      const validStatuses = ExhibitorApplication.STATUSES || ['pending', 'approved', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: `Invalid status filter. Allowed: ${validStatuses.join(', ')}`,
        });
      }
      filter.status = status;
    }

    // Build base query
    let query = ExhibitorApplication.find(filter)
      .populate('expo', 'title category startDate endDate status location')
      .populate('exhibitorProfile', 'companyName industry')
      .sort({ createdAt: -1 });

    // Apply search after population (filter at application level first, then match expo title)
    const [applications, total] = await Promise.all([
      query.skip(skip).limit(limitNum).lean(),
      ExhibitorApplication.countDocuments(filter),
    ]);

    // Post-filter by expo title search if provided
    let filtered = applications;
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = applications.filter(
        (a) => a.expo && a.expo.title && a.expo.title.toLowerCase().includes(term)
      );
    }

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully',
      data: filtered,
      meta: {
        page: pageNum,
        limit: limitNum,
        totalDocs: search ? filtered.length : total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/exhibitors/applications/:id
 * Get a single application detail for the authenticated exhibitor.
 * Enforces ownership — exhibitor can only see their own application.
 */
exports.getMyApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid application ID format',
      });
    }

    const application = await ExhibitorApplication.findById(id)
      .populate('expo', 'title category startDate endDate status location organizer')
      .populate('exhibitorProfile', 'companyName industry companyDescription contactPerson')
      .populate('reviewedBy', 'name email')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Application not found',
      });
    }

    // Ownership check — exhibitor can only see their own
    if (application.exhibitor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: This application does not belong to you.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Application retrieved successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Organizer Application Review ─────────────────────────────────────────────

/**
 * GET /api/organizer/applications
 * List applications for all expos owned by the authenticated organizer.
 * Strictly scoped — organizers cannot see another organizer's applications.
 */
exports.listOrganizerApplications = async (req, res, next) => {
  try {
    const organizerId = req.user._id;
    const { page = 1, limit = 10, status, expoId } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Find organizer's own expo IDs
    let expoFilter = { organizer: organizerId };
    if (expoId) {
      if (!isValidObjectId(expoId)) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Invalid expo ID format',
        });
      }
      expoFilter._id = expoId;
    }

    const organizerExpos = await Expo.find(expoFilter).select('_id').lean();
    const organizerExpoIds = organizerExpos.map((e) => e._id);

    if (organizerExpoIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No applications found',
        data: [],
        meta: { page: pageNum, limit: limitNum, totalDocs: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      });
    }

    const filter = { expo: { $in: organizerExpoIds } };
    if (status) {
      const validStatuses = ExhibitorApplication.STATUSES || ['pending', 'approved', 'rejected', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: `Invalid status filter. Allowed: ${validStatuses.join(', ')}`,
        });
      }
      filter.status = status;
    }

    const [applications, total] = await Promise.all([
      ExhibitorApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('expo', 'title category startDate endDate status')
        .populate('exhibitor', 'name email phone avatarUrl')
        .populate('exhibitorProfile', 'companyName industry companyDescription contactPerson logoUrl')
        .populate('reviewedBy', 'name email')
        .lean(),
      ExhibitorApplication.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully',
      data: applications,
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

/**
 * GET /api/organizer/applications/:id
 * Get a single application detail for a specific application belonging to the organizer's expo.
 */
exports.getOrganizerApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid application ID format',
      });
    }

    const application = await ExhibitorApplication.findById(id)
      .populate('expo', 'title category startDate endDate status organizer location')
      .populate('exhibitor', 'name email phone avatarUrl')
      .populate('exhibitorProfile', 'companyName industry companyDescription contactPerson logoUrl products documents')
      .populate('reviewedBy', 'name email')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Application not found',
      });
    }

    // Verify expo belongs to this organizer
    const expoOrganizer = application.expo?.organizer;
    if (!expoOrganizer || expoOrganizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: This application is not for one of your expos.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Application retrieved successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/organizer/applications/:id/status
 * Approve or reject an application for the organizer's own expo.
 * Allowed transitions: pending → approved | rejected | cancelled
 * Records reviewedBy, reviewNotes, reviewedAt.
 */
exports.reviewApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid application ID format',
      });
    }

    const ALLOWED_REVIEW_STATUSES = ['approved', 'rejected', 'cancelled'];
    if (!status || !ALLOWED_REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: `Invalid review status. Allowed: ${ALLOWED_REVIEW_STATUSES.join(', ')}`,
      });
    }

    const application = await ExhibitorApplication.findById(id)
      .populate('expo', 'title organizer')
      .populate('exhibitor', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Application not found',
      });
    }

    // Verify expo belongs to this organizer
    if (!application.expo?.organizer || application.expo.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: This application is not for one of your expos.',
      });
    }

    // Only pending applications can be reviewed
    if (application.status !== 'pending') {
      return res.status(422).json({
        success: false,
        status: 'error',
        statusCode: 422,
        message: `Application is already ${application.status}. Only pending applications can be reviewed.`,
      });
    }

    application.status = status;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    application.reviewNotes = reviewNotes ? String(reviewNotes).trim() : '';

    await application.save();

    // Notify the exhibitor
    const expoTitle = application.expo?.title || 'the expo';
    const notifTitle = status === 'approved'
      ? '🎉 Application Approved!'
      : status === 'rejected'
      ? '❌ Application Not Approved'
      : '📋 Application Cancelled';
    const notifMsg = status === 'approved'
      ? `Your application to "${expoTitle}" has been approved. Welcome!`
      : status === 'rejected'
      ? `Your application to "${expoTitle}" was not approved.${reviewNotes ? ` Note: ${reviewNotes}` : ''}`
      : `Your application to "${expoTitle}" has been cancelled.`;

    if (application.exhibitor) {
      await createNotification(
        application.exhibitor._id || application.exhibitor,
        notifTitle,
        notifMsg,
        application._id,
        'ExhibitorApplication'
      );
    }

    const updated = await ExhibitorApplication.findById(id)
      .populate('expo', 'title category startDate endDate status')
      .populate('exhibitor', 'name email')
      .populate('exhibitorProfile', 'companyName industry')
      .populate('reviewedBy', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
