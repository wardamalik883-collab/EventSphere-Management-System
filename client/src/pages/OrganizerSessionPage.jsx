/**
 * OrganizerSessionPage.jsx — Organizer Schedule & Session Management
 *
 * Full-featured session control interface:
 *  - Switch between managed expos
 *  - Live metric ribbon (Total, Scheduled, In Progress, Cancelled)
 *  - Filtering by category, status, date, and text search
 *  - Dual display: Timeline Cards vs Tabular Inventory
 *  - Create & Edit Session Modal with room conflict & time validation
 *  - Cancel Session & Safe Deletion actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getExpoSessions,
  createSession,
  updateSession,
  deleteSession,
  cancelSession,
} from '../services/sessionService';
import { listExpos } from '../services/expoService';
import '../styles/OrganizerSessionPage.css';

const SESSION_CATEGORIES = [
  'General',
  'Keynote',
  'Workshop',
  'Panel Discussion',
  'Technical Talk',
  'Breakout',
  'Networking',
  'Fireside Chat',
];

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  in_progress: '#10b981',
  completed: '#6366f1',
  cancelled: '#ef4444',
};

const OrganizerSessionPage = ({ expoId: initialExpoId, onNavigate }) => {
  const [selectedExpoId, setSelectedExpoId] = useState(initialExpoId || '');
  const [myExpos, setMyExpos] = useState([]);
  const [currentExpo, setCurrentExpo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    speakerName: '',
    speakerTitle: '',
    speakerCompany: '',
    speakerBio: '',
    room: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'General',
    capacity: 50,
  });

  // Load list of organizer's expos
  useEffect(() => {
    let isMounted = true;
    const fetchExpos = async () => {
      try {
        const res = await listExpos();
        const exposList = res.data?.expos || res.data || [];
        if (isMounted) {
          setMyExpos(exposList);
          if (!selectedExpoId && exposList.length > 0) {
            setSelectedExpoId(exposList[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch expos:', err);
      }
    };
    fetchExpos();
    return () => { isMounted = false; };
  }, [selectedExpoId]);

  // Fetch sessions for selected expo
  const fetchSessions = useCallback(async () => {
    if (!selectedExpoId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getExpoSessions(selectedExpoId, {
        search,
        category: categoryFilter,
        status: statusFilter,
      });
      setSessions(res.data?.sessions || []);
      setCurrentExpo(res.data?.expo || null);
    } catch (err) {
      setError(err.message || 'Failed to load sessions for this expo.');
    } finally {
      setLoading(false);
    }
  }, [selectedExpoId, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Form helpers
  const openCreateModal = () => {
    let defaultDate = '';
    if (currentExpo?.startDate) {
      defaultDate = new Date(currentExpo.startDate).toISOString().split('T')[0];
    } else {
      defaultDate = new Date().toISOString().split('T')[0];
    }

    setFormData({
      title: '',
      description: '',
      speakerName: '',
      speakerTitle: '',
      speakerCompany: '',
      speakerBio: '',
      room: '',
      date: defaultDate,
      startTime: '09:00',
      endTime: '10:00',
      category: 'General',
      capacity: 50,
    });
    setEditingSession(null);
    setIsModalOpen(true);
  };

  const openEditModal = (session) => {
    const sDate = new Date(session.startTime);
    const dateStr = sDate.toISOString().split('T')[0];
    const sHours = String(sDate.getHours()).padStart(2, '0');
    const sMins = String(sDate.getMinutes()).padStart(2, '0');
    const eDate = new Date(session.endTime);
    const eHours = String(eDate.getHours()).padStart(2, '0');
    const eMins = String(eDate.getMinutes()).padStart(2, '0');

    setFormData({
      title: session.title || '',
      description: session.description || '',
      speakerName: session.speaker?.name || '',
      speakerTitle: session.speaker?.title || '',
      speakerCompany: session.speaker?.company || '',
      speakerBio: session.speaker?.bio || '',
      room: session.room || '',
      date: dateStr,
      startTime: `${sHours}:${sMins}`,
      endTime: `${eHours}:${eMins}`,
      category: session.category || 'General',
      capacity: session.capacity || 0,
    });
    setEditingSession(session);
    setIsModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedbackMsg(null);

    try {
      // Assemble ISO dates from date string + time string
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      if (endDateTime <= startDateTime) {
        throw new Error('End time must be strictly after start time');
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        speakerName: formData.speakerName,
        speakerTitle: formData.speakerTitle,
        speakerCompany: formData.speakerCompany,
        speakerBio: formData.speakerBio,
        room: formData.room,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        category: formData.category,
        capacity: Number(formData.capacity) || 0,
      };

      if (editingSession) {
        await updateSession(editingSession._id, payload);
        setFeedbackMsg({ type: 'success', text: `Session "${formData.title}" updated successfully.` });
      } else {
        await createSession(selectedExpoId, payload);
        setFeedbackMsg({ type: 'success', text: `Session "${formData.title}" created successfully.` });
      }

      setIsModalOpen(false);
      fetchSessions();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSession = async (session) => {
    if (!window.confirm(`Are you sure you want to cancel the session "${session.title}"?`)) return;
    try {
      setActionLoading(true);
      await cancelSession(session._id);
      setFeedbackMsg({ type: 'success', text: `Session "${session.title}" cancelled.` });
      fetchSessions();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Could not cancel session.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSession = async (session) => {
    if (!window.confirm(`Permanently delete the session "${session.title}"? This action cannot be undone.`)) return;
    try {
      setActionLoading(true);
      await deleteSession(session._id);
      setFeedbackMsg({ type: 'success', text: `Session "${session.title}" deleted.` });
      fetchSessions();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Could not delete session.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const totalCount = sessions.length;
  const scheduledCount = sessions.filter((s) => s.status === 'scheduled').length;
  const inProgressCount = sessions.filter((s) => s.status === 'in_progress').length;
  const cancelledCount = sessions.filter((s) => s.status === 'cancelled').length;

  const formatTimeRange = (startStr, endStr) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    return `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="session-page-layout">
      {/* Header Bar */}
      <div className="session-header-bar">
        <div>
          <h1>Schedule & Session Management</h1>
          <p className="session-subtitle">
            Curate keynotes, panels, and workshops. Organize rooms and avoid timing collisions.
          </p>
        </div>

        <div className="session-header-actions">
          {myExpos.length > 0 && (
            <select
              className="expo-select-picker"
              value={selectedExpoId}
              onChange={(e) => setSelectedExpoId(e.target.value)}
            >
              {myExpos.map((exp) => (
                <option key={exp._id} value={exp._id}>
                  🏛️ {exp.title}
                </option>
              ))}
            </select>
          )}

          {selectedExpoId && (
            <button
              className="btn-secondary"
              onClick={() => onNavigate && onNavigate('expo-schedule', { expoId: selectedExpoId })}
            >
              📅 View Public Schedule
            </button>
          )}

          <button className="btn-primary" onClick={openCreateModal} disabled={!selectedExpoId}>
            + Add Session
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`session-feedback ${feedbackMsg.type === 'error' ? 'fb-error' : 'fb-success'}`}>
          {feedbackMsg.type === 'error' ? '⚠️' : '✅'} {feedbackMsg.text}
          <button className="fb-close" onClick={() => setFeedbackMsg(null)}>✕</button>
        </div>
      )}

      {/* Metrics Ribbon */}
      <section className="session-stats-strip">
        <div className="stat-card">
          <span className="stat-lbl">Total Sessions</span>
          <strong className="stat-num">{totalCount}</strong>
          <span className="stat-hint">Scheduled events</span>
        </div>
        <div className="stat-card border-blue">
          <span className="stat-lbl">Scheduled</span>
          <strong className="stat-num text-blue">{scheduledCount}</strong>
          <span className="stat-hint">Ready for attendees</span>
        </div>
        <div className="stat-card border-green">
          <span className="stat-lbl">In Progress</span>
          <strong className="stat-num text-green">{inProgressCount}</strong>
          <span className="stat-hint">Live right now</span>
        </div>
        <div className="stat-card border-red">
          <span className="stat-lbl">Cancelled</span>
          <strong className="stat-num text-red">{cancelledCount}</strong>
          <span className="stat-hint">Inactive sessions</span>
        </div>
      </section>

      {/* Controls & Filter Bar */}
      <div className="session-controls-bar">
        <div className="filter-group">
          <input
            type="text"
            className="search-input"
            placeholder="Search title, speaker, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {SESSION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
          >
            📇 Cards
          </button>
          <button
            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            📋 Table
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="session-loading-card">
          <div className="session-spinner"></div>
          <p>Loading schedule and sessions...</p>
        </div>
      ) : error ? (
        <div className="session-error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Sessions</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchSessions}>Try Again</button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="session-empty-card">
          <span className="empty-icon">📅</span>
          <h3>No Sessions Found</h3>
          <p>
            {search || categoryFilter || statusFilter
              ? 'No sessions match your search or filter criteria.'
              : 'Start scheduling keynotes, workshops, and panels for this expo.'}
          </p>
          <button className="btn-primary" onClick={openCreateModal}>
            + Create First Session
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Timeline Cards View */
        <div className="session-cards-grid">
          {sessions.map((sess) => (
            <div
              key={sess._id}
              className={`session-card status-${sess.status}`}
              style={{ borderLeftColor: STATUS_COLORS[sess.status] || '#64748b' }}
            >
              <div className="card-top-row">
                <span className="category-pill">{sess.category || 'General'}</span>
                <span
                  className="status-badge"
                  style={{
                    color: STATUS_COLORS[sess.status],
                    backgroundColor: `${STATUS_COLORS[sess.status]}1a`,
                    borderColor: `${STATUS_COLORS[sess.status]}40`,
                  }}
                >
                  {sess.status}
                </span>
              </div>

              <h3 className="session-card-title">{sess.title}</h3>

              <div className="time-location-block">
                <div className="info-line">
                  <span>📅</span> {formatDateLabel(sess.startTime)}
                </div>
                <div className="info-line">
                  <span>⏰</span> {formatTimeRange(sess.startTime, sess.endTime)}
                </div>
                <div className="info-line">
                  <span>📍</span> Room: <strong>{sess.room}</strong>
                </div>
                {sess.capacity > 0 && (
                  <div className="info-line">
                    <span>👥</span> Capacity: <strong>{sess.capacity}</strong>
                  </div>
                )}
              </div>

              {/* Speaker Box */}
              <div className="speaker-box">
                <div className="speaker-avatar-circle">
                  {sess.speaker?.name ? sess.speaker.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="speaker-meta">
                  <strong>{sess.speaker?.name || 'TBA'}</strong>
                  {sess.speaker?.title && <span>{sess.speaker.title}</span>}
                  {sess.speaker?.company && <small>{sess.speaker.company}</small>}
                </div>
              </div>

              {sess.description && (
                <p className="session-card-desc">{sess.description}</p>
              )}

              {/* Card Actions */}
              <div className="card-actions-bar">
                <button
                  className="btn-card-action"
                  onClick={() => openEditModal(sess)}
                  title="Edit session details"
                >
                  ✏️ Edit
                </button>
                {sess.status !== 'cancelled' && (
                  <button
                    className="btn-card-action btn-warn"
                    onClick={() => handleCancelSession(sess)}
                    title="Cancel session"
                  >
                    🚫 Cancel
                  </button>
                )}
                <button
                  className="btn-card-action btn-del"
                  onClick={() => handleDeleteSession(sess)}
                  title="Delete session"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Tabular Inventory View */
        <div className="session-table-wrapper">
          <table className="session-table">
            <thead>
              <tr>
                <th>Time & Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Speaker</th>
                <th>Room</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess) => (
                <tr key={sess._id}>
                  <td>
                    <div className="tbl-time-col">
                      <strong>{formatTimeRange(sess.startTime, sess.endTime)}</strong>
                      <small>{formatDateLabel(sess.startTime)}</small>
                    </div>
                  </td>
                  <td>
                    <strong>{sess.title}</strong>
                  </td>
                  <td>
                    <span className="category-pill">{sess.category || 'General'}</span>
                  </td>
                  <td>
                    <div className="tbl-speaker-col">
                      <strong>{sess.speaker?.name}</strong>
                      <small>{sess.speaker?.company || sess.speaker?.title}</small>
                    </div>
                  </td>
                  <td><strong>{sess.room}</strong></td>
                  <td>{sess.capacity > 0 ? sess.capacity : '—'}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        color: STATUS_COLORS[sess.status],
                        backgroundColor: `${STATUS_COLORS[sess.status]}1a`,
                        borderColor: `${STATUS_COLORS[sess.status]}40`,
                      }}
                    >
                      {sess.status}
                    </span>
                  </td>
                  <td>
                    <div className="tbl-actions-row">
                      <button className="btn-sm" onClick={() => openEditModal(sess)}>
                        Edit
                      </button>
                      {sess.status !== 'cancelled' && (
                        <button className="btn-sm btn-warn" onClick={() => handleCancelSession(sess)}>
                          Cancel
                        </button>
                      )}
                      <button className="btn-sm btn-del" onClick={() => handleDeleteSession(sess)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create / Edit Session */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSession ? 'Edit Session' : 'Create New Session'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveSession}>
              <div className="modal-body">
                {/* Title */}
                <div className="form-group">
                  <label>Session Title *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. NextGen AI Architectures Keynote"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Speaker Info Grid */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Speaker Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. Dr. Jane Smith"
                      value={formData.speakerName}
                      onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Speaker Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. VP of Research"
                      value={formData.speakerTitle}
                      onChange={(e) => setFormData({ ...formData, speakerTitle: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Speaker Company / Org</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. DeepMind"
                      value={formData.speakerCompany}
                      onChange={(e) => setFormData({ ...formData, speakerCompany: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {SESSION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date and Timing */}
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Session Date *</label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="time"
                      required
                      className="form-control"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time *</label>
                    <input
                      type="time"
                      required
                      className="form-control"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Room & Capacity */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Room / Hall Location *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="e.g. Auditorium A, Room 102"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Capacity (0 = unlimited)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label>Description & Objectives</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Brief outline of the topics to be covered..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : (editingSession ? 'Update Session' : 'Create Session')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerSessionPage;
