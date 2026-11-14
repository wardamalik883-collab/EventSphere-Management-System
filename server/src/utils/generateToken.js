/**
 * generateToken.js — JWT Token Generation & Verification Utility
 *
 * Encapsulates signing and verifying JSON Web Tokens for EventSphere Management.
 */

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JSON Web Token.
 * @param {string|object} userId - User's MongoDB _id
 * @param {string} role - User's authorized role (admin, organizer, exhibitor, attendee)
 * @returns {string} Signed JWT
 */
const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: userId.toString(),
      role: role || 'attendee',
    },
    secret,
    {
      expiresIn,
    }
  );
};

/**
 * Verify a JSON Web Token.
 * @param {string} token - Raw JWT string
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken,
};
