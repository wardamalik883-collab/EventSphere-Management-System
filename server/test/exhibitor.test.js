/**
 * exhibitor.test.js — Automated Test Suite for Exhibitor Portal & Applications (Task 07)
 *
 * Tests:
 *  1. Exhibitor Profile Creation & Validation
 *  2. Exhibitor Profile Updates & Ownership Protection
 *  3. Profile Retrieval (Self & 404 when absent)
 *  4. Exhibitor Dashboard Statistics (Real Data & Isolation)
 *  5. Browse Available Expos (Published & Ongoing Only)
 *  6. Application Submission (Validation, Rejections, Duplicate Prevention)
 *  7. Exhibitor Own Applications Listing & Ownership Isolation
 *  8. Organizer Applications Review (Listing, Ownership Isolation, Review notes, Approve, Reject)
 *  9. Notification Generation Verification
 * 10. Role-Based Access Control (Attendee, Exhibitor, Organizer restrictions)
 * 11. Malformed ObjectId handling
 * 12. Cleanup & Teardown
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Expo = require('../src/models/Expo');
const ExhibitorProfile = require('../src/models/ExhibitorProfile');
const ExhibitorApplication = require('../src/models/ExhibitorApplication');
const Notification = require('../src/models/Notification');

const {
  getMyProfile,
  createProfile,
  updateProfile,
  getExhibitorDashboard,
  browseExpos,
  submitApplication,
  listMyApplications,
  getMyApplicationById,
  listOrganizerApplications,
  getOrganizerApplicationById,
  reviewApplication,
} = require('../src/controllers/exhibitorController');

const { authorize } = require('../src/middleware/authMiddleware');

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
const EXH1_EMAIL = `exh1_${TS}@eventsphere.test`;
const EXH2_EMAIL = `exh2_${TS}@eventsphere.test`;
const ORG1_EMAIL = `org1_${TS}@eventsphere.test`;
const ORG2_EMAIL = `org2_${TS}@eventsphere.test`;
const ATT_EMAIL  = `att_${TS}@eventsphere.test`;
const ADMIN_EMAIL= `admin_${TS}@eventsphere.test`;

let exhibitor1, exhibitor2, organizer1, organizer2, attendee, admin;
let expo1, expo2Draft;

async function runExhibitorTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 07 EXHIBITOR & APPLICATIONS TEST');
  console.log('======================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run exhibitor tests without database connection.');
    console.error('Ensure MongoDB is reachable and your IP address is whitelisted in MongoDB Atlas.');
    process.exit(1);
  }

  // Setup / Clean
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: new RegExp(`Task07 Expo.*${TS}`) });
  await ExhibitorProfile.deleteMany({});
  await ExhibitorApplication.deleteMany({});
  await Notification.deleteMany({});

  exhibitor1 = await User.create({
    name: 'Exhibitor Alpha',
    email: EXH1_EMAIL,
    password: 'Password123!',
    role: 'exhibitor',
    isActive: true,
  });

  exhibitor2 = await User.create({
    name: 'Exhibitor Beta',
    email: EXH2_EMAIL,
    password: 'Password123!',
    role: 'exhibitor',
    isActive: true,
  });

  organizer1 = await User.create({
    name: 'Organizer One',
    email: ORG1_EMAIL,
    password: 'Password123!',
    role: 'organizer',
    isActive: true,
  });

  organizer2 = await User.create({
    name: 'Organizer Two',
    email: ORG2_EMAIL,
    password: 'Password123!',
    role: 'organizer',
    isActive: true,
  });

  attendee = await User.create({
    name: 'Attendee Person',
    email: ATT_EMAIL,
    password: 'Password123!',
    role: 'attendee',
    isActive: true,
  });

  admin = await User.create({
    name: 'Admin System',
    email: ADMIN_EMAIL,
    password: 'Password123!',
    role: 'admin',
    isActive: true,
  });

  const futureStart = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
  const futureEnd   = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);

  // Published Expo owned by Organizer 1
  expo1 = await Expo.create({
    title: `Task07 Expo Published ${TS}`,
    description: 'Premier tech conference for testing exhibitor applications.',
    category: 'Technology',
    startDate: futureStart,
    endDate: futureEnd,
    location: { venue: 'Hall A', city: 'San Francisco', country: 'USA' },
    organizer: organizer1._id,
    status: 'published',
  });

  // Draft Expo owned by Organizer 1 (not open for applications)
  expo2Draft = await Expo.create({
    title: `Task07 Expo Draft ${TS}`,
    description: 'Internal expo draft.',
    category: 'Technology',
    startDate: futureStart,
    endDate: futureEnd,
    location: { venue: 'Hall B', city: 'San Francisco', country: 'USA' },
    organizer: organizer1._id,
    status: 'draft',
  });

  // ── 1. Profile Retrieval & Creation ───────────────────────────────────────
  console.log('--- 1. Exhibitor Profile Management ---');

  await test('GET /me returns 404 when profile not created yet', async () => {
    const req = { user: exhibitor1 };
    const res = mockResponse();
    await getMyProfile(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 404);
  });

  await test('POST /profile creates profile with valid data', async () => {
    const req = {
      user: exhibitor1,
      body: {
        companyName: 'Acme Robotics',
        companyDescription: 'Autonomous drones and robotic equipment.',
        companyWebsite: 'https://acme-robotics.example.com',
        industry: 'Robotics',
        contactPerson: {
          name: 'Alice Johnson',
          email: 'alice@acme.example.com',
          phone: '+1-555-0199',
        },
        logoUrl: 'https://example.com/logo.png',
      },
    };
    const res = mockResponse();
    await createProfile(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.companyName, 'Acme Robotics');
    assert.strictEqual(res.body.data.user.toString(), exhibitor1._id.toString());
  });

  await test('POST /profile rejects duplicate profile for the same user (409)', async () => {
    const req = {
      user: exhibitor1,
      body: {
        companyName: 'Duplicate Corp',
        companyDescription: 'Trying to create another profile.',
        industry: 'Tech',
      },
    };
    const res = mockResponse();
    await createProfile(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 409);
  });

  await test('POST /profile validates required fields', async () => {
    const req = {
      user: exhibitor2,
      body: {
        // Missing companyName and industry
        companyDescription: 'Desc only',
      },
    };
    const res = mockResponse();
    await createProfile(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.errors);
  });

  await test('GET /me retrieves created exhibitor profile', async () => {
    const req = { user: exhibitor1 };
    const res = mockResponse();
    await getMyProfile(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.companyName, 'Acme Robotics');
  });

  await test('PUT /profile updates permitted fields and preserves user ownership', async () => {
    const req = {
      user: exhibitor1,
      body: {
        companyName: 'Acme Robotics Global',
        companyDescription: 'Global leader in autonomous equipment.',
        user: exhibitor2._id.toString(), // Attempt IDOR modification
      },
    };
    const res = mockResponse();
    await updateProfile(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.companyName, 'Acme Robotics Global');
    assert.strictEqual(res.body.data.user._id.toString(), exhibitor1._id.toString());
  });

  // ── 2. Exhibitor Dashboard ────────────────────────────────────────────────
  console.log('\n--- 2. Exhibitor Dashboard ---');

  await test('GET /dashboard returns complete statistics and profile completion', async () => {
    const req = { user: exhibitor1 };
    const res = mockResponse();
    await getExhibitorDashboard(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.profileCompletion > 50);
    assert.strictEqual(res.body.data.stats.totalApplications, 0);
  });

  // ── 3. Browse Expos ───────────────────────────────────────────────────────
  console.log('\n--- 3. Browse Available Expos ---');

  await test('GET /exhibitors/expos returns only published and ongoing expos', async () => {
    const req = { user: exhibitor1, query: {} };
    const res = mockResponse();
    await browseExpos(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    res.body.data.forEach((exp) => {
      assert.ok(['published', 'ongoing'].includes(exp.status));
      assert.notStrictEqual(exp.status, 'draft');
    });
  });

  await test('GET /exhibitors/expos supports search and category filtering', async () => {
    const req = { user: exhibitor1, query: { search: 'Task07 Expo Published', category: 'Technology' } };
    const res = mockResponse();
    await browseExpos(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.data.length >= 1);
  });

  // ── 4. Application Submission ─────────────────────────────────────────────
  console.log('\n--- 4. Expo Application Submission ---');

  let submittedApplicationId;

  await test('POST /applications rejects user without exhibitor profile (400)', async () => {
    const req = {
      user: exhibitor2, // No profile created yet
      body: { expoId: expo1._id.toString(), boothPreference: { size: 'medium' } },
    };
    const res = mockResponse();
    await submitApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('exhibitor profile'));
  });

  await test('POST /applications rejects invalid or missing expoId', async () => {
    const req = {
      user: exhibitor1,
      body: { expoId: 'not-an-id' },
    };
    const res = mockResponse();
    await submitApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 400);
  });

  await test('POST /applications rejects non-existent expo (404)', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = {
      user: exhibitor1,
      body: { expoId: fakeId },
    };
    const res = mockResponse();
    await submitApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 404);
  });

  await test('POST /applications rejects non-published/draft expo (422)', async () => {
    const req = {
      user: exhibitor1,
      body: { expoId: expo2Draft._id.toString() },
    };
    const res = mockResponse();
    await submitApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 422);
  });

  await test('POST /applications submits successfully for valid expo & profile', async () => {
    const req = {
      user: exhibitor1,
      body: {
        expoId: expo1._id.toString(),
        boothPreference: {
          size: 'large',
          preferredLocation: 'Near Main Entrance',
          specialRequirements: 'High-voltage power outlet for demo drone',
        },
      },
    };
    const res = mockResponse();
    await submitApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'pending');
    assert.strictEqual(res.body.data.boothPreference.size, 'large');
    submittedApplicationId = res.body.data._id.toString();
  });

  await test('POST /applications triggers in-app notification for the organizer', async () => {
    const notif = await Notification.findOne({
      recipient: organizer1._id,
      type: 'application_update',
    });
    assert.ok(notif, 'Expected notification to organizer');
    assert.ok(notif.title.includes('Exhibitor Application'));
  });

  await test('POST /applications rejects duplicate submission (409 Conflict)', async () => {
    const req = {
      user: exhibitor1,
      body: {
        expoId: expo1._id.toString(),
        boothPreference: { size: 'small' },
      },
    };
    const res = mockResponse();
    await submitApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 409);
    assert.ok(res.body.message.includes('already submitted'));
  });

  // ── 5. Exhibitor Application Listing & Detail ─────────────────────────────
  console.log('\n--- 5. Exhibitor Application Management ---');

  await test('GET /applications lists exhibitor\'s own applications', async () => {
    const req = { user: exhibitor1, query: {} };
    const res = mockResponse();
    await listMyApplications(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].expo.title, `Task07 Expo Published ${TS}`);
  });

  await test('Exhibitor 2 sees zero applications in list', async () => {
    const req = { user: exhibitor2, query: {} };
    const res = mockResponse();
    await listMyApplications(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 0);
  });

  await test('GET /applications/:id retrieves single application detail', async () => {
    const req = { user: exhibitor1, params: { id: submittedApplicationId } };
    const res = mockResponse();
    await getMyApplicationById(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data._id.toString(), submittedApplicationId);
  });

  await test('GET /applications/:id denies access to other exhibitor (403)', async () => {
    const req = { user: exhibitor2, params: { id: submittedApplicationId } };
    const res = mockResponse();
    await getMyApplicationById(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 403);
  });

  // ── 6. Organizer Application Review ───────────────────────────────────────
  console.log('\n--- 6. Organizer Application Review ---');

  await test('Organizer 1 lists applications for their own expos', async () => {
    const req = { user: organizer1, query: {} };
    const res = mockResponse();
    await listOrganizerApplications(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].exhibitor.name, 'Exhibitor Alpha');
  });

  await test('Organizer 2 sees empty list because they do not own Expo 1', async () => {
    const req = { user: organizer2, query: {} };
    const res = mockResponse();
    await listOrganizerApplications(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.length, 0);
  });

  await test('Organizer 2 cannot view Organizer 1 application detail (403)', async () => {
    const req = { user: organizer2, params: { id: submittedApplicationId } };
    const res = mockResponse();
    await getOrganizerApplicationById(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Organizer 2 cannot review Organizer 1 application (403)', async () => {
    const req = {
      user: organizer2,
      params: { id: submittedApplicationId },
      body: { status: 'approved' },
    };
    const res = mockResponse();
    await reviewApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Organizer 1 approves application with review notes', async () => {
    const req = {
      user: organizer1,
      params: { id: submittedApplicationId },
      body: {
        status: 'approved',
        reviewNotes: 'Impressive robotics portfolio. Booth location confirmed.',
      },
    };
    const res = mockResponse();
    await reviewApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.status, 'approved');
    assert.strictEqual(res.body.data.reviewedBy.name, 'Organizer One');
  });

  await test('Exhibitor receives notification upon application approval', async () => {
    const notif = await Notification.findOne({
      recipient: exhibitor1._id,
      type: 'application_update',
    }).sort({ createdAt: -1 });
    assert.ok(notif, 'Expected notification for exhibitor');
    assert.ok(notif.title.includes('Approved'));
  });

  await test('Cannot re-review an already approved application (422)', async () => {
    const req = {
      user: organizer1,
      params: { id: submittedApplicationId },
      body: { status: 'rejected' },
    };
    const res = mockResponse();
    await reviewApplication(req, res, (e) => { if (e) throw e; });
    assert.strictEqual(res.statusCode, 422);
  });

  // ── 7. RBAC Tests ─────────────────────────────────────────────────────────
  console.log('\n--- 7. Role-Based Access Control (RBAC) ---');

  await test('Attendee is denied access to Exhibitor routes (403)', async () => {
    const req = { user: attendee };
    const res = mockResponse();
    let called = false;
    authorize('exhibitor')(req, res, () => { called = true; });
    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 403);
  });

  await test('Exhibitor is denied access to Organizer Review routes (403)', async () => {
    const req = { user: exhibitor1 };
    const res = mockResponse();
    let called = false;
    authorize('organizer', 'admin')(req, res, () => { called = true; });
    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // ── 8. Cleanup & Teardown ─────────────────────────────────────────────────
  console.log('\n--- 8. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  await Expo.deleteMany({ title: new RegExp(`Task07 Expo.*${TS}`) });
  await ExhibitorProfile.deleteMany({});
  await ExhibitorApplication.deleteMany({});
  await Notification.deleteMany({});
  console.log('  Cleaned all Task 07 test records.');

  console.log('\n======================================================');
  console.log(`EXHIBITOR TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runExhibitorTestSuite().catch((err) => {
  console.error('Fatal error in exhibitor test suite:', err);
  process.exit(1);
});
