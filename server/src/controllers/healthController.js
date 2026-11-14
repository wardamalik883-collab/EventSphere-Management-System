/**
 * healthController.js
 *
 * Handles the GET /api/health endpoint.
 * Returns server status, timestamp, environment, and MongoDB
 * connection state so the React client can confirm the connection.
 */

const mongoose = require('mongoose');

/**
 * GET /api/health
 * Public — no authentication required.
 */
const getHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;

  // Mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbStatus = dbStateMap[dbState] ?? 'unknown';

  res.status(200).json({
    status: 'ok',
    message: 'EventSphere API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      uri: process.env.MONGO_URI
        ? process.env.MONGO_URI.replace(/\/\/.*@/, '//<credentials>@')
        : 'not configured',
    },
    version: '1.0.0',
  });
};

module.exports = { getHealth };
