/**
 * ExhibitorApplicationsPage.jsx — My Submitted Applications
 *
 * Dedicated screen for exhibitors to track the status of all their submitted
 * expo applications, view organizer review feedback, and inspect booth allocations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { listMyApplications, getMyApplicationById } from '../services/exhibitorService';
import '../styles/ExhibitorApplicationsPage.css';

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ExhibitorApplicationsPage = ({ onNavigate }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // Detail Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMyApplications({
        page,
        limit: 10,
        status: statusFilter,
        search,
      });
      setApplications(res.data || []);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleOpenDetail = async (id) => {
    setModalLoading(true);
    try {
      const res = await getMyApplicationById(id);
      setSelectedApp(res.data);
    } catch (err) {
      alert(err.message || 'Failed to load application details');
    } finally {
      setModalLoading(false);
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
    <div className="my-applications-layout">
      {/* Header */}
      <div className="applications-header-bar">
        <div>
          <h1>My Expo Applications</h1>
          <p className="applications-subtitle">
            Track your booth participation applications and view organizer review decisions.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => onNavigate('exhibitor-expos')}
        >
          + Apply to New Expo
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="applications-filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Filter by expo name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

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
      </div>

      {/* Content */}
      {loading ? (
        <div className="apps-loading">
          <div className="apps-spinner"></div>
          <p>Retrieving your applications...</p>
        </div>
      ) : error ? (
        <div className="apps-error">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Applications</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchApplications}>Try Again</button>
        </div>
      ) : applications.length === 0 ? (
        <div className="apps-empty">
          <span className="empty-icon">📋</span>
          <h3>No Applications Found</h3>
          <p>
            {statusFilter || search
              ? 'No applications match your selected criteria.'
              : 'You have not submitted any booth applications yet.'}
          </p>
          <button
            className="btn-primary"
            onClick={() => onNavigate('exhibitor-expos')}
          >
            Browse Available Expos
          </button>
        </div>
      ) : (
        <div className="applications-table-card">
          <div className="table-wrapper">
            <table className="apps-table">
              <thead>
                <tr>
                  <th>Expo Event</th>
                  <th>Booth Size</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td>
                      <div className="expo-cell">
                        <strong>{app.expo?.title || 'Expo Event'}</strong>
                        <span className="expo-loc">
                          📍 {app.expo?.location?.venue}, {app.expo?.location?.city}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="booth-size-tag">
                        {app.boothPreference?.size?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </td>
                    <td>{formatDate(app.createdAt)}</td>
                    <td>{getStatusBadge(app.status)}</td>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => handleOpenDetail(app._id)}
                        disabled={modalLoading}
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="apps-pagination">
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

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-sub">APPLICATION RECORD</span>
                <h2>{selectedApp.expo?.title || 'Expo Application'}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedApp(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-status-banner">
                <span>Current Status:</span>
                {getStatusBadge(selectedApp.status)}
              </div>

              {selectedApp.reviewNotes && (
                <div className="review-notes-box">
                  <strong>Organizer Feedback / Review Notes:</strong>
                  <p>{selectedApp.reviewNotes}</p>
                  {selectedApp.reviewedBy && (
                    <span className="reviewed-by-tag">
                      Reviewed by {selectedApp.reviewedBy.name} on {formatDate(selectedApp.reviewedAt)}
                    </span>
                  )}
                </div>
              )}

              <div className="modal-section">
                <h3>Booth Specifications</h3>
                <div className="modal-grid-2">
                  <div><span>Booth Size:</span> <strong>{selectedApp.boothPreference?.size?.toUpperCase()}</strong></div>
                  <div><span>Preferred Zone:</span> <strong>{selectedApp.boothPreference?.preferredLocation || 'Standard'}</strong></div>
                </div>
                {selectedApp.boothPreference?.specialRequirements && (
                  <div className="special-req-box">
                    <span>Special Requirements:</span>
                    <p>{selectedApp.boothPreference.specialRequirements}</p>
                  </div>
                )}
              </div>

              <div className="modal-section">
                <h3>Expo Details</h3>
                <div className="modal-grid-2">
                  <div><span>Venue:</span> {selectedApp.expo?.location?.venue}, {selectedApp.expo?.location?.city}</div>
                  <div><span>Category:</span> {selectedApp.expo?.category}</div>
                  <div><span>Dates:</span> {formatDate(selectedApp.expo?.startDate)} – {formatDate(selectedApp.expo?.endDate)}</div>
                  <div><span>Expo Status:</span> <span className="status-pill">{selectedApp.expo?.status}</span></div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedApp(null)}>
                Close
              </button>
              {selectedApp.expo?._id && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    const id = selectedApp.expo._id;
                    setSelectedApp(null);
                    onNavigate('expo-detail', { expoId: id });
                  }}
                >
                  View Expo Page
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExhibitorApplicationsPage;
