# EventSphere Management System — Database Backup & Seeding Guide

This directory contains the complete database seed package and backup data for **EventSphere Management System**.

---

## Files in this Directory

| File | Description |
| :--- | :--- |
| `eventsphere-seed-data.json` | Master JSON seed data covering all 12 collections with relational integrity and pre-hashed passwords. |
| `seed-database.js` | Standalone Node.js Mongoose script to seed/restore local or Atlas MongoDB databases. |
| `README.md` | This restoration guide. |

---

## 1. Quick Restoration via Node.js (Recommended)

The provided `seed-database.js` script connects to MongoDB, cleans existing collections, and populates all 12 collections with production-ready sample records.

### Option A: Using the configured environment variable

If `server/.env` or `.env` has `MONGODB_URI` configured:

```bash
node database-backup/seed-database.js
```

### Option B: Restoring to Local MongoDB

```bash
node database-backup/seed-database.js --uri "mongodb://localhost:27017/eventsphere"
```

### Option C: Restoring to MongoDB Atlas

```bash
node database-backup/seed-database.js --uri "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/eventsphere?retryWrites=true&w=majority"
```

> [!NOTE]
> If connecting to MongoDB Atlas, ensure your IP address is whitelisted under **Network Access** in the MongoDB Atlas console (or allow `0.0.0.0/0` for universal access during evaluation).

---

## 2. Seeded Collections & Record Counts

The seed file contains complete documents across all 12 system models:

| Collection | Count | Description |
| :--- | :--- | :--- |
| `users` | 6 | Administrator, Organizer, Exhibitors, and Attendees |
| `expos` | 3 | Global Tech Innovation Expo (Published), MedTech Summit (Published), CleanTech (Draft) |
| `booths` | 6 | Allocated, reserved, and available booths across floor plans |
| `sessions` | 3 | Keynote, cloud architecture, and medical oncology tracks |
| `exhibitorprofiles` | 2 | Verified company profiles (CyberDynamics AI, NovaTech) |
| `exhibitorapplications` | 2 | Approved booth applications with assigned stalls |
| `attendeeregistrations` | 2 | Confirmed tickets with registration numbers (`EXP-GTE-8921`) |
| `bookmarks` | 2 | Attendee session bookmarks |
| `notifications` | 3 | Application approval, ticket confirmation, and organizer alerts |
| `feedbacks` | 2 | Verified 5-star and 4-star attendee ratings & comments |
| `conversations` | 1 | Direct messaging thread between organizer & exhibitor |
| `messages` | 2 | Real-time messages regarding booth technical setup |

---

## 3. Demo Login Credentials

All passwords in the seed data are hashed with `bcryptjs` (salt rounds: 10):

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@eventsphere.demo` | `AdminPass123!` | System statistics, user activation/suspension, audit |
| **Event Organizer** | `organizer@eventsphere.demo` | `OrganizerPass123!` | Full expo CRUD, booth allocation, session scheduling, analytics |
| **Exhibitor** | `exhibitor@eventsphere.demo` | `ExhibitorPass123!` | Profile management, expo application, booth details, messaging |
| **Attendee** | `attendee@eventsphere.demo` | `AttendeePass123!` | Expo browsing, ticket registration, bookmarks, feedback |

---

## 4. Alternative: Importing with `mongoimport`

If you have MongoDB Database Tools installed on your system:

```bash
# Example for users collection
mongoimport --uri="mongodb://localhost:27017/eventsphere" --collection=users --jsonArray --file=database-backup/eventsphere-seed-data.json
```
