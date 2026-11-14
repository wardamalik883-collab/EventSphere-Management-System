/**
 * dashboard.test.js — Automated Test Suite for Admin and Organizer Dashboards
 *
 * Tests:
 *  1. Admin Dashboard Statistics & Real Data Integrity
 *  2. Organizer Dashboard Statistics & Tenant Scoping
 *  3. RBAC Enforcement on /api/dashboard/admin (Attendee, Exhibitor, Organizer blocked with 403)
 *  4. RBAC Enforcement on /api/dashboard/organizer (Admin, Attendee, Exhibitor blocked with 403)
 *  5. Unauthenticated Access Rejection (401)
 *  6. Security & Password Exclusion Checks
 *  7. Teardown / Cleanup
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Expo = require('../src/models/Expo');
const ExhibitorApplication = require('../src/models/ExhibitorApplication');
const ExhibitorProfile = require('../src/models/ExhibitorProfile');
const { generateToken } = require('../src/utils/generateToken');
const {
  getAdminDashboard,
  getOrganizerDashboard,
} = require('../src/controllers/dashboardController');
const { protect, authorize } = require('../src/middleware/authMiddleware');

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
const ADMIN_EMAIL = `dash_admin_${TS}@eventsphere.test`;
const ORG_1_EMAIL = `dash_org1_${TS}@eventsphere.test`;
const ORG_2_EMAIL = `dash_org2_${TS}@eventsphere.test`;
const ATTENDEE_EMAIL = `dash_att_${TS}@eventsphere.test`;
const EXHIBITOR_EMAIL = `dash_exh_${TS}@eventsphere.test`;

async function runDashboardTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 05 DASHBOARD TEST SUITE        ');
  console.log('======================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run dashboard tests without database connection.');
    console.error('Ensure MongoDB is reachable and your IP address is whitelisted in MongoDB Atlas.');
    process.exit(1);
  }

  // Clean test accounts
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: /Dashboard Test Expo/ });
  await ExhibitorApplication.deleteMany({});
  await ExhibitorProfile.deleteMany({ companyName: /Test Company/ });

  // 1. Create test users across all 4 roles
  const adminUser = await User.create({
    name: 'Admin Dashboard Tester',
    email: ADMIN_EMAIL,
    password: 'Password123!',
    role: 'admin',
    isActive: true,
  });

  const organizer1 = await User.create({
    name: 'Organizer Alpha',
    email: ORG_1_EMAIL,
    password: 'Password123!',
    role: 'organizer',
    isActive: true,
  });

  const organizer2 = await User.create({
    name: 'Organizer Beta',
    email: ORG_2_EMAIL,
    password: 'Password123!',
    role: 'organizer',
    isActive: true,
  });

  const attendee = await User.create({
    name: 'Attendee Viewer',
    email: ATTENDEE_EMAIL,
    password: 'Password123!',
    role: 'attendee',
    isActive: true,
  });

  const exhibitor = await User.create({
    name: 'Exhibitor Vendor',
    email: EXHIBITOR_EMAIL,
    password: 'Password123!',
    role: 'exhibitor',
    isActive: true,
  });

  // Create an exhibitor profile for applications
  const exhProfile = await ExhibitorProfile.create({
    user: exhibitor._id,
    companyName: `Test Company ${TS}`,
    companyDescription: 'Leading innovations in software',
    companyWebsite: 'https://testcompany.example.com',
    industry: 'Technology',
    contactPerson: {
      name: 'Exhibitor Vendor',
      email: EXHIBITOR_EMAIL,
      phone: '+1-555-9999',
    },
  });

  // Create expos for Organizer 1
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const futureEndDate = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
  const pastStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const pastEndDate = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);

  const expo1 = await Expo.create({
    title: `Dashboard Test Expo 1 ${TS}`,
    description: 'Upcoming technology conference',
    category: 'Technology',
    startDate: futureDate,
    endDate: futureEndDate,
    location: { venue: 'Convention Hall A', city: 'Metropolis', country: 'USA' },
    organizer: organizer1._id,
    status: 'published',
  });

  const expo2 = await Expo.create({
    title: `Dashboard Test Expo 2 ${TS}`,
    description: 'Past technology conference',
    category: 'Technology',
    startDate: pastStartDate,
    endDate: pastEndDate,
    location: { venue: 'Convention Hall B', city: 'Metropolis', country: 'USA' },
    organizer: organizer1._id,
    status: 'completed',
  });

  // Create an application for Expo 1
  await ExhibitorApplication.create({
    expo: expo1._id,
    exhibitor: exhibitor._id,
    exhibitorProfile: exhProfile._id,
    boothPreference: { size: 'medium' },
    status: 'pending',
  });

  console.log('--- 1. Admin Dashboard Statistics Tests ---');

  await test('Admin dashboard returns complete real system statistics', async () => {
    const req = { user: adminUser };
    const res = mockResponse();

    await getAdminDashboard(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.stats, 'Expected stats object');
    assert.ok(res.body.data.stats.totalUsers >= 5, 'Expected at least 5 users in stats');
    assert.ok(res.body.data.stats.totalAttendees >= 1, 'Expected at least 1 attendee');
    assert.ok(res.body.data.stats.totalOrganizers >= 2, 'Expected at least 2 organizers');
    assert.ok(res.body.data.stats.totalExhibitors >= 1, 'Expected at least 1 exhibitor');
    assert.ok(res.body.data.stats.totalAdmins >= 1, 'Expected at least 1 admin');
    assert.ok(Array.isArray(res.body.data.roleDistribution), 'Expected roleDistribution array');
    assert.ok(res.body.data.statusDistribution, 'Expected statusDistribution');
    assert.ok(Array.isArray(res.body.data.recentUsers), 'Expected recentUsers array');
    assert.ok(Array.isArray(res.body.data.recentActivities), 'Expected recentActivities array');
  });

  await test('Admin dashboard excludes passwords and hashes from recent users', async () => {
    const req = { user: adminUser };
    const res = mockResponse();

    await getAdminDashboard(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    res.body.data.recentUsers.forEach((u) => {
      assert.strictEqual(u.password, undefined, 'User password hash leaked in recentUsers!');
    });
  });

  console.log('\n--- 2. Organizer Dashboard Statistics & Scoping Tests ---');

  await test('Organizer 1 dashboard returns organizer-specific stats with expos and applications', async () => {
    const req = { user: organizer1 };
    const res = mockResponse();

    await getOrganizerDashboard(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.organizer._id.toString(), organizer1._id.toString());
    assert.strictEqual(res.body.data.stats.totalExpos, 2);
    assert.strictEqual(res.body.data.stats.upcomingExpos, 1);
    assert.strictEqual(res.body.data.stats.completedExpos, 1);
    assert.strictEqual(res.body.data.stats.totalApplications, 1);
    assert.strictEqual(res.body.data.stats.pendingApplications, 1);
    assert.strictEqual(res.body.data.recentExpos.length, 2);
    assert.strictEqual(res.body.data.recentApplications.length, 1);
  });

  await test('Organizer 2 dashboard returns zero counts and empty arrays when no expos owned', async () => {
    const req = { user: organizer2 };
    const res = mockResponse();

    await getOrganizerDashboard(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.stats.totalExpos, 0);
    assert.strictEqual(res.body.data.stats.upcomingExpos, 0);
    assert.strictEqual(res.body.data.stats.ongoingExpos, 0);
    assert.strictEqual(res.body.data.stats.completedExpos, 0);
    assert.strictEqual(res.body.data.stats.totalApplications, 0);
    assert.deepStrictEqual(res.body.data.recentExpos, []);
    assert.deepStrictEqual(res.body.data.recentApplications, []);
  });

  console.log('\n--- 3. Role-Based Access Control (RBAC) Tests ---');

  await test('Attendee is denied access to Admin Dashboard (403 Forbidden)', async () => {
    const req = { user: attendee };
    const res = mockResponse();
    let nextCalled = false;

    authorize('admin')(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('Exhibitor is denied access to Admin Dashboard (403 Forbidden)', async () => {
    const req = { user: exhibitor };
    const res = mockResponse();
    let nextCalled = false;

    authorize('admin')(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Organizer is denied access to Admin Dashboard (403 Forbidden)', async () => {
    const req = { user: organizer1 };
    const res = mockResponse();
    let nextCalled = false;

    authorize('admin')(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Admin is denied access to Organizer-only Dashboard (403 Forbidden)', async () => {
    const req = { user: adminUser };
    const res = mockResponse();
    let nextCalled = false;

    authorize('organizer')(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Attendee is denied access to Organizer Dashboard (403 Forbidden)', async () => {
    const req = { user: attendee };
    const res = mockResponse();
    let nextCalled = false;

    authorize('organizer')(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Exhibitor is denied access to Organizer Dashboard (403 Forbidden)', async () => {
    const req = { user: exhibitor };
    const res = mockResponse();
    let nextCalled = false;

    authorize('organizer')(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Unauthenticated request to protect middleware is rejected (401 Unauthorized)', async () => {
    const req = { headers: {} };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
  });

  console.log('\n--- 4. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: /Dashboard Test Expo/ });
  await ExhibitorApplication.deleteMany({});
  await ExhibitorProfile.deleteMany({ companyName: /Test Company/ });
  console.log('  Cleaned all test accounts, test expos, and test applications.');

  console.log('\n======================================================');
  console.log(`DASHBOARD TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runDashboardTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
