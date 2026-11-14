/**
 * authController.js — Authentication Controllers for EventSphere Management
 *
 * Implements:
 *  - register : Secure registration with attendee default role & duplicate checks
 *  - login    : Credential verification, bcrypt comparison & JWT issuance
 *  - getMe    : Retrieves safe profile for authenticated caller
 *  - logout   : Stateless JWT client logout guidance
 */

const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

/**
 * POST /api/auth/register
 * Public registration
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, avatarUrl } = req.body;

    // 1. Validate required inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Please provide all required fields: name, email, and password',
        errors: [
          !name && { field: 'name', message: 'Name is required' },
          !email && { field: 'email', message: 'Email is required' },
          !password && { field: 'password', message: 'Password is required' },
        ].filter(Boolean),
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Name must be at least 2 characters long',
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Please provide a valid email address',
      });
    }

    // Password strength/length validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Password must be at least 8 characters long',
      });
    }

    // 2. Check for duplicate accounts
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'An account with this email address already exists',
      });
    }

    // 3. Prevent Privilege Escalation
    // Public registration always defaults to 'attendee'.
    // Attempting to pass role: 'admin' or other roles in request payload is discarded.
    const userRole = 'attendee';

    // 4. Create user (password is automatically hashed by User model pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: userRole,
      phone: phone ? phone.trim() : '',
      avatarUrl: avatarUrl ? avatarUrl.trim() : '',
    });

    // 5. Generate signed JWT token
    const token = generateToken(user._id, user.role);

    // 6. Return response with safe user object (no password hash)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Public login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Locate user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Use generic error message to prevent account enumeration
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // 3. Verify password hash using bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // 4. Check active account status
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        status: 'error',
        statusCode: 401,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // 5. Generate signed JWT token
    const token = generateToken(user._id, user.role);

    // 6. Return success with token and safe user profile
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Protected: Retrieves profile of authenticated caller
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      message: 'Current user profile retrieved successfully',
      data: {
        user: user.toSafeObject ? user.toSafeObject() : user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Client-side token removal guidance (stateless JWT)
 */
const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove your token from client storage.',
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
