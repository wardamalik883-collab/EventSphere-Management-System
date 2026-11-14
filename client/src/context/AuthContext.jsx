/**
 * AuthContext.jsx — Authentication and Role State Management
 *
 * Provides current user profile, token persistence, role checking,
 * login, logout, and quick role switching for testing/evaluation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(tokenStorage.get());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Fetch current user details from server
  const loadUser = useCallback(async () => {
    const storedToken = tokenStorage.get();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/users/me');
      if (response && response.data && response.data.user) {
        setUser(response.data.user);
        setToken(storedToken);
      } else {
        tokenStorage.remove();
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      // If token expired or invalid, reset
      tokenStorage.remove();
      setUser(null);
      setToken(null);
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Standard Login
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: loggedInUser, token: receivedToken } = response.data;
      tokenStorage.set(receivedToken);
      setToken(receivedToken);
      setUser(loggedInUser);
      return { success: true, user: loggedInUser };
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // non-blocking
    } finally {
      tokenStorage.remove();
      setUser(null);
      setToken(null);
    }
  };

  const value = {
    user,
    token,
    role: user ? user.role : null,
    isAuthenticated: Boolean(user && token),
    loading,
    authError,
    login,
    logout,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
