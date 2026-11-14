/**
 * index.js — EventSphere Express API entry point
 *
 * Responsibilities:
 *  1. Load environment variables from .env
 *  2. Create and configure the Express application
 *  3. Attempt MongoDB connection (non-fatal if unavailable in Task 01)
 *  4. Mount API routes
 *  5. Register 404 and global error-handling middleware
 *  6. Start the HTTP server
 *
 * Run:
 *   npm run dev   (nodemon, auto-restart)
 *   npm start     (plain node)
 */

const path = require('path');

// Load .env from the server root (one level up from src/)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const expoRoutes = require('./routes/expoRoutes');
const { exhibitorRouter, organizerRouter } = require('./routes/exhibitorRoutes');
const boothRoutes = require('./routes/boothRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendeeRoutes = require('./routes/attendeeRoutes');
const directoryRoutes = require('./routes/directoryRoutes');
const messagingRoutes = require('./routes/messagingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { feedbackRouter } = require('./routes/feedbackRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { startReminderScheduler, stopReminderScheduler } = require('./utils/reminderScheduler');



const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./utils/logger');

// ─── Application setup ───────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ─── CORS ────────────────────────────────────────────────────────────────────
// Allow requests from the React dev server (and any additional origins listed
// in CLIENT_ORIGIN, comma-separated). Normalizes trailing slashes.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman) in development
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
  })
);

// ─── Body parsers ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Request logger ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Static files ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ─── Serverless DB Connection Assurance ─────────────────────────────────────
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (_) {
      // connectDB handles logging
    }
  }
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expos', expoRoutes);
app.use('/api/exhibitors', exhibitorRouter);
app.use('/api/organizer', organizerRouter);
app.use('/api/booths', boothRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendees', attendeeRoutes);
app.use('/api/exhibitors/directory', directoryRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRouter);
app.use('/api/analytics', analyticsRoutes);



// Root route — basic confirmation that the API is reachable
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the EventSphere Management API',
    docs: 'GET /api/health for server status',
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use(notFound);

// ─── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ────────────────────────────────────────────────────────────
const startServer = async () => {
  // Attempt DB connection; server starts regardless of outcome in Task 01
  const dbConnected = await connectDB();

  if (!dbConnected) {
    console.warn(
      '[SERVER] MongoDB is not connected. The server will start anyway.\n' +
        '         Set a valid MONGO_URI in server/.env to connect.'
    );
  } else {
    // Start background reminder scheduler once DB is connected
    startReminderScheduler();
  }

  const server = app.listen(PORT, () => {
    console.log(`\n[SERVER] EventSphere API running on http://localhost:${PORT}`);
    console.log(`[SERVER] Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[SERVER] Port ${PORT} is already in use. ` +
          'Stop the existing process or change PORT in server/.env.'
      );
    } else {
      console.error('[SERVER] Server error:', err.message);
    }
    process.exit(1);
  });

  // Graceful shutdown on SIGTERM / SIGINT
  const shutdown = (signal) => {
    console.log(`\n[SERVER] ${signal} received — shutting down gracefully...`);
    stopReminderScheduler();
    server.close(() => {
      console.log('[SERVER] HTTP server closed.');
      process.exit(0);
    });
  };


  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled promise rejections (Node 15+: process exits; log here first)
  process.on('unhandledRejection', (reason) => {
    console.error('[SERVER] Unhandled Promise Rejection:', reason);
  });
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app; // exported for potential testing use
