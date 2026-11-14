/**
 * Navbar.jsx — Global Navigation and Role Switcher Bar
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import '../styles/Navbar.css';


const Navbar = ({ activeView, onNavigate }) => {
  const { user, role, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand / Logo */}
        <div
          className="navbar-brand"
          onClick={() => onNavigate('landing')}
          role="button"
          tabIndex={0}
        >
          <span className="navbar-logo-icon">🌐</span>
          <span className="navbar-brand-name">EventSphere</span>
          <span className="navbar-badge">eProject</span>
        </div>

        {/* Navigation Links */}
        <nav className="navbar-links">
          <button
            className={`nav-link ${activeView === 'landing' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('landing')}
          >
            Home
          </button>

          {/* Admin Links */}
          {(!isAuthenticated || role === 'admin') && (
            <button
              className={`nav-link ${activeView === 'admin' ? 'nav-link-active' : ''}`}
              onClick={() => onNavigate('admin')}
            >
              Admin
            </button>
          )}

          {/* Organizer Links */}
          {(!isAuthenticated || role === 'organizer' || role === 'admin') && (
            <button
              className={`nav-link ${activeView === 'organizer' ? 'nav-link-active' : ''}`}
              onClick={() => onNavigate('organizer')}
            >
              Organizer Dashboard
            </button>
          )}

          {(role === 'organizer' || role === 'admin') && (
            <>
              <button
                className={`nav-link ${activeView.startsWith('expo-') ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('expo-list')}
              >
                Expos
              </button>
              <button
                className={`nav-link ${activeView === 'organizer-applications' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('organizer-applications')}
              >
                Applications Review
              </button>
              <button
                className={`nav-link ${activeView === 'organizer-booths' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('organizer-booths')}
              >
                Floor Plan & Booths
              </button>
              <button
                className={`nav-link ${activeView === 'organizer-sessions' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('organizer-sessions')}
              >
                Schedule & Sessions
              </button>
              <button
                className={`nav-link ${activeView === 'analytics' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('analytics')}
              >
                📊 Analytics
              </button>
            </>
          )}

          {/* Exhibitor Links */}
          {(role === 'exhibitor') && (
            <>
              <button
                className={`nav-link ${activeView === 'exhibitor-dashboard' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('exhibitor-dashboard')}
              >
                Exhibitor Portal
              </button>
              <button
                className={`nav-link ${activeView === 'exhibitor-expos' || activeView === 'exhibitor-apply' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('exhibitor-expos')}
              >
                Browse Expos
              </button>
              <button
                className={`nav-link ${activeView === 'exhibitor-applications' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('exhibitor-applications')}
              >
                My Applications
              </button>
              <button
                className={`nav-link ${activeView === 'exhibitor-booths' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('exhibitor-booths')}
              >
                My Booths
              </button>
              <button
                className={`nav-link ${activeView === 'exhibitor-profile' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('exhibitor-profile')}
              >
                Company Profile
              </button>
            </>
          )}

          {/* Attendee Links */}
          {(role === 'attendee') && (
            <>
              <button
                className={`nav-link ${activeView === 'attendee-dashboard' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('attendee-dashboard')}
              >
                My Dashboard
              </button>
              <button
                className={`nav-link ${activeView === 'attendee-registrations' ? 'nav-link-active' : ''}`}
                onClick={() => onNavigate('attendee-registrations')}
              >
                My Passes
              </button>
            </>
          )}

          {/* Public / Global Browse Expos Link */}
          {role !== 'exhibitor' && role !== 'organizer' && (
            <button
              className={`nav-link ${activeView === 'attendee-browse' ? 'nav-link-active' : ''}`}
              onClick={() => onNavigate('attendee-browse')}
            >
              Browse Expos
            </button>
          )}

          {/* Exhibitor Directory — public for all */}
          <button
            className={`nav-link ${activeView === 'exhibitor-directory' || activeView === 'exhibitor-public-profile' ? 'nav-link-active' : ''}`}
            onClick={() => onNavigate('exhibitor-directory')}
          >
            Exhibitor Directory
          </button>

          {/* Messages — authenticated non-admin roles */}
          {isAuthenticated && role !== 'admin' && (
            <button
              className={`nav-link ${activeView === 'messages' ? 'nav-link-active' : ''}`}
              onClick={() => onNavigate('messages')}
            >
              ✉️ Messages
            </button>
          )}
        </nav>

        {/* User / Auth State */}
        <div className="navbar-auth">
          {isAuthenticated && user ? (
            <>
              <NotificationBell onNavigate={onNavigate} />
              <div className="navbar-user-chip">
                <span className={`role-badge role-badge-${role}`}>
                  {role.toUpperCase()}
                </span>
                <span className="navbar-user-name">{user.name}</span>
                <button
                  className="btn-logout"
                  onClick={() => {
                    logout();
                    onNavigate('landing');
                  }}
                  title="Log out"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <button
              className="btn-login-nav"
              onClick={() => onNavigate('login')}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
