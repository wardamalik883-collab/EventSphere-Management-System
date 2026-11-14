/**
 * analyticsController.js — Platform & Expo Analytics Controller
 *
 * Implements high-performance MongoDB aggregations for:
 *  - Admin platform overview & timeseries trends
 *  - Organizer-scoped expo overview & trends (strictly isolated)
 *  - Individual expo performance reports (drill-down with capacity, booth, and feedback metrics)
 *
 * Security:
 *  - Admin endpoints strictly require role === 'admin'
 *  - Organizer endpoints strictly scope queries to expos where organizer === req.user._id
 *  - Expo performance report strictly verifies caller is admin or expo's owning organizer
 *  - Date range filters are validated to prevent invalid queries
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Expo = require('../models/Expo');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const Session = require('../models/Session');
const AttendeeRegistration = require('../models/AttendeeRegistration');
const Feedback = require('../models/Feedback');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Helper: Parse and validate date range from query parameters.
 * Supports: 'today', '7d', '30d', '90d', 'year', 'all', or custom startDate & endDate.
 */
function parseDateRange(query) {
  const { period = '30d', startDate, endDate } = query;
  const now = new Date();
  let start = null;
  let end = new Date(now.getTime());

  if (period === 'custom') {
    if (!startDate || !endDate) {
      throw new Error('Both startDate and endDate are required for custom date range');
    }
    start = new Date(startDate);
    end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format provided for custom date range');
    }
    if (start > end) {
      throw new Error('startDate cannot be after endDate');
    }
    // Set end to the end of that day (23:59:59.999)
    end.setHours(23, 59, 59, 999);
  } else if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  } else if (period === '7d') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === '90d') {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else if (period === 'all') {
    start = new Date(0); // Epoch
  } else {
    // Default 30d
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end, period };
}

function formatLocalYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper: Build an array of date-grouped counts from an aggregation result, filling missing dates with 0.
 */
function buildDailyTimeline(aggregatedData, startDate, endDate) {
  const map = {};
  aggregatedData.forEach((item) => {
    map[item._id] = item.count;
  });

  const timeline = [];
  const curr = new Date(startDate);
  curr.setHours(0, 0, 0, 0);

  const limitDate = new Date(endDate);
  limitDate.setHours(23, 59, 59, 999);

  // Avoid creating infinite loops if epoch was used
  const maxDays = 366;
  let daysCount = 0;

  while (curr <= limitDate && daysCount < maxDays) {
    const key = formatLocalYYYYMMDD(curr);
    timeline.push({
      date: key,
      count: map[key] || 0,
    });
    curr.setDate(curr.getDate() + 1);
    daysCount++;
  }

  return timeline;
}

exports.parseDateRange = parseDateRange;
exports.buildDailyTimeline = buildDailyTimeline;

// ─── ADMIN ANALYTICS ────────────────────────────────────────────────────────

/**
 * GET /api/analytics/admin/overview
 * Platform-wide aggregation covering users, expos, registrations, booths, feedback.
 */
exports.getAdminOverview = async (req, res, next) => {
  try {
    let dateFilter;
    try {
      dateFilter = parseDateRange(req.query);
    } catch (err) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: err.message,
      });
    }

    const { start, end } = dateFilter;
    const now = new Date();

    // Run parallel aggregation pipelines
    const [
      totalUsers,
      attendeesCount,
      exhibitorsCount,
      organizersCount,
      adminsCount,
      activeUsersCount,
      inactiveUsersCount,
      totalExpos,
      publishedExpos,
      draftExpos,
      ongoingExpos,
      completedExpos,
      cancelledExpos,
      totalRegistrations,
      confirmedRegistrations,
      cancelledRegistrations,
      totalApplications,
      approvedApplications,
      pendingApplications,
      rejectedApplications,
      totalBooths,
      availableBooths,
      allocatedBooths,
      occupiedBooths,
      totalFeedback,
      allRatings,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'attendee' }),
      User.countDocuments({ role: 'exhibitor' }),
      User.countDocuments({ role: 'organizer' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),

      Expo.countDocuments(),
      Expo.countDocuments({ status: 'published' }),
      Expo.countDocuments({ status: 'draft' }),
      Expo.countDocuments({ status: 'ongoing' }),
      Expo.countDocuments({ status: 'completed' }),
      Expo.countDocuments({ status: 'cancelled' }),

      AttendeeRegistration.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      AttendeeRegistration.countDocuments({ status: 'confirmed', createdAt: { $gte: start, $lte: end } }),
      AttendeeRegistration.countDocuments({ status: 'cancelled', createdAt: { $gte: start, $lte: end } }),

      ExhibitorApplication.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      ExhibitorApplication.countDocuments({ status: 'approved', createdAt: { $gte: start, $lte: end } }),
      ExhibitorApplication.countDocuments({ status: 'pending', createdAt: { $gte: start, $lte: end } }),
      ExhibitorApplication.countDocuments({ status: 'rejected', createdAt: { $gte: start, $lte: end } }),

      Booth.countDocuments(),
      Booth.countDocuments({ status: 'available' }),
      Booth.countDocuments({ status: 'allocated' }),
      Booth.countDocuments({ status: 'occupied' }),

      Feedback.countDocuments(),
      Feedback.find().select('rating').lean(),
    ]);

    // Calculate rating metrics
    let averageRating = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (allRatings.length > 0) {
      const sum = allRatings.reduce((acc, curr) => {
        ratingDistribution[curr.rating] = (ratingDistribution[curr.rating] || 0) + 1;
        return acc + curr.rating;
      }, 0);
      averageRating = Number((sum / allRatings.length).toFixed(1));
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Admin overview analytics retrieved successfully',
      data: {
        period: dateFilter.period,
        dateRange: { start, end },
        users: {
          total: totalUsers,
          attendees: attendeesCount,
          exhibitors: exhibitorsCount,
          organizers: organizersCount,
          admins: adminsCount,
          active: activeUsersCount,
          inactive: inactiveUsersCount,
        },
        expos: {
          total: totalExpos,
          published: publishedExpos,
          draft: draftExpos,
          ongoing: ongoingExpos,
          completed: completedExpos,
          cancelled: cancelledExpos,
        },
        registrations: {
          totalInRange: totalRegistrations,
          confirmed: confirmedRegistrations,
          cancelled: cancelledRegistrations,
        },
        applications: {
          totalInRange: totalApplications,
          approved: approvedApplications,
          pending: pendingApplications,
          rejected: rejectedApplications,
        },
        booths: {
          total: totalBooths,
          available: availableBooths,
          allocated: allocatedBooths,
          occupied: occupiedBooths,
          occupancyRate: totalBooths > 0
            ? Number((((allocatedBooths + occupiedBooths) / totalBooths) * 100).toFixed(1))
            : 0,
        },
        feedback: {
          total: totalFeedback,
          averageRating,
          ratingDistribution,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/admin/trends
 * Timeseries trend data for user registrations, expo creations, and attendee registrations.
 */
exports.getAdminTrends = async (req, res, next) => {
  try {
    let dateFilter;
    try {
      dateFilter = parseDateRange(req.query);
    } catch (err) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: err.message,
      });
    }

    const { start, end } = dateFilter;

    // Aggregate daily user signups
    const userSignups = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate daily attendee registrations
    const attendeeRegistrations = await AttendeeRegistration.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate daily expo creations
    const expoCreations = await Expo.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Admin trends retrieved successfully',
      data: {
        period: dateFilter.period,
        userSignups: buildDailyTimeline(userSignups, start, end),
        attendeeRegistrations: buildDailyTimeline(attendeeRegistrations, start, end),
        expoCreations: buildDailyTimeline(expoCreations, start, end),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── ORGANIZER ANALYTICS ────────────────────────────────────────────────────

/**
 * GET /api/analytics/organizer/overview
 * Metrics strictly scoped to expos owned by the authenticated organizer.
 */
exports.getOrganizerOverview = async (req, res, next) => {
  try {
    const organizerId = req.user._id;

    let dateFilter;
    try {
      dateFilter = parseDateRange(req.query);
    } catch (err) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: err.message,
      });
    }

    const { start, end } = dateFilter;

    // Optional specific expo filter
    const expoFilter = { organizer: organizerId };
    if (req.query.expoId && isValidObjectId(req.query.expoId)) {
      expoFilter._id = req.query.expoId;
    }

    // Get list of matching expo IDs
    const organizerExpos = await Expo.find(expoFilter).select('_id title status capacity').lean();
    const expoIds = organizerExpos.map((e) => e._id);

    // If organizer has no expos
    if (expoIds.length === 0) {
      return res.status(200).json({
        success: true,
        status: 'success',
        statusCode: 200,
        message: 'Organizer analytics retrieved successfully',
        data: {
          exposCount: 0,
          expos: [],
          registrations: { total: 0, confirmed: 0, cancelled: 0 },
          applications: { total: 0, approved: 0, pending: 0, rejected: 0, approvalRate: 0 },
          booths: { total: 0, available: 0, allocated: 0, occupancyRate: 0 },
          sessions: { total: 0 },
          feedback: { total: 0, averageRating: 0 },
        },
      });
    }

    // Run parallel aggregations scoped strictly to expoIds
    const [
      totalRegistrations,
      confirmedRegistrations,
      cancelledRegistrations,
      totalApplications,
      approvedApplications,
      pendingApplications,
      rejectedApplications,
      totalBooths,
      availableBooths,
      allocatedBooths,
      totalSessions,
      allRatings,
    ] = await Promise.all([
      AttendeeRegistration.countDocuments({ expo: { $in: expoIds }, createdAt: { $gte: start, $lte: end } }),
      AttendeeRegistration.countDocuments({ expo: { $in: expoIds }, status: 'confirmed', createdAt: { $gte: start, $lte: end } }),
      AttendeeRegistration.countDocuments({ expo: { $in: expoIds }, status: 'cancelled', createdAt: { $gte: start, $lte: end } }),

      ExhibitorApplication.countDocuments({ expo: { $in: expoIds }, createdAt: { $gte: start, $lte: end } }),
      ExhibitorApplication.countDocuments({ expo: { $in: expoIds }, status: 'approved', createdAt: { $gte: start, $lte: end } }),
      ExhibitorApplication.countDocuments({ expo: { $in: expoIds }, status: 'pending', createdAt: { $gte: start, $lte: end } }),
      ExhibitorApplication.countDocuments({ expo: { $in: expoIds }, status: 'rejected', createdAt: { $gte: start, $lte: end } }),

      Booth.countDocuments({ expo: { $in: expoIds } }),
      Booth.countDocuments({ expo: { $in: expoIds }, status: 'available' }),
      Booth.countDocuments({ expo: { $in: expoIds }, status: { $in: ['allocated', 'occupied'] } }),

      Session.countDocuments({ expo: { $in: expoIds }, status: { $ne: 'cancelled' } }),

      Feedback.find({ expo: { $in: expoIds } }).select('rating').lean(),
    ]);

    // Rating calculation
    let averageRating = 0;
    if (allRatings.length > 0) {
      const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = Number((sum / allRatings.length).toFixed(1));
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Organizer analytics retrieved successfully',
      data: {
        period: dateFilter.period,
        exposCount: organizerExpos.length,
        exposList: organizerExpos,
        registrations: {
          total: totalRegistrations,
          confirmed: confirmedRegistrations,
          cancelled: cancelledRegistrations,
        },
        applications: {
          total: totalApplications,
          approved: approvedApplications,
          pending: pendingApplications,
          rejected: rejectedApplications,
          approvalRate: totalApplications > 0
            ? Number(((approvedApplications / totalApplications) * 100).toFixed(1))
            : 0,
        },
        booths: {
          total: totalBooths,
          available: availableBooths,
          allocated: allocatedBooths,
          occupancyRate: totalBooths > 0
            ? Number(((allocatedBooths / totalBooths) * 100).toFixed(1))
            : 0,
        },
        sessions: {
          total: totalSessions,
        },
        feedback: {
          total: allRatings.length,
          averageRating,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/organizer/trends
 * Timeseries trends for an organizer's owned expos.
 */
exports.getOrganizerTrends = async (req, res, next) => {
  try {
    const organizerId = req.user._id;

    let dateFilter;
    try {
      dateFilter = parseDateRange(req.query);
    } catch (err) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: err.message,
      });
    }

    const { start, end } = dateFilter;

    // Optional expoId filter
    const expoFilter = { organizer: organizerId };
    if (req.query.expoId && isValidObjectId(req.query.expoId)) {
      expoFilter._id = req.query.expoId;
    }

    const expoIds = await Expo.find(expoFilter).distinct('_id');

    // Daily registrations for organizer's expos
    const registrations = await AttendeeRegistration.aggregate([
      { $match: { expo: { $in: expoIds }, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily exhibitor applications for organizer's expos
    const applications = await ExhibitorApplication.aggregate([
      { $match: { expo: { $in: expoIds }, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Organizer trends retrieved successfully',
      data: {
        period: dateFilter.period,
        registrations: buildDailyTimeline(registrations, start, end),
        applications: buildDailyTimeline(applications, start, end),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── EXPO PERFORMANCE REPORT ───────────────────────────────────────────────

/**
 * GET /api/analytics/expos/:expoId
 * Comprehensive performance report for an individual expo.
 * Only accessible by admin or the expo's owning organizer.
 */
exports.getExpoPerformanceReport = async (req, res, next) => {
  try {
    const { expoId } = req.params;

    if (!isValidObjectId(expoId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid Expo ID format',
      });
    }

    const expo = await Expo.findById(expoId).populate('organizer', 'name email phone').lean();
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Authorization check: must be admin or owning organizer
    const isOwner = expo.organizer && expo.organizer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You are not authorized to view this expo performance report',
      });
    }

    // Run parallel metrics gathering for this expo
    const [
      totalRegistrations,
      confirmedRegistrations,
      cancelledRegistrations,
      checkedInRegistrations,
      registrationTimeline,
      totalApplications,
      approvedApplications,
      pendingApplications,
      rejectedApplications,
      totalBooths,
      availableBooths,
      allocatedBooths,
      totalSessions,
      sessionRooms,
      allFeedback,
    ] = await Promise.all([
      AttendeeRegistration.countDocuments({ expo: expo._id }),
      AttendeeRegistration.countDocuments({ expo: expo._id, status: 'confirmed' }),
      AttendeeRegistration.countDocuments({ expo: expo._id, status: 'cancelled' }),
      AttendeeRegistration.countDocuments({ expo: expo._id, status: 'checked_in' }),

      AttendeeRegistration.aggregate([
        { $match: { expo: expo._id } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      ExhibitorApplication.countDocuments({ expo: expo._id }),
      ExhibitorApplication.countDocuments({ expo: expo._id, status: 'approved' }),
      ExhibitorApplication.countDocuments({ expo: expo._id, status: 'pending' }),
      ExhibitorApplication.countDocuments({ expo: expo._id, status: 'rejected' }),

      Booth.countDocuments({ expo: expo._id }),
      Booth.countDocuments({ expo: expo._id, status: 'available' }),
      Booth.countDocuments({ expo: expo._id, status: { $in: ['allocated', 'occupied'] } }),

      Session.countDocuments({ expo: expo._id, status: { $ne: 'cancelled' } }),
      Session.find({ expo: expo._id, status: { $ne: 'cancelled' } }).distinct('room'),

      Feedback.find({ expo: expo._id }).select('rating category comment createdAt').lean(),
    ]);

    // Calculate rating stats
    let averageRating = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (allFeedback.length > 0) {
      const sum = allFeedback.reduce((acc, curr) => {
        ratingDistribution[curr.rating] = (ratingDistribution[curr.rating] || 0) + 1;
        return acc + curr.rating;
      }, 0);
      averageRating = Number((sum / allFeedback.length).toFixed(1));
    }

    // Capacity utilization
    const capacity = expo.capacity || 0;
    const activeAttendees = confirmedRegistrations + checkedInRegistrations;
    const capacityUtilization = capacity > 0
      ? Number(((activeAttendees / capacity) * 100).toFixed(1))
      : 0;

    // Booth occupancy
    const boothOccupancy = totalBooths > 0
      ? Number(((allocatedBooths / totalBooths) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Expo performance report retrieved successfully',
      data: {
        expo: {
          _id: expo._id,
          title: expo.title,
          category: expo.category,
          startDate: expo.startDate,
          endDate: expo.endDate,
          location: expo.location,
          status: expo.status,
          capacity,
          organizer: expo.organizer
            ? { _id: expo.organizer._id, name: expo.organizer.name, email: expo.organizer.email }
            : null,
          createdAt: expo.createdAt,
        },
        metrics: {
          registrations: {
            total: totalRegistrations,
            confirmed: confirmedRegistrations,
            checkedIn: checkedInRegistrations,
            cancelled: cancelledRegistrations,
            capacityUtilization,
            isCapacityReached: capacity > 0 && activeAttendees >= capacity,
          },
          applications: {
            total: totalApplications,
            approved: approvedApplications,
            pending: pendingApplications,
            rejected: rejectedApplications,
            approvalRate: totalApplications > 0
              ? Number(((approvedApplications / totalApplications) * 100).toFixed(1))
              : 0,
          },
          booths: {
            total: totalBooths,
            available: availableBooths,
            allocated: allocatedBooths,
            occupancyRate: boothOccupancy,
          },
          sessions: {
            total: totalSessions,
            roomsCount: sessionRooms.length,
          },
          feedback: {
            total: allFeedback.length,
            averageRating,
            ratingDistribution,
          },
        },
        registrationTimeline,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};
