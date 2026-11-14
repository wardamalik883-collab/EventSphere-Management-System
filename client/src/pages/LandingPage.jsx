/**
 * LandingPage.jsx
 *
 * Professional landing page / setup screen for EventSphere Management.
 * Displays the project overview, role summaries, and embeds the
 * ApiStatus component to show live frontend-backend connection status.
 *
 * Task 01 — no routing, authentication, or dynamic data beyond the
 * health-check API call.
 */

import React from 'react';
import ApiStatus from '../components/ApiStatus';
import '../styles/LandingPage.css';

const FEATURES = [
  'Expo & Trade Show Management',
  'Role-Based Access Control',
  'Exhibitor Portal & Applications',
  'Booth & Floor-Plan Management',
  'Session & Schedule Management',
  'Attendee Registration',
  'Analytics & Reporting',
  'In-App Notifications',
];

const ROLES = [
  {
    icon: '🏛️',
    name: 'Admin / Organizer',
    desc:
      'Create and manage expos, approve exhibitor applications, assign booths, manage schedules, and view analytics.',
  },
  {
    icon: '🏪',
    name: 'Exhibitor',
    desc:
      'Register a company profile, apply to participate in expos, manage booth details, and communicate with organizers.',
  },
  {
    icon: '🎟️',
    name: 'Attendee',
    desc:
      'Discover and register for expos, browse exhibitors, bookmark sessions, and receive event reminders.',
  },
];

const LandingPage = ({ onNavigate }) => {
  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className="landing__nav">
        <span className="landing__logo">
          Event<span>Sphere</span>
        </span>
        <span className="landing__nav-badge">eProject · MERN Edition</span>
      </nav>

      {/* ── Hero ── */}
      <main className="landing__hero">
        <div className="landing__eyebrow">
          <span className="pulse-dot" />
          MERN Stack · Professional Edition
        </div>

        <h1 className="landing__hero-title">
          Your Complete <span className="accent">Expo & Trade Show</span>{' '}
          Management Platform
        </h1>

        <p className="landing__hero-subtitle">
          EventSphere brings organizers, exhibitors, and attendees together on
          one powerful, role-based platform — from booth allocation to real-time
          schedules.
        </p>

        {/* Dashboard Quick Access CTAs */}
        {onNavigate && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', margin: '1.5rem 0', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
              onClick={() => onNavigate('admin')}
            >
              📊 Open Admin Dashboard
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', background: 'rgba(139, 92, 246, 0.2)', borderColor: '#8b5cf6' }}
              onClick={() => onNavigate('organizer')}
            >
              🎪 Open Organizer Dashboard
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
              onClick={() => onNavigate('login')}
            >
              🔐 Sign In / Evaluate
            </button>
          </div>
        )}

        {/* Feature pills */}
        <div className="landing__features">
          {FEATURES.map((feature) => (
            <span key={feature} className="landing__feature-pill">
              <span className="dot" />
              {feature}
            </span>
          ))}
        </div>

        {/* Live API status */}
        <div className="landing__status-section">
          <span className="landing__status-label">
            Live API Connection Test
          </span>
          <ApiStatus />
        </div>
      </main>

      {/* ── User Roles ── */}
      <section className="landing__roles">
        <h2 className="landing__roles-title">Three Powerful User Roles</h2>
        <div className="landing__roles-grid">
          {ROLES.map((role) => (
            <div key={role.name} className="landing__role-card">
              <div className="landing__role-icon">{role.icon}</div>
              <h3 className="landing__role-name">{role.name}</h3>
              <p className="landing__role-desc">{role.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing__footer">
        EventSphere Management &copy; {new Date().getFullYear()} — Task 01
        Foundation — MERN Stack
      </footer>
    </div>
  );
};

export default LandingPage;
