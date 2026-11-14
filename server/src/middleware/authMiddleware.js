/**
 * authMiddleware.js — Authentication & Role-Based Authorization Middleware
 *
 * Provides:
 *  - protect: Verifies Bearer JWT, fetches current user, enforces active status.
 *  - authorize(...roles): Restricts access to specified roles (admin, organizer, exhibitor, attendee).
 */

const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');

/**
 * Protect middleware: Ensures incoming request has a valid JWT in the Authorization header.
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      status: 'error',
      statusCode: 401,
      message: 'Not authorized: Missing or malformed token in Authorization header',
    });
  }

  try {
    // 1. Verify token signature and expiration
    const decoded = verifyToken(token);

    // 2. Fetch user from database (never trust token claims alone for DB state)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Not authorized: The user belonging to this token no longer exists',
      });
    }

    // 3. Ensure user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Not authorized: This user account has been deactivated',
      });
    }

    // 4. Attach verified user to request object
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      status: 'error',
      statusCode: 401,
      message: 'Invalid authentication token',
    });
  }
};

/**
 * Authorize middleware: Restricts route to users with specified role(s).
 * @param  {...string} roles - Permitted user roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Not authorized: Authentication required before checking permissions',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: `Access denied: Role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
