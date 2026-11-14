/**
 * test-db-connection.js
 *
 * Secure connection test for MongoDB Atlas.
 * Validates connection without exposing credentials in logs.
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const testConnection = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ FAIL: MONGO_URI is missing from server/.env');
    process.exit(1);
  }

  const redact = (str) =>
    String(str || '')
      .replace(/mongodb(?:\+srv)?:\/\/[^\s@]+@/gi, 'mongodb+srv://<credentials-redacted>@')
      .replace(/:([^:@]+)@/g, ':<password-redacted>@');

  console.log('Testing connection to MongoDB Atlas...');
  const isAtlas = uri.startsWith('mongodb+srv://');
  console.log(`URI Scheme: ${isAtlas ? 'mongodb+srv (Atlas)' : 'standard'}`);

  // Check database name in URI
  const pathPart = uri.split('?')[0];
  const dbName = pathPart.split('/').pop();
  console.log(`Target Database: ${dbName || '(default)'}`);

  if (dbName !== 'eventsphere') {
    console.warn(`⚠️ Warning: Database name is '${dbName}', expected 'eventsphere'.`);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });

    console.log('✅ PASS: Successfully connected to MongoDB Atlas!');
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    console.log(`Ready State: ${conn.connection.readyState} (1 = connected)`);

    await mongoose.disconnect();
    console.log('Cleanly disconnected.');
    process.exit(0);
  } catch (error) {
    console.error(`❌ FAIL: Connection failed: ${redact(error.message)}`);
    process.exit(1);
  }
};

testConnection();
