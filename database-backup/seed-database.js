/**
 * seed-database.js — Database Seed and Restore Script
 * EventSphere Management System — Final Aptech Submission
 *
 * Populates all 12 collections with comprehensive sample data for
 * demonstration, testing, and Aptech project evaluation:
 *  - Users (admin, organizer, exhibitor, attendee)
 *  - Expos (published, upcoming, draft)
 *  - Booths (allocated, reserved, available)
 *  - Sessions (keynotes, tech tracks, clinical)
 *  - Exhibitor Profiles (verified companies)
 *  - Exhibitor Applications (approved, under review)
 *  - Attendee Registrations (confirmed tickets)
 *  - Bookmarks (saved sessions)
 *  - Notifications (system, application, reminders)
 *  - Feedbacks (ratings and reviews)
 *  - Conversations & Messages (organizer-exhibitor chat)
 *
 * Usage:
 *   node database-backup/seed-database.js
 *   node database-backup/seed-database.js --uri "mongodb://localhost:27017/eventsphere"
 *   node database-backup/seed-database.js --uri "mongodb+srv://user:pass@cluster..."
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Load environment variables from server/.env if available
const serverEnvPath = path.join(__dirname, '..', 'server', '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  require('dotenv').config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eventsphere',
    drop: true,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--uri' && args[i + 1]) {
      options.uri = args[i + 1];
      i++;
    } else if (args[i] === '--no-drop') {
      options.drop = false;
    }
  }

  return options;
}

// Convert string _id fields and relation references to mongoose.Types.ObjectId
function transformDocument(doc) {
  const transformed = { ...doc };

  if (transformed._id && typeof transformed._id === 'string' && /^[0-9a-fA-F]{24}$/.test(transformed._id)) {
    transformed._id = new mongoose.Types.ObjectId(transformed._id);
  }

  // Relations
  const objectIdFields = [
    'organizer', 'expo', 'assignedTo', 'application', 'user', 'exhibitor',
    'exhibitorProfile', 'reviewedBy', 'attendee', 'session', 'recipient',
    'conversation', 'sender', 'receiver'
  ];

  objectIdFields.forEach((field) => {
    if (transformed[field] && typeof transformed[field] === 'string' && /^[0-9a-fA-F]{24}$/.test(transformed[field])) {
      transformed[field] = new mongoose.Types.ObjectId(transformed[field]);
    }
  });

  if (Array.isArray(transformed.participants)) {
    transformed.participants = transformed.participants.map((p) =>
      typeof p === 'string' && /^[0-9a-fA-F]{24}$/.test(p) ? new mongoose.Types.ObjectId(p) : p
    );
  }

  // Dates
  const dateFields = [
    'startDate', 'endDate', 'assignedAt', 'startTime', 'endTime',
    'reviewedAt', 'readAt', 'lastMessageAt', 'createdAt', 'updatedAt'
  ];

  dateFields.forEach((field) => {
    if (transformed[field] && typeof transformed[field] === 'string') {
      transformed[field] = new Date(transformed[field]);
    }
  });

  return transformed;
}

async function seed() {
  const options = parseArgs();
  const seedFilePath = path.join(__dirname, 'eventsphere-seed-data.json');

  console.log('='.repeat(70));
  console.log('EventSphere Management System — Database Seeder');
  console.log('='.repeat(70));
  console.log(`Connecting to: ${options.uri.replace(/:([^:@]+)@/, ':****@')}`);

  if (!fs.existsSync(seedFilePath)) {
    console.error(`Error: Seed data file not found at ${seedFilePath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));

  try {
    await mongoose.connect(options.uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    console.log('MongoDB connection established successfully.');

    const db = mongoose.connection.db;

    // Map seed keys to collection names
    const collectionsMap = {
      users: 'users',
      expos: 'expos',
      booths: 'booths',
      sessions: 'sessions',
      exhibitorprofiles: 'exhibitorprofiles',
      exhibitorapplications: 'exhibitorapplications',
      attendeeregistrations: 'attendeeregistrations',
      bookmarks: 'bookmarks',
      notifications: 'notifications',
      feedbacks: 'feedbacks',
      conversations: 'conversations',
      messages: 'messages',
    };

    let totalInserted = 0;

    for (const [key, collectionName] of Object.entries(collectionsMap)) {
      const items = rawData[key];
      if (!items || !items.length) {
        console.log(`  - ${collectionName}: (no records)`);
        continue;
      }

      const collection = db.collection(collectionName);

      if (options.drop) {
        await collection.deleteMany({});
      }

      const documents = items.map(transformDocument);
      const result = await collection.insertMany(documents);
      console.log(`  + ${collectionName.padEnd(24)} : ${result.insertedCount} documents seeded`);
      totalInserted += result.insertedCount;
    }

    console.log('-'.repeat(70));
    console.log(`Database seeding completed! Total documents: ${totalInserted}`);
    console.log('='.repeat(70));
    console.log('\nDefault Demo Accounts:');
    console.log('  Admin     : admin@eventsphere.demo     / AdminPass123!');
    console.log('  Organizer : organizer@eventsphere.demo / OrganizerPass123!');
    console.log('  Exhibitor : exhibitor@eventsphere.demo / ExhibitorPass123!');
    console.log('  Attendee  : attendee@eventsphere.demo  / AttendeePass123!');
    console.log('='.repeat(70));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\nDatabase seeding failed:');
    console.error(err.message);
    if (err.name === 'MongooseServerSelectionError') {
      console.error('\nTip: If connecting to MongoDB Atlas, ensure your current IP address is whitelisted in Atlas Network Access (0.0.0.0/0).');
      console.error('Or run against a local MongoDB instance:');
      console.error('  node database-backup/seed-database.js --uri "mongodb://localhost:27017/eventsphere"');
    }
    process.exit(1);
  }
}

seed();
