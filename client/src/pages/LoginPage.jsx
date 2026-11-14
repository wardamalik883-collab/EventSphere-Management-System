/**
 * LoginPage.jsx — User Authentication & Role Evaluation Hub
 *
 * Allows real email/password login and convenient test credential presets
 * for evaluating RBAC and dashboards across all roles.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/LoginPage.css';

const LoginPage = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg(null);

    try {
      const res = await login(email, password);
      if (res.user.role === 'admin') {
        onNavigate('admin');
      } else if (res.user.role === 'organizer') {
        onNavigate('organizer');
      } else if (res.user.role === 'exhibitor') {
        onNavigate('exhibitor-dashboard');
      } else {
        onNavigate('landing');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo-icon">🌐</span>
          <h1 className="login-title">Sign In to EventSphere</h1>
          <p className="login-subtitle">
            Enter your credentials to access your role-specific portal
          </p>
        </div>

        {error && <div className="login-error-banner">⚠️ {error}</div>}
        {statusMsg && <div className="login-status-banner">ℹ️ {statusMsg}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">
          <span>OR EVALUATE ROLE-BASED ACCESS</span>
        </div>

        <div className="eval-presets">
          <p className="eval-presets-label">
            Quickly authenticate as a specific role to test dashboards & RBAC:
          </p>
          <div className="eval-btn-grid">
            <button
              type="button"
              className="eval-btn eval-btn-admin"
              onClick={() => {
                setEmail('admin@eventsphere.com');
                setPassword('Admin1234!');
              }}
            >
              Fill Admin Creds
            </button>
            <button
              type="button"
              className="eval-btn eval-btn-organizer"
              onClick={() => {
                setEmail('organizer@eventsphere.com');
                setPassword('Organizer1234!');
              }}
            >
              Fill Organizer Creds
            </button>
            <button
              type="button"
              className="eval-btn"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}
              onClick={() => {
                setEmail('exhibitor@eventsphere.com');
                setPassword('Exhibitor1234!');
              }}
            >
              Fill Exhibitor Creds
            </button>
            <button
              type="button"
              className="eval-btn eval-btn-attendee"
              onClick={() => {
                setEmail('attendee@eventsphere.com');
                setPassword('Attendee1234!');
              }}
            >
              Fill Attendee Creds
            </button>
          </div>
        </div>

        <div className="login-footer">
          <button
            type="button"
            className="btn-back-home"
            onClick={() => onNavigate('landing')}
          >
            ← Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
