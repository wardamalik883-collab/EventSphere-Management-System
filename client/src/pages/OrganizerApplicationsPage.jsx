/**
 * OrganizerApplicationsPage.jsx — Organizer Application Review Center
 *
 * Allows organizers to inspect exhibitor booth applications for their own expos,
 * review company credentials, and approve or reject submissions with review feedback notes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { listOrganizerApplications, reviewApplication } from '../services/exhibitorService';
import '../styles/OrganizerApplicationsPage.css';

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const OrganizerApplicationsPage = ({ onNavigate }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // Review Modal State
  const [activeReviewApp, setActiveReviewApp] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewActionLoading, setReviewActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOrganizerApplications({
        page,
        limit: 10,
        status: statusFilter,
      });
      setApplications(res.data || []);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err.message || 'Failed to load applications for review');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleOpenReview = (app) => {
    setActiveReviewApp(app);
    setReviewNotes(app.reviewNotes || '');
    setActionMessage(null);
  };

  const handleReviewAction = async (decision) => {
    if (!activeReviewApp) return;
    if (!window.confirm(`Are you sure you want to mark this application as ${decision.toUpperCase()}?`)) return;

    setReviewActionLoading(true);
    setActionMessage(null);
    try {
      await reviewApplication(activeReviewApp._id, {
        status: decision,
        reviewNotes: reviewNotes.trim(),
      });
      setActionMessage({ type: 'success', text: `Application ${decision} successfully!` });
      fetchApplications();
      setTimeout(() => {
        setActiveReviewApp(null);
      }, 1200);
    } catch (err) {
      const msg = err.data?.message || err.message || `Failed to ${decision} application`;
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setReviewActionLoading(false);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="status-pill badge-approved">Approved</span>;
      case 'rejected':
        return <span className="status-pill badge-rejected">Rejected</span>;
      case 'cancelled':
        return <span className="status-pill badge-cancelled">Cancelled</span>;
      case 'pending':
      default:
        return <span className="status-pill badge-pending">Pending Review</span>;
    }
  };

  return (
    <div className="organizer-review-layout">
      {/* Header */}
      <div className="review-header-bar">
        <div>
          <h1>Exhibitor Application Review</h1>
          <p className="review-subtitle">
            Evaluate exhibitor company qualifications and authorize booth space for your expos.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => onNavigate('organizer')}
        >
          ← Organizer Dashboard
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="review-filter-bar">
        <div className="status-tabs">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              className={`status-tab ${statusFilter === s.value ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(s.value);
                setPage(1);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button className="btn-secondary refresh-btn" onClick={fetchApplications}>
          🔄 Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="review-loading">
          <div className="review-spinner"></div>
          <p>Loading exhibitor applications...</p>
        </div>
      ) : error ? (
        <div className="review-error">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Applications</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchApplications}>Try Again</button>
        </div>
      ) : applications.length === 0 ? (
        <div className="review-empty">
          <span className="empty-icon">📂</span>
          <h3>No Applications Received</h3>
          <p>
            {statusFilter
              ? 'No applications match the selected status filter.'
              : 'There are currently no exhibitor applications submitted for your expos.'}
          </p>
        </div>
      ) : (
        <div className="review-table-card">
          <div className="table-wrapper">
            <table className="review-table">
              <thead>
                <tr>
                  <th>Applicant Company</th>
                  <th>Target Expo</th>
                  <th>Requested Booth</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td>
                      <div className="company-cell">
                        <strong>{app.exhibitorProfile?.companyName || app.exhibitor?.name || 'Company'}</strong>
                        <span className="industry-sub">{app.exhibitorProfile?.industry || 'Exhibitor'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="expo-cell">
                        <span>{app.expo?.title || 'Expo Event'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="booth-pill">
                        {app.boothPreference?.size?.toUpperCase()}
                      </span>
                    </td>
                    <td>{formatDate(app.createdAt)}</td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      <button
                        className="btn-primary review-action-btn"
                        onClick={() => handleOpenReview(app)}
                      >
                        {app.status === 'pending' ? 'Review Application →' : 'View Decision →'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="review-pagination">
              <button
                className="btn-secondary"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span className="page-indicator">
                Page {meta.page} of {meta.totalPages} ({meta.totalDocs} applications)
              </span>
              <button
                className="btn-secondary"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {activeReviewApp && (
        <div className="modal-overlay" onClick={() => setActiveReviewApp(null)}>
          <div className="modal-card review-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-sub">APPLICATION EVALUATION</span>
                <h2>{activeReviewApp.exhibitorProfile?.companyName || 'Applicant Company'}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveReviewApp(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {actionMessage && (
                <div className={`status-banner ${actionMessage.type === 'error' ? 'banner-error' : 'banner-success'}`}>
                  {actionMessage.text}
                </div>
              )}

              {/* Status Header */}
              <div className="modal-status-banner">
                <span>Application State:</span>
                {getStatusBadge(activeReviewApp.status)}
              </div>

              {/* Company Profile Details */}
              <div className="review-section">
                <h3>Company Credentials</h3>
                <div className="credentials-box">
                  <p><strong>Industry:</strong> {activeReviewApp.exhibitorProfile?.industry || 'N/A'}</p>
                  <p><strong>Description:</strong> {activeReviewApp.exhibitorProfile?.companyDescription || 'No description provided.'}</p>
                  {activeReviewApp.exhibitorProfile?.contactPerson && (
                    <p>
                      <strong>Primary Contact:</strong> {activeReviewApp.exhibitorProfile.contactPerson.name} ({activeReviewApp.exhibitorProfile.contactPerson.email || activeReviewApp.exhibitor?.email})
                    </p>
                  )}
                </div>
              </div>

              {/* Booth Preferences */}
              <div className="review-section">
                <h3>Requested Booth Space</h3>
                <div className="modal-grid-2">
                  <div><span>Size:</span> <strong>{activeReviewApp.boothPreference?.size?.toUpperCase()}</strong></div>
                  <div><span>Zone:</span> <strong>{activeReviewApp.boothPreference?.preferredLocation || 'Standard'}</strong></div>
                </div>
                {activeReviewApp.boothPreference?.specialRequirements && (
                  <div className="special-req-box">
                    <span>Technical & Facility Requests:</span>
                    <p>{activeReviewApp.boothPreference.specialRequirements}</p>
                  </div>
                )}
              </div>

              {/* Review Feedback Controls */}
              {activeReviewApp.status === 'pending' ? (
                <div className="review-section decision-box">
                  <h3>Evaluation Decision & Remarks</h3>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Enter review feedback, confirmed booth zone, or rejection rationale..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />

                  <div className="decision-actions">
                    <button
                      type="button"
                      className="btn-danger reject-btn"
                      onClick={() => handleReviewAction('rejected')}
                      disabled={reviewActionLoading}
                    >
                      {reviewActionLoading ? 'Processing...' : '❌ Reject Application'}
                    </button>
                    <button
                      type="button"
                      className="btn-success approve-btn"
                      onClick={() => handleReviewAction('approved')}
                      disabled={reviewActionLoading}
                    >
                      {reviewActionLoading ? 'Processing...' : '✅ Approve Application'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="review-section">
                  <h3>Review Outcome</h3>
                  <div className="review-notes-box">
                    <strong>Recorded Feedback:</strong>
                    <p>{activeReviewApp.reviewNotes || 'No specific notes recorded.'}</p>
                    {activeReviewApp.reviewedBy && (
                      <span className="reviewed-by-tag">
                        Reviewed by {activeReviewApp.reviewedBy.name} on {formatDate(activeReviewApp.reviewedAt)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveReviewApp(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerApplicationsPage;
