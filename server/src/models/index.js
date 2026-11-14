/**
 * models/index.js — Central Model Exports
 *
 * Exports all 12 Mongoose models for EventSphere Management.
 * Task 11 added: Conversation, Message
 */

const User = require('./User');
const Expo = require('./Expo');
const ExhibitorProfile = require('./ExhibitorProfile');
const ExhibitorApplication = require('./ExhibitorApplication');
const Booth = require('./Booth');
const Session = require('./Session');
const AttendeeRegistration = require('./AttendeeRegistration');
const Bookmark = require('./Bookmark');
const Notification = require('./Notification');
const Feedback = require('./Feedback');
const Conversation = require('./Conversation');
const Message = require('./Message');

module.exports = {
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
  Conversation,
  Message,
};
