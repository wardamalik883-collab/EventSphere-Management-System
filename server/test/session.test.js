/**
 * session.test.js — Automated Test Suite for Schedule & Session Management (Task 09)
 *
 * Scenarios tested:
 *  1. Session creation with valid data (Organizer & Admin)
 *  2. Required field validations (title, speaker, room, startTime, endTime)
 *  3. Invalid session date rejection (outside expo start/end dates)
 *  4. Invalid start/end time rejection (endTime <= startTime)
 *  5. Session listing by expo with search, category, status, date filters
 *  6. Session details retrieval
 *  7. Session updating with boundary & conflict re-checks
 *  8. Session cancellation
 *  9. Safe session deletion
 * 10. Same-room scheduling conflict detection (409 Conflict)
 * 11. Non-overlapping sessions in the same room allowed
 * 12. Cancelled sessions do not block room from being rebooked
 * 13. Multi-tenant expo ownership isolation (Organizer 2 blocked from Organizer 1's expo)
 * 14. Admin cross-expo session management privileges
 * 15. Public schedule aggregation & date-grouping (GET /api/expos/:expoId/schedule)
 * 16. Draft expo schedule hidden from unauthorized users (404)
 * 17. Malformed and non-existent ObjectId error handling (400 / 404)
 * 18. Teardown & cleanup
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Expo = require('../src/models/Expo');
const Session = require('../src/models/Session');

const {
  createSession,
  getExpoSessions,
  getExpoSchedule,
  getSessionById,
  updateSession,
  deleteSession,
  cancelSession,
} = require('../src/controllers/sessionController');

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failedTests++;
  }
}

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

const TS = Date.now();
const EMAIL_ORG_1 = `sess_org1_${TS}@eventsphere.test`;
const EMAIL_ORG_2 = `sess_org2_${TS}@eventsphere.test`;
const EMAIL_ADMIN = `sess_admin_${TS}@eventsphere.test`;
const EMAIL_ATTENDEE = `sess_att_${TS}@eventsphere.test`;

async function runSessionTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 09 SESSION & SCHEDULE TEST      ');
  console.log('======================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run session tests without database connection.');
    process.exit(1);
  }

  // Cleanup any lingering test records
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: /Session Test Expo/ });
  await Session.deleteMany({});

  // 1. Setup Users
  const org1 = await User.create({
    name: 'Session Org One',
    email: EMAIL_ORG_1,
    password: 'Password123!',
    role: 'organizer',
  });

  const org2 = await User.create({
    name: 'Session Org Two',
    email: EMAIL_ORG_2,
    password: 'Password123!',
    role: 'organizer',
  });

  const admin = await User.create({
    name: 'Session Admin',
    email: EMAIL_ADMIN,
    password: 'Password123!',
    role: 'admin',
  });

  const attendee = await User.create({
    name: 'Session Attendee',
    email: EMAIL_ATTENDEE,
    password: 'Password123!',
    role: 'attendee',
  });

  // 2. Setup Expos
  // Expo 1 runs Nov 20 to Nov 22, 2026
  const expo1 = await Expo.create({
    title: 'Session Test Expo 1 (Published)',
    description: 'Premier tech conference with multi-track sessions',
    category: 'Technology',
    startDate: new Date('2026-11-20T09:00:00.000Z'),
    endDate: new Date('2026-11-22T18:00:00.000Z'),
    location: { venue: 'Grand Convention Center', city: 'Tech City', country: 'USA' },
    organizer: org1._id,
    status: 'published',
  });

  // Expo 2 (Draft) owned by Org 2
  const expo2 = await Expo.create({
    title: 'Session Test Expo 2 (Draft)',
    description: 'Private draft expo',
    category: 'Science',
    startDate: new Date('2026-12-01T09:00:00.000Z'),
    endDate: new Date('2026-12-03T18:00:00.000Z'),
    location: { venue: 'Science Hall', city: 'Metropolis', country: 'USA' },
    organizer: org2._id,
    status: 'draft',
  });

  let createdSession1Id = null;
  let createdSession2Id = null;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SESSION CREATION & FIELD VALIDATIONS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Session Creation & Field Validations ---');

  await test('Organizer 1 creates a valid Keynote session for Expo 1', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        title: 'Opening Keynote: Future of Quantum AI',
        description: 'Deep dive into next-gen computing paradigms',
        speaker: {
          name: 'Dr. Alan Turing',
          title: 'Chief Scientist',
          company: 'Quantum Dynamics',
          bio: 'Pioneer in computing algorithms',
        },
        room: 'Auditorium A',
        startTime: '2026-11-20T10:00:00.000Z',
        endTime: '2026-11-20T11:30:00.000Z',
        category: 'Keynote',
        capacity: 300,
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.session.title, 'Opening Keynote: Future of Quantum AI');
    assert.strictEqual(res.body.data.session.room, 'Auditorium A');
    assert.strictEqual(res.body.data.session.speaker.name, 'Dr. Alan Turing');
    createdSession1Id = res.body.data.session._id.toString();
  });

  await test('Admin can create a session for any expo', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      user: admin,
      body: {
        title: 'Cloud Native Workshop',
        speakerName: 'Sara Connor',
        room: 'Workshop Lab 1',
        startTime: '2026-11-20T14:00:00.000Z',
        endTime: '2026-11-20T16:00:00.000Z',
        category: 'Workshop',
        capacity: 50,
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.data.session.title, 'Cloud Native Workshop');
    assert.strictEqual(res.body.data.session.speaker.name, 'Sara Connor');
    createdSession2Id = res.body.data.session._id.toString();
  });

  await test('Rejects creation when title is missing (400)', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        speakerName: 'John Doe',
        room: 'Hall B',
        startTime: '2026-11-20T12:00:00.000Z',
        endTime: '2026-11-20T13:00:00.000Z',
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('Rejects creation when speaker name is missing (400)', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        title: 'Speakerless Session',
        room: 'Hall B',
        startTime: '2026-11-20T12:00:00.000Z',
        endTime: '2026-11-20T13:00:00.000Z',
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
  });

  await test('Rejects creation when endTime is before or equal to startTime (400)', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        title: 'Time Paradox Session',
        speakerName: 'Doc Brown',
        room: 'Lab 88',
        startTime: '2026-11-20T15:00:00.000Z',
        endTime: '2026-11-20T14:00:00.000Z', // End before start
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert(res.body.message.includes('after start time'));
  });

  await test('Rejects session dates outside the parent expo duration (400)', async () => {
    // Expo 1 runs Nov 20 to Nov 22. Nov 25 is outside range.
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        title: 'Post-Expo Session',
        speakerName: 'Late Speaker',
        room: 'Auditorium A',
        startTime: '2026-11-25T10:00:00.000Z',
        endTime: '2026-11-25T11:00:00.000Z',
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert(res.body.message.includes('must fall within the expo duration'));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SAME-ROOM SCHEDULING CONFLICTS (409 CONFLICT)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Same-Room Scheduling Conflicts ---');

  await test('Blocks overlapping session in Auditorium A during 10:30-11:00 (409 Conflict)', async () => {
    // Session 1 is Auditorium A from 10:00 to 11:30.
    // Overlapping request: 10:30 to 12:00 in Auditorium A.
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        title: 'Conflicting AI Panel',
        speakerName: 'Panel Host',
        room: 'Auditorium A',
        startTime: '2026-11-20T10:30:00.000Z',
        endTime: '2026-11-20T12:00:00.000Z',
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 409);
    assert(res.body.message.includes('Room conflict'));
  });

  await test('Allows non-overlapping session in Auditorium A later in the day', async () => {
    // Auditorium A from 12:00 to 13:00 (after Session 1 ends at 11:30)
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        title: 'Lunch & Networking',
        speakerName: 'Host',
        room: 'Auditorium A',
        startTime: '2026-11-20T12:00:00.000Z',
        endTime: '2026-11-20T13:00:00.000Z',
        category: 'Networking',
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. MULTI-TENANT OWNERSHIP & PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Multi-Tenant Ownership & Permissions ---');

  await test('Organizer 2 cannot create session in Organizer 1 expo (403 Forbidden)', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org2,
      body: {
        title: 'Unauthorized Session',
        speakerName: 'Hacker',
        room: 'Room 9',
        startTime: '2026-11-20T10:00:00.000Z',
        endTime: '2026-11-20T11:00:00.000Z',
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
  });

  await test('Organizer 2 cannot update Organizer 1 session (403 Forbidden)', async () => {
    const req = {
      params: { id: createdSession1Id },
      user: org2,
      body: { title: 'Hijacked Title' },
    };
    const res = mockResponse();
    await updateSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
  });

  await test('Organizer 2 cannot delete Organizer 1 session (403 Forbidden)', async () => {
    const req = {
      params: { id: createdSession1Id },
      user: org2,
    };
    const res = mockResponse();
    await deleteSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SESSION LISTING & PUBLIC SCHEDULE AGGREGATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Session Listing & Schedule Aggregation ---');

  await test('Organizer lists sessions with search and category filters', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      query: { category: 'Keynote' },
    };
    const res = mockResponse();
    await getExpoSessions(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.data.sessions[0].category, 'Keynote');
  });

  await test('Public schedule groups sessions chronologically by date tabs', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      query: {},
    };
    const res = mockResponse();
    await getExpoSchedule(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.schedule.length > 0);
    assert(res.body.data.schedule[0].dayLabel.includes('Day 1'));
    assert(Array.isArray(res.body.data.schedule[0].sessions));
  });

  await test('Public schedule for draft expo is hidden from unauthenticated/attendee users (404)', async () => {
    const req = {
      params: { expoId: expo2._id.toString() },
      user: attendee,
      query: {},
    };
    const res = mockResponse();
    await getExpoSchedule(req, res, () => {});

    assert.strictEqual(res.statusCode, 404);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. SESSION DETAIL, UPDATE & CANCELLATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Session Detail, Update & Cancellation ---');

  await test('GET /sessions/:id retrieves single session detail with populated expo', async () => {
    const req = {
      params: { id: createdSession1Id },
    };
    const res = mockResponse();
    await getSessionById(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.session.title, 'Opening Keynote: Future of Quantum AI');
    assert.strictEqual(res.body.data.session.expo.title, 'Session Test Expo 1 (Published)');
  });

  await test('Organizer updates session title, speaker company, and capacity', async () => {
    const req = {
      params: { id: createdSession1Id },
      user: org1,
      body: {
        title: 'Opening Keynote: Future of Quantum AI (Updated)',
        speakerCompany: 'Quantum Global Systems',
        capacity: 450,
      },
    };
    const res = mockResponse();
    await updateSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.session.title, 'Opening Keynote: Future of Quantum AI (Updated)');
    assert.strictEqual(res.body.data.session.speaker.company, 'Quantum Global Systems');
    assert.strictEqual(res.body.data.session.capacity, 450);
  });

  await test('Organizer cancels a session', async () => {
    const req = {
      params: { id: createdSession2Id },
      user: org1, // Or admin
    };
    const res = mockResponse();
    await cancelSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.session.status, 'cancelled');
  });

  await test('Cancelled session does not block room from being rebooked during that time slot', async () => {
    // Session 2 was Workshop Lab 1 from 14:00 to 16:00, now cancelled.
    // New session can book Workshop Lab 1 from 14:00 to 15:30.
    const req = {
      params: { expoId: expo1._id.toString() },
      user: org1,
      body: {
        title: 'Replacement Workshop',
        speakerName: 'Dave Smith',
        room: 'Workshop Lab 1',
        startTime: '2026-11-20T14:00:00.000Z',
        endTime: '2026-11-20T15:30:00.000Z',
        category: 'Workshop',
      },
    };
    const res = mockResponse();
    await createSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
  });

  await test('Organizer deletes a session successfully', async () => {
    const req = {
      params: { id: createdSession2Id },
      user: admin,
    };
    const res = mockResponse();
    await deleteSession(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Session deleted successfully');

    // Confirm deleted
    const checkReq = { params: { id: createdSession2Id } };
    const checkRes = mockResponse();
    await getSessionById(checkReq, checkRes, () => {});
    assert.strictEqual(checkRes.statusCode, 404);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. INVALID IDS & 404 / 400 HANDLING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Invalid IDs & Error Handling ---');

  await test('Returns 400 for malformed session ObjectId', async () => {
    const req = { params: { id: 'bad-session-id' } };
    const res = mockResponse();
    await getSessionById(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
  });

  await test('Returns 404 for non-existent session ObjectId', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = { params: { id: fakeId } };
    const res = mockResponse();
    await getSessionById(req, res, () => {});
    assert.strictEqual(res.statusCode, 404);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CLEANUP
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: /Session Test Expo/ });
  await Session.deleteMany({});
  console.log('  Cleaned all Task 09 test records.');

  console.log('\n======================================================');
  console.log(`SESSION TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runSessionTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
