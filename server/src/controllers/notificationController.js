/**
 * notificationController.js — In-App Notifications Controller
 *
 * Implements:
 *  - getNotifications     : Paginated notification history with unread/type filters
 *  - getUnreadCount       : Fast unread notifications count
 *  - markAsRead           : Mark a single notification as read
 *  - markAllAsRead        : Mark all notifications for the current user as read
 *  - deleteNotification   : Delete a notification belonging to the current user
 *
 * Security:
 *  - Tenant isolation: All queries strictly scoped to req.user._id
 *  - Ownership protection: Users cannot view, modify, or delete another user's notifications
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/notifications
 * Get paginated list of notifications for the authenticated user.
 * Query params: page, limit, unreadOnly, type
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const filter = { recipient: userId };

    if (req.query.unreadOnly === 'true' || req.query.unreadOnly === true) {
      filter.isRead = false;
    }

    if (req.query.type && req.query.type.trim()) {
      filter.type = req.query.type.trim();
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Fast endpoint to return the current user's unread notifications count.
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const count = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Unread count retrieved successfully',
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark an individual notification as read.
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid notification ID format',
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Notification not found',
      });
    }

    // Tenant / ownership check
    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only modify your own notifications',
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Notification marked as read',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for the authenticated user as read.
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: now } }
    );

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'All notifications marked as read',
      data: { markedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a notification belonging to the authenticated user.
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid notification ID format',
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Notification not found',
      });
    }

    // Tenant / ownership check
    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only delete your own notifications',
      });
    }

    await Notification.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Notification deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};
