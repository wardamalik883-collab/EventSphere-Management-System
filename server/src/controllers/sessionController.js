/**
 * sessionController.js — Expo Session & Schedule Management Controller
 *
 * Implements:
 *  - createSession     : Organizers/Admins create sessions with room conflict & date checks
 *  - getExpoSessions   : Lists sessions for an expo with search/filtering
 *  - getExpoSchedule   : Public chronological schedule grouped by date tabs
 *  - getSessionById    : Single session details
 *  - updateSession     : Edits session details with re-validation & collision protection
 *  - deleteSession     : Safely removes a session
 *  - cancelSession     : Marks session as cancelled
 */

const mongoose = require('mongoose');
const Session = require('../models/Session');
const Expo = require('../models/Expo');
const { escapeRegex } = require('../utils/sanitize');

/** Helper: validate MongoDB ObjectId */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Helper: check if caller can manage this expo */
const canManageExpo = (expo, user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const organizerId = expo.organizer?._id ? expo.organizer._id.toString() : expo.organizer.toString();
  return organizerId === user._id.toString();
};

/**
 * POST /api/expos/:expoId/sessions
 * Create a new session for an expo.
 */
const createSession = async (req, res, next) => {
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

    const expo = await Expo.findById(expoId);
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Permission check
    if (!canManageExpo(expo, req.user)) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You do not have permission to manage sessions for this expo',
      });
    }

    const {
      title,
      description,
      speaker,
      speakerName,
      speakerTitle,
      speakerCompany,
      speakerBio,
      room,
      startTime,
      endTime,
      category,
      capacity,
      status,
    } = req.body;

    // Validate required fields
    const resolvedSpeakerName = speaker?.name || speakerName;
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Session title is required',
      });
    }

    if (!resolvedSpeakerName || !resolvedSpeakerName.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Speaker name is required',
      });
    }

    if (!room || !room.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Room or hall identifier is required',
      });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Both session start time and end time are required',
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid date/time format for session times',
      });
    }

    // End time strictly after start time
    if (end <= start) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'End time must be strictly after start time',
      });
    }

    // Validate times fall within expo dates (allowing full start/end calendar day)
    const expoStart = new Date(expo.startDate);
    expoStart.setHours(0, 0, 0, 0);
    const expoEnd = new Date(expo.endDate);
    expoEnd.setHours(23, 59, 59, 999);

    if (start < expoStart || end > expoEnd) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: `Session date/time must fall within the expo duration (${expo.startDate.toISOString().split('T')[0]} to ${expo.endDate.toISOString().split('T')[0]})`,
      });
    }

    // Capacity validation
    const numCapacity = capacity !== undefined && capacity !== null ? parseInt(capacity, 10) : 0;
    if (isNaN(numCapacity) || numCapacity < 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Capacity must be a non-negative number',
      });
    }

    // Same-Room Collision Check
    const normalizedRoom = room.trim();
    const conflict = await Session.findOne({
      expo: expo._id,
      room: normalizedRoom,
      status: { $ne: 'cancelled' },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: `Room conflict: Room '${normalizedRoom}' is already booked for '${conflict.title}' during this time window`,
        conflict: {
          sessionId: conflict._id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          room: conflict.room,
        },
      });
    }

    const session = await Session.create({
      expo: expo._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      speaker: {
        name: resolvedSpeakerName.trim(),
        title: (speaker?.title || speakerTitle || '').trim(),
        company: (speaker?.company || speakerCompany || '').trim(),
        bio: (speaker?.bio || speakerBio || '').trim(),
      },
      room: normalizedRoom,
      startTime: start,
      endTime: end,
      category: category ? category.trim() : 'General',
      capacity: numCapacity,
      status: status || 'scheduled',
    });

    return res.status(201).json({
      success: true,
      status: 'success',
      statusCode: 201,
      message: 'Session created successfully',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/expos/:expoId/sessions
 * List sessions for an expo with search/filtering.
 */
const getExpoSessions = async (req, res, next) => {
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

    const expo = await Expo.findById(expoId);
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Role-based visibility: draft/cancelled expos are visible only to organizer or admin
    if (['draft', 'cancelled'].includes(expo.status) && !canManageExpo(expo, req.user)) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo schedule is not available',
      });
    }

    const { search, category, status, speaker, date } = req.query;
    const filter = { expo: expo._id };

    if (category && typeof category === 'string') {
      filter.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, 'i') };
    }

    if (status) {
      filter.status = status;
    }

    if (speaker && typeof speaker === 'string') {
      filter['speaker.name'] = { $regex: escapeRegex(speaker.trim()), $options: 'i' };
    }

    if (search && typeof search === 'string') {
      const searchRegex = { $regex: escapeRegex(search.trim()), $options: 'i' };
      filter.$or = [
        { title: searchRegex },
        { 'speaker.name': searchRegex },
        { room: searchRegex },
        { description: searchRegex },
      ];
    }

    if (date) {
      const targetDate = new Date(date);
      if (!isNaN(targetDate.getTime())) {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.startTime = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    const sessions = await Session.find(filter).sort({ startTime: 1 });

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      count: sessions.length,
      data: {
        expo: {
          _id: expo._id,
          title: expo.title,
          startDate: expo.startDate,
          endDate: expo.endDate,
          status: expo.status,
        },
        sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/expos/:expoId/schedule
 * Public schedule endpoint: groups sessions chronologically by date for schedule UI.
 */
const getExpoSchedule = async (req, res, next) => {
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

    const expo = await Expo.findById(expoId);
    if (!expo) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Expo not found',
      });
    }

    // Public users can only view schedule for published or ongoing expos
    if (['draft', 'cancelled'].includes(expo.status) && !canManageExpo(expo, req.user)) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Public schedule is not available for this expo',
      });
    }

    const { category, search } = req.query;
    const filter = { expo: expo._id };

    if (category && typeof category === 'string') {
      filter.category = { $regex: new RegExp(`^${escapeRegex(category.trim())}$`, 'i') };
    }

    if (search && typeof search === 'string') {
      const searchRegex = { $regex: escapeRegex(search.trim()), $options: 'i' };
      filter.$or = [
        { title: searchRegex },
        { 'speaker.name': searchRegex },
        { room: searchRegex },
        { description: searchRegex },
      ];
    }

    const sessions = await Session.find(filter).sort({ startTime: 1 });

    // Group sessions by ISO date string (YYYY-MM-DD)
    const grouped = {};
    const categoriesSet = new Set();

    sessions.forEach((sess) => {
      if (sess.category) categoriesSet.add(sess.category);
      const dateKey = sess.startTime.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(sess);
    });

    const schedule = Object.keys(grouped)
      .sort()
      .map((dateKey, index) => {
        const d = new Date(dateKey + 'T00:00:00');
        const formattedDate = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return {
          date: dateKey,
          dayIndex: index + 1,
          dayLabel: `Day ${index + 1} — ${formattedDate}`,
          sessions: grouped[dateKey],
        };
      });

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      data: {
        expo: {
          _id: expo._id,
          title: expo.title,
          startDate: expo.startDate,
          endDate: expo.endDate,
          status: expo.status,
          location: expo.location,
        },
        totalSessions: sessions.length,
        categories: Array.from(categoriesSet).sort(),
        schedule,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sessions/:id
 * Retrieve single session details.
 */
const getSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid session ID format',
      });
    }

    const session = await Session.findById(id).populate('expo', 'title startDate endDate status organizer location');
    if (!session) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Session not found',
      });
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sessions/:id
 * Update session details.
 */
const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid session ID format',
      });
    }

    const session = await Session.findById(id).populate('expo');
    if (!session) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Session not found',
      });
    }

    if (!canManageExpo(session.expo, req.user)) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You do not have permission to modify this session',
      });
    }

    const {
      title,
      description,
      speaker,
      speakerName,
      speakerTitle,
      speakerCompany,
      speakerBio,
      room,
      startTime,
      endTime,
      category,
      capacity,
      status,
    } = req.body;

    const newStart = startTime ? new Date(startTime) : session.startTime;
    const newEnd = endTime ? new Date(endTime) : session.endTime;

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid date/time format for session times',
      });
    }

    if (newEnd <= newStart) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'End time must be strictly after start time',
      });
    }

    // Expo boundary check
    const expoStart = new Date(session.expo.startDate);
    expoStart.setHours(0, 0, 0, 0);
    const expoEnd = new Date(session.expo.endDate);
    expoEnd.setHours(23, 59, 59, 999);

    if (newStart < expoStart || newEnd > expoEnd) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: `Session dates must be within the expo duration (${session.expo.startDate.toISOString().split('T')[0]} to ${session.expo.endDate.toISOString().split('T')[0]})`,
      });
    }

    const newRoom = room ? room.trim() : session.room;

    // Check collision if room or times changed
    const conflict = await Session.findOne({
      _id: { $ne: session._id },
      expo: session.expo._id,
      room: newRoom,
      status: { $ne: 'cancelled' },
      startTime: { $lt: newEnd },
      endTime: { $gt: newStart },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        status: 'error',
        statusCode: 409,
        message: `Room conflict: Room '${newRoom}' is already booked for '${conflict.title}' during this time window`,
        conflict: {
          sessionId: conflict._id,
          title: conflict.title,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
      });
    }

    // Update fields
    if (title !== undefined) session.title = title.trim();
    if (description !== undefined) session.description = description.trim();
    if (room !== undefined) session.room = newRoom;
    if (category !== undefined) session.category = category.trim();
    if (status !== undefined) session.status = status;
    session.startTime = newStart;
    session.endTime = newEnd;

    if (capacity !== undefined) {
      const numCap = parseInt(capacity, 10);
      if (!isNaN(numCap) && numCap >= 0) session.capacity = numCap;
    }

    // Speaker updates
    if (speakerName !== undefined) session.speaker.name = speakerName.trim();
    if (speakerTitle !== undefined) session.speaker.title = speakerTitle.trim();
    if (speakerCompany !== undefined) session.speaker.company = speakerCompany.trim();
    if (speakerBio !== undefined) session.speaker.bio = speakerBio.trim();

    if (speaker && typeof speaker === 'object') {
      if (speaker.name !== undefined) session.speaker.name = speaker.name.trim();
      if (speaker.title !== undefined) session.speaker.title = speaker.title.trim();
      if (speaker.company !== undefined) session.speaker.company = speaker.company.trim();
      if (speaker.bio !== undefined) session.speaker.bio = speaker.bio.trim();
    }

    await session.save();

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Session updated successfully',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/sessions/:id
 * Delete a session.
 */
const deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid session ID format',
      });
    }

    const session = await Session.findById(id).populate('expo');
    if (!session) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Session not found',
      });
    }

    if (!canManageExpo(session.expo, req.user)) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You do not have permission to delete this session',
      });
    }

    await Session.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Session deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/sessions/:id/cancel
 * Cancel a session.
 */
const cancelSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        statusCode: 400,
        message: 'Invalid session ID format',
      });
    }

    const session = await Session.findById(id).populate('expo');
    if (!session) {
      return res.status(404).json({
        success: false,
        status: 'error',
        statusCode: 404,
        message: 'Session not found',
      });
    }

    if (!canManageExpo(session.expo, req.user)) {
      return res.status(403).json({
        success: false,
        status: 'error',
        statusCode: 403,
        message: 'Access denied: You do not have permission to cancel this session',
      });
    }

    session.status = 'cancelled';
    await session.save();

    // Dispatch schedule_change notifications to registered attendees & bookmarkers
    try {
      const Bookmark = require('../models/Bookmark');
      const AttendeeRegistration = require('../models/AttendeeRegistration');
      const Notification = require('../models/Notification');

      const bookmarks = await Bookmark.find({ session: session._id }).select('user').lean();
      const targetUserIds = new Set(bookmarks.map((b) => b.user.toString()));

      const registrations = await AttendeeRegistration.find({
        expo: session.expo._id,
        status: { $in: ['confirmed', 'checked_in'] },
      }).select('attendee').lean();
      registrations.forEach((r) => targetUserIds.add(r.attendee.toString()));

      for (const uid of targetUserIds) {
        await Notification.create({
          recipient: uid,
          title: `Session Cancelled: "${session.title}"`,
          message: `The session "${session.title}" has been marked as cancelled by the organizer.`,
          type: 'schedule_change',
          relatedId: session._id,
          relatedType: 'Session',
        });
      }
    } catch {
      // Non-fatal notification failure
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      statusCode: 200,
      message: 'Session marked as cancelled successfully',
      data: { session },
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getExpoSessions,
  getExpoSchedule,
  getSessionById,
  updateSession,
  deleteSession,
  cancelSession,
};
