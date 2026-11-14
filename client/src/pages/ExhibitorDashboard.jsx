/**
 * ExhibitorDashboard.jsx — Exhibitor Portal Operations Dashboard
 *
 * Scoped strictly to the logged-in exhibitor's company profile,
 * applications, status overviews, and upcoming expos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExhibitorDashboardData } from '../services/exhibitorService';
import StatCard from '../components/StatCard';
import '../styles/ExhibitorDashboard.css';

const ExhibitorDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getExhibitorDashboardData();
      setData(result.data);
    } catch (err) {
      setError(err.message || 'Failed to load exhibitor dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="exhibitor-loading">
        <div className="exhibitor-spinner"></div>
        <p>Loading your exhibitor command center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exhibitor-error">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Exhibitor Dashboard</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="btn-primary" onClick={fetchDashboard}>Try Again</button>
            <button className="btn-secondary" onClick={() => onNavigate('landing')}>Return Home</button>
          </div>
        </div>
      </div>
    );
  }

  const {
    profile,
    profileCompletion,
    stats,
    recentApplications,
    upcomingExpos,
  } = data || {};

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'badge-approved';
      case 'rejected': return 'badge-rejected';
      case 'cancelled': return 'badge-cancelled';
      case 'pending':
      default: return 'badge-pending';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="exhibitor-layout">
      {/* Top Banner / Hero */}
      <section className="exhibitor-hero">
        <div className="hero-content">
          <div className="hero-profile-chip">
            {profile?.logoUrl ? (
              <img src={profile.logoUrl} alt="Logo" className="hero-company-logo" />
            ) : (
              <div className="hero-company-placeholder">
                {(profile?.companyName || user?.name || 'E').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hero-titles">
              <div className="hero-badge-row">
                <span className="hero-role-badge">EXHIBITOR PORTAL</span>
                {profile?.industry && (
                  <span className="hero-industry-badge">📂 {profile.industry}</span>
                )}
              </div>
              <h1 className="hero-heading">
                {profile?.companyName || user?.name || 'Welcome, Exhibitor'}
              </h1>
              <p className="hero-subtitle">
                Manage your expo participations, booth requests, and application statuses.
              </p>
            </div>
          </div>

          <div className="hero-actions">
            <button className="btn-primary" onClick={() => onNavigate('exhibitor-expos')}>
              🔎 Browse Expos
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('exhibitor-applications')}>
              📋 My Applications
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('exhibitor-profile')}>
              ⚙️ Company Profile
            </button>
          </div>
        </div>

        {/* Profile Completion Bar */}
        <div className="profile-completion-card">
          <div className="completion-header">
            <span>Profile Completion: <strong>{profileCompletion}%</strong></span>
            {profileCompletion < 100 && (
              <button className="btn-link" onClick={() => onNavigate('exhibitor-profile')}>
                Complete Profile →
              </button>
            )}
          </div>
          <div className="completion-bar-track">
            <div
              className="completion-bar-fill"
              style={{ width: `${profileCompletion}%` }}
            ></div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="exhibitor-section">
        <h2 className="section-title">Application Overview</h2>
        <div className="stats-grid">
          <StatCard
            label="Total Applications"
            value={stats?.totalApplications || 0}
            icon="📑"
            variant="default"
          />
          <StatCard
            label="Pending Review"
            value={stats?.pendingApplications || 0}
            icon="⏳"
            variant="warning"
          />
          <StatCard
            label="Approved"
            value={stats?.approvedApplications || 0}
            icon="✅"
            variant="success"
          />
          <StatCard
            label="Rejected"
            value={stats?.rejectedApplications || 0}
            icon="❌"
            variant="danger"
          />
        </div>
      </section>

      {/* Main Content Grid: Recent Applications & Upcoming Expos */}
      <div className="exhibitor-columns">
        {/* Left: Recent Applications */}
        <section className="exhibitor-section-card">
          <div className="section-header-row">
            <h2 className="section-title">Recent Applications</h2>
            {recentApplications?.length > 0 && (
              <button
                className="btn-link"
                onClick={() => onNavigate('exhibitor-applications')}
              >
                View All ({stats?.totalApplications || 0})
              </button>
            )}
          </div>

          {(!recentApplications || recentApplications.length === 0) ? (
            <div className="empty-panel">
              <span className="empty-icon">📂</span>
              <h3>No Applications Yet</h3>
              <p>Explore upcoming expos and submit your booth application today.</p>
              <button
                className="btn-primary"
                onClick={() => onNavigate('exhibitor-expos')}
              >
                Browse Published Expos
              </button>
            </div>
          ) : (
            <div className="applications-table-wrapper">
              <table className="exhibitor-table">
                <thead>
                  <tr>
                    <th>Expo Event</th>
                    <th>Category</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.map((app) => (
                    <tr key={app._id}>
                      <td className="table-title">
                        <strong>{app.expo?.title || 'Expo Event'}</strong>
                        <span className="table-sub">{app.expo?.location?.city || 'Location TBA'}</span>
                      </td>
                      <td>{app.expo?.category || 'General'}</td>
                      <td>{formatDate(app.createdAt)}</td>
                      <td>
                        <span className={`status-pill ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Upcoming Approved Expos */}
        <section className="exhibitor-section-card">
          <div className="section-header-row">
            <h2 className="section-title">Your Confirmed Expos</h2>
          </div>

          {(!upcomingExpos || upcomingExpos.length === 0) ? (
            <div className="empty-panel">
              <span className="empty-icon">🏛️</span>
              <h3>No Confirmed Expos</h3>
              <p>Applications approved by organizers will appear here with scheduling details.</p>
            </div>
          ) : (
            <div className="confirmed-expos-list">
              {upcomingExpos.map((expo) => (
                <div key={expo._id} className="confirmed-expo-card">
                  <div className="confirmed-expo-badge">CONFIRMED EXHIBITOR</div>
                  <h3 className="confirmed-expo-title">{expo.title}</h3>
                  <p className="confirmed-expo-meta">
                    📍 {expo.location?.venue}, {expo.location?.city}
                  </p>
                  <p className="confirmed-expo-date">
                    📅 {formatDate(expo.startDate)} – {formatDate(expo.endDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ExhibitorDashboard;
