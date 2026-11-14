/**
 * ExhibitorDirectoryPage.jsx — Public Exhibitor Directory
 * Task 11: Searchable, filterable paginated exhibitor listing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { listExhibitorDirectory } from '../services/directoryService';
import { useAuth } from '../context/AuthContext';
import '../styles/ExhibitorDirectoryPage.css';

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Food & Beverage', 'Fashion', 'Automotive', 'Real Estate',
  'Media & Entertainment', 'Logistics', 'Agriculture', 'Energy', 'Other',
];

const ExhibitorDirectoryPage = ({ onNavigate }) => {
  const { isAuthenticated, role } = useAuth();

  const [exhibitors, setExhibitors] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('companyName');
  const [page, setPage] = useState(1);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listExhibitorDirectory({
        search: debouncedSearch,
        industry,
        location,
        sort,
        page,
        limit: 12,
      });
      setExhibitors(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exhibitor directory');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, industry, location, sort, page]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setIndustry('');
    setLocation('');
    setSort('companyName');
    setPage(1);
  };

  const canMessage = isAuthenticated && (role === 'attendee' || role === 'organizer');

  return (
    <div className="directory-page">
      {/* Header */}
      <div className="directory-header">
        <h1 className="directory-title">🏢 Exhibitor Directory</h1>
        <p className="directory-subtitle">
          Discover companies and exhibitors participating in EventSphere events.
        </p>
      </div>

      {/* Filters */}
      <div className="directory-filters">
        <div className="filter-row">
          <div className="filter-search-wrap">
            <span className="filter-search-icon">🔍</span>
            <input
              className="filter-input filter-search"
              type="text"
              placeholder="Search by company or exhibitor name…"
              value={search}
              onChange={handleSearch}
            />
          </div>

          <select
            className="filter-select"
            value={industry}
            onChange={handleFilterChange(setIndustry)}
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>

          <input
            className="filter-input"
            type="text"
            placeholder="Filter by location…"
            value={location}
            onChange={handleFilterChange(setLocation)}
          />

          <select
            className="filter-select"
            value={sort}
            onChange={handleFilterChange(setSort)}
          >
            <option value="companyName">Sort: A–Z</option>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
          </select>

          <button className="btn-clear-filters" onClick={handleClearFilters}>
            Clear
          </button>
        </div>

        {pagination.total > 0 && (
          <div className="directory-results-count">
            {pagination.total} exhibitor{pagination.total !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="directory-loading">
          <div className="dashboard-spinner" />
          <p>Loading exhibitors…</p>
        </div>
      ) : error ? (
        <div className="directory-error">
          <span>⚠️</span>
          <p>{error}</p>
          <button className="btn-retry" onClick={fetchDirectory}>Retry</button>
        </div>
      ) : exhibitors.length === 0 ? (
        <div className="directory-empty">
          <span className="directory-empty-icon">🏢</span>
          <h3>No exhibitors found</h3>
          <p>Try adjusting your search or filters.</p>
          <button className="btn-clear-filters" onClick={handleClearFilters}>Clear Filters</button>
        </div>
      ) : (
        <>
          <div className="directory-grid">
            {exhibitors.map((ex) => (
              <div key={ex._id} className="exhibitor-card">
                <div className="exhibitor-card-logo">
                  {ex.logoUrl ? (
                    <img src={ex.logoUrl} alt={`${ex.companyName} logo`} className="exhibitor-logo-img" />
                  ) : (
                    <div className="exhibitor-logo-placeholder">
                      {ex.companyName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="exhibitor-card-body">
                  <h3 className="exhibitor-company-name">{ex.companyName}</h3>
                  <p className="exhibitor-name">👤 {ex.exhibitorName}</p>

                  <div className="exhibitor-tags">
                    <span className="exhibitor-tag exhibitor-tag-industry">{ex.industry}</span>
                    {ex.location && (
                      <span className="exhibitor-tag exhibitor-tag-location">📍 {ex.location}</span>
                    )}
                  </div>

                  <p className="exhibitor-description">
                    {ex.companyDescription.length > 120
                      ? ex.companyDescription.slice(0, 120) + '…'
                      : ex.companyDescription}
                  </p>

                  {ex.companyWebsite && (
                    <a
                      href={ex.companyWebsite.startsWith('http') ? ex.companyWebsite : `https://${ex.companyWebsite}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="exhibitor-website-link"
                    >
                      🌐 Visit Website
                    </a>
                  )}
                </div>

                <div className="exhibitor-card-footer">
                  <button
                    className="btn-view-profile"
                    onClick={() => onNavigate('exhibitor-public-profile', { profileId: ex._id })}
                  >
                    View Profile
                  </button>
                  {canMessage && (
                    <button
                      className="btn-message-exhibitor"
                      onClick={() =>
                        onNavigate('messages', {
                          prefill: { recipientId: ex.userId, recipientName: ex.companyName },
                        })
                      }
                    >
                      ✉️ Message
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="directory-pagination">
              <button
                className="btn-page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn-page"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
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

export default ExhibitorDirectoryPage;
