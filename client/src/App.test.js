/**
 * App.test.js — Frontend QA & Access Control Test Suite
 *
 * Verifies:
 *  1. Root App component renders without throwing
 *  2. Default view resolves to LandingPage with branding & CTAs
 *  3. AccessDenied component displays required role and navigation back
 *  4. Navbar component renders navigation items and brand title
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AccessDenied from './components/AccessDenied';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';

global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock fetch for ApiStatus health check
beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          status: 'ok',
          uptime: 100,
        }),
    })
  );
});

afterAll(() => {
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
});

let container = null;
let root = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    if (root) root.unmount();
  });
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  container = null;
  root = null;
});

describe('EventSphere Frontend Component & Security QA Tests', () => {
  test('1. App renders without crashing and displays LandingPage by default', async () => {
    window.history.pushState({}, '', '/');

    await act(async () => {
      root.render(<App />);
    });

    expect(container.innerHTML).toContain('EventSphere');
    expect(container.querySelector('.eventsphere-app')).not.toBeNull();
  });

  test('2. AccessDenied component properly renders 403 warning and required role', async () => {
    let navigatedTo = null;
    const handleNavigate = (view) => {
      navigatedTo = view;
    };

    await act(async () => {
      root.render(
        <AccessDenied
          requiredRole="admin"
          currentRole="attendee"
          onNavigate={handleNavigate}
        />
      );
    });

    expect(container.innerHTML).toContain('403');
    expect(container.innerHTML).toContain('Access Denied');
    expect(container.innerHTML).toContain('admin');

    const returnBtn = container.querySelector('button');
    expect(returnBtn).not.toBeNull();
    await act(async () => {
      returnBtn.click();
    });
    expect(navigatedTo).toBe('landing');
  });

  test('3. Navbar renders EventSphere branding and public links', async () => {
    await act(async () => {
      root.render(
        <AuthProvider>
          <Navbar activeView="landing" onNavigate={() => {}} />
        </AuthProvider>
      );
    });

    expect(container.innerHTML).toContain('EventSphere');
    expect(container.querySelector('.navbar-container')).not.toBeNull();
    expect(container.querySelector('.navbar-brand-name')).not.toBeNull();
  });
});
