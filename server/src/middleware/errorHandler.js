/**
 * errorHandler.js — Global error-handling middleware
 *
 * Must be registered as the LAST middleware in Express (after all routes).
 * Catches errors passed via next(err) and returns a consistent JSON response.
 */

/**
 * Global error handler.
 * @param {Error}   err  - The error object.
 * @param {object}  req  - Express request.
 * @param {object}  res  - Express response.
 * @param {Function} next - Express next (required by Express to recognise 4-arg middleware).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Log to console in development; in production a logger would be used
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${statusCode} — ${err.message}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.error(`[ERROR] ${statusCode} — ${err.message}`);
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message || 'Internal Server Error',
    // Only expose stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
