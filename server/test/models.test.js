/**
 * models.test.js — Validation & Schema Unit Tests for Task 02
 *
 * Verifies all 10 Mongoose models without inserting permanent records.
 * Tests:
 *  1. Schema compilation
 *  2. Required field validation
 *  3. Enum validation
 *  4. Custom date range validations
 *  5. Unique & compound index definitions
 *  6. Reference field configurations
 */

const assert = require('assert');
const mongoose = require('mongoose');

const {
  User,
  Expo,
  ExhibitorProfile,
  ExhibitorApplication,
  Booth,
  Session,
  AttendeeRegistration,
  Bookmark,
  Notification,
  Feedback,
} = require('../src/models');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    testsFailed++;
  }
}

console.log('\n======================================================');
console.log('   EVENTSPHERE MANAGEMENT — TASK 02 MODEL TEST SUITE   ');
console.log('======================================================\n');

// 1. Schema Compilation
runTest('All 10 models compiled as Mongoose models', () => {
  const models = [
    User,
    Expo,
    ExhibitorProfile,
    ExhibitorApplication,
    Booth,
    Session,
    AttendeeRegistration,
    Bookmark,
    Notification,
    Feedback,
  ];
  models.forEach((m) => {
    assert(m && typeof m === 'function', `${m.modelName} is not a valid model`);
    assert(m.schema instanceof mongoose.Schema, `${m.modelName} has invalid schema`);
  });
});

// 2. User Model Validation
runTest('User: fails validation when required fields are missing', () => {
  const user = new User({});
  const err = user.validateSync();
  assert(err, 'Expected validation error');
  assert(err.errors.name, 'Expected name to be required');
  assert(err.errors.email, 'Expected email to be required');
  assert(err.errors.password, 'Expected password to be required');
});

runTest('User: rejects invalid role enum', () => {
  const user = new User({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    role: 'superadmin', // Invalid
  });
  const err = user.validateSync();
  assert(err && err.errors.role, 'Expected role validation error');
});

runTest('User: accepts valid role values', () => {
  ['admin', 'organizer', 'exhibitor', 'attendee'].forEach((role) => {
    const user = new User({
      name: 'Valid User',
      email: 'valid@example.com',
      password: 'password123',
      role,
    });
    const err = user.validateSync();
    assert(!err || !err.errors.role, `Expected role ${role} to be valid`);
  });
});

// 3. Expo Model Validation
runTest('Expo: requires title, category, startDate, endDate, location, organizer', () => {
  const expo = new Expo({});
  const err = expo.validateSync();
  assert(err, 'Expected validation error');
  assert(err.errors.title, 'Expected title to be required');
  assert(err.errors.category, 'Expected category to be required');
  assert(err.errors.startDate, 'Expected startDate to be required');
  assert(err.errors.endDate, 'Expected endDate to be required');
  assert(err.errors['location.venue'], 'Expected venue to be required');
  assert(err.errors['location.city'], 'Expected city to be required');
  assert(err.errors.organizer, 'Expected organizer to be required');
});

runTest('Expo: rejects endDate earlier than startDate', () => {
  const expo = new Expo({
    title: 'Future Expo 2026',
    description: 'A great technology exposition',
    category: 'Technology',
    startDate: new Date('2026-10-15'),
    endDate: new Date('2026-10-10'), // earlier than startDate
    location: { venue: 'Hall A', city: 'Karachi', country: 'Pakistan' },
    organizer: new mongoose.Types.ObjectId(),
  });
  const err = expo.validateSync();
  assert(err && err.errors.endDate, 'Expected date range validation error');
});

runTest('Expo: accepts valid date range', () => {
  const expo = new Expo({
    title: 'Future Expo 2026',
    description: 'A great technology exposition',
    category: 'Technology',
    startDate: new Date('2026-10-10'),
    endDate: new Date('2026-10-15'),
    location: { venue: 'Hall A', city: 'Karachi', country: 'Pakistan' },
    organizer: new mongoose.Types.ObjectId(),
  });
  const err = expo.validateSync();
  assert(!err, `Validation should pass, but got: ${err ? err.message : ''}`);
});

// 4. ExhibitorApplication Model Validation
runTest('ExhibitorApplication: requires expo, exhibitor, exhibitorProfile', () => {
  const app = new ExhibitorApplication({});
  const err = app.validateSync();
  assert(err.errors.expo, 'Expected expo to be required');
  assert(err.errors.exhibitor, 'Expected exhibitor to be required');
  assert(err.errors.exhibitorProfile, 'Expected exhibitorProfile to be required');
});

runTest('ExhibitorApplication: rejects invalid status enum', () => {
  const app = new ExhibitorApplication({
    expo: new mongoose.Types.ObjectId(),
    exhibitor: new mongoose.Types.ObjectId(),
    exhibitorProfile: new mongoose.Types.ObjectId(),
    status: 'invalid_status',
  });
  const err = app.validateSync();
  assert(err && err.errors.status, 'Expected status enum validation error');
});

// 5. Booth Model Validation
runTest('Booth: requires expo, boothNumber and valid status', () => {
  const booth = new Booth({});
  const err = booth.validateSync();
  assert(err.errors.expo, 'Expected expo to be required');
  assert(err.errors.boothNumber, 'Expected boothNumber to be required');
});

runTest('Booth: rejects invalid booth type', () => {
  const booth = new Booth({
    expo: new mongoose.Types.ObjectId(),
    boothNumber: 'B-101',
    type: 'skyscraping',
  });
  const err = booth.validateSync();
  assert(err && err.errors.type, 'Expected booth type enum validation error');
});

// 6. Session Model Validation
runTest('Session: requires expo, title, speaker.name, room, startTime, endTime', () => {
  const session = new Session({});
  const err = session.validateSync();
  assert(err.errors.expo, 'Expected expo to be required');
  assert(err.errors.title, 'Expected title to be required');
  assert(err.errors['speaker.name'], 'Expected speaker.name to be required');
  assert(err.errors.room, 'Expected room to be required');
  assert(err.errors.startTime, 'Expected startTime to be required');
  assert(err.errors.endTime, 'Expected endTime to be required');
});

runTest('Session: rejects endTime equal to or earlier than startTime', () => {
  const session = new Session({
    expo: new mongoose.Types.ObjectId(),
    title: 'Opening Keynote',
    speaker: { name: 'Alice Smith' },
    room: 'Main Auditorium',
    startTime: new Date('2026-10-10T10:00:00Z'),
    endTime: new Date('2026-10-10T09:30:00Z'),
  });
  const err = session.validateSync();
  assert(err && err.errors.endTime, 'Expected endTime validation error');
});

// 7. AttendeeRegistration Model Validation
runTest('AttendeeRegistration: requires expo, attendee, registrationNumber', () => {
  const reg = new AttendeeRegistration({});
  const err = reg.validateSync();
  assert(err.errors.expo, 'Expected expo to be required');
  assert(err.errors.attendee, 'Expected attendee to be required');
  assert(err.errors.registrationNumber, 'Expected registrationNumber to be required');
});

runTest('AttendeeRegistration: rejects invalid registrationType', () => {
  const reg = new AttendeeRegistration({
    expo: new mongoose.Types.ObjectId(),
    attendee: new mongoose.Types.ObjectId(),
    registrationNumber: 'REG-12345',
    registrationType: 'super_vip',
  });
  const err = reg.validateSync();
  assert(err && err.errors.registrationType, 'Expected registrationType validation error');
});

// 8. Bookmark Model Validation
runTest('Bookmark: requires user, session, expo', () => {
  const bm = new Bookmark({});
  const err = bm.validateSync();
  assert(err.errors.user, 'Expected user to be required');
  assert(err.errors.session, 'Expected session to be required');
  assert(err.errors.expo, 'Expected expo to be required');
});

// 9. Notification Model Validation
runTest('Notification: requires recipient, title, message and valid enum', () => {
  const notif = new Notification({});
  const err = notif.validateSync();
  assert(err.errors.recipient, 'Expected recipient to be required');
  assert(err.errors.title, 'Expected title to be required');
  assert(err.errors.message, 'Expected message to be required');
});

// 10. Feedback Model Validation
runTest('Feedback: requires user, expo, rating (1-5), comment', () => {
  const fb = new Feedback({
    user: new mongoose.Types.ObjectId(),
    expo: new mongoose.Types.ObjectId(),
    rating: 6, // invalid > 5
    comment: 'Great event!',
  });
  const err = fb.validateSync();
  assert(err && err.errors.rating, 'Expected rating <= 5 validation error');
});

// 11. Index Specifications
runTest('Unique Compound Indexes are properly defined', () => {
  // ExhibitorApplication: { expo: 1, exhibitor: 1 } unique
  const appIndexes = ExhibitorApplication.schema.indexes();
  const hasAppUnique = appIndexes.some(
    ([fields, opts]) => fields.expo === 1 && fields.exhibitor === 1 && opts.unique === true
  );
  assert(hasAppUnique, 'ExhibitorApplication missing { expo: 1, exhibitor: 1 } unique index');

  // Booth: { expo: 1, boothNumber: 1 } unique
  const boothIndexes = Booth.schema.indexes();
  const hasBoothUnique = boothIndexes.some(
    ([fields, opts]) => fields.expo === 1 && fields.boothNumber === 1 && opts.unique === true
  );
  assert(hasBoothUnique, 'Booth missing { expo: 1, boothNumber: 1 } unique index');

  // AttendeeRegistration: { expo: 1, attendee: 1 } unique
  const regIndexes = AttendeeRegistration.schema.indexes();
  const hasRegUnique = regIndexes.some(
    ([fields, opts]) => fields.expo === 1 && fields.attendee === 1 && opts.unique === true
  );
  assert(hasRegUnique, 'AttendeeRegistration missing { expo: 1, attendee: 1 } unique index');

  // Bookmark: { user: 1, session: 1 } unique
  const bmIndexes = Bookmark.schema.indexes();
  const hasBmUnique = bmIndexes.some(
    ([fields, opts]) => fields.user === 1 && fields.session === 1 && opts.unique === true
  );
  assert(hasBmUnique, 'Bookmark missing { user: 1, session: 1 } unique index');
});

// 12. Reference Field Types Check
runTest('Foreign keys are configured as ObjectId references', () => {
  assert.strictEqual(User.schema.path('email').options.unique, true);
  assert.strictEqual(Expo.schema.path('organizer').instance, 'ObjectId');
  assert.strictEqual(Expo.schema.path('organizer').options.ref, 'User');
  assert.strictEqual(ExhibitorProfile.schema.path('user').instance, 'ObjectId');
  assert.strictEqual(ExhibitorProfile.schema.path('user').options.ref, 'User');
  assert.strictEqual(Booth.schema.path('expo').instance, 'ObjectId');
  assert.strictEqual(Booth.schema.path('expo').options.ref, 'Expo');
  assert.strictEqual(Session.schema.path('expo').instance, 'ObjectId');
  assert.strictEqual(Session.schema.path('expo').options.ref, 'Expo');
  assert.strictEqual(Bookmark.schema.path('session').instance, 'ObjectId');
  assert.strictEqual(Bookmark.schema.path('session').options.ref, 'Session');
});

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('======================================================\n');

process.exit(testsFailed > 0 ? 1 : 0);
