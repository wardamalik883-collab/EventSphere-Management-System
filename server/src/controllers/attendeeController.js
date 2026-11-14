/**
 * attendeeController.js — Attendee Experience & Expo Registration Controller
 *
 * Implements:
 *  - getAttendeeDashboard : Real DB metrics (total, upcoming, past, recent registrations, featured expos)
 *  - browseExpos          : Searchable, filterable, sorted directory of published expos
 *  - getMyRegistrations   : List logged-in attendee's registrations with expo details
 *  - registerForExpo      : Create registration with duplicate, capacity & date validation
 *  - getRegistrationById  : Single registration details with tenant isolation
 *  - cancelRegistration   : Allows attendee to cancel their registration
 */

const mongoose = require('mongoose');
const AttendeeRegistration = require('../models/AttendeeRegistration');
const Expo = require('../models/Expo');
const Notification = require('../models/Notification');

/** Helper: generate unique registration number */
const generateRegistrationNumber = () => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ES-REG-${timePart}-${randPart}`;
};

/** Helper: validate MongoDB ObjectId */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/attendees/dashboard
 * Aggregated statistics for the authenticated attendee.
 */
const getAttendeeDashboard = async (req, res, next) => {
  try {
    const attendeeId = req.user._id;
    const now = new Date();

    const [allRegistrations, recentAvailableExpos] = await Promise.all([
      AttendeeRegistration.find({ attendee: attendeeId })
        .populate('expo', 'title startDate endDate status location category bannerUrl')
        .sort({ createdAt: -1 }),
      Expo.find({ status: { $in: ['published', 'ongoing'] }, endDate: { $gte: now } })
        .sort({ startDate: 1 })
        .limit(4)
        .select('title description category startDate endDate location bannerUrl status capacity'),
    ]);

    let upcomingCount = 0;
    let pastCount = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;

    allRegistrations.forEach((reg) => {
      if (reg.status === 'cancelled') {
        cancelledCount++;
      } else {
        confirmedCount++;
        if (reg.expo?.endDate && new Date(reg.expo.endDate) >= now) {
          upcomingCount++;
        } else {
          pastCount++;
        }
      }
    });

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      data: {
        stats: {
          totalRegistrations: allRegistrations.length,
          confirmedCount,
          upcomingCount,
          pastCount,
          cancelledCount,
        },
        recentRegistrations: allRegistrations.slice(0, 5),
        featuredExpos: recentAvailableExpos,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendees/expos
 * Attendee discovery interface for published and ongoing expos.
 */
const browseExpos = async (req, res, next) => {
  try {
    const { search, category, location, venue, date, sort, page = 1, limit = 12 } = req.query;

    const filter = {
      status: { $in: ['published', 'ongoing'] },
    };

    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { theme: searchRegex },
        { 'location.venue': searchRegex },
        { 'location.city': searchRegex },
      ];
    }

    if (category) {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (location || venue) {
      const locStr = (location || venue).trim();
      const locRegex = { $regex: locStr, $options: 'i' };
      filter.$or = [
        { 'location.city': locRegex },
        { 'location.venue': locRegex },
        { 'location.country': locRegex },
      ];
    }

    if (date) {
      const targetDate = new Date(date);
      if (!isNaN(targetDate.getTime())) {
        filter.startDate = { $lte: targetDate };
        filter.endDate = { $gte: targetDate };
      }
    }

    // Sorting
    let sortQuery = { startDate: 1 };
    if (sort === 'date_desc') sortQuery = { startDate: -1 };
    if (sort === 'title_asc') sortQuery = { title: 1 };
    if (sort === 'title_desc') sortQuery = { title: -1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, expos] = await Promise.all([
      Expo.countDocuments(filter),
      Expo.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum)
        .populate('organizer', 'name email avatarUrl'),
    ]);

    // If caller is authenticated, mark which expos they're already registered for
    let registeredExpoIds = new Set();
    if (req.user) {
      const userRegs = await AttendeeRegistration.find({
        attendee: req.user._id,
        status: { $in: ['confirmed', 'checked_in'] },
      }).select('expo');
      userRegs.forEach((r) => registeredExpoIds.add(r.expo.toString()));
    }

    const exposWithRegistrationFlag = expos.map((exp) => ({
      ...exp.toObject(),
      isRegistered: registeredExpoIds.has(exp._id.toString()),
    }));

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      data: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
        expos: exposWithRegistrationFlag,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendees/registrations
 * List registrations belonging to the authenticated attendee.
 */
const getMyRegistrations = async (req, res, next) => {
  try {
    const attendeeId = req.user._id;
    const { status, search } = req.query;

    const filter = { attendee: attendeeId };
    if (status) {
      filter.status = status;
    }

    const registrations = await AttendeeRegistration.find(filter)
      .populate({
        path: 'expo',
        select: 'title description startDate endDate status location category bannerUrl',
      })
      .sort({ createdAt: -1 });

    // In-memory search filter by expo title if search query is provided
    let results = registrations;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = registrations.filter(
        (r) =>
          r.expo?.title?.toLowerCase().includes(q) ||
          r.registrationNumber?.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      count: results.length,
      data: { registrations: results },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendees/registrations
 * Register for an expo.
 */
const registerForExpo = async (req, res, next) => {
  try {
    const attendeeId = req.user._id;
    const { expoId, registrationType, notes } = req.body;

    if (!expoId) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Expo ID is required',
      });
    }

    if (!isValidObjectId(expoId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid Expo ID format',
      });
    }

    const expo = await Expo.findById(expoId);
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Rejection rule: unpublished or cancelled expos
    if (!['published', 'ongoing'].includes(expo.status)) {
      return res.status(422).json({
        success: false,
        status: 'fail',
        statusCode: 422,
        message: `Registration is not open for this expo (current status: ${expo.status})`,
      });
    }

    // Date check: expo has ended
    const now = new Date();
    if (new Date(expo.endDate) < now) {
      return res.status(422).json({
        success: false,
        status: 'fail',
        statusCode: 422,
        message: 'Registration is closed: This expo has already concluded',
      });
    }

    // Check duplicate registration
    const existingReg = await AttendeeRegistration.findOne({
      expo: expo._id,
      attendee: attendeeId,
    });

    if (existingReg) {
      if (['confirmed', 'checked_in'].includes(existingReg.status)) {
        return res.status(409).json({
          success: false,
          status: 'fail',
          statusCode: 409,
          message: 'You are already registered for this expo',
          data: { registration: existingReg },
        });
      }

      // If previously cancelled, re-activate registration
      if (existingReg.status === 'cancelled') {
        existingReg.status = 'confirmed';
        existingReg.registrationType = registrationType || existingReg.registrationType || 'standard';
        existingReg.notes = notes !== undefined ? notes.trim() : existingReg.notes;
        await existingReg.save();
        await existingReg.populate('expo', 'title startDate endDate location status');

        // Notification
        await Notification.create({
          recipient: attendeeId,
          type: 'status_update',
          title: 'Expo Registration Re-Activated',
          message: `Your registration for "${expo.title}" is now confirmed. Reference: ${existingReg.registrationNumber}`,
          data: { expoId: expo._id, registrationId: existingReg._id },
        });

        return res.status(200).json({
          success: true,
          status: 'success',
          statusCode: 200,
          message: 'Registration re-activated successfully',
          data: { registration: existingReg },
        });
      }
    }

    // Capacity validation
    if (expo.capacity && expo.capacity > 0) {
      const activeCount = await AttendeeRegistration.countDocuments({
        expo: expo._id,
        status: { $in: ['confirmed', 'checked_in'] },
      });
      if (activeCount >= expo.capacity) {
        return res.status(422).json({
          success: false,
          status: 'fail',
          statusCode: 422,
          message: 'This expo has reached maximum attendee capacity',
        });
      }
    }

    const regNumber = generateRegistrationNumber();
    const registration = await AttendeeRegistration.create({
      expo: expo._id,
      attendee: attendeeId,
      registrationNumber: regNumber,
      registrationType: registrationType || 'standard',
      status: 'confirmed',
      notes: notes ? notes.trim() : '',
    });

    await registration.populate('expo', 'title startDate endDate location status category');

    // In-app Notification for attendee
    await Notification.create({
      recipient: attendeeId,
      type: 'status_update',
      title: 'Registration Confirmed',
      message: `You are registered for "${expo.title}". Your registration code is ${regNumber}.`,
      data: { expoId: expo._id, registrationId: registration._id },
    });

    return res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'Registration successful! See you at the expo.',
      data: { registration },
    });
  } catch (error) {
    // Catch MongoDB duplicate key error code 11000
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        status: 'fail',
        statusCode: 409,
        message: 'You are already registered for this expo',
      });
    }
    next(error);
  }
};

/**
 * GET /api/attendees/registrations/:id
 * Retrieve single registration detail with tenant ownership guard.
 */
const getRegistrationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid registration ID format',
      });
    }

    const registration = await AttendeeRegistration.findById(id).populate({
      path: 'expo',
      select: 'title description startDate endDate status location category bannerUrl organizer',
      populate: { path: 'organizer', select: 'name email' },
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Registration not found',
      });
    }

    // Ownership check: must be owner or admin
    const isOwner = registration.attendee.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only view your own registrations',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      data: { registration },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/attendees/registrations/:id/cancel
 * Cancel an active registration.
 */
const cancelRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid registration ID format',
      });
    }

    const registration = await AttendeeRegistration.findById(id).populate('expo', 'title');
    if (!registration) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Registration not found',
      });
    }

    // Ownership guard
    const isOwner = registration.attendee.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only cancel your own registrations',
      });
    }

    if (registration.status === 'cancelled') {
      return res.status(422).json({
        success: false,
        status: 'fail',
        statusCode: 422,
        message: 'This registration is already cancelled',
      });
    }

    registration.status = 'cancelled';
    await registration.save();

    // In-app Notification for attendee
    try {
      await registration.populate('expo', 'title');
      await Notification.create({
        recipient: registration.attendee,
        type: 'registration_cancelled',
        title: 'Registration Cancelled',
        message: `Your registration for "${registration.expo?.title || 'the expo'}" has been cancelled.`,
        relatedId: registration.expo?._id || null,
        relatedType: 'Expo',
        data: { registrationId: registration._id },
      });
    } catch {
      // Non-fatal notification failure
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Registration cancelled successfully',
      data: { registration },
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendeeDashboard,
  browseExpos,
  getMyRegistrations,
  registerForExpo,
  getRegistrationById,
  cancelRegistration,
};
