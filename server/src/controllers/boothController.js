/**
 * boothController.js — Booth Inventory & Floor-Plan Management Controller
 *
 * Implements:
 *  - Booth inventory CRUD for expos with floor-plan data
 *  - Ownership isolation for expo organizers & platform admins
 *  - Atomic booth allocation to approved exhibitor applications
 *  - Double-booking & concurrent allocation prevention
 *  - Safe deletion rules preventing orphan assignments
 *  - Exhibitor assigned-booth inspection
 */

const mongoose = require('mongoose');
const Booth = require('../models/Booth');
const Expo = require('../models/Expo');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Notification = require('../models/Notification');
const { escapeRegex } = require('../utils/sanitize');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Non-fatal notification helper */
async function sendNotification(recipient, title, message, relatedId, relatedType) {
  try {
    await Notification.create({
      recipient,
      title,
      message,
      type: 'booth_assigned',
      relatedId: relatedId || null,
      relatedType: relatedType || null,
    });
  } catch {
    // Failures in notification logging do not abort the core transaction
  }
}

// ─── 1. List Expo Booths / Floor-Plan Data ───────────────────────────────────

/**
 * GET /api/expos/:expoId/booths
 * Retrieve all booths and floor-plan layout for a specific expo.
 * Supports filtering by status, zone, type, and search by boothNumber.
 * Accessible to public/attendees/exhibitors for viewing, and organizers for management.
 */
exports.getExpoBooths = async (req, res, next) => {
  try {
    const { expoId } = req.params;
    const { status, zone, type, search } = req.query;

    if (!isValidObjectId(expoId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid expo ID format',
      });
    }

    const expo = await Expo.findById(expoId).select('title status location organizer').lean();
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    const filter = { expo: expoId };
    if (status) filter.status = status;
    if (zone && typeof zone === 'string') filter.zone = { $regex: escapeRegex(zone.trim()), $options: 'i' };
    if (type) filter.type = type;
    if (search && typeof search === 'string') filter.boothNumber = { $regex: escapeRegex(search.trim()), $options: 'i' };

    const [booths, statsAgg] = await Promise.all([
      Booth.find(filter)
        .populate('assignedTo', 'name email phone avatarUrl')
        .populate({
          path: 'application',
          populate: { path: 'exhibitorProfile', select: 'companyName industry logoUrl contactPerson' },
        })
        .sort({ zone: 1, boothNumber: 1 })
        .lean(),
      Booth.aggregate([
        { $match: { expo: new mongoose.Types.ObjectId(expoId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Aggregate summary statistics
    const stats = {
      total: 0,
      available: 0,
      reserved: 0,
      allocated: 0,
      occupied: 0,
      maintenance: 0,
    };

    statsAgg.forEach((item) => {
      stats[item._id] = item.count;
      stats.total += item.count;
    });

    // Group booths by zone for visual floor-plan rendering
    const zones = {};
    booths.forEach((b) => {
      const z = b.zone || 'General';
      if (!zones[z]) zones[z] = [];
      zones[z].push(b);
    });

    return res.status(200).json({
      success: true,
      message: 'Expo booths retrieved successfully',
      data: {
        expo: {
          _id: expo._id,
          title: expo.title,
          status: expo.status,
          location: expo.location,
          organizer: expo.organizer,
        },
        stats,
        zones,
        booths,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. Create Booth ─────────────────────────────────────────────────────────

/**
 * POST /api/expos/:expoId/booths
 * Create a new booth for an expo.
 * Restricted to the expo's organizer or platform admin.
 */
exports.createBooth = async (req, res, next) => {
  try {
    const { expoId } = req.params;
    const { boothNumber, dimensions, zone, type, price, status } = req.body;

    if (!isValidObjectId(expoId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid expo ID format',
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

    // Ownership check: must be expo organizer or admin
    if (req.user.role !== 'admin' && expo.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only manage booths for your own expos',
      });
    }

    if (!boothNumber || !boothNumber.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Booth number is required',
      });
    }

    // Check duplicate booth number within this expo
    const existing = await Booth.findOne({ expo: expoId, boothNumber: boothNumber.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: `Booth number '${boothNumber.trim()}' already exists for this expo. Please choose a unique identifier.`,
      });
    }

    const booth = await Booth.create({
      expo: expoId,
      boothNumber: boothNumber.trim(),
      dimensions: dimensions || { width: 3, length: 3, unit: 'meters' },
      zone: zone ? zone.trim() : 'General',
      type: type || 'standard',
      price: price != null ? Number(price) : 0,
      status: status || 'available',
    });

    return res.status(201).json({
      success: true,
      message: 'Booth created successfully',
      data: booth,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'Duplicate booth number detected for this expo.',
      });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Booth validation failed',
        errors,
      });
    }
    next(error);
  }
};

// ─── 3. Get Single Booth Detail ──────────────────────────────────────────────

/**
 * GET /api/booths/:id
 * Retrieve details for a specific booth.
 */
exports.getBoothById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid booth ID format',
      });
    }

    const booth = await Booth.findById(id)
      .populate('expo', 'title category location startDate endDate status organizer')
      .populate('assignedTo', 'name email phone avatarUrl')
      .populate({
        path: 'application',
        populate: { path: 'exhibitorProfile', select: 'companyName industry companyDescription contactPerson logoUrl' },
      })
      .lean();

    if (!booth) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Booth not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booth retrieved successfully',
      data: booth,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. Update Booth ─────────────────────────────────────────────────────────

/**
 * PATCH /api/booths/:id
 * Update booth details (dimensions, zone, type, price, number).
 * Restricted to expo organizer or admin.
 */
exports.updateBooth = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid booth ID format',
      });
    }

    const booth = await Booth.findById(id).populate('expo', 'organizer');
    if (!booth) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Booth not found',
      });
    }

    // Ownership check
    if (req.user.role !== 'admin' && booth.expo.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only edit booths for your own expos',
      });
    }

    const { boothNumber, dimensions, zone, type, price, status } = req.body;

    // Check duplicate if boothNumber is changing
    if (boothNumber && boothNumber.trim() !== booth.boothNumber) {
      const conflict = await Booth.findOne({
        expo: booth.expo._id,
        boothNumber: boothNumber.trim(),
        _id: { $ne: booth._id },
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          status: 'error',
          statusCode: 409,
          message: `Booth number '${boothNumber.trim()}' is already taken in this expo.`,
        });
      }
      booth.boothNumber = boothNumber.trim();
    }

    if (dimensions) booth.dimensions = { ...booth.dimensions.toObject(), ...dimensions };
    if (zone != null) booth.zone = zone.trim();
    if (type) booth.type = type;
    if (price != null) booth.price = Number(price);

    // Only allow manual status changes if booth is unassigned
    if (status && !booth.assignedTo) {
      booth.status = status;
    }

    await booth.save();

    const updated = await Booth.findById(id)
      .populate('assignedTo', 'name email phone')
      .populate({
        path: 'application',
        populate: { path: 'exhibitorProfile', select: 'companyName industry' },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Booth updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Booth update validation failed',
        errors,
      });
    }
    next(error);
  }
};

// ─── 5. Safe Booth Deletion ──────────────────────────────────────────────────

/**
 * DELETE /api/booths/:id
 * Delete a booth. Blocked if the booth is currently allocated or reserved to an exhibitor.
 * Restricted to expo organizer or admin.
 */
exports.deleteBooth = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid booth ID format',
      });
    }

    const booth = await Booth.findById(id).populate('expo', 'organizer');
    if (!booth) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Booth not found',
      });
    }

    // Ownership check
    if (req.user.role !== 'admin' && booth.expo.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only delete booths for your own expos',
      });
    }

    // Safe deletion rule: cannot delete if allocated or assigned to an exhibitor
    if (booth.assignedTo || ['allocated', 'occupied'].includes(booth.status)) {
      return res.status(422).json({
        success: false,
        status: 'error',
        statusCode: 422,
        message: 'Cannot delete an allocated booth. You must unassign the booth before it can be deleted.',
      });
    }

    await Booth.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Booth deleted successfully',
      data: { deletedId: id },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 6. Allocate Booth ───────────────────────────────────────────────────────

/**
 * POST /api/booths/:id/allocate
 * Assign booth to an approved exhibitor application.
 * Rules enforced:
 *  - Only expo organizer or admin
 *  - Application must exist, belong to this expo, and have status: 'approved'
 *  - Exhibitor must not already have another booth in this expo (double-booking guard)
 *  - Booth must be available / reserved (atomic update concurrency protection)
 *  - Dispatches in-app notification to exhibitor
 */
exports.allocateBooth = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { applicationId } = req.body;

    if (!isValidObjectId(id) || !applicationId || !isValidObjectId(applicationId)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Valid booth ID and application ID are required',
      });
    }

    const booth = await Booth.findById(id).populate('expo', 'title organizer location');
    if (!booth) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Booth not found',
      });
    }

    // Ownership check
    if (req.user.role !== 'admin' && booth.expo.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only allocate booths for your own expos',
      });
    }

    // Validate application
    const application = await ExhibitorApplication.findById(applicationId)
      .populate('exhibitor', 'name email')
      .populate('exhibitorProfile', 'companyName');

    if (!application) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Exhibitor application not found',
      });
    }

    // Application must match booth's expo
    if (application.expo.toString() !== booth.expo._id.toString()) {
      return res.status(422).json({
        success: false,
        status: 'error',
        statusCode: 422,
        message: 'Application does not belong to the same expo as this booth',
      });
    }

    // Application must be approved
    if (application.status !== 'approved') {
      return res.status(422).json({
        success: false,
        status: 'error',
        statusCode: 422,
        message: `Only approved applications can receive a booth assignment. Current application status is '${application.status}'.`,
      });
    }

    const exhibitorId = application.exhibitor._id;

    // Check if exhibitor already has a booth assigned in this expo
    const existingAllocation = await Booth.findOne({
      expo: booth.expo._id,
      assignedTo: exhibitorId,
      _id: { $ne: booth._id },
    });

    if (existingAllocation) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: `Exhibitor already has a booth (${existingAllocation.boothNumber}) allocated in this expo. Duplicate booth assignments are not permitted.`,
      });
    }

    // Atomic assignment with double-booking concurrency protection
    const allocatedBooth = await Booth.findOneAndUpdate(
      {
        _id: booth._id,
        $or: [{ status: 'available' }, { status: 'reserved' }],
        assignedTo: null,
      },
      {
        assignedTo: exhibitorId,
        application: application._id,
        status: 'allocated',
        assignedAt: new Date(),
      },
      { new: true }
    )
      .populate('assignedTo', 'name email phone avatarUrl')
      .populate({
        path: 'application',
        populate: { path: 'exhibitorProfile', select: 'companyName industry contactPerson' },
      });

    if (!allocatedBooth) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'Booth is no longer available for allocation. It may have been allocated concurrently or marked for maintenance.',
      });
    }

    // Notify exhibitor
    await sendNotification(
      exhibitorId,
      '🎪 Booth Allocated!',
      `You have been allocated Booth ${booth.boothNumber} (${booth.zone || 'General'} Zone) for "${booth.expo.title}".`,
      allocatedBooth._id,
      'Booth'
    );

    return res.status(200).json({
      success: true,
      message: `Booth ${booth.boothNumber} successfully allocated to ${application.exhibitorProfile?.companyName || application.exhibitor.name}`,
      data: allocatedBooth,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: 'Duplicate booth assignment detected at database constraint level.',
      });
    }
    next(error);
  }
};

// ─── 7. Unallocate Booth ─────────────────────────────────────────────────────

/**
 * POST /api/booths/:id/unallocate
 * Release an allocated booth back to 'available' status.
 * Restricted to expo organizer or admin.
 */
exports.unallocateBooth = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid booth ID format',
      });
    }

    const booth = await Booth.findById(id).populate('expo', 'title organizer');
    if (!booth) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Booth not found',
      });
    }

    // Ownership check
    if (req.user.role !== 'admin' && booth.expo.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You can only unassign booths for your own expos',
      });
    }

    const prevExhibitorId = booth.assignedTo;

    booth.assignedTo = null;
    booth.application = null;
    booth.assignedAt = null;
    booth.status = 'available';

    await booth.save();

    if (prevExhibitorId) {
      await sendNotification(
        prevExhibitorId,
        'Booth Assignment Released',
        `Your booth allocation for Booth ${booth.boothNumber} at "${booth.expo.title}" has been unassigned by the organizer.`,
        booth._id,
        'Booth'
      );
    }

    return res.status(200).json({
      success: true,
      message: `Booth ${booth.boothNumber} has been unallocated and returned to available inventory.`,
      data: booth,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 8. Exhibitor Assigned Booths ────────────────────────────────────────────

/**
 * GET /api/exhibitors/my-booths
 * Retrieve all booths allocated to the authenticated exhibitor across expos.
 */
exports.getMyBooths = async (req, res, next) => {
  try {
    const exhibitorId = req.user._id;

    const booths = await Booth.find({ assignedTo: exhibitorId })
      .populate('expo', 'title category location startDate endDate status')
      .populate({
        path: 'application',
        select: 'boothPreference status createdAt',
      })
      .sort({ assignedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Exhibitor allocated booths retrieved successfully',
      data: booths,
    });
  } catch (error) {
    next(error);
  }
};
