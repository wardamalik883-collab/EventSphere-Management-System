/**
 * expo.test.js — Automated Test Suite for Expo Management (Task 06)
 *
 * Tests:
 *  1. Create Expo (validation, required fields, date ranges, status)
 *  2. List Expos (pagination, filters, search, role scoping)
 *  3. Get Expo by ID (visibility, 404, invalid ObjectId)
 *  4. Update Expo (ownership, status transitions, field protection)
 *  5. Delete Expo (ownership, data integrity blocking)
 *  6. RBAC (attendee/exhibitor/unauthenticated access restrictions)
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
const Booth = require('../src/models/Booth');
const Session = require('../src/models/Session');
const { generateToken } = require('../src/utils/generateToken');
const {
  createExpo,
  listExpos,
  getExpoById,
  updateExpo,
  deleteExpo,
} = require('../src/controllers/expoController');
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
const ADMIN_EMAIL    = `expo_admin_${TS}@eventsphere.test`;
const ORG1_EMAIL     = `expo_org1_${TS}@eventsphere.test`;
const ORG2_EMAIL     = `expo_org2_${TS}@eventsphere.test`;
const ATTENDEE_EMAIL = `expo_att_${TS}@eventsphere.test`;
const EXHIBITOR_EMAIL= `expo_exh_${TS}@eventsphere.test`;

// Shared test data
let adminUser, organizer1, organizer2, attendeeUser, exhibitorUser;
let testExpo1, testExpo2;

const futureStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const futureEnd   = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
const pastStart   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const pastEnd     = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);

function validExpoBody(overrides = {}) {
  return {
    title: `Test Expo ${TS}`,
    description: 'A thorough test of expo management functionality',
    category: 'Technology',
    startDate: futureStart.toISOString(),
    endDate: futureEnd.toISOString(),
    location: {
      venue: 'Grand Convention Center',
      city: 'Metropolis',
      country: 'USA',
      address: '100 Main Street',
    },
    status: 'draft',
    capacity: 500,
    ...overrides,
  };
}

async function runExpoTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 06 EXPO MANAGEMENT TEST SUITE  ');
  console.log('======================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run expo tests without database connection.');
    console.error('Ensure MongoDB is reachable and your IP address is whitelisted in MongoDB Atlas.');
    process.exit(1);
  }

  // ── Setup ────────────────────────────────────────────────────────────────
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: new RegExp(`Test Expo ${TS}`) });

  adminUser = await User.create({
    name: 'Expo Admin Tester', email: ADMIN_EMAIL,
    password: 'Password123!', role: 'admin', isActive: true,
  });
  organizer1 = await User.create({
    name: 'Expo Organizer One', email: ORG1_EMAIL,
    password: 'Password123!', role: 'organizer', isActive: true,
  });
  organizer2 = await User.create({
    name: 'Expo Organizer Two', email: ORG2_EMAIL,
    password: 'Password123!', role: 'organizer', isActive: true,
  });
  attendeeUser = await User.create({
    name: 'Expo Attendee', email: ATTENDEE_EMAIL,
    password: 'Password123!', role: 'attendee', isActive: true,
  });
  exhibitorUser = await User.create({
    name: 'Expo Exhibitor', email: EXHIBITOR_EMAIL,
    password: 'Password123!', role: 'exhibitor', isActive: true,
  });

  // ── 1. Create Expo ───────────────────────────────────────────────────────
  console.log('--- 1. Create Expo Tests ---');

  await test('Organizer can create an expo with valid fields', async () => {
    const req = { user: organizer1, body: validExpoBody() };
    const res = mockResponse();
    await createExpo(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data._id, 'Expected expo _id in response');
    assert.strictEqual(res.body.data.organizer.toString(), organizer1._id.toString());
    testExpo1 = res.body.data; // Save for later tests
  });

  await test('Organizer ID is always set from req.user, not from request body', async () => {
    const req = {
      user: organizer1,
      body: { ...validExpoBody({ title: `Test Expo IDOR ${TS}` }), organizer: organizer2._id.toString() },
    };
    const res = mockResponse();
    await createExpo(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 201);
    // Should be organizer1, not organizer2 from body
    assert.strictEqual(res.body.data.organizer.toString(), organizer1._id.toString());
    // Cleanup
    await Expo.findByIdAndDelete(res.body.data._id);
  });

  await test('Create expo fails without required title', async () => {
    const body = validExpoBody();
    delete body.title;
    const req = { user: organizer1, body };
    const res = mockResponse();
    await createExpo(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.errors, 'Expected validation errors array');
  });

  await test('Create expo fails without required description', async () => {
    const body = validExpoBody();
    delete body.description;
    const req = { user: organizer1, body };
    const res = mockResponse();
    await createExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('Create expo fails when endDate is before startDate', async () => {
    const req = {
      user: organizer1,
      body: validExpoBody({ startDate: futureEnd.toISOString(), endDate: futureStart.toISOString() }),
    };
    const res = mockResponse();
    await createExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('Create expo fails without location venue', async () => {
    const req = {
      user: organizer1,
      body: validExpoBody({ location: { city: 'NYC', country: 'USA' } }),
    };
    const res = mockResponse();
    await createExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('Attendee cannot create an expo (403 Forbidden)', async () => {
    const req = { user: attendeeUser };
    const res = mockResponse();
    authorize('organizer', 'admin')(req, res, () => {});
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('Exhibitor cannot create an expo (403 Forbidden)', async () => {
    const req = { user: exhibitorUser };
    const res = mockResponse();
    authorize('organizer', 'admin')(req, res, () => {});
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Unauthenticated request to create expo is rejected (401)', async () => {
    const req = { headers: {} };
    const res = mockResponse();
    await protect(req, res, () => {});
    assert.strictEqual(res.statusCode, 401);
  });

  // ── 2. List Expos ────────────────────────────────────────────────────────
  console.log('\n--- 2. List Expos Tests ---');

  // Create a second expo for organizer1 (published)
  testExpo2 = await Expo.create({
    ...validExpoBody({ title: `Test Expo Published ${TS}`, status: 'published' }),
    organizer: organizer1._id,
  });
  // Create one for organizer2
  const org2Expo = await Expo.create({
    ...validExpoBody({ title: `Test Expo Org2 ${TS}` }),
    organizer: organizer2._id,
  });

  await test('Organizer sees only their own expos in list', async () => {
    const req = { user: organizer1, query: {} };
    const res = mockResponse();
    await listExpos(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    // All results should belong to organizer1
    res.body.data.forEach((expo) => {
      assert.strictEqual(
        expo.organizer._id.toString(),
        organizer1._id.toString(),
        'Organizer should not see another organizer\'s expo'
      );
    });
    assert.ok(res.body.meta, 'Expected pagination meta');
  });

  await test('Admin sees all expos in list', async () => {
    const req = { user: adminUser, query: {} };
    const res = mockResponse();
    await listExpos(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.meta.totalDocs >= 3, 'Admin should see at least 3 expos');
  });

  await test('Unauthenticated user sees only published expos', async () => {
    const req = { query: {} }; // No req.user
    const res = mockResponse();
    await listExpos(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    // All returned expos must be published
    res.body.data.forEach((expo) => {
      assert.strictEqual(expo.status, 'published', 'Unauthenticated user should not see draft/other expos');
    });
  });

  await test('List expos supports search by title', async () => {
    const req = { user: organizer1, query: { search: `Published ${TS}` } };
    const res = mockResponse();
    await listExpos(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.meta.totalDocs >= 1, 'Should find at least 1 matching expo');
    res.body.data.forEach((expo) => {
      assert.ok(
        expo.title.toLowerCase().includes('published'),
        'All returned expos should match search term'
      );
    });
  });

  await test('List expos supports status filter', async () => {
    const req = { user: organizer1, query: { status: 'published' } };
    const res = mockResponse();
    await listExpos(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    res.body.data.forEach((expo) => {
      assert.strictEqual(expo.status, 'published');
    });
  });

  await test('List expos rejects invalid status filter', async () => {
    const req = { user: organizer1, query: { status: 'invalid_status' } };
    const res = mockResponse();
    await listExpos(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('List expos supports pagination', async () => {
    const req = { user: adminUser, query: { page: '1', limit: '1' } };
    const res = mockResponse();
    await listExpos(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.data.length <= 1, 'Limit=1 should return at most 1 result');
    assert.strictEqual(res.body.meta.limit, 1);
    assert.strictEqual(res.body.meta.page, 1);
  });

  // ── 3. Get Expo by ID ─────────────────────────────────────────────────────
  console.log('\n--- 3. Get Expo by ID Tests ---');

  await test('Organizer can retrieve their own expo by ID', async () => {
    const req = { user: organizer1, params: { id: testExpo1._id.toString() } };
    const res = mockResponse();
    await getExpoById(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data._id.toString(), testExpo1._id.toString());
  });

  await test("Organizer cannot access another organizer's expo by ID (403)", async () => {
    const req = { user: organizer2, params: { id: testExpo1._id.toString() } };
    const res = mockResponse();
    await getExpoById(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Admin can retrieve any expo by ID', async () => {
    const req = { user: adminUser, params: { id: testExpo1._id.toString() } };
    const res = mockResponse();
    await getExpoById(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 200);
  });

  await test('Returns 404 for non-existent expo ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = { user: adminUser, params: { id: fakeId } };
    const res = mockResponse();
    await getExpoById(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 404);
  });

  await test('Returns 400 for malformed expo ObjectId', async () => {
    const req = { user: adminUser, params: { id: 'not-an-objectid' } };
    const res = mockResponse();
    await getExpoById(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('Unauthenticated user can only see published expo', async () => {
    // testExpo2 is published
    const req = { params: { id: testExpo2._id.toString() } }; // No req.user
    const res = mockResponse();
    await getExpoById(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 200);
  });

  await test('Unauthenticated user cannot see draft expo (returns 404)', async () => {
    // testExpo1 is draft
    const req = { params: { id: testExpo1._id.toString() } }; // No req.user
    const res = mockResponse();
    await getExpoById(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 404);
  });

  // ── 4. Update Expo ────────────────────────────────────────────────────────
  console.log('\n--- 4. Update Expo Tests ---');

  await test('Organizer can update their own expo', async () => {
    const req = {
      user: organizer1,
      params: { id: testExpo1._id.toString() },
      body: { title: `Test Expo Updated ${TS}`, capacity: 1000 },
    };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.data.title.includes('Updated'));
    assert.strictEqual(res.body.data.capacity, 1000);
  });

  await test("Organizer cannot update another organizer's expo (403)", async () => {
    const req = {
      user: organizer2,
      params: { id: testExpo1._id.toString() },
      body: { title: 'Hijacked Expo' },
    };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Admin can update any expo', async () => {
    const req = {
      user: adminUser,
      params: { id: testExpo1._id.toString() },
      body: { capacity: 2000 },
    };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.capacity, 2000);
  });

  await test('Update prevents organizer from changing expo organizer field', async () => {
    const req = {
      user: organizer1,
      params: { id: testExpo1._id.toString() },
      body: { organizer: organizer2._id.toString() }, // Attempt ownership change
    };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 200);
    // Organizer should remain organizer1
    const expo = await Expo.findById(testExpo1._id);
    assert.strictEqual(expo.organizer.toString(), organizer1._id.toString());
  });

  await test('Valid status transition: draft → published', async () => {
    const req = {
      user: organizer1,
      params: { id: testExpo1._id.toString() },
      body: { status: 'published' },
    };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.status, 'published');
  });

  await test('Invalid status transition: completed → published (rejected)', async () => {
    // Create a completed expo for this test
    const completedExpo = await Expo.create({
      ...validExpoBody({ title: `Test Expo Completed ${TS}`, status: 'completed' }),
      startDate: pastStart,
      endDate: pastEnd,
      organizer: organizer1._id,
    });
    const req = {
      user: organizer1,
      params: { id: completedExpo._id.toString() },
      body: { status: 'published' },
    };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('Invalid status transition'));
    await Expo.findByIdAndDelete(completedExpo._id);
  });

  await test('Update returns 404 for non-existent expo', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = { user: adminUser, params: { id: fakeId }, body: { title: 'Ghost' } };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 404);
  });

  await test('Update returns 400 for malformed expo ID', async () => {
    const req = { user: adminUser, params: { id: 'bad-id' }, body: {} };
    const res = mockResponse();
    await updateExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
  });

  // ── 5. Delete Expo ────────────────────────────────────────────────────────
  console.log('\n--- 5. Delete Expo Tests ---');

  await test('Organizer can delete their own expo with no related records', async () => {
    // Create a clean expo to delete
    const expoToDelete = await Expo.create({
      ...validExpoBody({ title: `Test Expo Delete ${TS}` }),
      organizer: organizer1._id,
    });
    const req = { user: organizer1, params: { id: expoToDelete._id.toString() } };
    const res = mockResponse();
    await deleteExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    // Confirm it's gone
    const gone = await Expo.findById(expoToDelete._id);
    assert.strictEqual(gone, null);
  });

  await test("Organizer cannot delete another organizer's expo (403)", async () => {
    const req = { user: organizer2, params: { id: testExpo1._id.toString() } };
    const res = mockResponse();
    await deleteExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Admin can delete any expo with no related records', async () => {
    const expoToDelete = await Expo.create({
      ...validExpoBody({ title: `Test Expo Admin Delete ${TS}` }),
      organizer: organizer1._id,
    });
    const req = { user: adminUser, params: { id: expoToDelete._id.toString() } };
    const res = mockResponse();
    await deleteExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 200);
  });

  await test('Deletion is blocked when exhibitor applications exist', async () => {
    // Create an expo and add an application
    const blockedExpo = await Expo.create({
      ...validExpoBody({ title: `Test Expo Blocked Delete ${TS}` }),
      organizer: organizer1._id,
    });
    const exhProfile = await ExhibitorProfile.create({
      user: exhibitorUser._id,
      companyName: `Blocker Corp ${TS}`,
      companyDescription: 'Blocking deletions since 2026',
      industry: 'Technology',
      contactPerson: { name: 'Jane Block', email: EXHIBITOR_EMAIL, phone: '+1-555-0001' },
    });
    await ExhibitorApplication.create({
      expo: blockedExpo._id,
      exhibitor: exhibitorUser._id,
      exhibitorProfile: exhProfile._id,
      boothPreference: { size: 'small' },
      status: 'pending',
    });

    const req = { user: organizer1, params: { id: blockedExpo._id.toString() } };
    const res = mockResponse();
    await deleteExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 422);
    assert.ok(res.body.data.relatedCounts.exhibitorApplications >= 1);

    // Cleanup
    await ExhibitorApplication.deleteMany({ expo: blockedExpo._id });
    await ExhibitorProfile.findByIdAndDelete(exhProfile._id);
    await Expo.findByIdAndDelete(blockedExpo._id);
  });

  await test('Delete returns 404 for non-existent expo', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = { user: adminUser, params: { id: fakeId } };
    const res = mockResponse();
    await deleteExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 404);
  });

  await test('Delete returns 400 for malformed expo ID', async () => {
    const req = { user: adminUser, params: { id: 'invalid-id' } };
    const res = mockResponse();
    await deleteExpo(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(res.statusCode, 400);
  });

  // ── Teardown ──────────────────────────────────────────────────────────────
  console.log('\n--- 6. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: new RegExp(`Test Expo.*${TS}`) });
  await ExhibitorProfile.deleteMany({ companyName: new RegExp(`Blocker Corp ${TS}`) });
  console.log('  Cleaned all test users, expos and related records.');

  console.log('\n======================================================');
  console.log(`EXPO TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runExpoTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
