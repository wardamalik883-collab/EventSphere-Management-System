/**
 * rateLimiter.js — In-Memory Rate Limiting Middleware
 *
 * Protects sensitive endpoints (e.g., /api/auth/login, /api/auth/register)
 * against brute-force and credential stuffing attacks without external dependencies.
 */

/**
 * Creates an in-memory rate limiter middleware.
 *
 * @param {object} options
 * @param {number} [options.windowMs=60000] - Time window in milliseconds (default: 1 minute)
 * @param {number} [options.max=15] - Maximum requests allowed per window per IP
 * @param {string} [options.message='Too many requests from this IP, please try again later']
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 15;
  const message = options.message || 'Too many requests from this IP, please try again later';

  // Map of ip -> array of request timestamps
  const hits = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, active);
      }
    }
  }, 5 * 60 * 1000);

  // Unref so the interval does not hold Node process open in test runners
  if (interval.unref) interval.unref();

  const limiter = (req, res, next) => {
    // In test environment with TEST_NO_RATE_LIMIT=true, skip limiter
    if (process.env.TEST_NO_RATE_LIMIT === 'true') {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const clientTimestamps = (hits.get(ip) || []).filter((t) => now - t < windowMs);

    if (clientTimestamps.length >= max) {
      const oldest = clientTimestamps[0];
      const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        status: 'error',
        statusCode: 429,
        message,
        retryAfterSeconds,
      });
    }

    clientTimestamps.push(now);
    hits.set(ip, clientTimestamps);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientTimestamps.length));

    next();
  };

  // Helper to reset counts (useful in tests)
  limiter.reset = () => hits.clear();

  return limiter;
}

// Pre-configured rate limiters
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 attempts per minute
  message: 'Too many authentication attempts. Please wait 1 minute before trying again.',
});

module.exports = {
  createRateLimiter,
  authLimiter,
};
