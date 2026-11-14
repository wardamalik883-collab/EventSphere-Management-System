/**
 * booth.test.js — Automated Test Suite for Booth & Floor-Plan Management (Task 08)
 *
 * Tests:
 *  1. Booth Creation & Field Validations
 *  2. Duplicate Booth Number Rejection in Same Expo (409 Conflict)
 *  3. Booth Listing, Floor-Plan Grouping, & Filtering
 *  4. Booth Details & Update Operations
 *  5. Safe Deletion & Allocated Booth Protection (422)
 *  6. Organizer Expo Ownership & Admin Permissions
 *  7. Booth Allocation to Approved Exhibitor Applications
 *  8. Rejection of Booth Allocation for Pending / Rejected Applications (422)
 *  9. Duplicate Exhibitor Assignment Prevention (409 Conflict)
 * 10. Concurrency & Double-Booking Protection
 * 11. Unallocation & Inventory Restoration
 * 12. Exhibitor Assigned Booth Access & Isolation
 * 13. Notification Generation Verification
 * 14. Teardown & Cleanup
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Expo = require('../src/models/Expo');
const Booth = require('../src/models/Booth');
const ExhibitorProfile = require('../src/models/ExhibitorProfile');
const ExhibitorApplication = require('../src/models/ExhibitorApplication');
const Notification = require('../src/models/Notification');

const {
  getExpoBooths,
  createBooth,
  getBoothById,
  updateBooth,
  deleteBooth,
  allocateBooth,
  unallocateBooth,
  getMyBooths,
} = require('../src/controllers/boothController');

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
const ADMIN_EMAIL = `booth_admin_${TS}@eventsphere.test`;
const ORG1_EMAIL  = `booth_org1_${TS}@eventsphere.test`;
const ORG2_EMAIL  = `booth_org2_${TS}@eventsphere.test`;
const EXH1_EMAIL  = `booth_exh1_${TS}@eventsphere.test`;
const EXH2_EMAIL  = `booth_exh2_${TS}@eventsphere.test`;

let adminUser, organizer1, organizer2, exhibitor1, exhibitor2;
let expo1, expo2;
let appApproved1, appPending2, appApproved2;
let createdBooth1, createdBooth2;

async function runBoothTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 08 BOOTH & FLOOR-PLAN TEST     ');
  console.log('======================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run booth tests without database connection.');
    console.error('Ensure MongoDB is reachable and your IP address is whitelisted in MongoDB Atlas.');
    process.exit(1);
  }

  // Cleanup old test data
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: new RegExp(`Task08 Expo.*${TS}`) });
  await Booth.deleteMany({});
  await ExhibitorProfile.deleteMany({});
  await ExhibitorApplication.deleteMany({});
  await Notification.deleteMany({});

  adminUser = await User.create({
    name: 'Admin Tester',
    email: ADMIN_EMAIL,
    password: 'Password123!',
    role: 'admin',
    isActive: true,
  });

  organizer1 = await User.create({
    name: 'Organizer Alpha',
    email: ORG1_EMAIL,
    password: 'Password123!',
    role: 'organizer',
    isActive: true,
  });

  organizer2 = await User.create({
    name: 'Organizer Beta',
    email: ORG2_EMAIL,
    password: 'Password123!',
    role: 'organizer',
    isActive: true,
  });

  exhibitor1 = await User.create({
    name: 'Exhibitor Alpha Corp',
    email: EXH1_EMAIL,
    password: 'Password123!',
    role: 'exhibitor',
    isActive: true,
  });

  exhibitor2 = await User.create({
    name: 'Exhibitor Beta Ltd',
    email: EXH2_EMAIL,
    password: 'Password123!',
    role: 'exhibitor',
    isActive: true,
  });

  const futureStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const futureEnd   = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);

  expo1 = await Expo.create({
    title: `Task08 Expo One ${TS}`,
    description: 'Premier Technology Expo',
    category: 'Technology',
    startDate: futureStart,
    endDate: futureEnd,
    location: { venue: 'Convention Center West', city: 'Las Vegas', country: 'USA' },
    organizer: organizer1._id,
    status: 'published',
  });

  expo2 = await Expo.create({
    title: `Task08 Expo Two ${TS}`,
    description: 'Medical & Healthcare Summit',
    category: 'Healthcare',
    startDate: futureStart,
    endDate: futureEnd,
    location: { venue: 'Civic Hall East', city: 'Chicago', country: 'USA' },
    organizer: organizer2._id,
    status: 'published',
  });

  const profile1 = await ExhibitorProfile.create({
    user: exhibitor1._id,
    companyName: 'Alpha Robotics',
    companyDescription: 'Industrial automation',
    industry: 'Robotics',
  });

  const profile2 = await ExhibitorProfile.create({
    user: exhibitor2._id,
    companyName: 'Beta Biotech',
    companyDescription: 'Biomedical devices',
    industry: 'Healthcare',
  });

  // Approved application for Exhibitor 1 on Expo 1
  appApproved1 = await ExhibitorApplication.create({
    expo: expo1._id,
    exhibitor: exhibitor1._id,
    exhibitorProfile: profile1._id,
    boothPreference: { size: 'large', preferredLocation: 'Zone A' },
    status: 'approved',
  });

  // Pending application for Exhibitor 2 on Expo 1
  appPending2 = await ExhibitorApplication.create({
    expo: expo1._id,
    exhibitor: exhibitor2._id,
    exhibitorProfile: profile2._id,
    boothPreference: { size: 'medium' },
    status: 'pending',
  });

  // Approved application for Exhibitor 2 on Expo 2
  appApproved2 = await ExhibitorApplication.create({
    expo: expo2._id,
    exhibitor: exhibitor2._id,
    exhibitorProfile: profile2._id,
    boothPreference: { size: 'medium' },
    status: 'approved',
  });

  // ── 1. Booth Creation & Validation ─────────────────────────────────────────
  console.log('--- 1. Booth Creation & Field Validation ---');

  await test('Organizer 1 creates a booth for Expo 1 with valid fields', async () => {
    const req = {
      user: organizer1,
      params: { expoId: expo1._id.toString() },
      body: {
        boothNumber: 'A-101',
        dimensions: { width: 4, length: 4, unit: 'meters' },
        zone: 'Zone A - Robotics',
        type: 'corner',
        price: 1500,
        status: 'available',
      },
    };
    const res = mockResponse();
    await createBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.boothNumber, 'A-101');
    assert.strictEqual(res.body.data.dimensions.width, 4);
    assert.strictEqual(res.body.data.price, 1500);
    createdBooth1 = res.body.data;
  });

  await test('Admin can create a booth for any expo', async () => {
    const req = {
      user: adminUser,
      params: { expoId: expo1._id.toString() },
      body: {
        boothNumber: 'A-102',
        dimensions: { width: 3, length: 3, unit: 'meters' },
        zone: 'Zone A - Robotics',
        type: 'standard',
        price: 1000,
      },
    };
    const res = mockResponse();
    await createBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.data.boothNumber, 'A-102');
    createdBooth2 = res.body.data;
  });

  await test('Rejects duplicate booth number in the same expo (409 Conflict)', async () => {
    const req = {
      user: organizer1,
      params: { expoId: expo1._id.toString() },
      body: {
        boothNumber: 'A-101', // Already created
        zone: 'Zone B',
      },
    };
    const res = mockResponse();
    await createBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 409);
    assert.ok(res.body.message.includes('already exists'));
  });

  await test('Rejects creation when boothNumber is missing (400)', async () => {
    const req = {
      user: organizer1,
      params: { expoId: expo1._id.toString() },
      body: {
        zone: 'Zone B',
      },
    };
    const res = mockResponse();
    await createBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 400);
  });

  // ── 2. Ownership & Permissions ────────────────────────────────────────────
  console.log('\n--- 2. Expo Ownership & Permissions ---');

  await test('Organizer 2 cannot create booths in Organizer 1 expo (403)', async () => {
    const req = {
      user: organizer2,
      params: { expoId: expo1._id.toString() },
      body: { boothNumber: 'B-201' },
    };
    const res = mockResponse();
    await createBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Organizer 2 cannot update booth belonging to Organizer 1 (403)', async () => {
    const req = {
      user: organizer2,
      params: { id: createdBooth1._id.toString() },
      body: { price: 9999 },
    };
    const res = mockResponse();
    await updateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Organizer 2 cannot delete booth belonging to Organizer 1 (403)', async () => {
    const req = {
      user: organizer2,
      params: { id: createdBooth1._id.toString() },
    };
    const res = mockResponse();
    await deleteBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 403);
  });

  // ── 3. Booth Listing, Floor Plan & Details ──────────────────────────────────
  console.log('\n--- 3. Booth Listing & Floor Plan Layout ---');

  await test('GET /expos/:expoId/booths retrieves booths, floor-plan stats, and zone grouping', async () => {
    const req = { params: { expoId: expo1._id.toString() }, query: {} };
    const res = mockResponse();
    await getExpoBooths(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.stats.total, 2);
    assert.strictEqual(res.body.data.stats.available, 2);
    assert.ok(res.body.data.zones['Zone A - Robotics']);
    assert.strictEqual(res.body.data.booths.length, 2);
  });

  await test('GET /expos/:expoId/booths filters by zone and search', async () => {
    const req = {
      params: { expoId: expo1._id.toString() },
      query: { search: 'A-101', zone: 'Robotics' },
    };
    const res = mockResponse();
    await getExpoBooths(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.booths.length, 1);
    assert.strictEqual(res.body.data.booths[0].boothNumber, 'A-101');
  });

  await test('GET /booths/:id returns detailed booth item', async () => {
    const req = { params: { id: createdBooth1._id.toString() } };
    const res = mockResponse();
    await getBoothById(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.boothNumber, 'A-101');
    assert.strictEqual(res.body.data.expo.title, `Task08 Expo One ${TS}`);
  });

  await test('PATCH /booths/:id updates dimensions, zone, price', async () => {
    const req = {
      user: organizer1,
      params: { id: createdBooth1._id.toString() },
      body: {
        price: 1800,
        dimensions: { width: 5, length: 4, unit: 'meters' },
        zone: 'Zone A - Premium Robotics',
      },
    };
    const res = mockResponse();
    await updateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.price, 1800);
    assert.strictEqual(res.body.data.dimensions.width, 5);
    assert.strictEqual(res.body.data.zone, 'Zone A - Premium Robotics');
  });

  // ── 4. Booth Allocation Workflow & Double-Booking Guards ───────────────────
  console.log('\n--- 4. Booth Allocation & Double-Booking Protection ---');

  await test('Rejects allocation for pending application (422 Unprocessable)', async () => {
    const req = {
      user: organizer1,
      params: { id: createdBooth1._id.toString() },
      body: { applicationId: appPending2._id.toString() },
    };
    const res = mockResponse();
    await allocateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 422);
    assert.ok(res.body.message.includes('Only approved applications'));
  });

  await test('Rejects allocation if application is from a different expo (422)', async () => {
    const req = {
      user: organizer1,
      params: { id: createdBooth1._id.toString() },
      body: { applicationId: appApproved2._id.toString() }, // Belongs to Expo 2
    };
    const res = mockResponse();
    await allocateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 422);
    assert.ok(res.body.message.includes('does not belong to the same expo'));
  });

  await test('Organizer 1 allocates Booth A-101 to Approved Application 1 successfully', async () => {
    const req = {
      user: organizer1,
      params: { id: createdBooth1._id.toString() },
      body: { applicationId: appApproved1._id.toString() },
    };
    const res = mockResponse();
    await allocateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'allocated');
    assert.strictEqual(res.body.data.assignedTo._id.toString(), exhibitor1._id.toString());
  });

  await test('Booth allocation generates in-app notification for the exhibitor', async () => {
    const notif = await Notification.findOne({
      recipient: exhibitor1._id,
      type: 'booth_assigned',
    });
    assert.ok(notif, 'Expected in-app notification for exhibitor');
    assert.ok(notif.title.includes('Booth Allocated'));
  });

  await test('Rejects allocating a second booth to the same exhibitor in the same expo (409 Conflict)', async () => {
    // Attempt to allocate Booth A-102 to Exhibitor 1 who already has Booth A-101
    const req = {
      user: organizer1,
      params: { id: createdBooth2._id.toString() },
      body: { applicationId: appApproved1._id.toString() },
    };
    const res = mockResponse();
    await allocateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 409);
    assert.ok(res.body.message.includes('already has a booth'));
  });

  await test('Rejects allocating an already allocated booth (double booking guard)', async () => {
    // Approve exhibitor 2's application
    appPending2.status = 'approved';
    await appPending2.save();

    // Try to allocate Booth A-101 which is already allocated
    const req = {
      user: organizer1,
      params: { id: createdBooth1._id.toString() },
      body: { applicationId: appPending2._id.toString() },
    };
    const res = mockResponse();
    await allocateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 409);
    assert.ok(res.body.message.includes('no longer available'));
  });

  // ── 5. Safe Deletion & Allocated Protection ────────────────────────────────
  console.log('\n--- 5. Safe Deletion & Allocated Protection ---');

  await test('Rejects deleting an allocated booth (422 Unprocessable)', async () => {
    const req = {
      user: organizer1,
      params: { id: createdBooth1._id.toString() },
    };
    const res = mockResponse();
    await deleteBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 422);
    assert.ok(res.body.message.includes('Cannot delete an allocated booth'));
  });

  await test('Allows deleting an unallocated available booth', async () => {
    const req = {
      user: organizer1,
      params: { id: createdBooth2._id.toString() },
    };
    const res = mockResponse();
    await deleteBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const check = await Booth.findById(createdBooth2._id);
    assert.strictEqual(check, null);
  });

  // ── 6. Unallocation & Exhibitor View ───────────────────────────────────────
  console.log('\n--- 6. Unallocation & Exhibitor Assigned Booth View ---');

  await test('Exhibitor 1 retrieves their allocated booth via GET /api/exhibitors/my-booths', async () => {
    const req = { user: exhibitor1 };
    const res = mockResponse();
    await getMyBooths(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].boothNumber, 'A-101');
    assert.strictEqual(res.body.data[0].expo.title, `Task08 Expo One ${TS}`);
  });

  await test('Exhibitor 2 sees zero allocated booths', async () => {
    const req = { user: exhibitor2 };
    const res = mockResponse();
    await getMyBooths(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 0);
  });

  await test('Organizer 1 unallocates Booth A-101 successfully', async () => {
    const req = {
      user: organizer1,
      params: { id: createdBooth1._id.toString() },
    };
    const res = mockResponse();
    await unallocateBooth(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.status, 'available');
    assert.strictEqual(res.body.data.assignedTo, null);
  });

  // ── 7. Cleanup & Teardown ─────────────────────────────────────────────────
  console.log('\n--- 7. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: new RegExp(`Task08 Expo.*${TS}`) });
  await Booth.deleteMany({});
  await ExhibitorProfile.deleteMany({});
  await ExhibitorApplication.deleteMany({});
  await Notification.deleteMany({});
  console.log('  Cleaned all Task 08 test records.');

  console.log('\n======================================================');
  console.log(`BOOTH TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runBoothTestSuite().catch((err) => {
  console.error('Fatal error in booth test suite:', err);
  process.exit(1);
});
