/**
 * notFound.js — 404 Not Found middleware
 *
 * Catches any request that did not match a registered route and
 * forwards a structured error to the global error handler.
 */

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = notFound;
