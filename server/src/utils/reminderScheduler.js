/**
 * reminderScheduler.js — Automated In-App Reminder Scheduler
 *
 * Implements automated background scanning for:
 *  1. Upcoming registered expos (starting within the reminder window)
 *  2. Upcoming expo sessions (for attendees with confirmed registrations or bookmarked sessions)
 *
 * Core Guarantees:
 *  - Duplicate Prevention: Never sends more than one reminder for the same (user, event)
 *  - Cancellation Safety: Skips cancelled registrations, cancelled expos, and cancelled sessions
 *  - Non-blocking: Runs in asynchronous, unref'd timer interval; errors are caught and logged
 *  - Exported On-Demand Trigger: checkAndSendReminders() is directly callable for unit tests
 */

const Expo = require('../models/Expo');
const Session = require('../models/Session');
const AttendeeRegistration = require('../models/AttendeeRegistration');
const Bookmark = require('../models/Bookmark');
const Notification = require('../models/Notification');
const { sendNotification } = require('./notificationHelper');

let schedulerTimer = null;

/**
 * Scan for upcoming expos and sessions, creating in-app reminder notifications for eligible users.
 *
 * @param {object} [options]
 * @param {number} [options.windowHours=24] - Hours ahead to look for upcoming events
 * @param {Date} [options.referenceDate=new Date()] - Reference point for time calculations (useful in tests)
 * @returns {Promise<{ expoRemindersSent: number, sessionRemindersSent: number }>}
 */
async function checkAndSendReminders(options = {}) {
  const windowHours = options.windowHours !== undefined
    ? options.windowHours
    : (parseInt(process.env.REMINDER_WINDOW_HOURS, 10) || 24);

  const now = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  let expoRemindersSent = 0;
  let sessionRemindersSent = 0;

  try {
    // ── 1. Upcoming Expos Reminders ──────────────────────────────────────────
    // Find published/ongoing expos starting between now and windowEnd
    const upcomingExpos = await Expo.find({
      status: { $in: ['published', 'ongoing'] },
      startDate: { $gte: now, $lte: windowEnd },
    }).select('_id title startDate location').lean();

    for (const expo of upcomingExpos) {
      // Find all confirmed registrations for this expo
      const registrations = await AttendeeRegistration.find({
        expo: expo._id,
        status: { $in: ['confirmed', 'checked_in'] }, // cancelled strictly excluded
      }).select('attendee').lean();

      for (const reg of registrations) {
        const attendeeId = reg.attendee;

        // Duplicate check: has this user already received an expo_reminder for this expo?
        const alreadyNotified = await Notification.exists({
          recipient: attendeeId,
          type: 'expo_reminder',
          relatedId: expo._id,
        });

        if (!alreadyNotified) {
          const formattedDate = new Date(expo.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          await sendNotification({
            recipient: attendeeId,
            title: `Reminder: Upcoming Expo "${expo.title}"`,
            message: `"${expo.title}" is starting soon on ${formattedDate}. Get ready for the event!`,
            type: 'expo_reminder',
            relatedId: expo._id,
            relatedType: 'Expo',
            data: {
              expoId: expo._id,
              startDate: expo.startDate,
            },
          });
          expoRemindersSent++;
        }
      }
    }

    // ── 2. Upcoming Sessions Reminders ───────────────────────────────────────
    // Find active sessions occurring between now and windowEnd
    const upcomingSessions = await Session.find({
      status: { $ne: 'cancelled' },
      startTime: { $gte: now, $lte: windowEnd },
    }).populate('expo', 'title status').lean();

    for (const session of upcomingSessions) {
      // Skip if parent expo is cancelled
      if (!session.expo || session.expo.status === 'cancelled') {
        continue;
      }

      // Collect target users:
      // a) Users who bookmarked this specific session
      const bookmarks = await Bookmark.find({ session: session._id }).select('user').lean();
      const targetUserIds = new Set(bookmarks.map((b) => b.user.toString()));

      // b) Attendees registered for this expo
      const registrations = await AttendeeRegistration.find({
        expo: session.expo._id,
        status: { $in: ['confirmed', 'checked_in'] },
      }).select('attendee').lean();

      registrations.forEach((r) => targetUserIds.add(r.attendee.toString()));

      for (const userIdStr of targetUserIds) {
        // Duplicate check: has this user already received a session_reminder for this session?
        const alreadyNotified = await Notification.exists({
          recipient: userIdStr,
          type: 'session_reminder',
          relatedId: session._id,
        });

        if (!alreadyNotified) {
          await sendNotification({
            recipient: userIdStr,
            title: `Session Reminder: "${session.title}"`,
            message: `The session "${session.title}" is scheduled for ${session.startTime} in ${session.room || 'the venue'}.`,
            type: 'session_reminder',
            relatedId: session._id,
            relatedType: 'Session',
            data: {
              sessionId: session._id,
              expoId: session.expo._id,
              startTime: session.startTime,
              room: session.room,
            },
          });
          sessionRemindersSent++;
        }
      }
    }
  } catch (error) {
    console.error(`[REMINDER SCHEDULER] Error during reminder run: ${error.message}`);
  }

  return { expoRemindersSent, sessionRemindersSent };
}

/**
 * Start the recurring background reminder worker.
 */
function startReminderScheduler() {
  if (schedulerTimer) return;

  const intervalMinutes = parseInt(process.env.REMINDER_INTERVAL_MINUTES, 10) || 30;
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[REMINDER SCHEDULER] Initialized (interval: ${intervalMinutes}m)`);

  // Run initial check after a short startup delay
  setTimeout(() => {
    checkAndSendReminders().catch((err) =>
      console.error(`[REMINDER SCHEDULER] Initial run failed: ${err.message}`)
    );
  }, 10000);

  // Set recurring interval
  schedulerTimer = setInterval(() => {
    checkAndSendReminders().catch((err) =>
      console.error(`[REMINDER SCHEDULER] Scheduled run failed: ${err.message}`)
    );
  }, intervalMs);

  if (schedulerTimer.unref) {
    schedulerTimer.unref(); // don't prevent Node process exit
  }
}

/**
 * Stop the recurring reminder scheduler.
 */
function stopReminderScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[REMINDER SCHEDULER] Stopped');
  }
}

module.exports = {
  checkAndSendReminders,
  startReminderScheduler,
  stopReminderScheduler,
};
