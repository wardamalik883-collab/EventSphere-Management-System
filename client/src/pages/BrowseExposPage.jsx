/**
 * BrowseExposPage.jsx — Attendee Expo Discovery & Direct Registration
 *
 * Provides:
 *  - Search by keywords (title, description, city, venue)
 *  - Filtering by category, city/location, and dates
 *  - Sorting by upcoming date or title
 *  - Dynamic registration status badge (Already Registered vs Open)
 *  - Registration modal with registration type selector
 *  - Pagination
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { browseAttendeeExpos, registerForExpo } from '../services/attendeeService';
import '../styles/BrowseExposPage.css';

const EXPO_CATEGORIES = [
  'Technology',
  'Automotive',
  'Healthcare',
  'Science & Robotics',
  'Energy & Environment',
  'Finance & FinTech',
  'Creative Arts & Media',
  'General',
];

const BrowseExposPage = ({ onNavigate }) => {
  const { isAuthenticated, role } = useAuth();
  const [expos, setExpos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('date_asc');

  // Registration modal state
  const [selectedExpoForReg, setSelectedExpoForReg] = useState(null);
  const [regType, setRegType] = useState('standard');
  const [regNotes, setRegNotes] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchExpos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await browseAttendeeExpos({
        search,
        category,
        location,
        sort,
        page,
        limit: 9,
      });
      setExpos(res.data?.expos || []);
      setTotal(res.data?.total || 0);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load expos.');
    } finally {
      setLoading(false);
    }
  }, [search, category, location, sort, page]);

  useEffect(() => {
    fetchExpos();
  }, [fetchExpos]);

  const handleOpenRegister = (expo) => {
    if (!isAuthenticated) {
      if (onNavigate) onNavigate('login');
      return;
    }
    if (role !== 'attendee' && role !== 'admin') {
      alert('Expo attendee registration is designated for attendee accounts.');
      return;
    }
    setSelectedExpoForReg(expo);
    setRegType('standard');
    setRegNotes('');
    setFeedbackMsg(null);
  };

  const handleConfirmRegistration = async (e) => {
    e.preventDefault();
    if (!selectedExpoForReg) return;

    try {
      setRegLoading(true);
      setFeedbackMsg(null);
      const res = await registerForExpo({
        expoId: selectedExpoForReg._id,
        registrationType: regType,
        notes: regNotes,
      });

      setFeedbackMsg({
        type: 'success',
        text: res.message || `Registration confirmed! Pass: ${res.data?.registration?.registrationNumber}`,
      });

      // Update local state to mark this expo as registered
      setExpos((prev) =>
        prev.map((exp) =>
          exp._id === selectedExpoForReg._id ? { ...exp, isRegistered: true } : exp
        )
      );

      setTimeout(() => {
        setSelectedExpoForReg(null);
      }, 1800);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Registration failed.',
      });
    } finally {
      setRegLoading(false);
    }
  };

  const formatDateRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="browse-expos-container">
      {/* Top Banner */}
      <header className="browse-hero">
        <div className="browse-hero-text">
          <span className="browse-pill">EXPO DIRECTORY</span>
          <h1>Explore Upcoming Trade Shows & Expos</h1>
          <p>
            Connect with pioneering innovators, experience interactive floor exhibits, and reserve your attendee pass.
          </p>
        </div>

        {onNavigate && isAuthenticated && (
          <button
            className="btn-secondary"
            onClick={() => onNavigate('attendee-registrations')}
          >
            🎟️ View My Registrations
          </button>
        )}
      </header>

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div className={`browse-feedback-bar ${feedbackMsg.type === 'error' ? 'fb-err' : 'fb-succ'}`}>
          {feedbackMsg.type === 'error' ? '⚠️' : '✅'} {feedbackMsg.text}
          <button className="fb-dismiss" onClick={() => setFeedbackMsg(null)}>✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="browse-filters-card">
        <div className="filters-grid">
          <input
            type="text"
            className="browse-search-input"
            placeholder="Search by expo title, description, or theme..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />

          <select
            className="browse-select"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {EXPO_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <input
            type="text"
            className="browse-location-input"
            placeholder="City or venue..."
            value={location}
            onChange={(e) => { setLocation(e.target.value); setPage(1); }}
          />

          <select
            className="browse-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date_asc">Date: Upcoming First</option>
            <option value="date_desc">Date: Latest First</option>
            <option value="title_asc">Title: A to Z</option>
            <option value="title_desc">Title: Z to A</option>
          </select>
        </div>

        {(search || category || location) && (
          <div className="active-filters-row">
            <span>Filtering results</span>
            <button
              className="btn-clear-filters"
              onClick={() => { setSearch(''); setCategory(''); setLocation(''); setPage(1); }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      {/* Content Section */}
      {loading ? (
        <div className="browse-loading-card">
          <div className="browse-spinner"></div>
          <p>Discovering upcoming trade shows...</p>
        </div>
      ) : error ? (
        <div className="browse-error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Expos</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchExpos}>Retry</button>
        </div>
      ) : expos.length === 0 ? (
        <div className="browse-empty-card">
          <span className="empty-icon">🎪</span>
          <h2>No Expos Found</h2>
          <p>No published expos match your search criteria. Try modifying your filters or search keywords.</p>
          <button
            className="btn-secondary"
            onClick={() => { setSearch(''); setCategory(''); setLocation(''); }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="expos-cards-grid">
            {expos.map((exp) => {
              const isRegistered = !!exp.isRegistered;
              const hasEnded = new Date(exp.endDate) < new Date();

              return (
                <div key={exp._id} className="expo-discover-card">
                  <div className="card-top-meta">
                    <span className="category-badge">{exp.category}</span>
                    {isRegistered ? (
                      <span className="badge-registered">✓ Registered</span>
                    ) : hasEnded ? (
                      <span className="badge-ended">Concluded</span>
                    ) : (
                      <span className="badge-open">Open for Reg</span>
                    )}
                  </div>

                  <h3 className="expo-title">{exp.title}</h3>

                  <div className="expo-meta-list">
                    <div className="meta-item">
                      <span>📅</span>
                      <strong>{formatDateRange(exp.startDate, exp.endDate)}</strong>
                    </div>
                    <div className="meta-item">
                      <span>📍</span>
                      <span>{exp.location?.venue ? `${exp.location.venue}, ` : ''}{exp.location?.city || 'Location TBA'}</span>
                    </div>
                    {exp.capacity > 0 && (
                      <div className="meta-item">
                        <span>👥</span>
                        <span>Capacity: {exp.capacity.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <p className="expo-snippet">
                    {exp.description ? exp.description.substring(0, 140) + '...' : 'Explore world-class exhibitions and keynotes.'}
                  </p>

                  <div className="card-actions-row">
                    {isRegistered ? (
                      <button
                        className="btn-pass-action btn-registered"
                        onClick={() => onNavigate && onNavigate('attendee-registrations')}
                      >
                        ✓ View Pass
                      </button>
                    ) : hasEnded ? (
                      <button className="btn-pass-action btn-disabled" disabled>
                        Event Concluded
                      </button>
                    ) : (
                      <button
                        className="btn-pass-action btn-register"
                        onClick={() => handleOpenRegister(exp)}
                      >
                        🎟️ Register Pass
                      </button>
                    )}

                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => onNavigate && onNavigate('expo-detail', { expoId: exp._id })}
                      title="View complete expo details"
                    >
                      Details
                    </button>

                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => onNavigate && onNavigate('expo-schedule', { expoId: exp._id })}
                      title="View schedule program"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="browse-pagination">
              <button
                className="btn-page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="page-indicator">
                Page {page} of {totalPages} ({total} expos)
              </span>
              <button
                className="btn-page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Registration Modal Dialog */}
      {selectedExpoForReg && (
        <div className="modal-overlay" onClick={() => setSelectedExpoForReg(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="modal-sub">PASS REGISTRATION</span>
                <h2>Register for {selectedExpoForReg.title}</h2>
              </div>
              <button className="btn-modal-close" onClick={() => setSelectedExpoForReg(null)}>✕</button>
            </div>

            <form onSubmit={handleConfirmRegistration}>
              <div className="modal-body">
                <div className="reg-expo-brief">
                  <div><span>Dates:</span> <strong>{formatDateRange(selectedExpoForReg.startDate, selectedExpoForReg.endDate)}</strong></div>
                  <div><span>Venue:</span> <strong>{selectedExpoForReg.location?.venue || 'TBA'}, {selectedExpoForReg.location?.city}</strong></div>
                </div>

                {feedbackMsg && (
                  <div className={`modal-alert ${feedbackMsg.type === 'error' ? 'alert-err' : 'alert-succ'}`}>
                    {feedbackMsg.type === 'error' ? '⚠️' : '✅'} {feedbackMsg.text}
                  </div>
                )}

                <div className="form-group">
                  <label>Select Pass Type *</label>
                  <select
                    className="form-control"
                    value={regType}
                    onChange={(e) => setRegType(e.target.value)}
                  >
                    <option value="standard">Standard Pass (Full Access to Floor & Panels)</option>
                    <option value="vip">VIP Pass (Priority Seating & VIP Lounge)</option>
                    <option value="student">Student Pass (Discounted Academic Access)</option>
                    <option value="press">Press / Media Pass</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Special Requests or Attendance Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Dietary requirements, accessibility assistance..."
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedExpoForReg(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={regLoading}
                >
                  {regLoading ? 'Processing Pass...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseExposPage;
