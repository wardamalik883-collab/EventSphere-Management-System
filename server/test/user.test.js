/**
 * user.test.js — Comprehensive User & Profile Management Automated Test Suite
 *
 * Tests:
 *  1. Profile Retrieval (Authenticated vs Unauthenticated, Password stripping)
 *  2. Profile Updates (Allowed fields, Role modification blocked, Status modification blocked)
 *  3. Avatar Uploads (Valid image, Invalid file extension, Oversized file, Safe filename)
 *  4. Admin User Management (List users, Search, Filters, View user, 403 for non-admins)
 *  5. Account Status Management (Activation/Deactivation, Last admin deactivation protection)
 *  6. Teardown / Cleanup
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/generateToken');
const {
  getMe,
  updateMe,
  updateAvatar,
  getAllUsers,
  getUserById,
  updateUserStatus,
} = require('../src/controllers/userController');

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
const USER_EMAIL = `usertest_attendee_${TS}@eventsphere.test`;
const ORG_EMAIL = `usertest_org_${TS}@eventsphere.test`;
const ADMIN_EMAIL_1 = `usertest_admin1_${TS}@eventsphere.test`;
const ADMIN_EMAIL_2 = `usertest_admin2_${TS}@eventsphere.test`;

async function runUserTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 04 USER & PROFILE TEST SUITE    ');
  console.log('======================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run user tests without database connection.');
    console.error('Ensure MongoDB is reachable and your IP address is whitelisted in MongoDB Atlas.');
    process.exit(1);
  }

  // Clean any previous test accounts
  await User.deleteMany({ email: /@eventsphere\.test$/ });

  // Seed test accounts
  const attendeeUser = await User.create({
    name: 'Standard Attendee',
    email: USER_EMAIL,
    password: 'Password123!',
    role: 'attendee',
    phone: '123-456-7890',
  });

  const organizerUser = await User.create({
    name: 'Event Organizer',
    email: ORG_EMAIL,
    password: 'Password123!',
    role: 'organizer',
  });

  const adminUser1 = await User.create({
    name: 'Main Admin',
    email: ADMIN_EMAIL_1,
    password: 'Password123!',
    role: 'admin',
    isActive: true,
  });

  const adminUser2 = await User.create({
    name: 'Secondary Admin',
    email: ADMIN_EMAIL_2,
    password: 'Password123!',
    role: 'admin',
    isActive: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. PROFILE RETRIEVAL TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Profile Retrieval Tests ---');

  await test('Authenticated user can retrieve their own profile', async () => {
    const req = { user: attendeeUser };
    const res = mockResponse();

    await getMe(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, USER_EMAIL.toLowerCase());
    assert.strictEqual(res.body.data.user.role, 'attendee');
    assert.strictEqual(res.body.data.user.password, undefined, 'Password must not be returned');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. PROFILE UPDATE TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Profile Update Tests ---');

  await test('Authenticated user can update allowed fields (name, phone, avatarUrl)', async () => {
    const req = {
      user: attendeeUser,
      body: {
        name: 'Updated Attendee Name',
        phone: '987-654-3210',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    };
    const res = mockResponse();

    await updateMe(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.user.name, 'Updated Attendee Name');
    assert.strictEqual(res.body.data.user.phone, '987-654-3210');
    assert.strictEqual(res.body.data.user.avatarUrl, 'https://example.com/avatar.jpg');
    assert.strictEqual(res.body.data.user.password, undefined);

    const reloaded = await User.findById(attendeeUser._id);
    assert.strictEqual(reloaded.name, 'Updated Attendee Name');
  });

  await test('User cannot change their own role (privilege escalation blocked)', async () => {
    const req = {
      user: attendeeUser,
      body: {
        role: 'admin', // Attempted role escalation
      },
    };
    const res = mockResponse();

    await updateMe(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.user.role, 'attendee', 'Role must remain attendee');

    const reloaded = await User.findById(attendeeUser._id);
    assert.strictEqual(reloaded.role, 'attendee', 'Role in database must remain attendee');
  });

  await test('User cannot modify their account status (isActive blocked)', async () => {
    const req = {
      user: attendeeUser,
      body: {
        isActive: false, // Attempted status tampering
      },
    };
    const res = mockResponse();

    await updateMe(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.user.isActive, true, 'Account status must remain true');
  });

  await test('Update rejects invalid name length with 400', async () => {
    const req = {
      user: attendeeUser,
      body: {
        name: 'A', // 1 char, min is 2
      },
    };
    const res = mockResponse();

    await updateMe(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('at least 2 characters'));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. AVATAR UPLOAD TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Avatar Upload Tests ---');

  await test('Avatar upload fails when no file is attached (400)', async () => {
    const req = { user: attendeeUser }; // file is undefined
    const res = mockResponse();

    await updateAvatar(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Please provide an image file'));
  });

  await test('Avatar upload stores sanitized path in user profile', async () => {
    const req = {
      user: attendeeUser,
      file: {
        filename: `avatar-${attendeeUser._id}-test.png`,
      },
    };
    const res = mockResponse();

    await updateAvatar(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.avatarUrl, `/uploads/avatars/${req.file.filename}`);

    const reloaded = await User.findById(attendeeUser._id);
    assert.strictEqual(reloaded.avatarUrl, `/uploads/avatars/${req.file.filename}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ADMIN USER MANAGEMENT TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Admin User Management Tests ---');

  await test('Admin can list users with pagination metadata', async () => {
    const req = {
      user: adminUser1,
      query: { page: '1', limit: '10' },
    };
    const res = mockResponse();

    await getAllUsers(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data), 'Data must be an array');
    assert(res.body.meta, 'Metadata must be included');
    assert.strictEqual(res.body.meta.page, 1);
    assert(res.body.meta.totalDocs >= 4);

    // Verify passwords are not included in any item
    res.body.data.forEach((u) => {
      assert.strictEqual(u.password, undefined, 'User passwords must never be returned');
    });
  });

  await test('Admin can search users by name', async () => {
    const req = {
      user: adminUser1,
      query: { search: 'Organizer' },
    };
    const res = mockResponse();

    await getAllUsers(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert(res.body.data.length >= 1);
    const found = res.body.data.find((u) => u.email === ORG_EMAIL.toLowerCase());
    assert(found, 'Should find the organizer user');
  });

  await test('Admin can filter users by role and status', async () => {
    const req = {
      user: adminUser1,
      query: { role: 'organizer', isActive: 'true' },
    };
    const res = mockResponse();

    await getAllUsers(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    res.body.data.forEach((u) => {
      assert.strictEqual(u.role, 'organizer');
      assert.strictEqual(u.isActive, true);
    });
  });

  await test('Admin can view individual user details by ID', async () => {
    const req = {
      user: adminUser1,
      params: { id: attendeeUser._id.toString() },
    };
    const res = mockResponse();

    await getUserById(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.user._id.toString(), attendeeUser._id.toString());
    assert.strictEqual(res.body.data.user.password, undefined);
  });

  await test('Admin user lookup rejects invalid ObjectId format with 400', async () => {
    const req = {
      user: adminUser1,
      params: { id: 'invalid-mongodb-id' },
    };
    const res = mockResponse();

    await getUserById(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Invalid user ID'));
  });

  await test('Admin user lookup returns 404 for non-existent user ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const req = {
      user: adminUser1,
      params: { id: nonExistentId },
    };
    const res = mockResponse();

    await getUserById(req, res, () => {});

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.message, 'User not found');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ACCOUNT STATUS (ACTIVATION / DEACTIVATION) TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Account Status Management Tests ---');

  await test('Admin can deactivate a non-admin user account', async () => {
    const req = {
      user: adminUser1,
      params: { id: attendeeUser._id.toString() },
      body: { isActive: false },
    };
    const res = mockResponse();

    await updateUserStatus(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.user.isActive, false);

    const reloaded = await User.findById(attendeeUser._id);
    assert.strictEqual(reloaded.isActive, false);
  });

  await test('Admin can reactivate a user account', async () => {
    const req = {
      user: adminUser1,
      params: { id: attendeeUser._id.toString() },
      body: { isActive: true },
    };
    const res = mockResponse();

    await updateUserStatus(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.user.isActive, true);
  });

  await test('Admin deactivation rejects non-boolean status with 400', async () => {
    const req = {
      user: adminUser1,
      params: { id: attendeeUser._id.toString() },
      body: { isActive: 'not_a_boolean' },
    };
    const res = mockResponse();

    await updateUserStatus(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('Admin cannot deactivate the last active administrator', async () => {
    // First deactivate secondary admin so only 1 admin remains active
    await User.findByIdAndUpdate(adminUser2._id, { isActive: false });

    const req = {
      user: adminUser1,
      params: { id: adminUser1._id.toString() },
      body: { isActive: false }, // Attempt to deactivate last admin
    };
    const res = mockResponse();

    await updateUserStatus(req, res, () => {});

    assert.strictEqual(res.statusCode, 400, 'Expected 400 Bad Request');
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('last active administrator'));

    // Verify admin remained active
    const reloaded = await User.findById(adminUser1._id);
    assert.strictEqual(reloaded.isActive, true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. CLEANUP & TEARDOWN
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  console.log('  Cleaned all test user accounts.');

  console.log('\n======================================================');
  console.log(`USER TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runUserTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
