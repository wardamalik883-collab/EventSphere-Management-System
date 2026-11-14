/**
 * ExpoListPage.jsx — Expo Management Listing Page
 *
 * Displays all expos belonging to the authenticated organizer (or all for admin).
 * Features: search, status filter, category filter, pagination, create button, expo cards.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listExpos, deleteExpo } from '../services/expoService';
import '../styles/ExpoListPage.css';

const STATUS_OPTIONS = ['', 'draft', 'published', 'ongoing', 'completed', 'cancelled'];
const STATUS_LABELS  = {
  '': 'All Statuses',
  draft: 'Draft',
  published: 'Published',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  draft:     '#94a3b8',
  published: '#22c55e',
  ongoing:   '#3b82f6',
  completed: '#8b5cf6',
  cancelled: '#ef4444',
};

function StatusBadge({ status }) {
  return (
    <span
      className="expo-status-badge"
      style={{ background: STATUS_COLORS[status] || '#94a3b8' }}
    >
      {status}
    </span>
  );
}

function ExpoCard({ expo, onNavigate, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${expo.title}"? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete(expo._id);
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="expo-card">
      <div className="expo-card-header">
        <div className="expo-card-title-row">
          <h3 className="expo-card-title">{expo.title}</h3>
          <StatusBadge status={expo.status} />
        </div>
        <p className="expo-card-category">📂 {expo.category}</p>
      </div>
      <div className="expo-card-body">
        <p className="expo-card-desc">{expo.description?.slice(0, 120)}{expo.description?.length > 120 ? '…' : ''}</p>
        <div className="expo-card-meta">
          <span>📍 {expo.location?.venue}, {expo.location?.city}</span>
          <span>📅 {fmtDate(expo.startDate)} – {fmtDate(expo.endDate)}</span>
          {expo.capacity > 0 && <span>👥 Capacity: {expo.capacity.toLocaleString()}</span>}
        </div>
      </div>
      <div className="expo-card-actions">
        <button
          className="btn-view"
          onClick={() => onNavigate('expo-detail', { expoId: expo._id })}
        >
          View Details
        </button>
        <button
          className="btn-edit"
          onClick={() => onNavigate('expo-edit', { expoId: expo._id })}
        >
          Edit
        </button>
        <button
          className="btn-delete"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

const ExpoListPage = ({ onNavigate }) => {
  const { role } = useAuth();
  const [expos, setExpos]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [categoryFilter, setCategory] = useState('');
  const [page, setPage]             = useState(1);
  const [meta, setMeta]             = useState(null);
  const [deleteMsg, setDeleteMsg]   = useState(null);

  const fetchExpos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listExpos({
        page,
        limit: 9,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        sort: '-createdAt',
      });
      setExpos(result.data || []);
      setMeta(result.meta || null);
    } catch (err) {
      setError(err.message || 'Failed to load expos');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchExpos();
  }, [fetchExpos]);

  const handleDelete = async (id) => {
    try {
      await deleteExpo(id);
      setDeleteMsg('Expo deleted successfully.');
      fetchExpos();
      setTimeout(() => setDeleteMsg(null), 4000);
    } catch (err) {
      const msg = err.data?.message || err.message || 'Delete failed';
      setDeleteMsg(`⚠️ ${msg}`);
      setTimeout(() => setDeleteMsg(null), 6000);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchExpos();
  };

  return (
    <div className="expo-list-layout">
      {/* Page Header */}
      <div className="expo-list-header">
        <div className="expo-list-title-block">
          <h1>Expo Management</h1>
          <p className="expo-list-subtitle">
            {role === 'admin' ? 'System-wide expo directory' : 'Manage your expo portfolio'}
          </p>
        </div>
        {(role === 'organizer' || role === 'admin') && (
          <button className="btn-primary expo-create-btn" onClick={() => onNavigate('expo-create')}>
            + Create Expo
          </button>
        )}
      </div>

      {/* Notification Bar */}
      {deleteMsg && (
        <div className={`expo-notify ${deleteMsg.startsWith('⚠️') ? 'expo-notify-error' : 'expo-notify-success'}`}>
          {deleteMsg}
        </div>
      )}

      {/* Filters */}
      <form className="expo-filters" onSubmit={handleSearch}>
        <input
          className="expo-search-input"
          type="text"
          placeholder="Search by expo name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="expo-filter-select"
          value={statusFilter}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input
          className="expo-filter-input"
          type="text"
          placeholder="Category…"
          value={categoryFilter}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {/* Content */}
      {loading ? (
        <div className="expo-list-loading">
          <div className="expo-spinner" />
          <p>Loading expos…</p>
        </div>
      ) : error ? (
        <div className="expo-list-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchExpos}>Retry</button>
        </div>
      ) : expos.length === 0 ? (
        <div className="expo-list-empty">
          <div className="expo-empty-icon">🏛️</div>
          <h3>No expos found</h3>
          <p>{search || statusFilter || categoryFilter ? 'Try adjusting your search or filters.' : 'Create your first expo to get started.'}</p>
          {(role === 'organizer' || role === 'admin') && (
            <button className="btn-primary" onClick={() => onNavigate('expo-create')}>
              Create Expo
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="expo-cards-grid">
            {expos.map((expo) => (
              <ExpoCard
                key={expo._id}
                expo={expo}
                onNavigate={onNavigate}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="expo-pagination">
              <button
                className="btn-secondary"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="expo-page-info">
                Page {meta.page} of {meta.totalPages} ({meta.totalDocs} expos)
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

          {meta && meta.totalPages <= 1 && (
            <p className="expo-results-count">{meta.totalDocs} expo{meta.totalDocs !== 1 ? 's' : ''} found</p>
          )}
        </>
      )}
    </div>
  );
};

export default ExpoListPage;
