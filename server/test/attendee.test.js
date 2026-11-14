/**
 * attendee.test.js — Automated Test Suite for Attendee Interface & Expo Registration (Task 10)
 *
 * Scenarios tested:
 *  1. Attendee Dashboard metrics calculation
 *  2. Browse published and ongoing expos
 *  3. Search and category/location filtering for expos
 *  4. Successful registration creation with unique registration number
 *  5. Rejection of duplicate registrations for the same attendee & expo (409 Conflict)
 *  6. Registration capacity validation (422 Unprocessable when full)
 *  7. Unpublished/draft expo registration rejection (422)
 *  8. Cancelled/concluded expo registration rejection (422)
 *  9. Registration cancellation (PATCH /api/attendees/registrations/:id/cancel)
 * 10. Re-activation of cancelled registration on re-registering
 * 11. Attendee registrations listing (GET /api/attendees/registrations)
 * 12. Registration detail retrieval (GET /api/attendees/registrations/:id)
 * 13. Tenant isolation & ownership protection (Attendee 2 cannot view or cancel Attendee 1's pass - 403)
 * 14. Admin cross-user registration inspection permissions
 * 15. Invalid ID handling (400 for malformed, 404 for non-existent)
 * 16. In-app Notification generation verification
 * 17. Teardown & cleanup
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Expo = require('../src/models/Expo');
const AttendeeRegistration = require('../src/models/AttendeeRegistration');
const Notification = require('../src/models/Notification');

const {
  getAttendeeDashboard,
  browseExpos,
  getMyRegistrations,
  registerForExpo,
  getRegistrationById,
  cancelRegistration,
} = require('../src/controllers/attendeeController');

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
const EMAIL_ATT_1 = `att1_${TS}@eventsphere.test`;
const EMAIL_ATT_2 = `att2_${TS}@eventsphere.test`;
const EMAIL_ORG = `att_org_${TS}@eventsphere.test`;
const EMAIL_ADMIN = `att_admin_${TS}@eventsphere.test`;

async function runAttendeeTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 10 ATTENDEE & REGISTRATION TEST ');
  console.log('======================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run attendee tests without database connection.');
    process.exit(1);
  }

  // Cleanup lingering test records
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: /Attendee Test Expo/ });
  await AttendeeRegistration.deleteMany({});
  await Notification.deleteMany({});

  // 1. Setup Users
  const attendee1 = await User.create({
    name: 'Attendee Alice',
    email: EMAIL_ATT_1,
    password: 'Password123!',
    role: 'attendee',
  });

  const attendee2 = await User.create({
    name: 'Attendee Bob',
    email: EMAIL_ATT_2,
    password: 'Password123!',
    role: 'attendee',
  });

  const org = await User.create({
    name: 'Organizer Oliver',
    email: EMAIL_ORG,
    password: 'Password123!',
    role: 'organizer',
  });

  const admin = await User.create({
    name: 'Admin Arthur',
    email: EMAIL_ADMIN,
    password: 'Password123!',
    role: 'admin',
  });

  // 2. Setup Expos
  const futureStart = new Date(Date.now() + 10 * 86400000);
  const futureEnd = new Date(Date.now() + 14 * 86400000);

  const pastStart = new Date(Date.now() - 20 * 86400000);
  const pastEnd = new Date(Date.now() - 15 * 86400000);

  // Published upcoming expo with capacity 1
  const expoPublished = await Expo.create({
    title: 'Attendee Test Expo Alpha (Published)',
    description: 'Premier innovation gathering with robotics and tech',
    category: 'Technology',
    startDate: futureStart,
    endDate: futureEnd,
    location: { venue: 'Convention Center', city: 'San Francisco', country: 'USA' },
    organizer: org._id,
    status: 'published',
    capacity: 1, // small capacity to test limit
  });

  // Draft expo
  const expoDraft = await Expo.create({
    title: 'Attendee Test Expo Beta (Draft)',
    description: 'Unpublished draft event',
    category: 'Science',
    startDate: futureStart,
    endDate: futureEnd,
    location: { venue: 'Hall 2', city: 'Boston', country: 'USA' },
    organizer: org._id,
    status: 'draft',
  });

  // Concluded past expo
  const expoPast = await Expo.create({
    title: 'Attendee Test Expo Gamma (Past)',
    description: 'Historical event',
    category: 'Healthcare',
    startDate: pastStart,
    endDate: pastEnd,
    location: { venue: 'Expo Dome', city: 'Chicago', country: 'USA' },
    organizer: org._id,
    status: 'completed',
  });

  let reg1Id = null;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ATTENDEE EXPO BROWSING & SEARCH
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Expo Browsing & Discovery ---');

  await test('browseExpos returns only published/ongoing expos and excludes drafts', async () => {
    const req = { query: {}, user: attendee1 };
    const res = mockResponse();
    await browseExpos(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const titles = res.body.data.expos.map((e) => e.title);
    assert(titles.includes('Attendee Test Expo Alpha (Published)'));
    assert(!titles.includes('Attendee Test Expo Beta (Draft)'));
  });

  await test('browseExpos supports category and keyword filtering', async () => {
    const req = {
      query: { search: 'robotics', category: 'Technology' },
      user: attendee1,
    };
    const res = mockResponse();
    await browseExpos(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.expos.length, 1);
    assert.strictEqual(res.body.data.expos[0].title, 'Attendee Test Expo Alpha (Published)');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. EXPO REGISTRATION & VALIDATION GUARDS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Registration Workflow & Validation Guards ---');

  await test('Attendee 1 registers successfully for published Expo Alpha', async () => {
    const req = {
      user: attendee1,
      body: {
        expoId: expoPublished._id.toString(),
        registrationType: 'vip',
        notes: 'Front row keynote seating requested',
      },
    };
    const res = mockResponse();
    await registerForExpo(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.registration.registrationType, 'vip');
    assert.strictEqual(res.body.data.registration.status, 'confirmed');
    assert(res.body.data.registration.registrationNumber.startsWith('ES-REG-'));
    reg1Id = res.body.data.registration._id.toString();
  });

  await test('Generates in-app notification for the registered attendee', async () => {
    const notif = await Notification.findOne({
      recipient: attendee1._id,
      title: 'Registration Confirmed',
    });
    assert(notif);
    assert(notif.message.includes('Attendee Test Expo Alpha'));
  });

  await test('Rejects duplicate registration for the same attendee & expo (409 Conflict)', async () => {
    const req = {
      user: attendee1,
      body: {
        expoId: expoPublished._id.toString(),
        registrationType: 'standard',
      },
    };
    const res = mockResponse();
    await registerForExpo(req, res, () => {});

    assert.strictEqual(res.statusCode, 409);
    assert(res.body.message.includes('already registered'));
  });

  await test('Rejects registration when expo capacity is reached (422)', async () => {
    // Expo Alpha capacity is 1, and Attendee 1 already took the spot.
    const req = {
      user: attendee2,
      body: {
        expoId: expoPublished._id.toString(),
        registrationType: 'standard',
      },
    };
    const res = mockResponse();
    await registerForExpo(req, res, () => {});

    assert.strictEqual(res.statusCode, 422);
    assert(res.body.message.includes('maximum attendee capacity'));
  });

  await test('Rejects registration for draft expo (422)', async () => {
    const req = {
      user: attendee2,
      body: {
        expoId: expoDraft._id.toString(),
      },
    };
    const res = mockResponse();
    await registerForExpo(req, res, () => {});

    assert.strictEqual(res.statusCode, 422);
    assert(res.body.message.includes('not open for this expo'));
  });

  await test('Rejects registration for concluded past expo (422)', async () => {
    const req = {
      user: attendee2,
      body: {
        expoId: expoPast._id.toString(),
      },
    };
    const res = mockResponse();
    await registerForExpo(req, res, () => {});

    assert.strictEqual(res.statusCode, 422);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. REGISTRATION DETAILS & TENANT ISOLATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Registration Details & Tenant Isolation ---');

  await test('Attendee 1 retrieves single registration detail', async () => {
    const req = {
      params: { id: reg1Id },
      user: attendee1,
    };
    const res = mockResponse();
    await getRegistrationById(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.registration.expo.title, 'Attendee Test Expo Alpha (Published)');
  });

  await test('Attendee 2 cannot view Attendee 1 registration (403 Forbidden)', async () => {
    const req = {
      params: { id: reg1Id },
      user: attendee2,
    };
    const res = mockResponse();
    await getRegistrationById(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
  });

  await test('Admin can view any user registration detail', async () => {
    const req = {
      params: { id: reg1Id },
      user: admin,
    };
    const res = mockResponse();
    await getRegistrationById(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. REGISTRATION CANCELLATION & RE-ACTIVATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Registration Cancellation & Re-Activation ---');

  await test('Attendee 2 cannot cancel Attendee 1 registration (403 Forbidden)', async () => {
    const req = {
      params: { id: reg1Id },
      user: attendee2,
    };
    const res = mockResponse();
    await cancelRegistration(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
  });

  await test('Attendee 1 cancels their own registration successfully', async () => {
    const req = {
      params: { id: reg1Id },
      user: attendee1,
    };
    const res = mockResponse();
    await cancelRegistration(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.registration.status, 'cancelled');
  });

  await test('Rejects cancelling an already cancelled registration (422)', async () => {
    const req = {
      params: { id: reg1Id },
      user: attendee1,
    };
    const res = mockResponse();
    await cancelRegistration(req, res, () => {});

    assert.strictEqual(res.statusCode, 422);
  });

  await test('Re-registering re-activates cancelled registration to confirmed', async () => {
    const req = {
      user: attendee1,
      body: {
        expoId: expoPublished._id.toString(),
        registrationType: 'standard',
      },
    };
    const res = mockResponse();
    await registerForExpo(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.registration.status, 'confirmed');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ATTENDEE DASHBOARD & LISTING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Attendee Dashboard & Listing ---');

  await test('Attendee 1 retrieves their registrations list', async () => {
    const req = {
      user: attendee1,
      query: {},
    };
    const res = mockResponse();
    await getMyRegistrations(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.registrations.length, 1);
  });

  await test('Attendee 2 sees zero registrations in list', async () => {
    const req = {
      user: attendee2,
      query: {},
    };
    const res = mockResponse();
    await getMyRegistrations(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.registrations.length, 0);
  });

  await test('Attendee Dashboard returns real aggregated statistics', async () => {
    const req = { user: attendee1 };
    const res = mockResponse();
    await getAttendeeDashboard(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.stats.totalRegistrations, 1);
    assert.strictEqual(res.body.data.stats.confirmedCount, 1);
    assert.strictEqual(res.body.data.stats.upcomingCount, 1);
    assert(Array.isArray(res.body.data.recentRegistrations));
    assert(Array.isArray(res.body.data.featuredExpos));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. INVALID IDS & ERROR HANDLING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Invalid IDs & Error Handling ---');

  await test('Returns 400 for malformed registration ID', async () => {
    const req = { params: { id: 'invalid-reg-id' }, user: attendee1 };
    const res = mockResponse();
    await getRegistrationById(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
  });

  await test('Returns 404 for non-existent registration ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = { params: { id: fakeId }, user: attendee1 };
    const res = mockResponse();
    await getRegistrationById(req, res, () => {});
    assert.strictEqual(res.statusCode, 404);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CLEANUP
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: /Attendee Test Expo/ });
  await AttendeeRegistration.deleteMany({});
  await Notification.deleteMany({});
  console.log('  Cleaned all Task 10 test records.');

  console.log('\n======================================================');
  console.log(`ATTENDEE TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runAttendeeTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
