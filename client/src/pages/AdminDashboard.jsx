/**
 * AdminDashboard.jsx — Admin Command Center Dashboard
 *
 * Displays real platform statistics, role distributions, recent registrations,
 * and system activity logs directly from MongoDB.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdminDashboardData } from '../services/dashboardService';
import StatCard from '../components/StatCard';
import '../styles/AdminDashboard.css';

const AdminDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminDashboardData();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load administrator dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="dashboard-spinner"></div>
        <p>Loading real-time administrative statistics...</p>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="admin-dashboard-error">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Admin Dashboard</h2>
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

  const { stats, roleDistribution, statusDistribution, recentUsers, recentActivities } =
    data || {};

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Admin Console</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Platform Overview
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            ⚡ System Activity
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            ⚙️ System Status
          </button>
          <button
            className="sidebar-nav-item"
            onClick={() => onNavigate('analytics')}
          >
            📈 Advanced Analytics & Reports
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </span>
            <div className="admin-details">
              <span className="admin-name">{user?.name || 'Administrator'}</span>
              <span className="admin-role-label">System Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <main className="admin-main">
        {/* Welcome & Action Bar */}
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              Welcome, {user?.name || 'System Administrator'}
            </h1>
            <p className="dashboard-subtitle">
              Live operational analytics and user governance dashboard
            </p>
          </div>
          <div className="dashboard-header-actions">
            <button
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={() => onNavigate('analytics')}
            >
              📊 Advanced Analytics
            </button>
            <button
              className="btn-refresh"
              onClick={fetchDashboard}
              title="Refresh MongoDB statistics"
            >
              🔄 Refresh
            </button>
          </div>
        </header>

        {/* 1. Statistics Cards Grid */}
        <section className="stats-grid">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon="👥"
            color="blue"
            trend="All registered platform accounts"
          />
          <StatCard
            title="Attendees"
            value={stats?.totalAttendees ?? 0}
            icon="🎟️"
            color="emerald"
            badge={`${stats?.totalUsers ? ((stats.totalAttendees / stats.totalUsers) * 100).toFixed(0) : 0}%`}
          />
          <StatCard
            title="Exhibitors"
            value={stats?.totalExhibitors ?? 0}
            icon="🏢"
            color="amber"
            badge={`${stats?.totalUsers ? ((stats.totalExhibitors / stats.totalUsers) * 100).toFixed(0) : 0}%`}
          />
          <StatCard
            title="Organizers"
            value={stats?.totalOrganizers ?? 0}
            icon="📋"
            color="purple"
            badge={`${stats?.totalUsers ? ((stats.totalOrganizers / stats.totalUsers) * 100).toFixed(0) : 0}%`}
          />
          <StatCard
            title="Active Accounts"
            value={stats?.totalActiveUsers ?? 0}
            icon="✅"
            color="green"
            badge="Permitted"
          />
          <StatCard
            title="Inactive Accounts"
            value={stats?.totalInactiveUsers ?? 0}
            icon="⛔"
            color="rose"
            badge="Suspended"
          />
        </section>

        {/* 2. Charts / Distribution Breakdown */}
        <section className="dashboard-analytics-row">
          {/* Role Distribution Visual Chart */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h3>Role Distribution</h3>
              <span className="analytics-badge">Real Data</span>
            </div>
            <div className="distribution-bars">
              {roleDistribution && roleDistribution.length > 0 ? (
                roleDistribution.map((item) => (
                  <div key={item.role} className="distribution-item">
                    <div className="distribution-label-row">
                      <span className="distribution-name">{item.label}</span>
                      <span className="distribution-meta">
                        {item.count} users ({item.percentage}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className={`bar-fill bar-${item.role}`}
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No role distribution data available.</div>
              )}
            </div>
          </div>

          {/* Account Status Ratio */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h3>Account Health & Status</h3>
              <span className="analytics-badge">Active vs Suspended</span>
            </div>
            <div className="status-ratio-container">
              <div className="ratio-meters">
                <div className="ratio-stat">
                  <span className="ratio-number active-color">
                    {statusDistribution?.active ?? 0}
                  </span>
                  <span className="ratio-label">Active Users</span>
                  <span className="ratio-percent">
                    ({statusDistribution?.activePercentage ?? 0}%)
                  </span>
                </div>
                <div className="ratio-divider">vs</div>
                <div className="ratio-stat">
                  <span className="ratio-number inactive-color">
                    {statusDistribution?.inactive ?? 0}
                  </span>
                  <span className="ratio-label">Suspended</span>
                  <span className="ratio-percent">
                    ({statusDistribution?.inactivePercentage ?? 0}%)
                  </span>
                </div>
              </div>
              <div className="ratio-visual-bar">
                <div
                  className="ratio-fill-active"
                  style={{
                    width: `${statusDistribution?.activePercentage || 100}%`,
                  }}
                  title={`Active: ${statusDistribution?.activePercentage}%`}
                ></div>
                <div
                  className="ratio-fill-inactive"
                  style={{
                    width: `${statusDistribution?.inactivePercentage || 0}%`,
                  }}
                  title={`Suspended: ${statusDistribution?.inactivePercentage}%`}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Recent Registrations & System Activity Split */}
        <section className="dashboard-data-row">
          {/* Recent Registrations Table */}
          <div className="data-card user-table-card">
            <div className="data-card-header">
              <h3>Recent User Registrations</h3>
              <span className="data-badge">Latest {recentUsers?.length || 0}</span>
            </div>
            {recentUsers && recentUsers.length > 0 ? (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u._id}>
                        <td className="user-cell">
                          <div className="table-avatar">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="user-cell-name">{u.name}</span>
                        </td>
                        <td className="email-cell">{u.email}</td>
                        <td>
                          <span className={`table-role-pill role-${u.role}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`table-status-pill ${
                              u.isActive ? 'status-active' : 'status-inactive'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="date-cell">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No registered users found.</div>
            )}
          </div>

          {/* System Activity Timeline */}
          <div className="data-card activity-card">
            <div className="data-card-header">
              <h3>System Activity</h3>
              <span className="data-badge">Live Feed</span>
            </div>
            {recentActivities && recentActivities.length > 0 ? (
              <div className="activity-timeline">
                {recentActivities.map((act) => (
                  <div key={act.id} className="timeline-item">
                    <div className="timeline-indicator"></div>
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
              <div className="empty-state">No recent activity events recorded.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
