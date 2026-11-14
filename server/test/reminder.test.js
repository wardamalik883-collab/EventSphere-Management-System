/**
 * reminder.test.js — Reminder Scheduler & Duplicate Prevention Test Suite
 * Task 12: Controlled execution of reminder checks, cancellation safety, and duplicate prevention.
 *
 * Run: node test/reminder.test.js
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const { checkAndSendReminders } = require('../src/utils/reminderScheduler');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

let User, Expo, Session, AttendeeRegistration, Bookmark, Notification;
const TS = `_rem_${Date.now()}`;

async function setup() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 15000,
  });

  User = require('../src/models/User');
  Expo = require('../src/models/Expo');
  Session = require('../src/models/Session');
  AttendeeRegistration = require('../src/models/AttendeeRegistration');
  Bookmark = require('../src/models/Bookmark');
  Notification = require('../src/models/Notification');
}

async function teardown() {
  const emails = [`org${TS}@test.com`, `att1${TS}@test.com`, `att2${TS}@test.com`];
  const users = await User.find({ email: { $in: emails } }).select('_id').lean();
  const userIds = users.map((u) => u._id);

  if (userIds.length) {
    const expos = await Expo.find({ organizer: { $in: userIds } }).select('_id').lean();
    const expoIds = expos.map((e) => e._id);

    await Notification.deleteMany({ recipient: { $in: userIds } });
    await Bookmark.deleteMany({ user: { $in: userIds } });
    await AttendeeRegistration.deleteMany({ attendee: { $in: userIds } });
    if (expoIds.length) {
      await Session.deleteMany({ expo: { $in: expoIds } });
      await Expo.deleteMany({ _id: { $in: expoIds } });
    }
    await User.deleteMany({ _id: { $in: userIds } });
  }

  await mongoose.disconnect();
}

async function runTests() {
  await setup();

  // Create organizer and 2 attendees
  const organizer = await User.create({
    name: `Org${TS}`,
    email: `org${TS}@test.com`,
    password: 'Password1!',
    role: 'organizer',
  });

  const attendeeActive = await User.create({
    name: `Attendee Active${TS}`,
    email: `att1${TS}@test.com`,
    password: 'Password1!',
    role: 'attendee',
  });

  const attendeeCancelled = await User.create({
    name: `Attendee Cancelled${TS}`,
    email: `att2${TS}@test.com`,
    password: 'Password1!',
    role: 'attendee',
  });

  // Reference date: tomorrow morning at 09:00
  const refDate = new Date();
  refDate.setDate(refDate.getDate() + 1);
  refDate.setHours(9, 0, 0, 0);

  // Expo starting in 12 hours from refDate
  const expoStartDate = new Date(refDate.getTime() + 12 * 60 * 60 * 1000);
  const expoEndDate = new Date(expoStartDate.getTime() + 48 * 60 * 60 * 1000);

  const upcomingExpo = await Expo.create({
    title: `Future Expo ${TS}`,
    description: 'Upcoming technology expo',
    organizer: organizer._id,
    startDate: expoStartDate,
    endDate: expoEndDate,
    status: 'published',
    category: 'Technology',
    location: {
      venue: 'Test Convention Center',
      city: 'Test City',
      country: 'Test Country',
    },
  });

  // 1 confirmed registration for attendeeActive
  await AttendeeRegistration.create({
    expo: upcomingExpo._id,
    attendee: attendeeActive._id,
    registrationNumber: `REG-ACT-${Date.now()}`,
    status: 'confirmed',
  });

  // 1 cancelled registration for attendeeCancelled
  await AttendeeRegistration.create({
    expo: upcomingExpo._id,
    attendee: attendeeCancelled._id,
    registrationNumber: `REG-CAN-${Date.now()}`,
    status: 'cancelled',
  });

  // Upcoming session in 14 hours from refDate
  const sessionDate = new Date(refDate.getTime() + 14 * 60 * 60 * 1000);
  const sessionDoc = await Session.create({
    expo: upcomingExpo._id,
    title: `Keynote on AI ${TS}`,
    description: 'Opening keynote',
    speaker: { name: 'Dr. Smith' },
    startTime: new Date(sessionDate.getTime()),
    endTime: new Date(sessionDate.getTime() + 60 * 60 * 1000), // +1 hour
    room: 'Hall A',
  });

  // Bookmarked by attendeeActive
  await Bookmark.create({
    user: attendeeActive._id,
    session: sessionDoc._id,
    expo: upcomingExpo._id,
  });

  // ── 1. checkAndSendReminders sends reminder for confirmed attendee ─────────
  await test('1. checkAndSendReminders creates expo_reminder for confirmed registration', async () => {
    const result = await checkAndSendReminders({
      referenceDate: refDate,
      windowHours: 24,
    });
    assert(result.expoRemindersSent >= 1, `Expected at least 1 expo reminder, got ${result.expoRemindersSent}`);

    const notif = await Notification.findOne({
      recipient: attendeeActive._id,
      type: 'expo_reminder',
      relatedId: upcomingExpo._id,
    });
    assert(notif !== null, 'attendeeActive should have received an expo_reminder notification');
    assert(notif.title.includes('Reminder'), 'Title should mention Reminder');
  });

  // ── 2. checkAndSendReminders creates session_reminder for upcoming session ──
  await test('2. checkAndSendReminders creates session_reminder for upcoming session', async () => {
    const notif = await Notification.findOne({
      recipient: attendeeActive._id,
      type: 'session_reminder',
      relatedId: sessionDoc._id,
    });
    assert(notif !== null, 'attendeeActive should have received a session_reminder');
    assert(notif.title.includes('Session Reminder'), 'Title should mention Session Reminder');
  });

  // ── 3. Cancelled registration receives NO reminder ────────────────────────
  await test('3. Cancelled registration strictly receives NO expo reminder', async () => {
    const notif = await Notification.findOne({
      recipient: attendeeCancelled._id,
      type: 'expo_reminder',
      relatedId: upcomingExpo._id,
    });
    assert(notif === null, 'attendeeCancelled should NOT receive an expo reminder');
  });

  // ── 4. Cancelled expo receives NO reminders ───────────────────────────────
  await test('4. Cancelled expo does not generate reminders', async () => {
    // Mark expo as cancelled
    await Expo.findByIdAndUpdate(upcomingExpo._id, { status: 'cancelled' });

    // Clear notifications
    await Notification.deleteMany({ recipient: attendeeActive._id });

    const result = await checkAndSendReminders({
      referenceDate: refDate,
      windowHours: 24,
    });
    assert(result.expoRemindersSent === 0, 'No expo reminders should be sent for cancelled expo');

    // Restore status for duplicate tests
    await Expo.findByIdAndUpdate(upcomingExpo._id, { status: 'published' });
  });

  // ── 5. Duplicate prevention guarantee ─────────────────────────────────────
  await test('5. Duplicate prevention: second run sends 0 duplicate reminders', async () => {
    // Run reminder check again
    const secondRun = await checkAndSendReminders({
      referenceDate: refDate,
      windowHours: 24,
    });
    // First run in this phase
    const thirdRun = await checkAndSendReminders({
      referenceDate: refDate,
      windowHours: 24,
    });

    assert(thirdRun.expoRemindersSent === 0, `Expected 0 duplicate expo reminders, got ${thirdRun.expoRemindersSent}`);
    assert(thirdRun.sessionRemindersSent === 0, `Expected 0 duplicate session reminders, got ${thirdRun.sessionRemindersSent}`);
  });

  // ── 6. Verification of single notification record in DB ───────────────────
  await test('6. Database maintains exactly one reminder per (user, event)', async () => {
    const count = await Notification.countDocuments({
      recipient: attendeeActive._id,
      type: 'expo_reminder',
      relatedId: upcomingExpo._id,
    });
    assert(count === 1, `Expected exactly 1 notification record, got ${count}`);
  });

  await teardown();
}

runTests()
  .then(() => {
    console.log(`\n[REMINDER TESTS] ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('\n[REMINDER TESTS] Fatal error:', err.message);
    process.exit(1);
  });
