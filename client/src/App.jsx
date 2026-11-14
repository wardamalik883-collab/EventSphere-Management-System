/**
 * App.jsx — EventSphere Root Application Component
 *
 * Implements role-based dashboard routing, global navigation,
 * authentication context, and 403 Access Denied boundaries.
 *
 * Task 06 added: expo-list, expo-create, expo-edit, expo-detail views.
 * Task 07 adds: exhibitor-dashboard, exhibitor-profile, exhibitor-expos,
 *                exhibitor-apply, exhibitor-applications, organizer-applications.
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import LoginPage from './pages/LoginPage';
import AccessDenied from './components/AccessDenied';
import ExpoListPage from './pages/ExpoListPage';
import ExpoFormPage from './pages/ExpoFormPage';
import ExpoDetailPage from './pages/ExpoDetailPage';

// Task 07 Pages
import ExhibitorDashboard from './pages/ExhibitorDashboard';
import ExhibitorProfilePage from './pages/ExhibitorProfilePage';
import ExhibitorExposPage from './pages/ExhibitorExposPage';
import ExhibitorApplyPage from './pages/ExhibitorApplyPage';
import ExhibitorApplicationsPage from './pages/ExhibitorApplicationsPage';
import OrganizerApplicationsPage from './pages/OrganizerApplicationsPage';

// Task 08 Pages
import OrganizerBoothPage from './pages/OrganizerBoothPage';
import ExhibitorBoothView from './pages/ExhibitorBoothView';

// Task 09 Pages
import OrganizerSessionPage from './pages/OrganizerSessionPage';
import ExpoSchedulePage from './pages/ExpoSchedulePage';

// Task 10 Pages
import AttendeeDashboard from './pages/AttendeeDashboard';
import BrowseExposPage from './pages/BrowseExposPage';
import MyRegistrationsPage from './pages/MyRegistrationsPage';

// Task 11 Pages
import ExhibitorDirectoryPage from './pages/ExhibitorDirectoryPage';
import ExhibitorPublicProfilePage from './pages/ExhibitorPublicProfilePage';
import MessagesPage from './pages/MessagesPage';

// Task 12 Pages
import NotificationCenterPage from './pages/NotificationCenterPage';

// Task 13 Pages
import AnalyticsDashboardPage from './pages/AnalyticsDashboardPage';



/** Views that require authentication */
const PROTECTED_VIEWS = [
  'admin',
  'organizer',
  'expo-list',
  'expo-create',
  'expo-edit',
  'expo-detail',
  'exhibitor-dashboard',
  'exhibitor-profile',
  'exhibitor-expos',
  'exhibitor-apply',
  'exhibitor-applications',
  'organizer-applications',
  'organizer-booths',
  'exhibitor-booths',
  'organizer-sessions',
  'attendee-dashboard',
  'attendee-registrations',
  'messages',
  'notifications',
  'analytics',
];

/** Map URL path segments to view names */
function pathToView(path) {
  if (!path || path === '') return 'landing';
  if ([
    'admin', 'organizer', 'login', 'expo-list', 'expo-create',
    'exhibitor-dashboard', 'exhibitor-profile', 'exhibitor-expos',
    'exhibitor-apply', 'exhibitor-applications', 'organizer-applications',
    'organizer-booths', 'exhibitor-booths', 'organizer-sessions', 'expo-schedule',
    'attendee-dashboard', 'attendee-browse', 'attendee-registrations',
    'exhibitor-directory', 'messages', 'notifications', 'analytics',
  ].includes(path)) return path;

  if (path.startsWith('expo-edit/')) return 'expo-edit';
  if (path.startsWith('expo-detail/')) return 'expo-detail';
  if (path.startsWith('organizer-booths/')) return 'organizer-booths';
  if (path.startsWith('organizer-sessions/')) return 'organizer-sessions';
  if (path.startsWith('expo-schedule/')) return 'expo-schedule';
  if (path.startsWith('exhibitor-public-profile/')) return 'exhibitor-public-profile';
  return 'landing';
}

const AppContent = () => {
  const { role, isAuthenticated, loading } = useAuth();

  // navState holds both the view name and optional params (e.g. { expoId })
  const [navState, setNavState] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    let params = {};
    if (path.startsWith('organizer-booths/')) {
      params = { expoId: path.split('/')[1] };
    } else if (path.startsWith('organizer-sessions/')) {
      params = { expoId: path.split('/')[1] };
    } else if (path.startsWith('expo-schedule/')) {
      params = { expoId: path.split('/')[1] };
    } else if (path.startsWith('exhibitor-public-profile/')) {
      params = { profileId: path.split('/')[1] };
    }
    return { view: pathToView(path), params };
  });

  /**
   * Navigate to a view.
   * @param {string} view - View name
   * @param {object} [params] - Optional params (e.g. { expoId })
   */
  const navigateTo = (view, params = {}) => {
    setNavState({ view, params });
    let targetPath;
    if (view === 'landing') targetPath = '/';
    else if (view === 'expo-edit' && params.expoId) targetPath = `/expo-edit/${params.expoId}`;
    else if (view === 'expo-detail' && params.expoId) targetPath = `/expo-detail/${params.expoId}`;
    else if (view === 'organizer-booths' && params.expoId) targetPath = `/organizer-booths/${params.expoId}`;
    else if (view === 'organizer-sessions' && params.expoId) targetPath = `/organizer-sessions/${params.expoId}`;
    else if (view === 'expo-schedule' && params.expoId) targetPath = `/expo-schedule/${params.expoId}`;
    else if (view === 'exhibitor-public-profile' && params.profileId) targetPath = `/exhibitor-public-profile/${params.profileId}`;
    else targetPath = `/${view}`;

    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view, params }, '', targetPath);
    }
  };

  // Sync state with browser back/forward navigation
  useEffect(() => {
    const handlePopState = (e) => {
      const path = window.location.pathname.replace(/^\//, '');
      if (e.state && e.state.view) {
        setNavState({ view: e.state.view, params: e.state.params || {} });
      } else {
        setNavState({ view: pathToView(path), params: {} });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const { view: activeView, params } = navState;

  const renderView = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#94a3b8' }}>
          <div className="dashboard-spinner" />
        </div>
      );
    }

    // Guard: protected views require authentication
    if (PROTECTED_VIEWS.includes(activeView) && !isAuthenticated) {
      return <LoginPage onNavigate={navigateTo} returnTo={activeView} />;
    }

    switch (activeView) {
      // ── Dashboards ─────────────────────────────────────────────────────
      case 'admin':
        if (role !== 'admin') {
          return <AccessDenied requiredRole="admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <AdminDashboard onNavigate={navigateTo} />;

      case 'organizer':
        if (role !== 'organizer') {
          return <AccessDenied requiredRole="organizer" currentRole={role} onNavigate={navigateTo} />;
        }
        return <OrganizerDashboard onNavigate={navigateTo} />;

      // ── Expo Management ────────────────────────────────────────────────
      case 'expo-list':
        if (role !== 'organizer' && role !== 'admin') {
          return <AccessDenied requiredRole="organizer / admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExpoListPage onNavigate={navigateTo} />;

      case 'expo-create':
        if (role !== 'organizer' && role !== 'admin') {
          return <AccessDenied requiredRole="organizer / admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExpoFormPage mode="create" onNavigate={navigateTo} />;

      case 'expo-edit':
        if (role !== 'organizer' && role !== 'admin') {
          return <AccessDenied requiredRole="organizer / admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExpoFormPage mode="edit" expoId={params.expoId} onNavigate={navigateTo} />;

      case 'expo-detail':
        return <ExpoDetailPage expoId={params.expoId} onNavigate={navigateTo} />;

      // ── Task 07: Exhibitor Portal ──────────────────────────────────────
      case 'exhibitor-dashboard':
        if (role !== 'exhibitor') {
          return <AccessDenied requiredRole="exhibitor" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExhibitorDashboard onNavigate={navigateTo} />;

      case 'exhibitor-profile':
        if (role !== 'exhibitor') {
          return <AccessDenied requiredRole="exhibitor" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExhibitorProfilePage onNavigate={navigateTo} />;

      case 'exhibitor-expos':
        if (role !== 'exhibitor') {
          return <AccessDenied requiredRole="exhibitor" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExhibitorExposPage onNavigate={navigateTo} />;

      case 'exhibitor-apply':
        if (role !== 'exhibitor') {
          return <AccessDenied requiredRole="exhibitor" currentRole={role} onNavigate={navigateTo} />;
        }
        return (
          <ExhibitorApplyPage
            expoId={params.expoId}
            expoTitle={params.expoTitle}
            onNavigate={navigateTo}
          />
        );

      case 'exhibitor-applications':
        if (role !== 'exhibitor') {
          return <AccessDenied requiredRole="exhibitor" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExhibitorApplicationsPage onNavigate={navigateTo} />;

      // ── Task 07: Organizer Application Review ──────────────────────────
      case 'organizer-applications':
        if (role !== 'organizer' && role !== 'admin') {
          return <AccessDenied requiredRole="organizer / admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <OrganizerApplicationsPage onNavigate={navigateTo} />;

      // ── Task 08: Booth & Floor-Plan Management ─────────────────────────
      case 'organizer-booths':
        if (role !== 'organizer' && role !== 'admin') {
          return <AccessDenied requiredRole="organizer / admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <OrganizerBoothPage expoId={params.expoId} onNavigate={navigateTo} />;

      case 'exhibitor-booths':
        if (role !== 'exhibitor') {
          return <AccessDenied requiredRole="exhibitor" currentRole={role} onNavigate={navigateTo} />;
        }
        return <ExhibitorBoothView onNavigate={navigateTo} />;

      // ── Task 09: Schedule & Session Management ─────────────────────────
      case 'organizer-sessions':
        if (role !== 'organizer' && role !== 'admin') {
          return <AccessDenied requiredRole="organizer / admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <OrganizerSessionPage expoId={params.expoId} onNavigate={navigateTo} />;

      case 'expo-schedule':
        return <ExpoSchedulePage expoId={params.expoId} onNavigate={navigateTo} />;

      // ── Task 10: Attendee Interface & Expo Registration ────────────────
      case 'attendee-dashboard':
        if (role !== 'attendee') {
          return <AccessDenied requiredRole="attendee" currentRole={role} onNavigate={navigateTo} />;
        }
        return <AttendeeDashboard onNavigate={navigateTo} />;

      case 'attendee-browse':
        return <BrowseExposPage onNavigate={navigateTo} />;

      case 'attendee-registrations':
        if (role !== 'attendee' && role !== 'admin') {
          return <AccessDenied requiredRole="attendee / admin" currentRole={role} onNavigate={navigateTo} />;
        }
        return <MyRegistrationsPage onNavigate={navigateTo} />;

      // ── Task 11: Exhibitor Directory & Messaging ─────────────────────
      case 'exhibitor-directory':
        return <ExhibitorDirectoryPage onNavigate={navigateTo} />;

      case 'exhibitor-public-profile':
        return (
          <ExhibitorPublicProfilePage
            profileId={params.profileId}
            onNavigate={navigateTo}
          />
        );

      case 'messages':
        if (!isAuthenticated) {
          return <LoginPage onNavigate={navigateTo} returnTo="messages" />;
        }
        if (role === 'admin') {
          return <AccessDenied requiredRole="attendee / exhibitor / organizer" currentRole={role} onNavigate={navigateTo} />;
        }
        return <MessagesPage onNavigate={navigateTo} prefill={params.prefill || null} />;

      // ── Task 12: Notification Center ──────────────────────────────────
      case 'notifications':
        return <NotificationCenterPage onNavigate={navigateTo} />;

      // ── Task 13: Analytics & Reporting ────────────────────────────────
      case 'analytics':
        if (role !== 'admin' && role !== 'organizer') {
          return <AccessDenied requiredRole="admin / organizer" currentRole={role} onNavigate={navigateTo} />;
        }
        return (
          <AnalyticsDashboardPage
            onNavigate={navigateTo}
            initialExpoId={params.expoId || null}
          />
        );

      // ── Auth & Landing ─────────────────────────────────────────────────

      case 'login':
        return <LoginPage onNavigate={navigateTo} />;

      case 'landing':
      default:
        return <LandingPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="eventsphere-app">
      <Navbar activeView={activeView} onNavigate={navigateTo} />
      {renderView()}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
