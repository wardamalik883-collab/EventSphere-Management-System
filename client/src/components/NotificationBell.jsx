/**
 * NotificationBell.jsx — Navbar Notification Bell with Dropdown
 * Task 12: Displays live unread count badge and quick-view notification panel.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getUnreadCount,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import '../styles/NotificationBell.css';

const TYPE_ICONS = {
  registration_confirmed: '🎟️',
  registration_cancelled: '❌',
  application_update:     '📋',
  booth_assigned:         '🏢',
  session_reminder:       '⏰',
  expo_reminder:          '📅',
  schedule_change:        '🔄',
  expo_update:            '📢',
  announcement:           '📣',
  system:                 '⚙️',
  general:                '🔔',
};

const NotificationBell = ({ onNavigate }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.data.data?.unreadCount || 0);
    } catch {
      // Silently fail if not logged in or offline
    }
  }, []);

  const fetchDropdownNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ page: 1, limit: 6 });
      setNotifications(res.data.data?.notifications || []);
      setUnreadCount(res.data.data?.unreadCount || 0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 45 seconds
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 45000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // When dropdown opens, fetch latest notifications
  useEffect(() => {
    if (isOpen) {
      fetchDropdownNotifications();
    }
  }, [isOpen, fetchDropdownNotifications]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Continue navigation
      }
    }

    setIsOpen(false);

    // Contextual navigation
    if (notification.relatedType === 'Expo' && notification.relatedId) {
      onNavigate('expo-detail', { expoId: notification.relatedId });
    } else if (notification.type === 'expo_reminder' && notification.relatedId) {
      onNavigate('expo-detail', { expoId: notification.relatedId });
    } else if (notification.type === 'session_reminder') {
      onNavigate('attendee-dashboard');
    } else {
      onNavigate('notifications');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="notif-bell-container" ref={dropdownRef}>
      <button
        className="notif-bell-btn"
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
      >
        <span className="notif-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h4 className="notif-dropdown-title">Notifications</h4>
            {unreadCount > 0 && (
              <button className="btn-mark-all-link" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-dropdown-body">
            {loading ? (
              <div className="notif-loading">
                <div className="dashboard-spinner" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty-state">
                <span className="notif-empty-icon">📭</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`notif-item ${!n.isRead ? 'notif-unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <span className="notif-type-icon">
                      {TYPE_ICONS[n.type] || '🔔'}
                    </span>
                    <div className="notif-text-wrap">
                      <p className="notif-item-title">{n.title}</p>
                      <p className="notif-item-message">{n.message}</p>
                      <span className="notif-time">{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    {!n.isRead && <span className="notif-unread-dot" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="notif-dropdown-footer">
            <button
              className="btn-view-all-notifs"
              onClick={() => {
                setIsOpen(false);
                onNavigate('notifications');
              }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
