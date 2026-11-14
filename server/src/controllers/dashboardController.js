/**
 * dashboardController.js — Admin and Organizer Dashboard Statistics
 *
 * Provides real MongoDB-aggregated analytics and operational overviews
 * for authorized Administrators and Organizers.
 *
 * Strict RBAC:
 *  - /api/dashboard/admin     -> admin only
 *  - /api/dashboard/organizer -> organizer only (scoped strictly to organizer's owned data)
 */

const User = require('../models/User');
const Expo = require('../models/Expo');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Notification = require('../models/Notification');

/**
 * GET /api/dashboard/admin
 * Admin-only overview of platform users, role distributions, system status, and recent activity.
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const now = new Date();

    // Query platform-wide statistics concurrently
    const [
      totalUsers,
      totalAttendees,
      totalExhibitors,
      totalOrganizers,
      totalAdmins,
      totalActiveUsers,
      totalInactiveUsers,
      totalExpos,
      totalApplications,
      recentUsers,
      recentNotifications,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'attendee' }),
      User.countDocuments({ role: 'exhibitor' }),
      User.countDocuments({ role: 'organizer' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      Expo.countDocuments().catch(() => 0),
      ExhibitorApplication.countDocuments().catch(() => 0),
      User.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select('_id name email role phone avatarUrl isActive createdAt')
        .lean(),
      Notification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('recipient', 'name email role')
        .lean()
        .catch(() => []),
    ]);

    // Calculate percentage distribution for roles
    const safeTotal = totalUsers > 0 ? totalUsers : 1;
    const roleDistribution = [
      {
        role: 'attendee',
        label: 'Attendees',
        count: totalAttendees,
        percentage: Number(((totalAttendees / safeTotal) * 100).toFixed(1)),
      },
      {
        role: 'exhibitor',
        label: 'Exhibitors',
        count: totalExhibitors,
        percentage: Number(((totalExhibitors / safeTotal) * 100).toFixed(1)),
      },
      {
        role: 'organizer',
        label: 'Organizers',
        count: totalOrganizers,
        percentage: Number(((totalOrganizers / safeTotal) * 100).toFixed(1)),
      },
      {
        role: 'admin',
        label: 'Administrators',
        count: totalAdmins,
        percentage: Number(((totalAdmins / safeTotal) * 100).toFixed(1)),
      },
    ];

    // Compile recent system activities from real database records
    const recentActivities = [];

    // Map recent user registrations to activity events
    recentUsers.slice(0, 5).forEach((u) => {
      recentActivities.push({
        id: `user-${u._id}`,
        type: 'user_registration',
        title: 'New User Registered',
        description: `${u.name} registered as ${u.role}`,
        timestamp: u.createdAt,
        user: {
          id: u._id,
          name: u.name,
          role: u.role,
        },
      });
    });

    // Map system notifications to activity events if present
    recentNotifications.forEach((n) => {
      recentActivities.push({
        id: `notif-${n._id}`,
        type: n.type || 'system_notification',
        title: n.title,
        description: n.message,
        timestamp: n.createdAt,
        user: n.recipient
          ? {
              id: n.recipient._id,
              name: n.recipient.name,
              role: n.recipient.role,
            }
          : null,
      });
    });

    // Sort combined activities descending by timestamp
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      message: 'Admin dashboard statistics retrieved successfully',
      data: {
        stats: {
          totalUsers,
          totalAttendees,
          totalExhibitors,
          totalOrganizers,
          totalAdmins,
          totalActiveUsers,
          totalInactiveUsers,
          totalExpos,
          totalApplications,
        },
        roleDistribution,
        statusDistribution: {
          active: totalActiveUsers,
          inactive: totalInactiveUsers,
          activePercentage: Number(((totalActiveUsers / safeTotal) * 100).toFixed(1)),
          inactivePercentage: Number(((totalInactiveUsers / safeTotal) * 100).toFixed(1)),
        },
        recentUsers,
        recentActivities: recentActivities.slice(0, 8),
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/organizer
 * Organizer-specific overview of owned expos, application statuses, and relevant activities.
 * Strictly scoped to the authenticated organizer's data (req.user._id).
 */
exports.getOrganizerDashboard = async (req, res, next) => {
  try {
    const organizerId = req.user._id;
    const now = new Date();

    // 1. Query organizer's expos
    const [
      totalExpos,
      upcomingExpos,
      ongoingExpos,
      completedExpos,
      draftExpos,
      publishedExpos,
      recentExpos,
      organizerExpoIds,
    ] = await Promise.all([
      Expo.countDocuments({ organizer: organizerId }),
      Expo.countDocuments({ organizer: organizerId, startDate: { $gt: now } }),
      Expo.countDocuments({
        organizer: organizerId,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      Expo.countDocuments({ organizer: organizerId, endDate: { $lt: now } }),
      Expo.countDocuments({ organizer: organizerId, status: 'draft' }),
      Expo.countDocuments({ organizer: organizerId, status: 'published' }),
      Expo.find({ organizer: organizerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id title category startDate endDate status capacity location')
        .lean(),
      Expo.find({ organizer: organizerId }).distinct('_id'),
    ]);

    // 2. Query exhibitor applications for this organizer's expos
    let totalApplications = 0;
    let pendingApplications = 0;
    let approvedApplications = 0;
    let rejectedApplications = 0;
    let recentApplications = [];

    if (organizerExpoIds && organizerExpoIds.length > 0) {
      const [total, pending, approved, rejected, applicationsList] = await Promise.all([
        ExhibitorApplication.countDocuments({ expo: { $in: organizerExpoIds } }),
        ExhibitorApplication.countDocuments({
          expo: { $in: organizerExpoIds },
          status: 'pending',
        }),
        ExhibitorApplication.countDocuments({
          expo: { $in: organizerExpoIds },
          status: 'approved',
        }),
        ExhibitorApplication.countDocuments({
          expo: { $in: organizerExpoIds },
          status: 'rejected',
        }),
        ExhibitorApplication.find({ expo: { $in: organizerExpoIds } })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('exhibitor', 'name email phone avatarUrl')
          .populate('expo', 'title category startDate endDate')
          .lean(),
      ]);

      totalApplications = total;
      pendingApplications = pending;
      approvedApplications = approved;
      rejectedApplications = rejected;
      recentApplications = applicationsList;
    }

    // 3. Query organizer's notifications / activities
    const recentNotifications = await Notification.find({ recipient: organizerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .catch(() => []);

    // 4. Synthesize relevant activities
    const recentActivities = [];

    recentExpos.forEach((expo) => {
      recentActivities.push({
        id: `expo-${expo._id}`,
        type: 'expo_created',
        title: 'Expo Managed',
        description: `Expo "${expo.title}" (${expo.status})`,
        timestamp: expo.createdAt || now,
        relatedId: expo._id,
      });
    });

    recentApplications.forEach((app) => {
      recentActivities.push({
        id: `app-${app._id}`,
        type: 'application_received',
        title: 'Exhibitor Application',
        description: `${app.exhibitor ? app.exhibitor.name : 'Exhibitor'} applied to "${app.expo ? app.expo.title : 'Expo'}" (${app.status})`,
        timestamp: app.createdAt || now,
        relatedId: app._id,
      });
    });

    recentNotifications.forEach((n) => {
      recentActivities.push({
        id: `notif-${n._id}`,
        type: n.type || 'notification',
        title: n.title,
        description: n.message,
        timestamp: n.createdAt,
        relatedId: n.relatedId || null,
      });
    });

    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({
      success: true,
      message: 'Organizer dashboard statistics retrieved successfully',
      data: {
        organizer: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone,
          avatarUrl: req.user.avatarUrl,
        },
        stats: {
          totalExpos,
          upcomingExpos,
          ongoingExpos,
          completedExpos,
          draftExpos,
          publishedExpos,
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
        },
        expoStatusDistribution: [
          { status: 'upcoming', label: 'Upcoming', count: upcomingExpos },
          { status: 'ongoing', label: 'Ongoing', count: ongoingExpos },
          { status: 'completed', label: 'Completed', count: completedExpos },
          { status: 'draft', label: 'Draft', count: draftExpos },
        ],
        applicationStatusDistribution: [
          { status: 'pending', label: 'Pending', count: pendingApplications },
          { status: 'approved', label: 'Approved', count: approvedApplications },
          { status: 'rejected', label: 'Rejected', count: rejectedApplications },
        ],
        recentExpos,
        recentApplications,
        recentActivities: recentActivities.slice(0, 8),
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
