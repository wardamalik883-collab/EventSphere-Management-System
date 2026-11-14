/**
 * AnalyticsDashboardPage.jsx — Unified Admin & Organizer Analytics & Reporting
 * Task 13: Live MongoDB statistics, responsive SVG charts, date filters, CSV exports, and expo audit reports.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminOverview,
  getAdminTrends,
  getOrganizerOverview,
  getOrganizerTrends,
} from '../services/analyticsService';
import { LineChart, BarChart, DonutProgress } from '../components/ChartComponents';
import ExpoReportModal from '../components/ExpoReportModal';
import '../styles/AnalyticsDashboardPage.css';

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' },
];

const AnalyticsDashboardPage = ({ onNavigate, initialExpoId = null }) => {
  const { user, role } = useAuth();

  // Filter States
  const [period, setPeriod] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedExpoFilter, setSelectedExpoFilter] = useState(initialExpoId || '');

  // Data States
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State for Individual Expo Audit Report
  const [reportExpoId, setReportExpoId] = useState(null);

  // Fetch data based on role and filter parameters
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queryParams = { period };
    if (period === 'custom') {
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;
    }

    try {
      if (role === 'admin') {
        const [ovRes, trRes] = await Promise.all([
          getAdminOverview(queryParams),
          getAdminTrends(queryParams),
        ]);
        setOverview(ovRes.data || ovRes);
        setTrends(trRes.data || trRes);
      } else if (role === 'organizer') {
        if (selectedExpoFilter) {
          queryParams.expoId = selectedExpoFilter;
        }
        const [ovRes, trRes] = await Promise.all([
          getOrganizerOverview(queryParams),
          getOrganizerTrends(queryParams),
        ]);
        setOverview(ovRes.data || ovRes);
        setTrends(trRes.data || trRes);
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics data from server');
    } finally {
      setLoading(false);
    }
  }, [role, period, startDate, endDate, selectedExpoFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Handle Export Overview Summary to CSV
  const handleExportSummaryCSV = () => {
    if (!overview) return;

    let rows = [];

    if (role === 'admin') {
      const { users, expos, applications, booths, registrations, feedback } = overview;
      rows = [
        ['EventSphere — Admin Analytics Summary'],
        ['Generated At', new Date().toISOString()],
        ['Period Filter', period],
        [],
        ['Metric Category', 'Key', 'Value'],
        ['Users', 'Total Users', users.total],
        ['Users', 'Admins', users.byRole.admin],
        ['Users', 'Organizers', users.byRole.organizer],
        ['Users', 'Exhibitors', users.byRole.exhibitor],
        ['Users', 'Attendees', users.byRole.attendee],
        ['Expos', 'Total Expos', expos.total],
        ['Expos', 'Published Expos', expos.published],
        ['Expos', 'Upcoming Expos', expos.upcoming],
        ['Expos', 'Ongoing Expos', expos.ongoing],
        ['Expos', 'Completed Expos', expos.completed],
        ['Expos', 'Draft Expos', expos.draft],
        ['Applications', 'Total Applications', applications.total],
        ['Applications', 'Approved', applications.approved],
        ['Applications', 'Pending', applications.pending],
        ['Applications', 'Rejected', applications.rejected],
        ['Booths', 'Total Booths', booths.total],
        ['Booths', 'Allocated Booths', booths.allocated],
        ['Booths', 'Available Booths', booths.available],
        ['Booths', 'Allocation Rate (%)', booths.allocationRate],
        ['Registrations', 'Total Registrations', registrations.total],
        ['Registrations', 'Active Passes', registrations.active],
        ['Registrations', 'Cancelled Passes', registrations.cancelled],
        ['Feedback', 'Total Reviews', feedback.count],
        ['Feedback', 'Average Rating', feedback.averageRating],
        [],
        ['--- PLATFORM EXPOS AUDIT ---'],
        ['Expo Title', 'Status', 'Start Date', 'End Date', 'Registrations', 'Applications'],
        ...(overview.recentExpos || []).map((e) => [
          e.title,
          e.status,
          new Date(e.startDate).toLocaleDateString(),
          new Date(e.endDate).toLocaleDateString(),
          e.registrationCount || 0,
          e.applicationCount || 0,
        ]),
      ];
    } else {
      // Organizer
      const { expos, registrations, applications, booths, sessions, feedback } = overview;
      rows = [
        ['EventSphere — Organizer Analytics Summary'],
        ['Generated At', new Date().toISOString()],
        ['Organizer', user?.name || 'Organizer'],
        ['Period Filter', period],
        [],
        ['Metric Category', 'Key', 'Value'],
        ['Expos', 'My Total Expos', expos.total],
        ['Expos', 'Published', expos.published],
        ['Expos', 'Draft', expos.draft],
        ['Registrations', 'Total Attendee Registrations', registrations.total],
        ['Registrations', 'Active', registrations.active],
        ['Applications', 'Total Applications', applications.total],
        ['Applications', 'Approved', applications.approved],
        ['Applications', 'Approval Rate (%)', applications.approvalRate],
        ['Booths', 'Total Booths', booths.total],
        ['Booths', 'Allocated', booths.allocated],
        ['Booths', 'Available', booths.available],
        ['Booths', 'Allocation Rate (%)', booths.allocationRate],
        ['Sessions', 'Total Sessions Scheduled', sessions.total],
        ['Feedback', 'Total Feedback Reviews', feedback.count],
        ['Feedback', 'Average Rating', feedback.averageRating],
        [],
        ['--- MY EXPO PORTFOLIO ---'],
        ['Expo Title', 'Status', 'Start Date', 'End Date', 'Capacity', 'Registrations', 'Applications'],
        ...(overview.myExpos || []).map((e) => [
          e.title,
          e.status,
          new Date(e.startDate).toLocaleDateString(),
          new Date(e.endDate).toLocaleDateString(),
          e.capacity || 'Unlimited',
          e.registrationCount || 0,
          e.applicationCount || 0,
        ]),
      ];
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows
        .map((row) => row.map((field) => `"${String(field || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `eventsphere_analytics_${role}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="analytics-page-container">
      {/* Page Title & Navigation Bar */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <button
            type="button"
            className="btn-back-crumb"
            onClick={() => onNavigate(role === 'admin' ? 'admin' : 'organizer')}
          >
            ← Back to {role === 'admin' ? 'Admin Console' : 'Dashboard'}
          </button>
          <div className="header-headline-row">
            <h1 className="analytics-page-title">
              {role === 'admin' ? 'Platform Analytics & Business Intelligence' : 'Organizer Portfolio Analytics'}
            </h1>
            <span className="analytics-role-pill">
              {role === 'admin' ? '🛡️ Admin Suite' : '🎪 Organizer Scope'}
            </span>
          </div>
          <p className="analytics-page-subtitle">
            {role === 'admin'
              ? 'Real-time MongoDB platform metrics, attendance trends, booth allocations, and audit logs.'
              : 'Performance tracking, registration velocity, booth occupancy, and feedback for your expos.'}
          </p>
        </div>

        <div className="analytics-top-actions">
          {overview && (
            <button
              type="button"
              className="btn-analytics-export"
              onClick={handleExportSummaryCSV}
            >
              📥 Export CSV Summary
            </button>
          )}
          <button
            type="button"
            className="btn-analytics-refresh"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Date Range & Expo Filter Control Ribbon */}
      <div className="analytics-filter-bar">
        <div className="filter-pills-row">
          <span className="filter-label">Timeframe:</span>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`filter-pill ${period === opt.id ? 'active' : ''}`}
              onClick={() => setPeriod(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {period === 'custom' && (
          <div className="custom-date-inputs">
            <div className="date-input-group">
              <label htmlFor="startDate">From:</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-picker-input"
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="endDate">To:</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-picker-input"
              />
            </div>
          </div>
        )}

        {/* Organizer Expo Zoom Selector */}
        {role === 'organizer' && overview?.myExpos && (
          <div className="expo-selector-group">
            <label htmlFor="expoSelect">Filter by Expo:</label>
            <select
              id="expoSelect"
              className="expo-select-input"
              value={selectedExpoFilter}
              onChange={(e) => setSelectedExpoFilter(e.target.value)}
            >
              <option value="">All My Expos ({overview.myExpos.length})</option>
              {overview.myExpos.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title} ({e.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="analytics-loading-box">
          <div className="analytics-spinner" />
          <p>Aggregating database analytics and timeseries trends...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="analytics-error-box">
          <span className="error-icon">⚠️</span>
          <h3>Unable to Load Analytics</h3>
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={fetchAnalytics}>
            Try Again
          </button>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && !error && overview && (
        <div className="analytics-content-layout">
          {/* ─────────────────────────────────────────────────────────────
              ADMIN ANALYTICS VIEW
             ───────────────────────────────────────────────────────────── */}
          {role === 'admin' && (
            <>
              {/* Admin Primary KPI Ribbon */}
              <div className="kpi-ribbon-grid">
                <div className="kpi-card accent-indigo">
                  <div className="kpi-head">
                    <span className="kpi-title">Total Users</span>
                    <span className="kpi-icon">👥</span>
                  </div>
                  <div className="kpi-number">{overview.users.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">🛡️ {overview.users.byRole.admin} Admins</span>
                    <span className="meta-subtag">🎪 {overview.users.byRole.organizer} Organizers</span>
                    <span className="meta-subtag">🏢 {overview.users.byRole.exhibitor} Exhibitors</span>
                    <span className="meta-subtag">🎟️ {overview.users.byRole.attendee} Attendees</span>
                  </div>
                </div>

                <div className="kpi-card accent-violet">
                  <div className="kpi-head">
                    <span className="kpi-title">Total Expos</span>
                    <span className="kpi-icon">🎪</span>
                  </div>
                  <div className="kpi-number">{overview.expos.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">✅ {overview.expos.published} Published</span>
                    <span className="meta-subtag">📅 {overview.expos.upcoming} Upcoming</span>
                    <span className="meta-subtag">🏁 {overview.expos.completed} Completed</span>
                    <span className="meta-subtag">📝 {overview.expos.draft} Draft</span>
                  </div>
                </div>

                <div className="kpi-card accent-emerald">
                  <div className="kpi-head">
                    <span className="kpi-title">Attendee Registrations</span>
                    <span className="kpi-icon">🎟️</span>
                  </div>
                  <div className="kpi-number">{overview.registrations.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">Active: {overview.registrations.active}</span>
                    <span className="meta-subtag">Cancelled: {overview.registrations.cancelled}</span>
                  </div>
                </div>

                <div className="kpi-card accent-amber">
                  <div className="kpi-head">
                    <span className="kpi-title">Exhibitor Applications</span>
                    <span className="kpi-icon">📑</span>
                  </div>
                  <div className="kpi-number">{overview.applications.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">✅ {overview.applications.approved} Approved</span>
                    <span className="meta-subtag">⏳ {overview.applications.pending} Pending</span>
                    <span className="meta-subtag">❌ {overview.applications.rejected} Rejected</span>
                  </div>
                </div>

                <div className="kpi-card accent-cyan">
                  <div className="kpi-head">
                    <span className="kpi-title">Booth Utilization</span>
                    <span className="kpi-icon">📍</span>
                  </div>
                  <div className="kpi-number">{overview.booths.allocationRate}%</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">{overview.booths.allocated} Allocated</span>
                    <span className="meta-subtag">{overview.booths.available} Available</span>
                    <span className="meta-subtag">{overview.booths.total} Total</span>
                  </div>
                </div>

                <div className="kpi-card accent-rose">
                  <div className="kpi-head">
                    <span className="kpi-title">Platform Feedback</span>
                    <span className="kpi-icon">⭐</span>
                  </div>
                  <div className="kpi-number">{overview.feedback.averageRating} / 5.0</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">{overview.feedback.count} Reviews</span>
                  </div>
                </div>
              </div>

              {/* Timeseries Velocity Charts */}
              <div className="analytics-chart-row-double">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">📈 Attendee Registration Velocity</h3>
                  <p className="chart-panel-subtitle">Daily registration counts recorded during this timeframe</p>
                  <LineChart
                    data={trends?.registrations || []}
                    color="#6366f1"
                    height={220}
                  />
                </div>

                <div className="chart-panel">
                  <h3 className="chart-panel-title">👥 User Signups Over Time</h3>
                  <p className="chart-panel-subtitle">New account creation timeline across all roles</p>
                  <LineChart
                    data={trends?.userSignups || []}
                    color="#10b981"
                    height={220}
                  />
                </div>
              </div>

              {/* Distribution Breakdown Panels */}
              <div className="analytics-chart-row-triple">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">User Roles Distribution</h3>
                  <BarChart
                    data={[
                      { label: 'Attendees', value: overview.users.byRole.attendee, color: '#3b82f6' },
                      { label: 'Exhibitors', value: overview.users.byRole.exhibitor, color: '#8b5cf6' },
                      { label: 'Organizers', value: overview.users.byRole.organizer, color: '#f59e0b' },
                      { label: 'Admins', value: overview.users.byRole.admin, color: '#ef4444' },
                    ]}
                  />
                </div>

                <div className="chart-panel">
                  <h3 className="chart-panel-title">Exhibitor Applications</h3>
                  <BarChart
                    data={[
                      { label: 'Approved', value: overview.applications.approved, color: '#10b981' },
                      { label: 'Pending', value: overview.applications.pending, color: '#f59e0b' },
                      { label: 'Rejected', value: overview.applications.rejected, color: '#ef4444' },
                    ]}
                  />
                </div>

                <div className="chart-panel flex-center">
                  <h3 className="chart-panel-title">Booth Space Occupancy</h3>
                  <DonutProgress
                    percentage={overview.booths.allocationRate}
                    label="Allocated"
                    sublabel={`${overview.booths.allocated} of ${overview.booths.total} booths`}
                    color="#06b6d4"
                    size={150}
                  />
                </div>
              </div>

              {/* Admin Recent Expos Audit Table */}
              <div className="analytics-table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 className="table-panel-title">Platform Expos & Audit Log</h3>
                    <p className="table-panel-subtitle">Inspect performance metrics and individual event reports</p>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Expo Title</th>
                        <th>Organizer</th>
                        <th>Status</th>
                        <th>Dates</th>
                        <th>Registrations</th>
                        <th>Applications</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentExpos && overview.recentExpos.length > 0 ? (
                        overview.recentExpos.map((expo) => (
                          <tr key={expo._id}>
                            <td className="font-semibold">{expo.title}</td>
                            <td>{expo.organizer?.name || 'Unknown'}</td>
                            <td>
                              <span className={`status-pill status-${expo.status}`}>
                                {expo.status}
                              </span>
                            </td>
                            <td>
                              {new Date(expo.startDate).toLocaleDateString()} –{' '}
                              {new Date(expo.endDate).toLocaleDateString()}
                            </td>
                            <td>{expo.registrationCount || 0}</td>
                            <td>{expo.applicationCount || 0}</td>
                            <td>
                              <button
                                type="button"
                                className="btn-audit-report"
                                onClick={() => setReportExpoId(expo._id)}
                              >
                                📊 Performance Report
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="table-empty-cell">
                            No expos found matching the selected timeframe.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────
              ORGANIZER ANALYTICS VIEW
             ───────────────────────────────────────────────────────────── */}
          {role === 'organizer' && (
            <>
              {/* Organizer Primary KPI Ribbon */}
              <div className="kpi-ribbon-grid">
                <div className="kpi-card accent-indigo">
                  <div className="kpi-head">
                    <span className="kpi-title">My Expos</span>
                    <span className="kpi-icon">🎪</span>
                  </div>
                  <div className="kpi-number">{overview.expos.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">✅ {overview.expos.published} Published</span>
                    <span className="meta-subtag">📝 {overview.expos.draft} Draft</span>
                  </div>
                </div>

                <div className="kpi-card accent-emerald">
                  <div className="kpi-head">
                    <span className="kpi-title">Attendee Registrations</span>
                    <span className="kpi-icon">🎟️</span>
                  </div>
                  <div className="kpi-number">{overview.registrations.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">{overview.registrations.active} Active Passes</span>
                  </div>
                </div>

                <div className="kpi-card accent-amber">
                  <div className="kpi-head">
                    <span className="kpi-title">Exhibitor Applications</span>
                    <span className="kpi-icon">📑</span>
                  </div>
                  <div className="kpi-number">{overview.applications.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">{overview.applications.approvalRate}% Approved</span>
                    <span className="meta-subtag">⏳ {overview.applications.pending} Pending</span>
                  </div>
                </div>

                <div className="kpi-card accent-cyan">
                  <div className="kpi-head">
                    <span className="kpi-title">Booth Utilization</span>
                    <span className="kpi-icon">📍</span>
                  </div>
                  <div className="kpi-number">{overview.booths.allocationRate}%</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">{overview.booths.allocated} / {overview.booths.total} Assigned</span>
                  </div>
                </div>

                <div className="kpi-card accent-violet">
                  <div className="kpi-head">
                    <span className="kpi-title">Sessions Scheduled</span>
                    <span className="kpi-icon">📅</span>
                  </div>
                  <div className="kpi-number">{overview.sessions.total}</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">Programmed Sessions</span>
                  </div>
                </div>

                <div className="kpi-card accent-rose">
                  <div className="kpi-head">
                    <span className="kpi-title">Attendee Rating</span>
                    <span className="kpi-icon">⭐</span>
                  </div>
                  <div className="kpi-number">{overview.feedback.averageRating} / 5.0</div>
                  <div className="kpi-meta-tags">
                    <span className="meta-subtag">{overview.feedback.count} Submissions</span>
                  </div>
                </div>
              </div>

              {/* Timeseries Velocity Chart */}
              <div className="chart-panel full-width">
                <h3 className="chart-panel-title">📈 Attendee Registration Velocity</h3>
                <p className="chart-panel-subtitle">Daily tickets booked across your expos for this timeframe</p>
                <LineChart
                  data={trends?.registrations || []}
                  color="#6366f1"
                  height={220}
                />
              </div>

              {/* Distribution Row */}
              <div className="analytics-chart-row-double">
                <div className="chart-panel">
                  <h3 className="chart-panel-title">Exhibitor Application Funnel</h3>
                  <BarChart
                    data={[
                      { label: 'Approved', value: overview.applications.approved, color: '#10b981' },
                      { label: 'Pending Review', value: overview.applications.pending, color: '#f59e0b' },
                      { label: 'Rejected', value: overview.applications.rejected, color: '#ef4444' },
                    ]}
                  />
                </div>

                <div className="chart-panel flex-center">
                  <h3 className="chart-panel-title">Floor Plan Space Utilization</h3>
                  <DonutProgress
                    percentage={overview.booths.allocationRate}
                    label="Allocated"
                    sublabel={`${overview.booths.allocated} of ${overview.booths.total} booths`}
                    color="#06b6d4"
                    size={150}
                  />
                </div>
              </div>

              {/* My Expos Performance Table */}
              <div className="analytics-table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 className="table-panel-title">My Event Portfolio Performance</h3>
                    <p className="table-panel-subtitle">Compare attendance and exhibitor metrics across your expos</p>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Expo Title</th>
                        <th>Status</th>
                        <th>Dates</th>
                        <th>Capacity</th>
                        <th>Registrations</th>
                        <th>Applications</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.myExpos && overview.myExpos.length > 0 ? (
                        overview.myExpos.map((expo) => (
                          <tr key={expo._id}>
                            <td className="font-semibold">{expo.title}</td>
                            <td>
                              <span className={`status-pill status-${expo.status}`}>
                                {expo.status}
                              </span>
                            </td>
                            <td>
                              {new Date(expo.startDate).toLocaleDateString()} –{' '}
                              {new Date(expo.endDate).toLocaleDateString()}
                            </td>
                            <td>{expo.capacity ? expo.capacity.toLocaleString() : 'Unlimited'}</td>
                            <td>{expo.registrationCount || 0}</td>
                            <td>{expo.applicationCount || 0}</td>
                            <td>
                              <button
                                type="button"
                                className="btn-audit-report"
                                onClick={() => setReportExpoId(expo._id)}
                              >
                                📊 Performance Report
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="table-empty-cell">
                            No expos found under your organizer account.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Individual Expo Performance Audit Report Modal */}
      {reportExpoId && (
        <ExpoReportModal
          expoId={reportExpoId}
          onClose={() => setReportExpoId(null)}
        />
      )}
    </div>
  );
};

export default AnalyticsDashboardPage;
