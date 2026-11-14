/**
 * ExpoSchedulePage.jsx — Public / Attendee Chronological Expo Schedule View
 *
 * Renders:
 *  - Date navigation tabs (Day 1, Day 2, etc.)
 *  - Category filter pills
 *  - Text search by session title, speaker, or room
 *  - Chronological session timeline cards
 *  - Speaker information and room badges
 *  - Deep link to manage sessions if organizer/admin
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getExpoSchedule } from '../services/sessionService';
import '../styles/ExpoSchedulePage.css';

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  in_progress: '#10b981',
  completed: '#6366f1',
  cancelled: '#ef4444',
};

const ExpoSchedulePage = ({ expoId, onNavigate }) => {
  const { role, user } = useAuth();
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeDateTab, setActiveDateTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  const fetchSchedule = useCallback(async () => {
    if (!expoId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getExpoSchedule(expoId, {
        category: selectedCategory,
        search,
      });
      setScheduleData(res.data);
      if (res.data?.schedule?.length > 0) {
        // default to first day if available on initial load
        setActiveDateTab((prev) => (prev === 'all' ? res.data.schedule[0].date : prev));
      }
    } catch (err) {
      setError(err.message || 'Unable to load schedule for this expo.');
    } finally {
      setLoading(false);
    }
  }, [expoId, selectedCategory, search]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const expo = scheduleData?.expo;
  const scheduleDays = scheduleData?.schedule || [];
  const categories = scheduleData?.categories || [];

  // Filter days based on active tab
  const displayedDays = activeDateTab === 'all'
    ? scheduleDays
    : scheduleDays.filter((day) => day.date === activeDateTab);

  const formatTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOrganizerOrAdmin = role === 'admin' || (role === 'organizer' && user && expo?.organizer === user._id);

  if (loading) {
    return (
      <div className="schedule-page-container">
        <div className="schedule-loading-card">
          <div className="schedule-spinner"></div>
          <p>Loading event schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedule-page-container">
        <div className="schedule-error-card">
          <span className="error-icon">⚠️</span>
          <h2>Schedule Unavailable</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn-primary" onClick={fetchSchedule}>Retry</button>
            {onNavigate && (
              <button className="btn-secondary" onClick={() => onNavigate('expo-detail', { expoId })}>
                Back to Expo Details
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-page-container">
      {/* Breadcrumb / Top Link */}
      <div className="schedule-top-bar">
        {onNavigate && (
          <button
            className="btn-back-link"
            onClick={() => onNavigate('expo-detail', { expoId })}
          >
            ← Back to {expo?.title || 'Expo Details'}
          </button>
        )}

        {isOrganizerOrAdmin && onNavigate && (
          <button
            className="btn-secondary btn-manage-schedule"
            onClick={() => onNavigate('organizer-sessions', { expoId })}
          >
            ⚙️ Manage Sessions & Speakers
          </button>
        )}
      </div>

      {/* Hero Header */}
      <header className="schedule-header">
        <div className="schedule-header-content">
          <span className="schedule-badge">Official Event Program</span>
          <h1>{expo?.title} — Schedule</h1>
          <p className="schedule-meta">
            <span>📅 {new Date(expo?.startDate).toLocaleDateString()} – {new Date(expo?.endDate).toLocaleDateString()}</span>
            {expo?.location?.venue && <span>📍 {expo.location.venue}, {expo.location.city}</span>}
          </p>
        </div>
      </header>

      {/* Filters Strip */}
      <section className="schedule-filters-card">
        <div className="filters-row">
          <input
            type="text"
            className="schedule-search"
            placeholder="Search sessions, topics, speakers, or rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="category-pills">
            <button
              className={`pill-btn ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('')}
            >
              All Topics
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Date Tabs */}
      {scheduleDays.length > 0 && (
        <div className="date-tabs-container">
          <button
            className={`date-tab ${activeDateTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveDateTab('all')}
          >
            All Days ({scheduleData?.totalSessions || 0})
          </button>
          {scheduleDays.map((day) => (
            <button
              key={day.date}
              className={`date-tab ${activeDateTab === day.date ? 'active' : ''}`}
              onClick={() => setActiveDateTab(day.date)}
            >
              {day.dayLabel} ({day.sessions.length})
            </button>
          ))}
        </div>
      )}

      {/* Sessions Timeline View */}
      {scheduleDays.length === 0 || displayedDays.every((d) => d.sessions.length === 0) ? (
        <div className="schedule-empty-state">
          <span className="empty-icon">📅</span>
          <h3>No Sessions Scheduled</h3>
          <p>
            {search || selectedCategory
              ? 'No sessions match your filter criteria.'
              : 'The organizers have not published any sessions for this event yet.'}
          </p>
          {(search || selectedCategory) && (
            <button
              className="btn-secondary"
              onClick={() => { setSearch(''); setSelectedCategory(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="schedule-timeline">
          {displayedDays.map((day) => (
            <div key={day.date} className="schedule-day-group">
              <div className="day-sticky-header">
                <h3>{day.dayLabel}</h3>
                <span className="day-count">{day.sessions.length} sessions</span>
              </div>

              <div className="day-sessions-list">
                {day.sessions.map((sess) => {
                  const isCancelled = sess.status === 'cancelled';
                  return (
                    <article
                      key={sess._id}
                      className={`timeline-card ${isCancelled ? 'card-cancelled' : ''}`}
                      style={{ borderLeftColor: STATUS_COLORS[sess.status] || '#64748b' }}
                    >
                      <div className="time-block">
                        <strong className="time-start">{formatTime(sess.startTime)}</strong>
                        <span className="time-divider">↓</span>
                        <span className="time-end">{formatTime(sess.endTime)}</span>
                      </div>

                      <div className="timeline-content">
                        <div className="timeline-meta-top">
                          <span className="category-tag">{sess.category || 'General'}</span>
                          <span className="room-tag">📍 {sess.room}</span>
                          {sess.capacity > 0 && (
                            <span className="capacity-tag">👥 Cap: {sess.capacity}</span>
                          )}
                          <span
                            className="status-tag"
                            style={{
                              color: STATUS_COLORS[sess.status],
                              backgroundColor: `${STATUS_COLORS[sess.status]}1a`,
                            }}
                          >
                            {sess.status}
                          </span>
                        </div>

                        <h4 className="timeline-title">{sess.title}</h4>

                        {/* Speaker details */}
                        <div className="timeline-speaker-chip">
                          <div className="speaker-initial">
                            {sess.speaker?.name ? sess.speaker.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <strong>{sess.speaker?.name || 'TBA'}</strong>
                            {(sess.speaker?.title || sess.speaker?.company) && (
                              <span>
                                {[sess.speaker?.title, sess.speaker?.company].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {sess.description && (
                          <p className="timeline-desc">{sess.description}</p>
                        )}

                        {sess.speaker?.bio && (
                          <div className="speaker-bio-box">
                            <small><strong>About the speaker:</strong> {sess.speaker.bio}</small>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpoSchedulePage;
