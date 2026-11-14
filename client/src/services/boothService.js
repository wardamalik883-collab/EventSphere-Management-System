/**
 * boothService.js — Booth Inventory & Floor-Plan API Client Service
 *
 * Provides API wrappers for:
 *  - Listing expo booth inventory and visual floor-plan structure
 *  - Creating, updating, and safe deletion of booths
 *  - Allocating booths to approved exhibitor applications
 *  - Unallocating / releasing booth spaces
 *  - Exhibitor allocated booth inspection
 */

import api from './api';

/**
 * Retrieve all booths and floor-plan stats for a specific expo.
 */
export const getExpoBooths = (expoId, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '' && val !== null) {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return api.get(`/expos/${expoId}/booths${qs ? `?${qs}` : ''}`);
};

/**
 * Create a new booth for an expo.
 */
export const createBooth = (expoId, boothData) =>
  api.post(`/expos/${expoId}/booths`, boothData);

/**
 * Get details for a single booth.
 */
export const getBoothById = (id) => api.get(`/booths/${id}`);

/**
 * Update booth specifications (dimensions, zone, type, price, etc.).
 */
export const updateBooth = (id, updates) => api.patch(`/booths/${id}`, updates);

/**
 * Safe delete booth (unallocated booths only).
 */
export const deleteBooth = (id) => api.delete(`/booths/${id}`);

/**
 * Allocate booth to an approved exhibitor application.
 */
export const allocateBooth = (id, applicationId) =>
  api.post(`/booths/${id}/allocate`, { applicationId });

/**
 * Unallocate / release booth back to available inventory.
 */
export const unallocateBooth = (id) => api.post(`/booths/${id}/unallocate`);

/**
 * Retrieve all booths allocated to the authenticated exhibitor.
 */
export const getMyBooths = () => api.get('/exhibitors/my-booths');
