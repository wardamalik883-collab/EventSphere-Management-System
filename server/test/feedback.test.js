/**
 * feedback.test.js — Expo Feedback & Rating Test Suite
 * Task 12: Feedback submission, rating validation, registration verification, duplicate prevention, and editing.
 *
 * Run: node test/feedback.test.js
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const http = require('http');
const app = require('../src/index');
const { generateToken } = require('../src/utils/generateToken');

// Minimal HTTP request helper
function request(server, method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const port = addr ? addr.port : 5000;
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      { hostname: '127.0.0.1', port, method, path: urlPath, headers },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

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

let server;
let User, Expo, Feedback, AttendeeRegistration;
const TS = `_fb_${Date.now()}`;

async function setup() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 15000,
  });

  User = require('../src/models/User');
  Expo = require('../src/models/Expo');
  Feedback = require('../src/models/Feedback');
  AttendeeRegistration = require('../src/models/AttendeeRegistration');

  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  console.log(`[TEST] Feedback test server running on port ${server.address().port}\n`);
}

async function teardown() {
  const emails = [`orgfb${TS}@test.com`, `attreg${TS}@test.com`, `attnon${TS}@test.com`];
  const users = await User.find({ email: { $in: emails } }).select('_id').lean();
  const userIds = users.map((u) => u._id);

  if (userIds.length) {
    const expos = await Expo.find({ organizer: { $in: userIds } }).select('_id').lean();
    const expoIds = expos.map((e) => e._id);

    await Feedback.deleteMany({ user: { $in: userIds } });
    await AttendeeRegistration.deleteMany({ attendee: { $in: userIds } });
    if (expoIds.length) {
      await Expo.deleteMany({ _id: { $in: expoIds } });
    }
    await User.deleteMany({ _id: { $in: userIds } });
  }

  if (server) server.close();
  await mongoose.disconnect();
}

async function runTests() {
  await setup();

  const organizer = await User.create({
    name: `Organizer${TS}`,
    email: `orgfb${TS}@test.com`,
    password: 'Password1!',
    role: 'organizer',
  });

  const registeredAttendee = await User.create({
    name: `Registered Attendee${TS}`,
    email: `attreg${TS}@test.com`,
    password: 'Password1!',
    role: 'attendee',
  });

  const unregisteredAttendee = await User.create({
    name: `Unregistered Attendee${TS}`,
    email: `attnon${TS}@test.com`,
    password: 'Password1!',
    role: 'attendee',
  });

  const regToken = generateToken(registeredAttendee._id);
  const unregToken = generateToken(unregisteredAttendee._id);

  const expo = await Expo.create({
    title: `Expo With Feedback ${TS}`,
    description: 'Test expo for feedback',
    organizer: organizer._id,
    startDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'completed',
    category: 'Technology',
    location: {
      venue: 'Test Convention Center',
      city: 'Test City',
      country: 'Test Country',
    },
  });

  // Confirmed registration for registeredAttendee
  await AttendeeRegistration.create({
    expo: expo._id,
    attendee: registeredAttendee._id,
    registrationNumber: `REG-FB-${Date.now()}`,
    status: 'confirmed',
  });

  let createdFeedbackId;

  // ── 1. Registered attendee submits valid feedback ─────────────────────────
  await test('1. Registered attendee can submit valid feedback (201)', async () => {
    const res = await request(
      server,
      'POST',
      `/api/expos/${expo._id}/feedback`,
      {
        rating: 5,
        category: 'overall',
        comment: 'Outstanding expo! The keynotes and booths were very informative.',
      },
      regToken
    );

    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'success should be true');
    assert(res.body.data.feedback._id, 'Feedback ID should be returned');
    createdFeedbackId = res.body.data.feedback._id;
  });

  // ── 2. Unregistered attendee cannot submit feedback (403) ─────────────────
  await test('2. Unregistered attendee is blocked from submitting feedback (403)', async () => {
    const res = await request(
      server,
      'POST',
      `/api/expos/${expo._id}/feedback`,
      {
        rating: 4,
        comment: 'I did not attend but want to rate.',
      },
      unregToken
    );

    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.body.success === false, 'success should be false');
  });

  // ── 3. Invalid rating rejection ───────────────────────────────────────────
  await test('3. Invalid rating (< 1 or > 5 or decimal) is rejected with 400', async () => {
    const res = await request(
      server,
      'POST',
      `/api/expos/${expo._id}/feedback`,
      { rating: 6, comment: 'Over the top' },
      regToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // ── 4. Empty comment rejection ────────────────────────────────────────────
  await test('4. Empty feedback comment is rejected with 400', async () => {
    const res = await request(
      server,
      'POST',
      `/api/expos/${expo._id}/feedback`,
      { rating: 4, comment: '   ' },
      regToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // ── 5. Duplicate feedback prevention ──────────────────────────────────────
  await test('5. Duplicate feedback from the same user for same expo is rejected (400)', async () => {
    const res = await request(
      server,
      'POST',
      `/api/expos/${expo._id}/feedback`,
      {
        rating: 4,
        comment: 'Attempting duplicate feedback submission.',
      },
      regToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.message.includes('already submitted'), 'Error should mention already submitted');
  });

  // ── 6. Public expo feedback & aggregation ─────────────────────────────────
  await test('6. GET /api/expos/:id/feedback returns aggregated rating and reviews', async () => {
    const res = await request(server, 'GET', `/api/expos/${expo._id}/feedback`, null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.averageRating === 5, `Expected average 5, got ${res.body.data.averageRating}`);
    assert(res.body.data.totalReviews === 1, `Expected 1 review, got ${res.body.data.totalReviews}`);
    assert(res.body.data.ratingDistribution[5] === 1, '5-star distribution should be 1');

    // Check reviewer name is privacy-safe
    const firstReview = res.body.data.reviews[0];
    assert(!firstReview.user?.email, 'Reviewer email must NOT be exposed');
    assert(typeof firstReview.user?.displayName === 'string', 'Safe displayName should be present');
  });

  // ── 7. Attendee edits own feedback ────────────────────────────────────────
  await test('7. PATCH /api/feedback/:id updates own feedback (200)', async () => {
    const res = await request(
      server,
      'PATCH',
      `/api/feedback/${createdFeedbackId}`,
      { rating: 4, comment: 'Updated review: still good overall.' },
      regToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.feedback.rating === 4, 'Rating should be updated to 4');
  });

  // ── 8. Cross-user deletion blocked & own deletion succeeds ────────────────
  await test('8. Non-owner cannot delete feedback (403); owner can delete (200)', async () => {
    // Other user attempts deletion
    const blockRes = await request(
      server,
      'DELETE',
      `/api/feedback/${createdFeedbackId}`,
      null,
      unregToken
    );
    assert(blockRes.status === 403, `Expected 403, got ${blockRes.status}`);

    // Owner deletes
    const okRes = await request(
      server,
      'DELETE',
      `/api/feedback/${createdFeedbackId}`,
      null,
      regToken
    );
    assert(okRes.status === 200, `Expected 200, got ${okRes.status}`);

    // Verify deletion
    const check = await Feedback.findById(createdFeedbackId);
    assert(check === null, 'Feedback should be removed from database');
  });

  await teardown();
}

runTests()
  .then(() => {
    console.log(`\n[FEEDBACK TESTS] ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('\n[FEEDBACK TESTS] Fatal error:', err.message);
    process.exit(1);
  });
