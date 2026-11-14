/**
 * ExpoDetailPage.jsx — Expo Details View
 *
 * Displays full details of a single expo.
 * Shows edit/delete actions for authorized owners (organizer owner, admin).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExpoById, deleteExpo } from '../services/expoService';
import ExpoScheduleSection from '../components/ExpoScheduleSection';
import ExpoFeedbackSection from '../components/ExpoFeedbackSection';
import ExpoReportModal from '../components/ExpoReportModal';
import '../styles/ExpoDetailPage.css';


const STATUS_COLORS = {
  draft:     '#94a3b8',
  published: '#22c55e',
  ongoing:   '#3b82f6',
  completed: '#8b5cf6',
  cancelled: '#ef4444',
};

function StatusBadge({ status }) {
  return (
    <span className="detail-status-badge" style={{ background: STATUS_COLORS[status] || '#94a3b8' }}>
      {status}
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="detail-info-row">
      <span className="detail-info-icon">{icon}</span>
      <div>
        <span className="detail-info-label">{label}</span>
        <span className="detail-info-value">{value}</span>
      </div>
    </div>
  );
}

const ExpoDetailPage = ({ expoId, onNavigate }) => {
  const { user, role } = useAuth();
  const [expo, setExpo]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const fetchExpo = useCallback(async () => {
    if (!expoId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getExpoById(expoId);
      setExpo(result.data);
    } catch (err) {
      setError(err.message || 'Failed to load expo');
    } finally {
      setLoading(false);
    }
  }, [expoId]);

  useEffect(() => {
    fetchExpo();
  }, [fetchExpo]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${expo?.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteExpo(expoId);
      onNavigate('expo-list');
    } catch (err) {
      const msg = err.data?.message || err.message || 'Delete failed';
      setDeleteError(msg);
      setDeleting(false);
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

  // Check if current user can edit/delete this expo
  const isOwner = expo && user && expo.organizer?._id?.toString() === user._id?.toString();
  const canManage = role === 'admin' || isOwner;

  if (loading) {
    return (
      <div className="expo-detail-loading">
        <div className="expo-spinner" />
        <p>Loading expo details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="expo-detail-error">
        <span className="error-icon">⚠️</span>
        <h2>Unable to Load Expo</h2>
        <p>{error}</p>
        <div className="detail-error-actions">
          <button className="btn-primary" onClick={fetchExpo}>Retry</button>
          <button className="btn-secondary" onClick={() => onNavigate('expo-list')}>Back to List</button>
        </div>
      </div>
    );
  }

  if (!expo) return null;

  return (
    <div className="expo-detail-layout">
      {/* Breadcrumb */}
      <div className="detail-breadcrumb">
        <button className="btn-link" onClick={() => onNavigate('expo-list')}>← Expo Management</button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{expo.title}</span>
      </div>

      {/* Hero Banner */}
      {expo.bannerUrl && (
        <div className="detail-banner">
          <img src={expo.bannerUrl} alt={`${expo.title} banner`} onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
        </div>
      )}

      {/* Title Row */}
      <div className="detail-title-row">
        <div className="detail-title-block">
          <h1 className="detail-title">{expo.title}</h1>
          {expo.theme && <p className="detail-theme">🏷️ {expo.theme}</p>}
          <div className="detail-badges">
            <StatusBadge status={expo.status} />
            <span className="detail-category-badge">📂 {expo.category}</span>
          </div>
        </div>
        {canManage ? (
          <div className="detail-manage-actions">
            <button
              className="btn-primary"
              onClick={() => onNavigate('organizer-sessions', { expoId: expo._id })}
            >
              📅 Sessions & Schedule
            </button>
            <button
              className="btn-secondary"
              onClick={() => onNavigate('organizer-booths', { expoId: expo._id })}
            >
              🗺️ Floor Plan & Booths
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowReportModal(true)}
            >
              📊 Performance Report
            </button>
            <button
              className="btn-secondary"
              onClick={() => onNavigate('expo-edit', { expoId: expo._id })}
            >
              ✏️ Edit Expo
            </button>
            <button
              className="btn-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : '🗑️ Delete'}
            </button>
          </div>
        ) : ['published', 'ongoing'].includes(expo.status) && (
          <div className="detail-manage-actions">
            <button
              className="btn-primary"
              onClick={() => onNavigate('attendee-browse')}
            >
              🎟️ Register Attendee Pass
            </button>
            <button
              className="btn-secondary"
              onClick={() => onNavigate('expo-schedule', { expoId: expo._id })}
            >
              📅 View Event Schedule
            </button>
          </div>
        )}
      </div>

      {/* Delete Error */}
      {deleteError && (
        <div className="detail-delete-error">
          <strong>⚠️ Cannot delete:</strong> {deleteError}
        </div>
      )}

      <div className="detail-content-grid">
        {/* Left: Description + Info + Schedule */}
        <div className="detail-main">
          <section className="detail-section">
            <h2 className="detail-section-title">About This Expo</h2>
            <p className="detail-description">{expo.description}</p>
          </section>

          {/* Task 09: Schedule & Sessions Embedded Section */}
          <ExpoScheduleSection
            expoId={expo._id}
            canManage={canManage}
            onNavigate={onNavigate}
          />

          {/* Task 12: Expo Reviews & Feedback Section */}
          <ExpoFeedbackSection expoId={expo._id} />


          {/* Organizer Info */}
          {expo.organizer && (
            <section className="detail-section">
              <h2 className="detail-section-title">Organizer</h2>
              <div className="detail-organizer-card">
                {expo.organizer.avatarUrl ? (
                  <img className="organizer-avatar" src={expo.organizer.avatarUrl} alt={expo.organizer.name} />
                ) : (
                  <div className="organizer-avatar organizer-avatar-placeholder">
                    {expo.organizer.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="organizer-name">{expo.organizer.name}</p>
                  <p className="organizer-email">{expo.organizer.email}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right: Details card */}
        <aside className="detail-sidebar">
          <div className="detail-info-card">
            <h3 className="detail-card-title">Event Details</h3>
            <InfoRow icon="📅" label="Start Date" value={fmtDate(expo.startDate)} />
            <InfoRow icon="📅" label="End Date" value={fmtDate(expo.endDate)} />
            <InfoRow icon="📍" label="Venue" value={expo.location?.venue} />
            <InfoRow icon="🏙️" label="City" value={expo.location?.city} />
            <InfoRow icon="🌍" label="Country" value={expo.location?.country} />
            {expo.location?.address && (
              <InfoRow icon="🗺️" label="Address" value={expo.location.address} />
            )}
            {expo.capacity > 0 && (
              <InfoRow icon="👥" label="Capacity" value={`${expo.capacity.toLocaleString()} attendees`} />
            )}
          </div>

          <div className="detail-info-card">
            <h3 className="detail-card-title">System Info</h3>
            <InfoRow
              icon="🕐"
              label="Created"
              value={expo.createdAt ? new Date(expo.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            />
            <InfoRow
              icon="🔄"
              label="Last Updated"
              value={expo.updatedAt ? new Date(expo.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            />
          </div>
        </aside>
      </div>

      {showReportModal && (
        <ExpoReportModal
          expoId={expo._id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default ExpoDetailPage;
