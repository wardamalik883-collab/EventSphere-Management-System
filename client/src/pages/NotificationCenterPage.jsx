/**
 * NotificationCenterPage.jsx — Full In-App Notification Center
 * Task 12: Paginated notification history, unread filter, mark as read, delete.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../services/notificationService';
import '../styles/NotificationCenterPage.css';

const TYPE_CONFIG = {
  registration_confirmed: { icon: '🎟️', badgeClass: 'badge-success', label: 'Registration' },
  registration_cancelled: { icon: '❌', badgeClass: 'badge-danger',  label: 'Cancellation' },
  application_update:     { icon: '📋', badgeClass: 'badge-info',    label: 'Application' },
  booth_assigned:         { icon: '🏢', badgeClass: 'badge-purple',  label: 'Booth' },
  session_reminder:       { icon: '⏰', badgeClass: 'badge-warning', label: 'Reminder' },
  expo_reminder:          { icon: '📅', badgeClass: 'badge-warning', label: 'Reminder' },
  schedule_change:        { icon: '🔄', badgeClass: 'badge-amber',   label: 'Schedule' },
  expo_update:            { icon: '📢', badgeClass: 'badge-info',    label: 'Expo Update' },
  announcement:           { icon: '📣', badgeClass: 'badge-purple',  label: 'Announcement' },
  system:                 { icon: '⚙️', badgeClass: 'badge-neutral', label: 'System' },
  general:                { icon: '🔔', badgeClass: 'badge-neutral', label: 'General' },
};

const NotificationCenterPage = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNotifications({
        page,
        limit: 15,
        unreadOnly: activeTab === 'unread',
      });
      setNotifications(res.data.data?.notifications || []);
      setUnreadCount(res.data.data?.unreadCount || 0);
      setPagination(res.data.data?.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleMarkRead = async (id) => {
    setActionLoadingId(id);
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (activeTab === 'unread') {
        fetchNotifs();
      }
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    setActionLoadingId(id);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete notification');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNavigateRelated = (n) => {
    if (n.relatedType === 'Expo' && n.relatedId) {
      onNavigate('expo-detail', { expoId: n.relatedId });
    } else if (n.type === 'expo_reminder' && n.relatedId) {
      onNavigate('expo-detail', { expoId: n.relatedId });
    } else if (n.type === 'session_reminder') {
      onNavigate('attendee-dashboard');
    } else if (n.type === 'application_update') {
      onNavigate('exhibitor-applications');
    } else if (n.type === 'booth_assigned') {
      onNavigate('exhibitor-booths');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="notif-center-page">
      {/* Page Header */}
      <div className="notif-center-header">
        <div>
          <h1 className="notif-center-title">🔔 Notification Center</h1>
          <p className="notif-center-subtitle">
            Stay updated with event alerts, schedule changes, and reminders.
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-mark-all-read" onClick={handleMarkAllRead}>
            ✓ Mark All as Read
          </button>
        )}
      </div>

      {/* Tabs / Filters */}
      <div className="notif-tabs-bar">
        <button
          className={`notif-tab ${activeTab === 'all' ? 'notif-tab-active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All Notifications
        </button>
        <button
          className={`notif-tab ${activeTab === 'unread' ? 'notif-tab-active' : ''}`}
          onClick={() => handleTabChange('unread')}
        >
          Unread {unreadCount > 0 && <span className="tab-pill">{unreadCount}</span>}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="notif-center-loading">
          <div className="dashboard-spinner" />
          <p>Loading notifications…</p>
        </div>
      ) : error ? (
        <div className="notif-center-error">
          <span>⚠️</span>
          <p>{error}</p>
          <button className="btn-retry" onClick={fetchNotifs}>
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notif-center-empty">
          <span className="notif-empty-big-icon">📭</span>
          <h3>No notifications found</h3>
          <p>
            {activeTab === 'unread'
              ? 'You have read all your notifications!'
              : 'You do not have any notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="notif-center-list">
          {notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
            return (
              <div
                key={n._id}
                className={`notif-card ${!n.isRead ? 'notif-card-unread' : ''}`}
              >
                <div className="notif-card-icon-wrap">
                  <span className="notif-card-icon">{cfg.icon}</span>
                </div>

                <div className="notif-card-content">
                  <div className="notif-card-top">
                    <div className="notif-card-title-group">
                      <span className={`notif-type-tag ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                      <h3 className="notif-card-title">{n.title}</h3>
                    </div>
                    <span className="notif-card-date">{formatDate(n.createdAt)}</span>
                  </div>

                  <p className="notif-card-message">{n.message}</p>

                  <div className="notif-card-actions">
                    {/* View context button if applicable */}
                    {(n.relatedId || n.type === 'expo_reminder' || n.type === 'session_reminder') && (
                      <button
                        className="btn-notif-action btn-notif-view"
                        onClick={() => handleNavigateRelated(n)}
                      >
                        View Details →
                      </button>
                    )}

                    {!n.isRead && (
                      <button
                        className="btn-notif-action btn-notif-mark"
                        onClick={() => handleMarkRead(n._id)}
                        disabled={actionLoadingId === n._id}
                      >
                        Mark as read
                      </button>
                    )}

                    <button
                      className="btn-notif-action btn-notif-delete"
                      onClick={() => handleDelete(n._id)}
                      disabled={actionLoadingId === n._id}
                      title="Delete notification"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="notif-pagination">
          <button
            className="btn-page"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn-page"
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenterPage;
