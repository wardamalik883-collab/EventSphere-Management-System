/**
 * boothRoutes.js — Exhibition Booth & Floor-Plan Management Routes
 *
 * REST Endpoints:
 *  - GET    /api/booths/:id              — Get single booth detail
 *  - PATCH  /api/booths/:id              — Update booth specifications
 *  - DELETE /api/booths/:id              — Safe booth deletion (unallocated only)
 *  - POST   /api/booths/:id/allocate     — Allocate booth to approved application
 *  - POST   /api/booths/:id/unallocate   — Release allocated booth
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getBoothById,
  updateBooth,
  deleteBooth,
  allocateBooth,
  unallocateBooth,
} = require('../controllers/boothController');

// Direct booth item routes
router.get('/:id', getBoothById);
router.patch('/:id', protect, authorize('organizer', 'admin'), updateBooth);
router.delete('/:id', protect, authorize('organizer', 'admin'), deleteBooth);
router.post('/:id/allocate', protect, authorize('organizer', 'admin'), allocateBooth);
router.post('/:id/unallocate', protect, authorize('organizer', 'admin'), unallocateBooth);

module.exports = router;
