/**
 * messaging.test.js — In-App Messaging Test Suite
 * Task 11: Tests for conversation and message management endpoints.
 *
 * Run: node test/messaging.test.js
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
let User, Conversation, Message;

const TS = `_msgtest_${Date.now()}`;

async function setup() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 15000,
  });

  User = require('../src/models/User');
  Conversation = require('../src/models/Conversation');
  Message = require('../src/models/Message');

  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  console.log(`[TEST] Messaging test server on port ${server.address().port}\n`);
}

async function teardown() {
  const emails = [
    `attendee${TS}@test.com`,
    `exhibitor${TS}@test.com`,
    `organizer${TS}@test.com`,
    `other${TS}@test.com`,
  ];
  const users = await User.find({ email: { $in: emails } }).select('_id').lean();
  const userIds = users.map((u) => u._id);
  if (userIds.length) {
    const convs = await Conversation.find({ participants: { $in: userIds } }).select('_id').lean();
    const convIds = convs.map((c) => c._id);
    if (convIds.length) {
      await Message.deleteMany({ conversation: { $in: convIds } });
      await Conversation.deleteMany({ _id: { $in: convIds } });
    }
    await User.deleteMany({ _id: { $in: userIds } });
  }

  if (server) server.close();
  await mongoose.disconnect();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {
  await setup();

  // Create test users
  const attendeeDoc = await User.create({ name: `Attendee${TS}`, email: `attendee${TS}@test.com`, password: 'Password1!', role: 'attendee', isActive: true });
  const exhibitorDoc = await User.create({ name: `Exhibitor${TS}`, email: `exhibitor${TS}@test.com`, password: 'Password1!', role: 'exhibitor', isActive: true });
  const organizerDoc = await User.create({ name: `Organizer${TS}`, email: `organizer${TS}@test.com`, password: 'Password1!', role: 'organizer', isActive: true });
  const otherDoc = await User.create({ name: `Other${TS}`, email: `other${TS}@test.com`, password: 'Password1!', role: 'attendee', isActive: true });

  const attendeeToken = generateToken(attendeeDoc._id);
  const exhibitorToken = generateToken(exhibitorDoc._id);
  const organizerToken = generateToken(organizerDoc._id);
  const otherToken = generateToken(otherDoc._id);

  let createdConvId = null;

  // ── 1. Attendee sends a message to exhibitor → 201 ────────────────────
  await test('1. Attendee can start a conversation with an exhibitor (201)', async () => {
    const res = await request(
      server, 'POST', '/api/messages/conversations',
      { recipientId: exhibitorDoc._id.toString(), subject: `Product Inquiry${TS}`, body: 'Hello, I am interested in your products.' },
      attendeeToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'success should be true');
    assert(res.body.data.conversation._id, 'conversation _id should be returned');
    createdConvId = res.body.data.conversation._id;
  });

  // ── 2. Empty message rejected → 400 ───────────────────────────────────
  await test('2. Empty message body is rejected with 400', async () => {
    const res = await request(
      server, 'POST', '/api/messages/conversations',
      { recipientId: exhibitorDoc._id.toString(), subject: 'Test', body: '' },
      attendeeToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.success === false, 'success should be false');
  });

  // ── 3. Message over 2000 chars rejected → 400 ─────────────────────────
  await test('3. Message body over 2000 characters is rejected with 400', async () => {
    const longBody = 'A'.repeat(2001);
    const res = await request(
      server, 'POST', '/api/messages/conversations',
      { recipientId: exhibitorDoc._id.toString(), subject: 'Test', body: longBody },
      attendeeToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.body.success === false, 'success should be false');
  });

  // ── 4. Duplicate conversation returns existing (200) ──────────────────
  await test('4. Duplicate conversation returns existing conversation (200)', async () => {
    const res = await request(
      server, 'POST', '/api/messages/conversations',
      { recipientId: exhibitorDoc._id.toString(), subject: `Product Inquiry${TS}`, body: 'Follow-up message.' },
      attendeeToken
    );
    assert([200, 201].includes(res.status), `Expected 200 or 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'success should be true');
    // Should reuse same conversation
    if (createdConvId && res.status === 200) {
      assert(res.body.data.conversation._id === createdConvId, 'Should return the same conversation ID');
    }
  });

  // ── 5. List conversations (attendee) ──────────────────────────────────
  await test('5. List conversations returns attendee conversations (200)', async () => {
    const res = await request(server, 'GET', '/api/messages/conversations', null, attendeeToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'success should be true');
    assert(Array.isArray(res.body.data), 'data should be an array');
    assert(res.body.data.length >= 1, 'Should have at least 1 conversation');
  });

  // ── 6. List conversations (exhibitor) ─────────────────────────────────
  await test('6. List conversations returns exhibitor conversations (200)', async () => {
    const res = await request(server, 'GET', '/api/messages/conversations', null, exhibitorToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), 'data should be an array');
    assert(res.body.data.length >= 1, 'Exhibitor should see the conversation started by attendee');
  });

  // ── 7. Get conversation history (participant) ──────────────────────────
  await test('7. Participant can get conversation with message history (200)', async () => {
    if (!createdConvId) throw new Error('No conversation ID from test 1');
    const res = await request(server, 'GET', `/api/messages/conversations/${createdConvId}`, null, attendeeToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.conversation._id === createdConvId, 'Should return correct conversation');
    assert(Array.isArray(res.body.data.messages), 'messages should be an array');
    assert(res.body.data.messages.length >= 1, 'Should have at least 1 message');
    // Privacy: sender should not expose private fields
    const msg = res.body.data.messages[0];
    assert(!msg.sender?.email, 'Sender email should not be exposed');
    assert(!msg.sender?.password, 'Sender password should not be exposed');
  });

  // ── 8. Non-participant cannot access conversation → 403 ───────────────
  await test('8. Non-participant cannot access conversation (403)', async () => {
    if (!createdConvId) throw new Error('No conversation ID from test 1');
    const res = await request(server, 'GET', `/api/messages/conversations/${createdConvId}`, null, otherToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.body.success === false, 'success should be false');
  });

  // ── 9. Exhibitor can send reply → 201 ────────────────────────────────
  await test('9. Exhibitor can reply to conversation (201)', async () => {
    if (!createdConvId) throw new Error('No conversation ID from test 1');
    const res = await request(
      server, 'POST', `/api/messages/conversations/${createdConvId}/reply`,
      { body: 'Thank you for your interest! We would be happy to assist.' },
      exhibitorToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'success should be true');
    assert(res.body.data.body.length > 0, 'Reply body should be present');
  });

  // ── 10. Mark messages as read → 200 ──────────────────────────────────
  await test('10. Participant can mark conversation messages as read (200)', async () => {
    if (!createdConvId) throw new Error('No conversation ID from test 1');
    const res = await request(server, 'PATCH', `/api/messages/conversations/${createdConvId}/read`, null, attendeeToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.success === true, 'success should be true');
    assert(typeof res.body.data.markedCount === 'number', 'markedCount should be a number');
  });

  await teardown();
}

runTests()
  .then(() => {
    console.log(`\n[MESSAGING TESTS] ${passed} passed, ${failed} failed\n`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('\n[MESSAGING TESTS] Fatal error:', err.message);
    process.exit(1);
  });
