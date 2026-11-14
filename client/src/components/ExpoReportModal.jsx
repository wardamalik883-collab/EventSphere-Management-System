/**
 * ExpoReportModal.jsx — Comprehensive Expo Performance & Audit Report
 * Task 13: Detailed analytics for a single expo, printable PDF view, and CSV export.
 */

import React, { useState, useEffect } from 'react';
import { getExpoPerformanceReport } from '../services/analyticsService';
import { LineChart, BarChart, DonutProgress } from './ChartComponents';
import '../styles/ExpoReportModal.css';

const ExpoReportModal = ({ expoId, onClose }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!expoId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getExpoPerformanceReport(expoId)
      .then((res) => {
        if (isMounted) {
          setReport(res.data || res);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load expo performance report');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [expoId]);

  // Export report data to CSV
  const handleExportCSV = () => {
    if (!report) return;

    const { expo, registrations, applications, booths, sessions, feedback } = report;

    const rows = [
      ['EventSphere — Expo Performance Report'],
      ['Generated On', new Date().toISOString()],
      ['Expo Title', expo.title],
      ['Organizer', expo.organizer?.name || 'N/A'],
      ['Category', expo.category || 'N/A'],
      ['Status', expo.status],
      ['Dates', `${new Date(expo.startDate).toLocaleDateString()} to ${new Date(expo.endDate).toLocaleDateString()}`],
      ['Location', `${expo.location?.venue || ''}, ${expo.location?.city || ''}`],
      [],
      ['--- KEY PERFORMANCE METRICS ---'],
      ['Metric', 'Value', 'Percentage / Details'],
      ['Total Registrations', registrations.total, `${registrations.capacityPercentage}% of capacity`],
      ['Capacity Limit', registrations.capacityLimit || 'Unlimited'],
      ['Active Passes', registrations.active],
      ['Cancelled Passes', registrations.cancelled],
      ['Total Applications', applications.total],
      ['Approved Applications', applications.approved, `${applications.approvalRate}% approval rate`],
      ['Pending Applications', applications.pending],
      ['Rejected Applications', applications.rejected],
      ['Total Booths', booths.total],
      ['Allocated Booths', booths.allocated, `${booths.allocationRate}% allocated`],
      ['Available Booths', booths.available],
      ['Total Sessions', sessions.total],
      ['Total Feedback Reviews', feedback.count],
      ['Average Rating (out of 5)', feedback.averageRating],
      [],
      ['--- DAILY REGISTRATION TIMELINE ---'],
      ['Date', 'Registrations'],
      ...(registrations.timeline || []).map((t) => [t.date, t.count]),
      [],
      ['--- FEEDBACK RATING BREAKDOWN ---'],
      ['Stars', 'Count'],
      ['5 Stars', feedback.ratingBreakdown?.['5'] || 0],
      ['4 Stars', feedback.ratingBreakdown?.['4'] || 0],
      ['3 Stars', feedback.ratingBreakdown?.['3'] || 0],
      ['2 Stars', feedback.ratingBreakdown?.['2'] || 0],
      ['1 Star', feedback.ratingBreakdown?.['1'] || 0],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((row) => row.map((field) => `"${String(field || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeTitle = (expo.title || 'expo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `expo_report_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger browser print dialog for PDF export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <header className="report-modal-header no-print">
          <div className="report-modal-title-group">
            <span className="report-badge">📊 Audit Report</span>
            <h2 className="report-modal-title">Expo Performance Analysis</h2>
          </div>
          <div className="report-modal-actions">
            {report && (
              <>
                <button
                  type="button"
                  className="btn-report-action btn-export-csv"
                  onClick={handleExportCSV}
                  title="Download tabular metrics as CSV"
                >
                  📥 Export CSV
                </button>
                <button
                  type="button"
                  className="btn-report-action btn-print-pdf"
                  onClick={handlePrint}
                  title="Print or Save as PDF"
                >
                  🖨️ Print / Save PDF
                </button>
              </>
            )}
            <button
              type="button"
              className="btn-modal-close"
              onClick={onClose}
              aria-label="Close Report"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="report-modal-loading">
            <div className="report-spinner" />
            <p>Compiling real-time performance metrics and MongoDB analytics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="report-modal-error">
            <span className="error-icon">⚠️</span>
            <h3>Unable to Load Expo Report</h3>
            <p>{error}</p>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {/* Report Content Body */}
        {!loading && !error && report && (
          <div className="report-modal-body print-section" id="printable-expo-report">
            {/* Printable Report Header */}
            <div className="printable-report-heading">
              <div className="print-brand-row">
                <span className="brand-icon">🌐</span>
                <span className="brand-title">EventSphere Management System</span>
                <span className="print-timestamp">
                  Report Date: {new Date().toLocaleDateString()}
                </span>
              </div>
              <h1 className="expo-report-main-title">{report.expo.title}</h1>
              <div className="expo-report-meta-tags">
                <span className={`status-pill status-${report.expo.status}`}>
                  {report.expo.status?.toUpperCase()}
                </span>
                <span className="meta-tag">🎪 {report.expo.category || 'General'}</span>
                <span className="meta-tag">
                  📅 {new Date(report.expo.startDate).toLocaleDateString()} –{' '}
                  {new Date(report.expo.endDate).toLocaleDateString()}
                </span>
                <span className="meta-tag">
                  📍 {report.expo.location?.venue || 'Venue'}, {report.expo.location?.city || 'City'}
                </span>
                {report.expo.organizer && (
                  <span className="meta-tag">
                    👤 Organizer: {report.expo.organizer.name} ({report.expo.organizer.email})
                  </span>
                )}
              </div>
            </div>

            {/* KPI Summary Ribbon */}
            <div className="report-kpi-grid">
              <div className="report-kpi-card">
                <div className="kpi-icon">🎟️</div>
                <div className="kpi-info">
                  <div className="kpi-value">{report.registrations.total}</div>
                  <div className="kpi-label">Attendee Registrations</div>
                  <div className="kpi-sub">
                    {report.registrations.active} active • {report.registrations.cancelled} cancelled
                  </div>
                </div>
              </div>

              <div className="report-kpi-card">
                <div className="kpi-icon">🏢</div>
                <div className="kpi-info">
                  <div className="kpi-value">{report.applications.total}</div>
                  <div className="kpi-label">Exhibitor Applications</div>
                  <div className="kpi-sub">
                    {report.applications.approved} approved ({report.applications.approvalRate}%)
                  </div>
                </div>
              </div>

              <div className="report-kpi-card">
                <div className="kpi-icon">📍</div>
                <div className="kpi-info">
                  <div className="kpi-value">
                    {report.booths.allocated} / {report.booths.total}
                  </div>
                  <div className="kpi-label">Booths Allocated</div>
                  <div className="kpi-sub">
                    {report.booths.available} available ({report.booths.allocationRate}%)
                  </div>
                </div>
              </div>

              <div className="report-kpi-card">
                <div className="kpi-icon">⭐</div>
                <div className="kpi-info">
                  <div className="kpi-value">{report.feedback.averageRating} / 5.0</div>
                  <div className="kpi-label">Attendee Rating</div>
                  <div className="kpi-sub">{report.feedback.count} verified reviews</div>
                </div>
              </div>
            </div>

            {/* Gauge & Distributions Section */}
            <div className="report-charts-grid">
              {/* Donut Gauges */}
              <div className="report-card">
                <h3 className="card-section-title">Occupancy & Space Utilization</h3>
                <div className="gauges-flex-row">
                  <DonutProgress
                    percentage={report.registrations.capacityPercentage}
                    label="Capacity"
                    sublabel={`${report.registrations.total} / ${report.registrations.capacityLimit || '∞'} Seats`}
                    color="#6366f1"
                    size={130}
                  />
                  <DonutProgress
                    percentage={report.booths.allocationRate}
                    label="Booth Space"
                    sublabel={`${report.booths.allocated} / ${report.booths.total} Allocated`}
                    color="#10b981"
                    size={130}
                  />
                </div>
              </div>

              {/* Application Funnel */}
              <div className="report-card">
                <h3 className="card-section-title">Exhibitor Application Status</h3>
                <BarChart
                  data={[
                    { label: 'Approved', value: report.applications.approved, color: '#10b981' },
                    { label: 'Pending Review', value: report.applications.pending, color: '#f59e0b' },
                    { label: 'Rejected', value: report.applications.rejected, color: '#ef4444' },
                  ]}
                />
              </div>
            </div>

            {/* Timeseries Registration Velocity */}
            <div className="report-card full-width">
              <h3 className="card-section-title">Registration Velocity Over Time</h3>
              <p className="card-section-desc">
                Daily cumulative attendee pass bookings recorded for this event.
              </p>
              <LineChart
                data={report.registrations.timeline || []}
                color="#6366f1"
                height={200}
                title="Daily Attendee Registrations"
              />
            </div>

            {/* Feedback Breakdown */}
            <div className="report-card full-width">
              <h3 className="card-section-title">Attendee Feedback Breakdown</h3>
              <div className="feedback-score-summary">
                <div className="score-big-box">
                  <div className="big-star-score">{report.feedback.averageRating}</div>
                  <div className="stars-visual">
                    {'★'.repeat(Math.round(report.feedback.averageRating))}
                    {'☆'.repeat(5 - Math.round(report.feedback.averageRating))}
                  </div>
                  <div className="score-total-reviews">
                    Based on {report.feedback.count} submissions
                  </div>
                </div>

                <div className="score-breakdown-bars">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const cnt = report.feedback.ratingBreakdown?.[String(stars)] || 0;
                    const pct =
                      report.feedback.count > 0
                        ? Math.round((cnt / report.feedback.count) * 100)
                        : 0;

                    return (
                      <div key={stars} className="rating-star-row">
                        <span className="star-level">{stars} ★</span>
                        <div className="star-track">
                          <div
                            className="star-bar"
                            style={{ width: `${pct}%`, backgroundColor: stars >= 4 ? '#10b981' : stars === 3 ? '#f59e0b' : '#ef4444' }}
                          />
                        </div>
                        <span className="star-count">
                          {cnt} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="printable-report-footer print-only">
              <p>Generated by EventSphere Management System • Confidential & Proprietary</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpoReportModal;
