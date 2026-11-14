/**
 * db.js — MongoDB connection helper
 *
 * Establishes a Mongoose connection using the MONGO_URI from .env.
 * Logs connection events and re-throws on failure so the caller
 * (index.js) can decide whether to exit.
 *
 * NOTE: No models are created in Task 01. This file is wired up but
 *       the server will start even when MongoDB is unreachable
 *       (connectDB logs the error and returns false; the health endpoint
 *       reports "db_disconnected").
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB.
 * @returns {Promise<boolean>} true if connected, false on error.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      '[DB] MONGO_URI is not set in .env — skipping database connection.'
    );
    return false;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[DB] Connection failed: ${error.message}`);
    return false;
  }
};

module.exports = connectDB;
