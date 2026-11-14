/**
 * AttendeeDashboard.jsx — Attendee Home & Operational Overview
 *
 * Displays:
 *  - Welcome section with attendee name
 *  - Real DB metrics: Total registered expos, upcoming, past, cancelled
 *  - Quick action buttons (Browse Expos, My Registrations, Profile)
 *  - Active / upcoming registered expos stream
 *  - Featured published expos available for registration
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAttendeeDashboard } from '../services/attendeeService';
import '../styles/AttendeeDashboard.css';

const AttendeeDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAttendeeDashboard();
      setDashboardData(res.data);
    } catch (err) {
      setError(err.message || 'Unable to load attendee dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = dashboardData?.stats || {
    totalRegistrations: 0,
    confirmedCount: 0,
    upcomingCount: 0,
    pastCount: 0,
    cancelledCount: 0,
  };

  const recentRegistrations = dashboardData?.recentRegistrations || [];
  const featuredExpos = dashboardData?.featuredExpos || [];

  const formatDateRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="attendee-dash-layout">
        <div className="dash-loading-card">
          <div className="dash-spinner"></div>
          <p>Loading your event dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendee-dash-layout">
        <div className="dash-error-card">
          <span className="error-icon">⚠️</span>
          <h2>Dashboard Unavailable</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchDashboard}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="attendee-dash-layout">
      {/* Welcome Hero */}
      <section className="attendee-welcome-card">
        <div className="welcome-main">
          <div className="attendee-avatar-circle">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <span className="welcome-role-tag">ATTENDEE PORTAL</span>
            <h1>Welcome back, {user?.name || 'Attendee'}!</h1>
            <p className="welcome-sub">
              Track your registered trade shows, explore schedules, and discover upcoming industry expos.
            </p>
          </div>
        </div>

        <div className="welcome-quick-actions">
          {onNavigate && (
            <>
              <button
                className="btn-primary"
                onClick={() => onNavigate('attendee-browse')}
              >
                🔍 Browse All Expos
              </button>
              <button
                className="btn-secondary"
                onClick={() => onNavigate('attendee-registrations')}
              >
                🎟️ My Registrations
              </button>
              <button
                className="btn-secondary"
                onClick={() => onNavigate('notifications')}
              >
                🔔 Notifications
              </button>
            </>
          )}
        </div>
      </section>

      {/* Metrics Ribbon */}
      <section className="attendee-metrics-strip">
        <div className="metric-box">
          <span className="metric-lbl">Total Registrations</span>
          <strong className="metric-num">{stats.totalRegistrations}</strong>
          <span className="metric-desc">Lifetime expo sign-ups</span>
        </div>
        <div className="metric-box border-blue">
          <span className="metric-lbl">Upcoming Events</span>
          <strong className="metric-num text-blue">{stats.upcomingCount}</strong>
          <span className="metric-desc">Expos ahead</span>
        </div>
        <div className="metric-box border-green">
          <span className="metric-lbl">Confirmed Active</span>
          <strong className="metric-num text-green">{stats.confirmedCount}</strong>
          <span className="metric-desc">Valid passes</span>
        </div>
        <div className="metric-box border-purple">
          <span className="metric-lbl">Past Events</span>
          <strong className="metric-num text-purple">{stats.pastCount}</strong>
          <span className="metric-desc">Attended expos</span>
        </div>
      </section>

      {/* Main Grid: My Active Registrations & Available Expos */}
      <div className="dash-two-col-grid">
        {/* Left Column: My Registrations Stream */}
        <section className="dash-section-card">
          <div className="section-head">
            <div>
              <h2>🎟️ My Event Passes</h2>
              <p>Your confirmed and recent expo registrations</p>
            </div>
            {onNavigate && (
              <button
                className="btn-link-action"
                onClick={() => onNavigate('attendee-registrations')}
              >
                View All ({stats.totalRegistrations}) →
              </button>
            )}
          </div>

          {recentRegistrations.length === 0 ? (
            <div className="empty-stream-box">
              <span className="empty-icon">🎪</span>
              <h3>No Registrations Yet</h3>
              <p>You haven't registered for any upcoming expos. Discover leading trade shows and reserve your pass today.</p>
              {onNavigate && (
                <button
                  className="btn-primary"
                  onClick={() => onNavigate('attendee-browse')}
                >
                  Explore Available Expos
                </button>
              )}
            </div>
          ) : (
            <div className="registrations-stream-list">
              {recentRegistrations.map((reg) => (
                <div key={reg._id} className={`reg-stream-item status-${reg.status}`}>
                  <div className="reg-item-top">
                    <span className="reg-code-pill">Ref: {reg.registrationNumber}</span>
                    <span className={`reg-status-pill status-${reg.status}`}>{reg.status}</span>
                  </div>

                  <h3 className="reg-expo-title">{reg.expo?.title || 'Expo Event'}</h3>

                  <div className="reg-meta-row">
                    <span>📅 {reg.expo ? formatDateRange(reg.expo.startDate, reg.expo.endDate) : '—'}</span>
                    <span>📍 {reg.expo?.location?.city || reg.expo?.location?.venue || 'Venue'}</span>
                    <span>🏷️ {reg.registrationType?.toUpperCase()}</span>
                  </div>

                  <div className="reg-item-actions">
                    {onNavigate && reg.expo?._id && (
                      <>
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => onNavigate('expo-schedule', { expoId: reg.expo._id })}
                        >
                          📅 View Schedule
                        </button>
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => onNavigate('expo-detail', { expoId: reg.expo._id })}
                        >
                          ℹ️ Expo Details
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Featured Available Expos */}
        <section className="dash-section-card">
          <div className="section-head">
            <div>
              <h2>🌟 Discover Leading Expos</h2>
              <p>Open for public attendee registration</p>
            </div>
            {onNavigate && (
              <button
                className="btn-link-action"
                onClick={() => onNavigate('attendee-browse')}
              >
                See Full Directory →
              </button>
            )}
          </div>

          {featuredExpos.length === 0 ? (
            <div className="empty-stream-box">
              <p>No new published expos available right now.</p>
            </div>
          ) : (
            <div className="featured-expos-stream">
              {featuredExpos.map((exp) => (
                <div key={exp._id} className="featured-expo-card">
                  <div className="featured-expo-header">
                    <span className="category-tag">{exp.category}</span>
                    <span className="dates-tag">{formatDateRange(exp.startDate, exp.endDate)}</span>
                  </div>

                  <h3 className="featured-expo-title">{exp.title}</h3>
                  <p className="featured-expo-loc">
                    📍 {exp.location?.venue ? `${exp.location.venue}, ` : ''}{exp.location?.city || 'Location TBA'}
                  </p>

                  <div className="featured-expo-footer">
                    {onNavigate && (
                      <>
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => onNavigate('expo-detail', { expoId: exp._id })}
                        >
                          View & Register →
                        </button>
                        <button
                          className="btn-sm btn-secondary"
                          onClick={() => onNavigate('expo-schedule', { expoId: exp._id })}
                        >
                          Schedule
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AttendeeDashboard;
