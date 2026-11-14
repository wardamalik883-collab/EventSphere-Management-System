/**
 * directoryRoutes.js — Public Exhibitor Directory Routes
 *
 * Routes:
 *  GET /api/exhibitors/directory          — Paginated public exhibitor list
 *  GET /api/exhibitors/directory/:id      — Single public exhibitor profile
 *
 * Authentication is NOT required (public directory).
 * No private data is returned (enforced in controller).
 */

const express = require('express');
const { listDirectory, getPublicProfile } = require('../controllers/directoryController');

const router = express.Router();

router.get('/', listDirectory);
router.get('/:id', getPublicProfile);

module.exports = router;
