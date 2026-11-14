/**
 * api/index.js — Vercel Serverless Function Entry Point
 * EventSphere Management System
 *
 * Bridges Vercel serverless HTTP requests to the Express application instance.
 */

const app = require('../server/src/index');

module.exports = app;
