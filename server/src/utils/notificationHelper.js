/**
 * notificationHelper.js — Centralized In-App Notification Dispatcher
 *
 * Provides a standardized, non-fatal helper to dispatch notifications to users.
 * Supports all Task 12 event types:
 *  - registration_confirmed / registration_cancelled
 *  - application_update / booth_assigned
 *  - expo_reminder / session_reminder
 *  - schedule_change / expo_update / announcement / general
 */

const Notification = require('../models/Notification');

/**
 * Creates and saves an in-app notification for a recipient user.
 * Non-fatal: if notification creation fails, it logs a warning but never throws,
 * preventing notification errors from breaking core business operations.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.recipient - Target User ID
 * @param {string} params.title - Short, descriptive title
 * @param {string} params.message - Detailed notification message
 * @param {string} [params.type='general'] - One of Notification.TYPES
 * @param {string|mongoose.Types.ObjectId} [params.relatedId=null] - Related entity ID
 * @param {string} [params.relatedType=null] - 'Expo' | 'Session' | 'Booth' | 'ExhibitorApplication' | 'AttendeeRegistration' | 'Feedback'
 * @param {object} [params.data={}] - Optional metadata payload (e.g. { eventDate, passCode })
 * @returns {Promise<object|null>} The created Notification document, or null on error
 */
async function sendNotification({
  recipient,
  title,
  message,
  type = 'general',
  relatedId = null,
  relatedType = null,
  data = {},
}) {
  if (!recipient || !title || !message) {
    return null;
  }

  try {
    const notification = await Notification.create({
      recipient,
      title: title.trim(),
      message: message.trim(),
      type,
      relatedId: relatedId || null,
      relatedType: relatedType || null,
      data: data || {},
    });
    return notification;
  } catch (err) {
    // Log non-fatal error
    console.warn(`[NOTIFICATION] Warning: Could not create notification: ${err.message}`);
    return null;
  }
}

module.exports = {
  sendNotification,
};
