/**
 * directoryController.js — Public Exhibitor Directory
 *
 * Provides public-facing read-only access to exhibitor profiles.
 *
 * Security rules:
 *  - No authentication required (public directory).
 *  - Contact person email, phone, internal documents are NEVER returned.
 *  - Only active exhibitor users with existing profiles are listed.
 *
 * Endpoints:
 *  GET /api/exhibitors/directory          — Paginated list with search/filter
 *  GET /api/exhibitors/directory/:id      — Single public profile by ExhibitorProfile ID
 */

const mongoose = require('mongoose');
const ExhibitorProfile = require('../models/ExhibitorProfile');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const { escapeRegex } = require('../utils/sanitize');

// Fields safe to return in public directory responses (never include documents or contactPerson)
const PUBLIC_PROFILE_FIELDS =
  'companyName companyDescription companyWebsite industry location logoUrl products user createdAt updatedAt';

// Product sub-document projection (only public fields)
function sanitiseProducts(products = []) {
  return products.map((p) => ({
    _id: p._id,
    name: p.name,
    description: p.description,
    category: p.category,
  }));
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─── GET /api/exhibitors/directory ───────────────────────────────────────────

/**
 * List public exhibitor profiles.
 * Query params: search, industry, location, expoId, page, limit, sort
 */
exports.listDirectory = async (req, res, next) => {
  try {
    const {
      search = '',
      industry = '',
      location = '',
      expoId = '',
      page = '1',
      limit = '12',
      sort = 'companyName',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ companyName: regex }, { companyDescription: regex }];
    }

    if (industry && typeof industry === 'string' && industry.trim()) {
      filter.industry = new RegExp(escapeRegex(industry.trim()), 'i');
    }

    if (location && typeof location === 'string' && location.trim()) {
      filter.location = new RegExp(escapeRegex(location.trim()), 'i');
    }

    // Filter by expo participation: find exhibitor users who have an approved application for this expo
    if (expoId.trim() && isValidObjectId(expoId)) {
      const approvedApps = await ExhibitorApplication.find({
        expo: expoId,
        status: 'approved',
      })
        .select('exhibitor')
        .lean();

      const exhibitorUserIds = approvedApps.map((a) => a.exhibitor);
      filter.user = { $in: exhibitorUserIds };
    }

    // Sort map
    const SORT_MAP = {
      companyName: { companyName: 1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const sortObj = SORT_MAP[sort] || SORT_MAP.companyName;

    const [profiles, total] = await Promise.all([
      ExhibitorProfile.find(filter)
        .select(PUBLIC_PROFILE_FIELDS)
        .populate('user', 'name isActive')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ExhibitorProfile.countDocuments(filter),
    ]);

    // Filter out profiles linked to inactive users and sanitise products
    const publicProfiles = profiles
      .filter((p) => p.user && p.user.isActive)
      .map((p) => ({
        _id: p._id,
        companyName: p.companyName,
        companyDescription: p.companyDescription,
        companyWebsite: p.companyWebsite || '',
        industry: p.industry,
        location: p.location || '',
        logoUrl: p.logoUrl || '',
        products: sanitiseProducts(p.products),
        exhibitorName: p.user ? p.user.name : '',
        userId: p.user ? p.user._id : null,
        createdAt: p.createdAt,
      }));

    return res.status(200).json({
      success: true,
      message: 'Exhibitor directory retrieved successfully',
      data: publicProfiles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/exhibitors/directory/:id ───────────────────────────────────────

/**
 * Public profile detail for a single exhibitor.
 * :id is the ExhibitorProfile _id.
 * Also returns participating expos and booth info (public only).
 */
exports.getPublicProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exhibitor profile ID',
      });
    }

    const profile = await ExhibitorProfile.findById(id)
      .select(PUBLIC_PROFILE_FIELDS)
      .populate('user', 'name isActive createdAt')
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Exhibitor profile not found',
      });
    }

    if (!profile.user || !profile.user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exhibitor profile not found',
      });
    }

    // Fetch approved expo participations
    const applications = await ExhibitorApplication.find({
      exhibitor: profile.user._id,
      status: 'approved',
    })
      .populate('expo', 'title description startDate endDate venue status')
      .lean();

    const participatingExpos = applications
      .filter((a) => a.expo && a.expo.status === 'published')
      .map((a) => ({
        expoId: a.expo._id,
        title: a.expo.title,
        description: a.expo.description,
        startDate: a.expo.startDate,
        endDate: a.expo.endDate,
        venue: a.expo.venue,
      }));

    // Fetch allocated booth info (public: boothNumber, zone, type, dimensions only)
    const allocatedBooths = await Booth.find({
      assignedTo: profile.user._id,
      status: { $in: ['allocated', 'occupied'] },
    })
      .populate('expo', 'title')
      .select('boothNumber zone type dimensions expo status')
      .lean();

    const boothInfo = allocatedBooths.map((b) => ({
      boothNumber: b.boothNumber,
      zone: b.zone,
      type: b.type,
      dimensions: b.dimensions,
      expoTitle: b.expo ? b.expo.title : '',
      status: b.status,
    }));

    const publicProfile = {
      _id: profile._id,
      companyName: profile.companyName,
      companyDescription: profile.companyDescription,
      companyWebsite: profile.companyWebsite || '',
      industry: profile.industry,
      location: profile.location || '',
      logoUrl: profile.logoUrl || '',
      products: sanitiseProducts(profile.products),
      exhibitorName: profile.user.name,
      userId: profile.user._id,
      memberSince: profile.user.createdAt,
      participatingExpos,
      boothInfo,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: 'Exhibitor public profile retrieved successfully',
      data: publicProfile,
    });
  } catch (err) {
    next(err);
  }
};
