/**
 * AccessDenied.jsx — 403 Forbidden / Access Denied Screen
 *
 * Renders when an authenticated user attempts to access a dashboard
 * or view reserved for a different role.
 */

import React from 'react';

const AccessDenied = ({ requiredRole, currentRole, onNavigate }) => {
  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        <div className="access-denied-icon">🛡️</div>
        <h1 className="access-denied-title">403 — Access Denied</h1>
        <p className="access-denied-subtitle">
          Role-Based Access Control (RBAC) Protection Active
        </p>

        <div className="access-denied-details">
          <div className="access-denied-row">
            <span className="access-label">Your Current Role:</span>
            <span className={`role-pill role-${currentRole || 'guest'}`}>
              {currentRole ? currentRole.toUpperCase() : 'GUEST / UNAUTHENTICATED'}
            </span>
          </div>
          <div className="access-denied-row">
            <span className="access-label">Required Role:</span>
            <span className={`role-pill role-${requiredRole}`}>
              {requiredRole.toUpperCase()}
            </span>
          </div>
        </div>

        <p className="access-denied-message">
          You do not have permission to view this dashboard. EventSphere strictly
          isolates administrative and organizer portals based on authenticated credentials.
        </p>

        <div className="access-denied-actions">
          <button
            className="btn-primary"
            onClick={() => onNavigate('landing')}
          >
            Return to Home
          </button>
          <button
            className="btn-secondary"
            onClick={() => onNavigate('login')}
          >
            Switch Account / Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
