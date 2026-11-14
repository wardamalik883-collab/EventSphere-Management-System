/**
 * feedbackController.js — Expo Feedback & Rating Controller
 *
 * Implements:
 *  - submitFeedback   : Registered attendees submit rating (1-5) and review
 *  - getExpoFeedback  : Public aggregated ratings, star distribution, and paginated reviews
 *  - getMyFeedback    : List feedback submitted by the authenticated user
 *  - updateFeedback   : Update own feedback rating, comment, or category
 *  - deleteFeedback   : Delete own feedback (or admin)
 *
 * Security:
 *  - Only registered attendees (with confirmed/checked_in status) can submit feedback
 *  - Duplicate reviews for the same expo by the same user are prevented
 *  - Public display sanitizes attendee names (e.g. "John D.") and hides private emails/phones
 *  - Ownership protection enforced on update and delete
 */

const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Expo = require('../models/Expo');
const AttendeeRegistration = require('../models/AttendeeRegistration');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Format an attendee's name safely for public reviews (e.g., "John Doe" -> "John D.")
 */
function sanitizeReviewerName(name) {
  if (!name || typeof name !== 'string') return 'Attendee';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * POST /api/expos/:expoId/feedback
 * Submit feedback for an expo.
 * Only authenticated attendees with a confirmed registration may submit.
 */
exports.submitFeedback = async (req, res, next) => {
  try {
    const { expoId } = req.params;
    const userId = req.user._id;
    const { rating, comment, category } = req.body;

    if (!isValidObjectId(expoId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid Expo ID format',
      });
    }

    const expo = await Expo.findById(expoId);
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Must be a registered attendee for this expo
    const isRegistered = await AttendeeRegistration.exists({
      expo: expoId,
      attendee: userId,
      status: { $in: ['confirmed', 'checked_in'] },
    });

    if (!isRegistered && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Only registered attendees can submit feedback for this expo',
      });
    }

    // Validate rating (1-5)
    const ratingNum = Number(rating);
    if (!ratingNum || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    // Validate comment
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Feedback comment is required',
      });
    }

    if (comment.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Feedback comment cannot exceed 2000 characters',
      });
    }

    // Validate category if provided
    let cat = 'overall';
    if (category && typeof category === 'string') {
      const trimmedCat = category.trim().toLowerCase();
      if (Feedback.CATEGORIES.includes(trimmedCat)) {
        cat = trimmedCat;
      }
    }

    // Check for duplicate feedback
    const existing = await Feedback.findOne({ expo: expoId, user: userId });
    if (existing) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'You have already submitted feedback for this expo. You can edit your existing feedback.',
      });
    }

    const feedback = await Feedback.create({
      expo: expoId,
      user: userId,
      rating: ratingNum,
      category: cat,
      comment: comment.trim(),
    });

    return res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'Feedback submitted successfully',
      data: { feedback },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'You have already submitted feedback for this expo',
      });
    }
    next(error);
  }
};

/**
 * GET /api/expos/:expoId/feedback
 * Get public aggregated ratings, rating distribution, and paginated feedback list for an expo.
 */
exports.getExpoFeedback = async (req, res, next) => {
  try {
    const { expoId } = req.params;

    if (!isValidObjectId(expoId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid Expo ID format',
      });
    }

    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Filter by category if requested
    const filter = { expo: expoId };
    if (req.query.category && Feedback.CATEGORIES.includes(req.query.category.toLowerCase())) {
      filter.category = req.query.category.toLowerCase();
    }

    const [reviews, totalCount, allRatings] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name')
        .lean(),
      Feedback.countDocuments(filter),
      Feedback.find({ expo: expoId }).select('rating').lean(),
    ]);

    // Aggregate stats from allRatings
    const totalReviews = allRatings.length;
    let averageRating = 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews > 0) {
      const sum = allRatings.reduce((acc, curr) => {
        distribution[curr.rating] = (distribution[curr.rating] || 0) + 1;
        return acc + curr.rating;
      }, 0);
      averageRating = Number((sum / totalReviews).toFixed(1));
    }

    // Format reviews safely
    const formattedReviews = reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      category: r.category,
      comment: r.comment,
      createdAt: r.createdAt,
      user: {
        _id: r.user?._id,
        displayName: sanitizeReviewerName(r.user?.name),
      },
    }));

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Expo feedback retrieved successfully',
      data: {
        averageRating,
        totalReviews,
        ratingDistribution: distribution,
        reviews: formattedReviews,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/my-feedback
 * List feedback submitted by the currently authenticated user.
 */
exports.getMyFeedback = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const feedbacks = await Feedback.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('expo', 'title startDate endDate location status')
      .lean();

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'My feedback retrieved successfully',
      data: { feedbacks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/feedback/:id
 * Edit feedback rating or comment (owner only).
 */
exports.updateFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { rating, comment, category } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid feedback ID format',
      });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Feedback not found',
      });
    }

    // Ownership check
    if (feedback.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only edit your own feedback',
      });
    }

    if (rating !== undefined) {
      const rNum = Number(rating);
      if (!rNum || !Number.isInteger(rNum) || rNum < 1 || rNum > 5) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Rating must be an integer between 1 and 5',
        });
      }
      feedback.rating = rNum;
    }

    if (comment !== undefined) {
      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Feedback comment cannot be empty',
        });
      }
      if (comment.trim().length > 2000) {
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: 'Feedback comment cannot exceed 2000 characters',
        });
      }
      feedback.comment = comment.trim();
    }

    if (category !== undefined) {
      const cat = category.trim().toLowerCase();
      if (Feedback.CATEGORIES.includes(cat)) {
        feedback.category = cat;
      }
    }

    await feedback.save();

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Feedback updated successfully',
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/feedback/:id
 * Delete feedback (owner or admin only).
 */
exports.deleteFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid feedback ID format',
      });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Feedback not found',
      });
    }

    // Ownership check
    if (feedback.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only delete your own feedback',
      });
    }

    await Feedback.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Feedback deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};
