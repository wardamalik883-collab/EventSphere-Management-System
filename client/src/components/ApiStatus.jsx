/**
 * ApiStatus.jsx
 *
 * Fetches GET /api/health from the Express backend and displays
 * the connection status, environment, and DB state.
 *
 * Props:
 *   none
 *
 * Usage:
 *   <ApiStatus />
 */

import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import '../styles/ApiStatus.css';

// Map Mongoose readyState strings to badge variants
const dbStatusVariant = (status) => {
  switch (status) {
    case 'connected':     return 'success';
    case 'connecting':    return 'warning';
    case 'disconnected':  return 'error';
    default:              return 'muted';
  }
};

const ApiStatus = () => {
  const [status, setStatus] = useState(null);   // null = not fetched yet
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.get('/health');
      setStatus(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Unable to reach the API.');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="api-status">
      {/* Header */}
      <div className="api-status__header">
        <span className="api-status__title">API Connection Status</span>
        <button
          className="api-status__refresh-btn"
          onClick={fetchHealth}
          disabled={loading}
        >
          {loading ? 'Checking…' : '↻ Refresh'}
        </button>
      </div>

      {/* Loading */}
      {loading && !status && (
        <div className="api-status__loading">
          <div className="spinner" />
          <span>Connecting to EventSphere API…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="api-status__error">
          <span className="badge badge--error">
            <span className="pulse-dot" />
            Disconnected
          </span>
          <p className="api-status__error-title">Cannot reach the backend</p>
          <p className="api-status__error-msg">{error}</p>
          <p className="api-status__error-msg" style={{ marginTop: 4 }}>
            Make sure the Express server is running on port 5000.
          </p>
        </div>
      )}

      {/* Success */}
      {!loading && status && (
        <>
          <div className="api-status__row">
            <span className="api-status__label">API Server</span>
            <span className="badge badge--success">
              <span className="pulse-dot" />
              {status.status?.toUpperCase() || 'OK'}
            </span>
          </div>

          <div className="api-status__row">
            <span className="api-status__label">Database</span>
            <span className={`badge badge--${dbStatusVariant(status.database?.status)}`}>
              <span className="pulse-dot" />
              {status.database?.status || 'unknown'}
            </span>
          </div>

          <div className="api-status__row">
            <span className="api-status__label">Environment</span>
            <span className="api-status__value">{status.environment}</span>
          </div>

          <div className="api-status__row">
            <span className="api-status__label">Message</span>
            <span className="api-status__value">{status.message}</span>
          </div>

          <div className="api-status__row">
            <span className="api-status__label">API Version</span>
            <span className="api-status__value">v{status.version}</span>
          </div>

          <div className="api-status__row">
            <span className="api-status__label">Server Time</span>
            <span className="api-status__value">
              {status.timestamp
                ? new Date(status.timestamp).toLocaleString()
                : '—'}
            </span>
          </div>

          {lastChecked && (
            <div className="api-status__row">
              <span className="api-status__label">Last checked</span>
              <span className="api-status__value">{lastChecked}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApiStatus;
