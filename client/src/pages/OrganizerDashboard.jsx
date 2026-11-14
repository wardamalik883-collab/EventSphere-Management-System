/**
 * OrganizerDashboard.jsx — Dedicated Organizer Operations Dashboard
 *
 * Scoped strictly to the logged-in organizer's expos and applications.
 * Does not show admin-only statistics or navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrganizerDashboardData } from '../services/dashboardService';
import StatCard from '../components/StatCard';
import '../styles/OrganizerDashboard.css';

const OrganizerDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOrganizerDashboardData();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load organizer dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="organizer-loading">
        <div className="organizer-spinner"></div>
        <p>Loading your organizer dashboard and event portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organizer-error">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Organizer Dashboard</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="btn-primary" onClick={fetchDashboard}>
              Try Again
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('landing')}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    organizer,
    stats,
    expoStatusDistribution,
    applicationStatusDistribution,
    recentExpos,
    recentApplications,
    recentActivities,
  } = data || {};

  return (
    <div className="organizer-layout">
      {/* Top Banner / Organizer Header */}
      <section className="organizer-hero">
        <div className="organizer-hero-inner">
          <div className="organizer-profile-card">
            <div className="organizer-avatar">
              {organizer?.name ? organizer.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="organizer-profile-meta">
              <div className="organizer-profile-title-row">
                <h1 className="organizer-name">{organizer?.name || user?.name}</h1>
                <span className="organizer-badge">Verified Organizer</span>
              </div>
              <p className="organizer-email">📧 {organizer?.email || user?.email}</p>
              {organizer?.phone && (
                <p className="organizer-phone">📞 {organizer.phone}</p>
              )}
            </div>
          </div>

          <div className="organizer-hero-actions">
            <button
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={() => onNavigate('analytics')}
            >
              📊 Performance & Reports
            </button>
            <button className="btn-refresh" onClick={fetchDashboard}>
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <main className="organizer-main">
        {/* Navigation Tabs */}
        <div className="organizer-tab-bar">
          <button
            className={`organizer-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Event & Application Overview
          </button>
          <button
            className={`organizer-tab ${activeTab === 'expos' ? 'active' : ''}`}
            onClick={() => setActiveTab('expos')}
          >
            🎪 My Expos ({stats?.totalExpos ?? 0})
          </button>
          <button
            className={`organizer-tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            📋 Applications ({stats?.totalApplications ?? 0})
          </button>
        </div>

        {/* 1. Statistics Cards */}
        <section className="stats-grid">
          <StatCard
            title="My Total Expos"
            value={stats?.totalExpos ?? 0}
            icon="🎪"
            color="purple"
            trend="Total exhibitions created by you"
          />
          <StatCard
            title="Upcoming Expos"
            value={stats?.upcomingExpos ?? 0}
            icon="📅"
            color="blue"
            badge="Scheduled"
          />
          <StatCard
            title="Ongoing Expos"
            value={stats?.ongoingExpos ?? 0}
            icon="⚡"
            color="green"
            badge="Live Now"
          />
          <StatCard
            title="Completed Expos"
            value={stats?.completedExpos ?? 0}
            icon="🏁"
            color="emerald"
            badge="Concluded"
          />
          <StatCard
            title="Total Applications"
            value={stats?.totalApplications ?? 0}
            icon="📑"
            color="amber"
            trend="Exhibitor applications for your expos"
          />
          <StatCard
            title="Pending Reviews"
            value={stats?.pendingApplications ?? 0}
            icon="⏳"
            color="rose"
            badge="Action Needed"
          />
          <StatCard
            title="Approved"
            value={stats?.approvedApplications ?? 0}
            icon="✅"
            color="green"
            badge="Accepted"
          />
          <StatCard
            title="Rejected"
            value={stats?.rejectedApplications ?? 0}
            icon="❌"
            color="rose"
            badge="Declined"
          />
        </section>

        {/* 2. Visual Distributions */}
        <section className="organizer-analytics-row">
          {/* Expo Status Breakdown */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h3>Expo Timeline Breakdown</h3>
              <span className="analytics-badge">My Expos</span>
            </div>
            <div className="distribution-bars">
              {stats?.totalExpos > 0 && expoStatusDistribution ? (
                expoStatusDistribution.map((item) => {
                  const percent =
                    stats.totalExpos > 0
                      ? Math.round((item.count / stats.totalExpos) * 100)
                      : 0;
                  return (
                    <div key={item.status} className="distribution-item">
                      <div className="distribution-label-row">
                        <span className="distribution-name">{item.label}</span>
                        <span className="distribution-meta">
                          {item.count} ({percent}%)
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill bar-${item.status}`}
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="organizer-empty-box">
                  <span className="empty-box-icon">🎪</span>
                  <h4>No Expos Created Yet</h4>
                  <p>
                    You have not published any trade shows or expos yet. In Task 06
                    (Expo Management), you will be able to create and schedule expos here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Application Review Status */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h3>Application Review Pipeline</h3>
              <span className="analytics-badge">Exhibitor Inflow</span>
            </div>
            <div className="distribution-bars">
              {stats?.totalApplications > 0 && applicationStatusDistribution ? (
                applicationStatusDistribution.map((item) => {
                  const percent =
                    stats.totalApplications > 0
                      ? Math.round((item.count / stats.totalApplications) * 100)
                      : 0;
                  return (
                    <div key={item.status} className="distribution-item">
                      <div className="distribution-label-row">
                        <span className="distribution-name">{item.label}</span>
                        <span className="distribution-meta">
                          {item.count} ({percent}%)
                        </span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill bar-${item.status}`}
                          style={{ width: `${Math.max(percent, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="organizer-empty-box">
                  <span className="empty-box-icon">📑</span>
                  <h4>No Applications Received</h4>
                  <p>
                    No exhibitors have applied to your expos yet. Once applications
                    arrive in Task 07, you will review them here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. Expo Overview & Applications List */}
        <section className="organizer-data-row">
          {/* Recent Expos Card */}
          <div className="data-card">
            <div className="data-card-header">
              <div>
                <h3>My Recent Expos</h3>
                <span className="data-badge">{recentExpos?.length || 0} Managed</span>
              </div>
              <button
                className="btn-link"
                style={{ fontSize: '0.85rem' }}
                onClick={() => onNavigate('expo-list')}
              >
                Manage Expos →
              </button>
            </div>

            {recentExpos && recentExpos.length > 0 ? (
              <div className="expo-cards-list">
                {recentExpos.map((expo) => (
                  <div key={expo._id} className="expo-mini-card">
                    <div className="expo-card-top">
                      <h4 className="expo-card-title">{expo.title}</h4>
                      <span className={`expo-status-tag status-${expo.status}`}>
                        {expo.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="expo-card-details">
                      <span>🏷️ {expo.category}</span>
                      <span>
                        📍 {expo.location?.venue || 'Venue TBD'}, {expo.location?.city || ''}
                      </span>
                      <span>
                        🗓️ {new Date(expo.startDate).toLocaleDateString()} –{' '}
                        {new Date(expo.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="organizer-empty-box">
                <span className="empty-box-icon">🎪</span>
                <h4>Zero Expos on Record</h4>
                <p>
                  Accurate database state: 0 expos found for your account. You will
                  be able to create expos in the upcoming Expo Management module.
                </p>
              </div>
            )}
          </div>

          {/* Recent Applications Card */}
          <div className="data-card">
            <div className="data-card-header">
              <div>
                <h3>Recent Exhibitor Applications</h3>
                <span className="data-badge">
                  {recentApplications?.length || 0} Inbound
                </span>
              </div>
              <button
                className="btn-link"
                style={{ fontSize: '0.85rem' }}
                onClick={() => onNavigate('organizer-applications')}
              >
                Review Applications →
              </button>
            </div>

            {recentApplications && recentApplications.length > 0 ? (
              <div className="table-responsive">
                <table className="organizer-table">
                  <thead>
                    <tr>
                      <th>Exhibitor</th>
                      <th>Expo</th>
                      <th>Booth Size</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map((app) => (
                      <tr key={app._id}>
                        <td>
                          <div className="exhibitor-cell">
                            <strong>{app.exhibitor?.name || 'Exhibitor'}</strong>
                            <small>{app.exhibitor?.email}</small>
                          </div>
                        </td>
                        <td>{app.expo?.title || 'Expo'}</td>
                        <td>{app.boothPreference?.size || 'Standard'}</td>
                        <td>
                          <span className={`app-status-tag status-${app.status}`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="organizer-empty-box">
                <span className="empty-box-icon">📋</span>
                <h4>Zero Applications</h4>
                <p>
                  No exhibitor applications currently require your action.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 4. Recent Relevant Activities */}
        <section style={{ marginTop: '2rem' }}>
          <div className="data-card">
            <div className="data-card-header">
              <h3>Recent Organizer Activities</h3>
              <span className="data-badge">{recentActivities?.length || 0} Events</span>
            </div>
            {recentActivities && recentActivities.length > 0 ? (
              <div className="activity-timeline">
                {recentActivities.map((act) => (
                  <div key={act.id} className="timeline-item">
                    <div className="timeline-indicator" style={{ background: '#8b5cf6', boxShadow: '0 0 6px rgba(139, 92, 246, 0.6)' }}></div>
                    <div className="timeline-content">
                      <div className="timeline-title-row">
                        <span className="timeline-title">{act.title}</span>
                        <span className="timeline-time">
                          {new Date(act.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="timeline-description">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="organizer-empty-box">
                <span className="empty-box-icon">⚡</span>
                <h4>No Recent Activity</h4>
                <p>No recent activity events recorded for your organizer account yet.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default OrganizerDashboard;
