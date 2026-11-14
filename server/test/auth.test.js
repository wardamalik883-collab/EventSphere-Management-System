/**
 * auth.test.js — Comprehensive Authentication & Authorization Unit & Integration Test Suite
 *
 * Covers:
 *  1. User Registration (Success, Duplicate, Missing fields, Invalid email, Weak password, Role escalation prevention, Password hashing)
 *  2. User Login (Success, Incorrect password, Unknown email, Missing credentials, Password stripping)
 *  3. JWT Generation & Verification (Signature, Claims, Expiry)
 *  4. Protect Middleware (Missing token, Malformed header, Invalid token, Expired token, Inactive user, Active user)
 *  5. Authorize Middleware (Admin access, Organizer access, Exhibitor access, Attendee access, Forbidden role, Multi-role)
 *  6. GET /api/auth/me Profile Lookup
 *  7. Clean Teardown (Removes test records from database)
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { generateToken, verifyToken } = require('../src/utils/generateToken');
const { protect, authorize } = require('../src/middleware/authMiddleware');
const {
  register,
  login,
  getMe,
} = require('../src/controllers/authController');

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

// Mock Express response helper
function mockResponse() {
  const res = {
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
  return res;
}

const TEST_TIMESTAMP = Date.now();
const TEST_EMAIL_1 = `authtest1_${TEST_TIMESTAMP}@eventsphere.test`;
const TEST_EMAIL_2 = `authtest2_${TEST_TIMESTAMP}@eventsphere.test`;
const TEST_EMAIL_ADMIN = `authtest_admin_${TEST_TIMESTAMP}@eventsphere.test`;
const TEST_EMAIL_ORG = `authtest_org_${TEST_TIMESTAMP}@eventsphere.test`;
const TEST_EMAIL_EXH = `authtest_exh_${TEST_TIMESTAMP}@eventsphere.test`;
const TEST_EMAIL_INACTIVE = `authtest_inactive_${TEST_TIMESTAMP}@eventsphere.test`;

async function runAuthTestSuite() {
  console.log('\n======================================================');
  console.log('   EVENTSPHERE — TASK 03 AUTH & RBAC TEST SUITE       ');
  console.log('======================================================\n');

  // Ensure DB is connected
  const connected = await connectDB();
  if (!connected) {
    console.error('Cannot run auth tests without database connection.');
    console.error('Ensure MongoDB is reachable and your IP address is whitelisted in MongoDB Atlas.');
    process.exit(1);
  }

  // Clean any old test records
  await User.deleteMany({ email: /@eventsphere\.test$/ });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. REGISTRATION TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Registration Tests ---');

  await test('Registration succeeds with valid attendee credentials', async () => {
    const req = {
      body: {
        name: 'Alice Attendee',
        email: TEST_EMAIL_1,
        password: 'Password123!',
      },
    };
    const res = mockResponse();
    let nextCalled = false;

    await register(req, res, (err) => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 201, 'Expected 201 Created');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, TEST_EMAIL_1.toLowerCase());
    assert.strictEqual(res.body.data.user.role, 'attendee');
    assert.strictEqual(typeof res.body.data.token, 'string');
    assert.strictEqual(res.body.data.user.password, undefined, 'Password must not be in response');
  });

  await test('Password is saved as a bcrypt hash and never plaintext', async () => {
    const userInDb = await User.findOne({ email: TEST_EMAIL_1.toLowerCase() });
    assert(userInDb, 'User must exist in DB');
    assert(userInDb.password !== 'Password123!', 'Password must NOT be plaintext');
    assert(userInDb.password.startsWith('$2a$') || userInDb.password.startsWith('$2b$'), 'Password must be a bcrypt hash');
  });

  await test('Registration rejects duplicate email addresses with 409', async () => {
    const req = {
      body: {
        name: 'Alice Duplicate',
        email: TEST_EMAIL_1.toUpperCase(), // Test case-insensitive duplicate check
        password: 'Password123!',
      },
    };
    const res = mockResponse();

    await register(req, res, () => {});

    assert.strictEqual(res.statusCode, 409, 'Expected 409 Conflict');
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('already exists'));
  });

  await test('Registration rejects missing name, email, or password with 400', async () => {
    const req = { body: { name: '', email: '', password: '' } };
    const res = mockResponse();

    await register(req, res, () => {});

    assert.strictEqual(res.statusCode, 400, 'Expected 400 Bad Request');
    assert.strictEqual(res.body.success, false);
  });

  await test('Registration rejects invalid email format with 400', async () => {
    const req = {
      body: {
        name: 'Bob Invalid',
        email: 'bob-not-an-email',
        password: 'Password123!',
      },
    };
    const res = mockResponse();

    await register(req, res, () => {});

    assert.strictEqual(res.statusCode, 400, 'Expected 400 Bad Request');
    assert(res.body.message.includes('valid email'));
  });

  await test('Registration rejects password shorter than 8 characters with 400', async () => {
    const req = {
      body: {
        name: 'Charlie Short',
        email: TEST_EMAIL_2,
        password: 'short', // 5 chars
      },
    };
    const res = mockResponse();

    await register(req, res, () => {});

    assert.strictEqual(res.statusCode, 400, 'Expected 400 Bad Request');
    assert(res.body.message.includes('8 characters'));
  });

  await test('Registration prevents public privilege escalation (cannot register as admin)', async () => {
    const req = {
      body: {
        name: 'Malicious User',
        email: TEST_EMAIL_2,
        password: 'Password123!',
        role: 'admin', // Attempted escalation
      },
    };
    const res = mockResponse();

    await register(req, res, () => {});

    assert.strictEqual(res.statusCode, 201, 'Should register successfully');
    assert.strictEqual(res.body.data.user.role, 'attendee', 'Role must be forced to attendee');

    const dbUser = await User.findOne({ email: TEST_EMAIL_2 });
    assert.strictEqual(dbUser.role, 'attendee', 'Database role must strictly be attendee');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. LOGIN TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Login Tests ---');

  await test('Login succeeds with correct email and password', async () => {
    const req = {
      body: {
        email: TEST_EMAIL_1,
        password: 'Password123!',
      },
    };
    const res = mockResponse();

    await login(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Expected 200 OK');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(typeof res.body.data.token, 'string');
    assert.strictEqual(res.body.data.user.email, TEST_EMAIL_1.toLowerCase());
    assert.strictEqual(res.body.data.user.password, undefined, 'Password hash must never be in login response');
  });

  await test('Login rejects incorrect password with generic 401', async () => {
    const req = {
      body: {
        email: TEST_EMAIL_1,
        password: 'WrongPassword999!',
      },
    };
    const res = mockResponse();

    await login(req, res, () => {});

    assert.strictEqual(res.statusCode, 401, 'Expected 401 Unauthorized');
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Invalid email or password');
  });

  await test('Login rejects unknown email with generic 401', async () => {
    const req = {
      body: {
        email: 'nonexistent_user_999@eventsphere.test',
        password: 'Password123!',
      },
    };
    const res = mockResponse();

    await login(req, res, () => {});

    assert.strictEqual(res.statusCode, 401, 'Expected 401 Unauthorized');
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Invalid email or password');
  });

  await test('Login rejects missing email or password with 400', async () => {
    const req = {
      body: {
        email: '',
        password: '',
      },
    };
    const res = mockResponse();

    await login(req, res, () => {});

    assert.strictEqual(res.statusCode, 400, 'Expected 400 Bad Request');
    assert.strictEqual(res.body.success, false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. JWT TOKEN GENERATION & VERIFICATION TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. JWT Token Tests ---');

  let sampleToken;
  await test('JWT generation creates valid signed token with id and role claims', () => {
    const mockId = new mongoose.Types.ObjectId();
    sampleToken = generateToken(mockId, 'organizer');
    assert(sampleToken && typeof sampleToken === 'string');

    const decoded = verifyToken(sampleToken);
    assert.strictEqual(decoded.id, mockId.toString());
    assert.strictEqual(decoded.role, 'organizer');
  });

  await test('JWT verification rejects tampered token', () => {
    assert.throws(() => {
      verifyToken(sampleToken + 'tampered');
    }, /invalid signature|jwt malformed/);
  });

  await test('JWT verification rejects expired token', () => {
    const expiredToken = jwt.sign(
      { id: '123', role: 'attendee' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    assert.throws(() => {
      verifyToken(expiredToken);
    }, /jwt expired/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. AUTHENTICATION (PROTECT) MIDDLEWARE TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Protect Middleware Tests ---');

  // Seed role-specific users for testing
  const adminUser = await User.create({
    name: 'Admin Test',
    email: TEST_EMAIL_ADMIN,
    password: 'Password123!',
    role: 'admin',
  });

  const orgUser = await User.create({
    name: 'Organizer Test',
    email: TEST_EMAIL_ORG,
    password: 'Password123!',
    role: 'organizer',
  });

  const exhUser = await User.create({
    name: 'Exhibitor Test',
    email: TEST_EMAIL_EXH,
    password: 'Password123!',
    role: 'exhibitor',
  });

  const inactiveUser = await User.create({
    name: 'Inactive Test',
    email: TEST_EMAIL_INACTIVE,
    password: 'Password123!',
    role: 'attendee',
    isActive: false,
  });

  await test('Protect rejects request with missing Authorization header (401)', async () => {
    const req = { headers: {} };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert(res.body.message.includes('Missing or malformed'));
  });

  await test('Protect rejects request with malformed Authorization header (no Bearer) (401)', async () => {
    const req = { headers: { authorization: 'Basic 12345' } };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
  });

  await test('Protect rejects invalid JWT signature (401)', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.value' } };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert(res.body.message.includes('Invalid authentication token'));
  });

  await test('Protect rejects expired JWT with explicit expiry message (401)', async () => {
    const expired = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${expired}` } };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert(res.body.message.includes('expired'));
  });

  await test('Protect rejects deactivated/inactive user (401)', async () => {
    const token = generateToken(inactiveUser._id, inactiveUser.role);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert(res.body.message.includes('deactivated'));
  });

  await test('Protect accepts valid token and attaches user without password to req.user', async () => {
    const token = generateToken(adminUser._id, adminUser.role);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockResponse();
    let nextCalled = false;

    await protect(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true, 'Next must be called');
    assert(req.user, 'req.user must be populated');
    assert.strictEqual(req.user._id.toString(), adminUser._id.toString());
    assert.strictEqual(req.user.password, undefined, 'req.user must not include password');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ROLE-BASED AUTHORIZATION (AUTHORIZE) MIDDLEWARE TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Role-Based Authorization Tests ---');

  await test('Authorize grants access when user has permitted role', () => {
    const req = { user: { role: 'admin' } };
    const res = mockResponse();
    let nextCalled = false;

    authorize('admin', 'organizer')(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true, 'Admin should have access');
  });

  await test('Authorize grants organizer access to organizer routes', () => {
    const req = { user: { role: 'organizer' } };
    const res = mockResponse();
    let nextCalled = false;

    authorize('organizer')(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true, 'Organizer should have access');
  });

  await test('Authorize grants exhibitor access to exhibitor routes', () => {
    const req = { user: { role: 'exhibitor' } };
    const res = mockResponse();
    let nextCalled = false;

    authorize('exhibitor')(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true, 'Exhibitor should have access');
  });

  await test('Authorize grants attendee access to attendee routes', () => {
    const req = { user: { role: 'attendee' } };
    const res = mockResponse();
    let nextCalled = false;

    authorize('attendee')(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true, 'Attendee should have access');
  });

  await test('Authorize denies access with 403 Forbidden when user lacks required role', () => {
    const req = { user: { role: 'attendee' } };
    const res = mockResponse();
    let nextCalled = false;

    authorize('admin', 'organizer')(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Attendee must be denied access');
    assert.strictEqual(res.statusCode, 403, 'Expected 403 Forbidden');
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('Access denied'));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. GET /api/auth/me ENDPOINT TESTS
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Current User (GET /me) Tests ---');

  await test('GET /me returns currently authenticated user profile safely', async () => {
    const req = { user: orgUser };
    const res = mockResponse();

    await getMe(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, TEST_EMAIL_ORG.toLowerCase());
    assert.strictEqual(res.body.data.user.role, 'organizer');
    assert.strictEqual(res.body.data.user.password, undefined, 'Password must not be returned in /me');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CLEAN TEARDOWN
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Cleanup ---');
  await User.deleteMany({ email: /@eventsphere\.test$/ });
  console.log('  Cleaned all test user accounts.');

  console.log('\n======================================================');
  console.log(`AUTH TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(failedTests > 0 ? 1 : 0);
}

runAuthTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
