/**
 * MyRegistrationsPage.jsx — Attendee Registration Passes & Schedule Shortcuts
 *
 * Allows authenticated attendees to:
 *  - View all registered event passes with unique registration codes
 *  - Filter by pass status (All, Confirmed, Cancelled)
 *  - Search by event title or pass code
 *  - View event program & schedule
 *  - Cancel an active registration with confirmation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getMyRegistrations, cancelRegistration } from '../services/attendeeService';
import '../styles/MyRegistrationsPage.css';

const MyRegistrationsPage = ({ onNavigate }) => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyRegistrations({
        status: statusFilter,
        search,
      });
      setRegistrations(res.data?.registrations || []);
    } catch (err) {
      setError(err.message || 'Failed to load your event registrations.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleCancelPass = async (reg) => {
    const expoTitle = reg.expo?.title || 'this event';
    if (!window.confirm(`Are you sure you want to cancel your pass for "${expoTitle}"?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setFeedbackMsg(null);
      await cancelRegistration(reg._id);
      setFeedbackMsg({
        type: 'success',
        text: `Your registration for "${expoTitle}" has been cancelled.`,
      });
      fetchRegistrations();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Could not cancel registration.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateRange = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="my-regs-container">
      {/* Top Header */}
      <header className="my-regs-header">
        <div>
          <span className="my-regs-pill">ATTENDEE PASSES</span>
          <h1>My Event Passes & Registrations</h1>
          <p>
            Present your pass reference at expo check-in desk or access event session agendas.
          </p>
        </div>

        {onNavigate && (
          <button
            className="btn-primary"
            onClick={() => onNavigate('attendee-browse')}
          >
            🔍 Browse More Expos
          </button>
        )}
      </header>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className={`regs-feedback ${feedbackMsg.type === 'error' ? 'fb-err' : 'fb-succ'}`}>
          {feedbackMsg.type === 'error' ? '⚠️' : '✅'} {feedbackMsg.text}
          <button className="fb-close-btn" onClick={() => setFeedbackMsg(null)}>✕</button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <section className="regs-controls-card">
        <div className="controls-left">
          <input
            type="text"
            className="regs-search-input"
            placeholder="Search by expo title or pass code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="regs-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="regs-counter-tag">
          {registrations.length} {registrations.length === 1 ? 'Pass' : 'Passes'}
        </div>
      </section>

      {/* Main List */}
      {loading ? (
        <div className="regs-loading-card">
          <div className="regs-spinner"></div>
          <p>Loading your event passes...</p>
        </div>
      ) : error ? (
        <div className="regs-error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Registrations</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchRegistrations}>Retry</button>
        </div>
      ) : registrations.length === 0 ? (
        <div className="regs-empty-card">
          <span className="empty-icon">🎟️</span>
          <h2>No Registrations Found</h2>
          <p>
            {search || statusFilter
              ? 'No passes match your search or filter selection.'
              : 'You do not have any expo passes yet. Browse available trade shows and secure your attendance.'}
          </p>
          {onNavigate && (
            <button
              className="btn-primary"
              onClick={() => onNavigate('attendee-browse')}
            >
              Browse Available Expos
            </button>
          )}
        </div>
      ) : (
        <div className="passes-grid">
          {registrations.map((reg) => {
            const expo = reg.expo;
            const isCancelled = reg.status === 'cancelled';
            const hasEnded = expo?.endDate && new Date(expo.endDate) < new Date();

            return (
              <article key={reg._id} className={`pass-ticket-card ${isCancelled ? 'ticket-cancelled' : ''}`}>
                {/* Left Ticket Stub */}
                <div className="ticket-stub">
                  <span className="stub-label">ADMIT ONE</span>
                  <div className="stub-code">{reg.registrationNumber}</div>
                  <span className={`stub-status status-${reg.status}`}>{reg.status}</span>
                </div>

                {/* Right Ticket Main Info */}
                <div className="ticket-main">
                  <div className="ticket-top">
                    <span className="pass-type-badge">{reg.registrationType?.toUpperCase()} PASS</span>
                    <span className="registered-on-date">
                      Registered: {new Date(reg.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="ticket-title">{expo?.title || 'Expo Event'}</h3>

                  <div className="ticket-meta-block">
                    <div className="meta-row">
                      <span>📅</span>
                      <strong>{expo ? formatDateRange(expo.startDate, expo.endDate) : '—'}</strong>
                    </div>
                    <div className="meta-row">
                      <span>📍</span>
                      <span>{expo?.location?.venue ? `${expo.location.venue}, ` : ''}{expo?.location?.city || 'Location TBA'}</span>
                    </div>
                  </div>

                  {reg.notes && (
                    <div className="ticket-notes">
                      <small>Note: {reg.notes}</small>
                    </div>
                  )}

                  {/* Ticket Actions */}
                  <div className="ticket-actions-row">
                    {expo?._id && onNavigate && (
                      <>
                        <button
                          className="btn-ticket btn-schedule"
                          onClick={() => onNavigate('expo-schedule', { expoId: expo._id })}
                        >
                          📅 View Schedule
                        </button>
                        <button
                          className="btn-ticket btn-details"
                          onClick={() => onNavigate('expo-detail', { expoId: expo._id })}
                        >
                          ℹ️ Expo Details
                        </button>
                      </>
                    )}

                    {!isCancelled && !hasEnded && (
                      <button
                        className="btn-ticket btn-cancel"
                        disabled={actionLoading}
                        onClick={() => handleCancelPass(reg)}
                        title="Cancel this registration"
                      >
                        Cancel Pass
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRegistrationsPage;
