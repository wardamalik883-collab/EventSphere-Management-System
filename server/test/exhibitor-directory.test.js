/**
 * exhibitor-directory.test.js — Exhibitor Directory Test Suite
 * Task 11: Tests for public exhibitor directory and profile endpoints.
 *
 * Run: node test/exhibitor-directory.test.js
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const http = require('http');
const app = require('../src/index');
const { generateToken } = require('../src/utils/generateToken');

// ─── Minimal HTTP helper ───────────────────────────────────────────────────

function request(server, method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const port = addr ? addr.port : (server._port || 5000);
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

// ─── Test runner ─────────────────────────────────────────────────────────────

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

// ─── Setup ───────────────────────────────────────────────────────────────────

let server;
let User, ExhibitorProfile, ExhibitorApplication, Expo;

const TEST_SUFFIX = `_dirtest_${Date.now()}`;

async function setup() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 15000,
  });

  User = require('../src/models/User');
  ExhibitorProfile = require('../src/models/ExhibitorProfile');
  ExhibitorApplication = require('../src/models/ExhibitorApplication');
  Expo = require('../src/models/Expo');

  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  console.log(`[TEST] Directory test server on port ${server.address().port}\n`);
}

async function teardown() {
  // Clean up test data
  const emails = [`ex1${TEST_SUFFIX}@test.com`, `ex2${TEST_SUFFIX}@test.com`];
  const users = await User.find({ email: { $in: emails } }).select('_id').lean();
  const userIds = users.map((u) => u._id);
  if (userIds.length) {
    await ExhibitorProfile.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
  }

  if (server) server.close();
  await mongoose.disconnect();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {
  await setup();

  // Create test exhibitors
  const ex1 = await User.create({
    name: `Exhibitor One${TEST_SUFFIX}`,
    email: `ex1${TEST_SUFFIX}@test.com`,
    password: 'Password1!',
    role: 'exhibitor',
    isActive: true,
  });
  const ex2 = await User.create({
    name: `Exhibitor Two${TEST_SUFFIX}`,
    email: `ex2${TEST_SUFFIX}@test.com`,
    password: 'Password1!',
    role: 'exhibitor',
    isActive: true,
  });

  const prof1 = await ExhibitorProfile.create({
    user: ex1._id,
    companyName: `TechCorp${TEST_SUFFIX}`,
    companyDescription: 'A technology company focused on innovation.',
    industry: 'Technology',
    location: 'Karachi, Pakistan',
    companyWebsite: 'https://techcorp.example.com',
    products: [{ name: 'ProductX', description: 'Innovative product', category: 'Software' }],
  });
  const prof2 = await ExhibitorProfile.create({
    user: ex2._id,
    companyName: `HealthPlus${TEST_SUFFIX}`,
    companyDescription: 'Healthcare solutions provider.',
    industry: 'Healthcare',
    location: 'Lahore, Pakistan',
  });

  // ── 1. List all exhibitors (paginated) ─────────────────────────────────
  await test('1. List all exhibitors returns 200 with paginated data', async () => {
    const res = await request(server, 'GET', '/api/exhibitors/directory?limit=50', null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'success should be true');
    assert(Array.isArray(res.body.data), 'data should be an array');
    assert(typeof res.body.pagination === 'object', 'pagination should be present');
  });

  // ── 2. Search by company name ──────────────────────────────────────────
  await test('2. Search by company name returns matching results', async () => {
    const res = await request(server, 'GET', `/api/exhibitors/directory?search=TechCorp${TEST_SUFFIX}`, null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.length >= 1, 'Should find at least 1 result');
    assert(res.body.data[0].companyName.includes('TechCorp'), 'Result should include TechCorp');
  });

  // ── 3. Filter by industry ──────────────────────────────────────────────
  await test('3. Filter by industry returns only matching industry', async () => {
    const res = await request(server, 'GET', '/api/exhibitors/directory?industry=Healthcare', null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    if (res.body.data.length > 0) {
      res.body.data.forEach((ex) => {
        assert(ex.industry.toLowerCase().includes('healthcare'), `Unexpected industry: ${ex.industry}`);
      });
    }
  });

  // ── 4. Filter by location ──────────────────────────────────────────────
  await test('4. Filter by location returns matching results', async () => {
    const res = await request(server, 'GET', '/api/exhibitors/directory?location=Karachi', null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    if (res.body.data.length > 0) {
      const found = res.body.data.some((ex) => ex.location && ex.location.includes('Karachi'));
      assert(found, 'Should find at least one Karachi exhibitor');
    }
  });

  // ── 5. Pagination returns correct page ────────────────────────────────
  await test('5. Pagination: page=1&limit=1 returns exactly 1 result', async () => {
    const res = await request(server, 'GET', '/api/exhibitors/directory?page=1&limit=1', null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.length <= 1, 'Should have at most 1 result with limit=1');
    assert(res.body.pagination.limit === 1, 'Pagination limit should be 1');
  });

  // ── 6. Sort by newest ─────────────────────────────────────────────────
  await test('6. Sort=newest returns results in reverse chronological order', async () => {
    const res = await request(server, 'GET', '/api/exhibitors/directory?sort=newest&limit=10', null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    if (res.body.data.length >= 2) {
      const dates = res.body.data.map((ex) => new Date(ex.createdAt));
      for (let i = 1; i < dates.length; i++) {
        assert(dates[i - 1] >= dates[i], 'Should be sorted newest first');
      }
    }
  });

  // ── 7. Public profile retrieval ───────────────────────────────────────
  await test('7. Public profile detail returns correct exhibitor data', async () => {
    const res = await request(server, 'GET', `/api/exhibitors/directory/${prof1._id}`, null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.companyName.includes('TechCorp'), 'companyName should match');
    assert(res.body.data.industry === 'Technology', 'industry should match');
    assert(Array.isArray(res.body.data.products), 'products should be an array');
    assert(Array.isArray(res.body.data.participatingExpos), 'participatingExpos should be an array');
  });

  // ── 8. Privacy: no email/phone/password in response ──────────────────
  await test('8. Privacy: response does not expose email, phone, or password', async () => {
    const res = await request(server, 'GET', `/api/exhibitors/directory/${prof1._id}`, null, null);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const bodyStr = JSON.stringify(res.body);
    assert(!bodyStr.includes('"email"') || !bodyStr.includes(`ex1${TEST_SUFFIX}`), 'Should not expose private email');
    assert(!bodyStr.includes('"password"'), 'Should not expose password field');
    // contactPerson should not be in directory response
    assert(!bodyStr.includes('"contactPerson"'), 'Should not expose contactPerson');
    assert(!bodyStr.includes('"documents"'), 'Should not expose documents');
  });

  // ── 9. Invalid exhibitor ID → 400 ────────────────────────────────────
  await test('9. Invalid exhibitor ID returns 400', async () => {
    const res = await request(server, 'GET', '/api/exhibitors/directory/not-a-valid-id', null, null);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.success === false, 'success should be false');
  });

  // ── 10. Non-existent exhibitor ID → 404 ──────────────────────────────
  await test('10. Non-existent exhibitor ID returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(server, 'GET', `/api/exhibitors/directory/${fakeId}`, null, null);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(res.body.success === false, 'success should be false');
  });

  await teardown();
}

runTests()
  .then(() => {
    console.log(`\n[DIRECTORY TESTS] ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('\n[DIRECTORY TESTS] Fatal error:', err.message);
    process.exit(1);
  });
