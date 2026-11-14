/**
 * notification.test.js — In-App Notification System Test Suite
 * Task 12: Notification creation, listing, unread counts, mark-as-read, delete, and tenant isolation.
 *
 * Run: node test/notification.test.js
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
let User, Notification;
const TS = `_notif_${Date.now()}`;

async function setup() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 15000,
  });

  User = require('../src/models/User');
  Notification = require('../src/models/Notification');

  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  console.log(`[TEST] Notification test server running on port ${server.address().port}\n`);
}

async function teardown() {
  const emails = [`u1${TS}@test.com`, `u2${TS}@test.com`];
  const users = await User.find({ email: { $in: emails } }).select('_id').lean();
  const userIds = users.map((u) => u._id);
  if (userIds.length) {
    await Notification.deleteMany({ recipient: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
  }

  if (server) server.close();
  await mongoose.disconnect();
}

async function runTests() {
  await setup();

  const user1 = await User.create({
    name: `Attendee One${TS}`,
    email: `u1${TS}@test.com`,
    password: 'Password1!',
    role: 'attendee',
    isActive: true,
  });

  const user2 = await User.create({
    name: `Attendee Two${TS}`,
    email: `u2${TS}@test.com`,
    password: 'Password1!',
    role: 'attendee',
    isActive: true,
  });

  const token1 = generateToken(user1._id);
  const token2 = generateToken(user2._id);

  let n1Id, n2Id;

  // ── 1. Create notifications in DB ─────────────────────────────────────────
  await test('1. Notifications can be created with valid Task 12 types', async () => {
    const notif1 = await Notification.create({
      recipient: user1._id,
      title: 'Pass Confirmed',
      message: 'Your registration is complete.',
      type: 'registration_confirmed',
      data: { passCode: 'ES-1234' },
    });
    const notif2 = await Notification.create({
      recipient: user1._id,
      title: 'Schedule Change',
      message: 'Room has moved to Hall B.',
      type: 'schedule_change',
    });
    // Create one for user2
    await Notification.create({
      recipient: user2._id,
      title: 'Private Alert',
      message: 'Belongs to user2.',
      type: 'general',
    });

    n1Id = notif1._id.toString();
    n2Id = notif2._id.toString();
    assert(n1Id && n2Id, 'Notification IDs should be defined');
  });

  // ── 2. List notifications (paginated) ─────────────────────────────────────
  await test('2. GET /api/notifications returns user notifications with pagination', async () => {
    const res = await request(server, 'GET', '/api/notifications?page=1&limit=10', null, token1);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'success should be true');
    assert(Array.isArray(res.body.data.notifications), 'notifications should be an array');
    assert(res.body.data.notifications.length === 2, `Expected 2 notifications, got ${res.body.data.notifications.length}`);
    assert(res.body.data.unreadCount === 2, 'unreadCount should be 2');
  });

  // ── 3. Fast unread count ──────────────────────────────────────────────────
  await test('3. GET /api/notifications/unread-count returns correct count', async () => {
    const res = await request(server, 'GET', '/api/notifications/unread-count', null, token1);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.unreadCount === 2, `Expected 2, got ${res.body.data.unreadCount}`);
  });

  // ── 4. Mark single notification as read ───────────────────────────────────
  await test('4. PATCH /api/notifications/:id/read marks notification as read', async () => {
    const res = await request(server, 'PATCH', `/api/notifications/${n1Id}/read`, null, token1);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.notification.isRead === true, 'isRead should be true');

    // Verify unread count is now 1
    const countRes = await request(server, 'GET', '/api/notifications/unread-count', null, token1);
    assert(countRes.body.data.unreadCount === 1, 'unreadCount should now be 1');
  });

  // ── 5. Mark all as read ───────────────────────────────────────────────────
  await test('5. PATCH /api/notifications/read-all marks all as read', async () => {
    const res = await request(server, 'PATCH', '/api/notifications/read-all', null, token1);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.markedCount >= 1, 'Should have marked at least 1 notification');

    const countRes = await request(server, 'GET', '/api/notifications/unread-count', null, token1);
    assert(countRes.body.data.unreadCount === 0, 'unreadCount should now be 0');
  });

  // ── 6. Tenant isolation / ownership protection ────────────────────────────
  await test('6. User cannot view or modify another user\'s notifications (403)', async () => {
    // User2 attempts to mark User1's notification as read
    const res = await request(server, 'PATCH', `/api/notifications/${n1Id}/read`, null, token2);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.body.success === false, 'success should be false');
  });

  // ── 7. Delete notification ────────────────────────────────────────────────
  await test('7. DELETE /api/notifications/:id deletes own notification', async () => {
    const res = await request(server, 'DELETE', `/api/notifications/${n1Id}`, null, token1);
    assert(res.status === 200, `Expected 200, got ${res.status}`);

    // Verify it is gone
    const check = await Notification.findById(n1Id);
    assert(check === null, 'Notification should be deleted from DB');
  });

  // ── 8. Invalid ID handling ────────────────────────────────────────────────
  await test('8. Invalid notification ID format returns 400', async () => {
    const res = await request(server, 'PATCH', '/api/notifications/invalid-id-123/read', null, token1);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await teardown();
}

runTests()
  .then(() => {
    console.log(`\n[NOTIFICATION TESTS] ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('\n[NOTIFICATION TESTS] Fatal error:', err.message);
    process.exit(1);
  });
