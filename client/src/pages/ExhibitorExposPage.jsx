/**
 * ExhibitorExposPage.jsx — Browse Available Expos to Apply
 *
 * Allows exhibitors to discover published/ongoing expos, filter by category or search,
 * check if they have already applied, and submit a new booth application.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { browseAvailableExpos } from '../services/exhibitorService';
import '../styles/ExhibitorExposPage.css';

const CATEGORY_OPTIONS = [
  '', 'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Food & Beverage', 'Fashion', 'Automotive', 'Energy', 'Other'
];

const ExhibitorExposPage = ({ onNavigate }) => {
  const [expos, setExpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchExpos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await browseAvailableExpos({
        page,
        limit: 9,
        search,
        category,
        sort: 'startDate',
      });
      setExpos(res.data || []);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err.message || 'Failed to load available expos');
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchExpos();
  }, [fetchExpos]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchExpos();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="exhibitor-expos-layout">
      {/* Header */}
      <div className="expos-header-bar">
        <div>
          <h1>Browse Available Expos</h1>
          <p className="expos-subtitle">
            Find industry-leading events and reserve exhibition booth space for your company.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => onNavigate('exhibitor-applications')}
        >
          📋 View My Applications
        </button>
      </div>

      {/* Filter and Search Bar */}
      <form className="expos-filter-bar" onSubmit={handleSearchSubmit}>
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Search expos by title or theme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="category-select"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.filter(Boolean).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <button type="submit" className="btn-primary">
          Filter
        </button>
      </form>

      {/* Content Area */}
      {loading ? (
        <div className="expos-loading">
          <div className="expos-spinner"></div>
          <p>Discovering upcoming trade shows and conferences...</p>
        </div>
      ) : error ? (
        <div className="expos-error">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Expos</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchExpos}>Try Again</button>
        </div>
      ) : expos.length === 0 ? (
        <div className="expos-empty">
          <span className="empty-icon">🏛️</span>
          <h3>No Expos Found</h3>
          <p>There are currently no published expos matching your search criteria.</p>
          {(search || category) && (
            <button
              className="btn-secondary"
              onClick={() => { setSearch(''); setCategory(''); setPage(1); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="expos-grid">
            {expos.map((expo) => (
              <div key={expo._id} className="expo-card">
                <div className="card-top-row">
                  <span className="category-pill">{expo.category}</span>
                  <span className={`status-pill pill-${expo.status}`}>
                    {expo.status}
                  </span>
                </div>

                <h3 className="expo-title">{expo.title}</h3>
                {expo.theme && <p className="expo-theme">🏷️ {expo.theme}</p>}

                <p className="expo-description">
                  {expo.description?.length > 130
                    ? `${expo.description.substring(0, 130)}...`
                    : expo.description}
                </p>

                <div className="expo-meta-list">
                  <div className="meta-item">
                    <span>📍</span>
                    <span>{expo.location?.venue}, {expo.location?.city}</span>
                  </div>
                  <div className="meta-item">
                    <span>📅</span>
                    <span>{formatDate(expo.startDate)} – {formatDate(expo.endDate)}</span>
                  </div>
                  {expo.capacity > 0 && (
                    <div className="meta-item">
                      <span>👥</span>
                      <span>Capacity: {expo.capacity.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="expo-card-footer">
                  <button
                    className="btn-link"
                    onClick={() => onNavigate('expo-detail', { expoId: expo._id })}
                  >
                    Details →
                  </button>

                  {expo.hasApplied ? (
                    <span className="applied-tag">
                      ✓ Application Submitted
                    </span>
                  ) : (
                    <button
                      className="btn-primary apply-btn"
                      onClick={() => onNavigate('exhibitor-apply', { expoId: expo._id, expoTitle: expo.title })}
                    >
                      Apply for Booth
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="expos-pagination">
              <button
                className="btn-secondary"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span className="page-indicator">
                Page {meta.page} of {meta.totalPages} ({meta.totalDocs} total)
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
        </>
      )}
    </div>
  );
};

export default ExhibitorExposPage;
