/**
 * dashboardService.js — API calls for Admin and Organizer Dashboards
 */

import api from './api';

export const getAdminDashboardData = async () => {
  const response = await api.get('/dashboard/admin');
  return response.data;
};

export const getOrganizerDashboardData = async () => {
  const response = await api.get('/dashboard/organizer');
  return response.data;
};
