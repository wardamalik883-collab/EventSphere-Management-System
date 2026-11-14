/**
 * notificationService.js — In-App Notifications API Service
 * Task 12: Notification fetching, unread count, read receipts, and deletion.
 */

import api from './api';

/**
 * Get paginated notifications for the current user.
 * @param {object} [params] - { page, limit, unreadOnly, type }
 */
export const getNotifications = (params = {}) =>
  api.get('/notifications', { params });

/**
 * Fast lookup for unread notifications count.
 */
export const getUnreadCount = () =>
  api.get('/notifications/unread-count');

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 */
export const markNotificationAsRead = (notificationId) =>
  api.patch(`/notifications/${notificationId}/read`);

/**
 * Mark all notifications for the current user as read.
 */
export const markAllNotificationsAsRead = () =>
  api.patch('/notifications/read-all');

/**
 * Delete a notification.
 * @param {string} notificationId
 */
export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`);
