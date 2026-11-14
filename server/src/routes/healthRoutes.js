/**
 * healthRoutes.js
 *
 * Mounts the health-check route under /api/health.
 * This is the only route registered in Task 01; additional route
 * files will be added as future tasks are completed.
 */

const express = require('express');
const { getHealth } = require('../controllers/healthController');

const router = express.Router();

// GET /api/health
router.get('/', getHealth);

module.exports = router;
