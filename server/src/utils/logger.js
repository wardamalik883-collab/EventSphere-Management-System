/**
 * logger.js — Simple request logger utility
 *
 * Logs incoming HTTP requests to the console in development mode.
 * In Task 01 this is a lightweight inline logger; a production-grade
 * logger (e.g., Winston) can replace it in later tasks.
 */

const requestLogger = (req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  }
  next();
};

module.exports = requestLogger;
