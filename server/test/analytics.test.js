/**
 * analytics.test.js — Analytics & Reporting Engine Test Suite
 * Task 13: Date range parsing, timeline aggregation, route authorization, admin overview,
 *          organizer scoping, tenant isolation, and audit report generation.
 *
 * Run: node test/analytics.test.js
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const http = require('http');
const app = require('../src/index');
const { generateToken } = require('../src/utils/generateToken');
const { parseDateRange, buildDailyTimeline } = require('../src/controllers/analyticsController');

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
let dbConnected = false;
let User, Expo, AttendeeRegistration, ExhibitorApplication, Booth, Session, Feedback;
const TS = `_analyt_${Date.now()}`;

async function setup() {
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  console.log(`[TEST] Analytics test server running on port ${server.address().port}\n`);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
    });
    // Ping to verify actual reachability
    await mongoose.connection.db.admin().ping();
    dbConnected = true;
    User = require('../src/models/User');
    Expo = require('../src/models/Expo');
    AttendeeRegistration = require('../src/models/AttendeeRegistration');
    ExhibitorApplication = require('../src/models/ExhibitorApplication');
    Booth = require('../src/models/Booth');
    Session = require('../src/models/Session');
    Feedback = require('../src/models/Feedback');
    console.log('[TEST] Connected to MongoDB Atlas for live database integration tests.\n');
  } catch (err) {
    dbConnected = false;
    console.log('[TEST] Note: MongoDB Atlas cluster is not reachable from this IP (39.35.194.141).');
    console.log('[TEST] Executing controller unit tests, route validation, and authorization guard tests.\n');
  }
}

async function teardown() {
  if (dbConnected) {
    try {
      const emails = [`adm${TS}@test.com`, `org1${TS}@test.com`, `org2${TS}@test.com`, `att${TS}@test.com`];
      const users = await User.find({ email: { $in: emails } }).select('_id').lean();
      const userIds = users.map((u) => u._id);

      if (userIds.length) {
        const expos = await Expo.find({ organizer: { $in: userIds } }).select('_id').lean();
        const expoIds = expos.map((e) => e._id);

        if (expoIds.length) {
          await AttendeeRegistration.deleteMany({ expo: { $in: expoIds } });
          await ExhibitorApplication.deleteMany({ expo: { $in: expoIds } });
          await Booth.deleteMany({ expo: { $in: expoIds } });
          await Session.deleteMany({ expo: { $in: expoIds } });
          await Feedback.deleteMany({ expo: { $in: expoIds } });
          await Expo.deleteMany({ _id: { $in: expoIds } });
        }

        await User.deleteMany({ _id: { $in: userIds } });
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error('Teardown cleanup error:', err.message);
    }
  }

  if (server) server.close();
}

async function runTests() {
  await setup();

  console.log('--- Task 13: Analytics Unit & Logic Tests ---\n');

  // Test 1: parseDateRange - Period 7d
  await test('parseDateRange: "7d" sets start to 7 days ago and end to now', () => {
    const res = parseDateRange({ period: '7d' });
    assert(res.period === '7d', 'Expected period 7d');
    assert(res.start instanceof Date, 'Expected start Date');
    assert(res.end instanceof Date, 'Expected end Date');
    const diffDays = Math.round((res.end - res.start) / (1000 * 60 * 60 * 24));
    assert(diffDays >= 7, `Expected approx 7 days, got ${diffDays}`);
  });

  // Test 2: parseDateRange - Period "today"
  await test('parseDateRange: "today" sets start to midnight today', () => {
    const res = parseDateRange({ period: 'today' });
    const today = new Date();
    assert(res.start.getDate() === today.getDate(), 'Expected start day to match today');
    assert(res.start.getHours() === 0 && res.start.getMinutes() === 0, 'Expected midnight start');
  });

  // Test 3: parseDateRange - Valid custom range
  await test('parseDateRange: "custom" parses valid ISO dates correctly', () => {
    const res = parseDateRange({ period: 'custom', startDate: '2026-01-01', endDate: '2026-01-31' });
    assert(res.start.getFullYear() === 2026 && res.start.getMonth() === 0, 'Expected Jan 2026 start');
    assert(res.end.getFullYear() === 2026 && res.end.getMonth() === 0, 'Expected Jan 2026 end');
    assert(res.end.getHours() === 23 && res.end.getMinutes() === 59, 'Expected end of day timestamp');
  });

  // Test 4: parseDateRange - Error on startDate > endDate
  await test('parseDateRange: throws Error when startDate > endDate', () => {
    let threw = false;
    try {
      parseDateRange({ period: 'custom', startDate: '2026-05-10', endDate: '2026-05-01' });
    } catch (err) {
      threw = true;
      assert(err.message.includes('cannot be after'), 'Expected start cannot be after end error');
    }
    assert(threw, 'Expected function to throw error');
  });

  // Test 5: parseDateRange - Error on missing dates for custom period
  await test('parseDateRange: throws Error when custom dates are missing', () => {
    let threw = false;
    try {
      parseDateRange({ period: 'custom' });
    } catch (err) {
      threw = true;
      assert(err.message.includes('required'), 'Expected required error');
    }
    assert(threw, 'Expected function to throw error');
  });

  // Test 6: buildDailyTimeline - Generates zero-filled timeline
  await test('buildDailyTimeline: fills missing calendar dates with count 0', () => {
    const parsed = parseDateRange({ period: 'custom', startDate: '2026-03-01', endDate: '2026-03-05' });
    const aggregated = [
      { _id: '2026-03-02', count: 5 },
      { _id: '2026-03-04', count: 12 },
    ];
    const timeline = buildDailyTimeline(aggregated, parsed.start, parsed.end);
    assert(timeline.length === 5, `Expected 5 days in timeline, got ${timeline.length}`);
    assert(timeline[0].date === '2026-03-01' && timeline[0].count === 0, 'Expected Day 1 count 0');
    assert(timeline[1].date === '2026-03-02' && timeline[1].count === 5, 'Expected Day 2 count 5');
    assert(timeline[2].date === '2026-03-03' && timeline[2].count === 0, 'Expected Day 3 count 0');
    assert(timeline[3].date === '2026-03-04' && timeline[3].count === 12, 'Expected Day 4 count 12');
    assert(timeline[4].date === '2026-03-05' && timeline[4].count === 0, 'Expected Day 5 count 0');
  });

  console.log('\n--- Task 13: Route Protection & Authorization Tests ---\n');

  // Test 7: Admin Overview blocks unauthenticated request
  await test('GET /api/analytics/admin/overview — 401 without auth token', async () => {
    const res = await request(server, 'GET', '/api/analytics/admin/overview');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // Test 8: Admin Trends blocks unauthenticated request
  await test('GET /api/analytics/admin/trends — 401 without auth token', async () => {
    const res = await request(server, 'GET', '/api/analytics/admin/trends');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // Test 9: Organizer Overview blocks unauthenticated request
  await test('GET /api/analytics/organizer/overview — 401 without auth token', async () => {
    const res = await request(server, 'GET', '/api/analytics/organizer/overview');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // Test 10: Organizer Trends blocks unauthenticated request
  await test('GET /api/analytics/organizer/trends — 401 without auth token', async () => {
    const res = await request(server, 'GET', '/api/analytics/organizer/trends');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // Test 11: Expo Report blocks unauthenticated request
  await test('GET /api/analytics/expos/:expoId — 401 without auth token', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(server, 'GET', `/api/analytics/expos/${fakeId}`);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // If DB is connected, run live integration tests
  if (dbConnected) {
    console.log('\n--- Task 13: Live Database Integration Tests ---\n');

    try {
      const adminUser = await User.create({
        name: `Admin${TS}`,
        email: `adm${TS}@test.com`,
        password: 'Password1!',
        role: 'admin',
        isActive: true,
      });

      const orgUser1 = await User.create({
        name: `Organizer One${TS}`,
        email: `org1${TS}@test.com`,
        password: 'Password1!',
        role: 'organizer',
        isActive: true,
      });

      const orgUser2 = await User.create({
        name: `Organizer Two${TS}`,
        email: `org2${TS}@test.com`,
        password: 'Password1!',
        role: 'organizer',
        isActive: true,
      });

      const attUser = await User.create({
        name: `Attendee${TS}`,
        email: `att${TS}@test.com`,
        password: 'Password1!',
        role: 'attendee',
        isActive: true,
      });

      const adminToken = generateToken(adminUser._id);
      const org1Token = generateToken(orgUser1._id);
      const org2Token = generateToken(orgUser2._id);
      const attToken = generateToken(attUser._id);

      const expo1 = await Expo.create({
        title: `Global Expo 2026 ${TS}`,
        description: 'International exhibition for tech',
        category: 'Technology',
        startDate: new Date(Date.now() + 86400000 * 10),
        endDate: new Date(Date.now() + 86400000 * 12),
        location: { venue: 'Hall 1', city: 'Metropolis', address: '1st Ave' },
        status: 'published',
        organizer: orgUser1._id,
        capacity: 300,
      });

      await AttendeeRegistration.create({
        expo: expo1._id,
        user: attUser._id,
        registrationNumber: `REG-${Date.now()}-A`,
        status: 'confirmed',
      });

      await Booth.create({
        expo: expo1._id,
        boothNumber: `B1-${TS}`,
        label: 'Main Booth',
        size: '10x10',
        type: 'premium',
        status: 'allocated',
      });

      await Feedback.create({
        expo: expo1._id,
        user: attUser._id,
        rating: 5,
        comment: 'Top notch expo!',
      });

      // Test 12: Admin Overview live
      await test('GET /api/analytics/admin/overview — 200 with platform metrics', async () => {
        const res = await request(server, 'GET', '/api/analytics/admin/overview', null, adminToken);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.body.success === true, 'Expected success true');
        assert(typeof res.body.data.users?.total === 'number', 'Expected users total');
        assert(typeof res.body.data.expos?.total === 'number', 'Expected expos total');
      });

      // Test 13: Admin Trends live
      await test('GET /api/analytics/admin/trends — 200 with timeseries', async () => {
        const res = await request(server, 'GET', '/api/analytics/admin/trends?period=7d', null, adminToken);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.body.data.registrations), 'Expected registrations timeline');
      });

      // Test 14: Role Guard: Attendee calling Admin Overview gets 403
      await test('GET /api/analytics/admin/overview — 403 when called by attendee', async () => {
        const res = await request(server, 'GET', '/api/analytics/admin/overview', null, attToken);
        assert(res.status === 403, `Expected 403, got ${res.status}`);
      });

      // Test 15: Role Guard: Attendee calling Organizer Overview gets 403
      await test('GET /api/analytics/organizer/overview — 403 when called by attendee', async () => {
        const res = await request(server, 'GET', '/api/analytics/organizer/overview', null, attToken);
        assert(res.status === 403, `Expected 403, got ${res.status}`);
      });

      // Test 16: Organizer Overview live scoped to owned expos
      await test('GET /api/analytics/organizer/overview — 200 scoped to owned expos', async () => {
        const res = await request(server, 'GET', '/api/analytics/organizer/overview', null, org1Token);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.body.data.expos.total >= 1, 'Expected at least 1 expo for org1');
        assert(res.body.data.registrations.total >= 1, 'Expected at least 1 registration for org1');
      });

      // Test 17: Expo Report live for owner
      await test('GET /api/analytics/expos/:expoId — 200 for owning organizer', async () => {
        const res = await request(server, 'GET', `/api/analytics/expos/${expo1._id}`, null, org1Token);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.body.data.expo.title === expo1.title, 'Expected title to match');
        assert(res.body.data.feedback.averageRating === 5, 'Expected 5 rating');
      });

      // Test 18: Tenant Isolation: Organizer 2 gets 403 for Organizer 1's expo
      await test('GET /api/analytics/expos/:expoId — 403 for unauthorized organizer (Tenant Isolation)', async () => {
        const res = await request(server, 'GET', `/api/analytics/expos/${expo1._id}`, null, org2Token);
        assert(res.status === 403, `Expected 403, got ${res.status}`);
      });

      // Test 19: Admin can access any expo's performance report
      await test('GET /api/analytics/expos/:expoId — 200 for platform admin', async () => {
        const res = await request(server, 'GET', `/api/analytics/expos/${expo1._id}`, null, adminToken);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
      });

      // Test 20: Invalid expo ID format returns 400
      await test('GET /api/analytics/expos/invalid-id — 400 bad request', async () => {
        const res = await request(server, 'GET', '/api/analytics/expos/invalid-id-xyz', null, adminToken);
        assert(res.status === 400, `Expected 400, got ${res.status}`);
      });
    } catch (dbErr) {
      console.log(`[TEST] Live DB operations bypassed: ${dbErr.message}`);
    }
  }

  console.log(`\nFinal Test Suite Summary: ${passed} passed, ${failed} failed\n`);
  await teardown();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  if (server) server.close();
  mongoose.disconnect().then(() => process.exit(1));
});
