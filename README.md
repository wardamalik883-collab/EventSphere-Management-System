# EventSphere Management System

A comprehensive, enterprise-ready **MERN stack** web application for managing trade shows, conventions, and expositions. EventSphere unites organizers, exhibitors, and attendees onto a single synchronized, role-based platform.

---

## 🏗️ Project Progress Status

| Task | Module / Description | Status | Reference Documentation |
|:---:|---|:---:|---|
| **01** | Project Setup & Development Foundation | ✅ Complete | Express on `:5000`, React on `:3000`, Health API |
| **02** | Database Design & API Conventions | ✅ Complete | [`docs/api-conventions.md`](docs/api-conventions.md) |
| **03** | Authentication & Authorization (RBAC) | ✅ Complete | [`docs/authentication.md`](docs/authentication.md) |
| **04** | User & Profile Management | ✅ Complete | [`docs/user-management.md`](docs/user-management.md) |
| **05** | Admin & Organizer Dashboards | ✅ Complete | [`docs/dashboard.md`](docs/dashboard.md) |
| **06** | Expo Event Management CRUD | ✅ Complete | [`docs/expo-management.md`](docs/expo-management.md) |
| **07** | Exhibitor Portal & Applications | ✅ Complete | [`docs/exhibitor-portal.md`](docs/exhibitor-portal.md) |
| **08** | Booth Inventory & Floor-Plan Allocation | ✅ Complete | [`docs/booth-floor-plan.md`](docs/booth-floor-plan.md) |
| **09** | Schedule & Session Management | ✅ Complete | [`docs/schedule-session-management.md`](docs/schedule-session-management.md) |
| **10** | Attendee Interface & Registrations | ✅ Complete | [`docs/attendee-interface-registration.md`](docs/attendee-interface-registration.md) |
| **11** | Exhibitor Search & 1-on-1 Messaging | ✅ Complete | [`docs/exhibitor-search-communication.md`](docs/exhibitor-search-communication.md) |
| **12** | Notifications, Reminders & Reviews | ✅ Complete | [`docs/notifications-reminders-feedback.md`](docs/notifications-reminders-feedback.md) |
| **13** | Analytics, CSV Export & Printable PDF | ✅ Complete | [`docs/analytics-reporting.md`](docs/analytics-reporting.md) |
| **14** | Testing, Quality Assurance & Security Audit | ✅ Complete | [`docs/security-qa-audit.md`](docs/security-qa-audit.md) |
| **15** | Deployment Preparation & Complete Documentation | ✅ Complete | [`docs/deployment-guide.md`](docs/deployment-guide.md) |
| **16** | Aptech Final Submission Package | ⏳ Pending | Awaiting approval |

---

## 📋 Problem Statement & Objectives

### The Problem
Traditional expo and trade-show management relies on disconnected spreadsheets, manual floor-plan diagrams, paper ticket registration, and fragmented communication between organizers and exhibitors. This leads to booth double-booking, scheduling conflicts, lost exhibitor applications, and poor attendee engagement.

### Objectives
1. **Unified Platform:** Replace disconnected workflows with a central web application for expos, booths, schedules, and analytics.
2. **Role-Based Security:** Protect sensitive organizer data, exhibitor documents, and attendee registrations with role-based authorization (RBAC) and tenant isolation.
3. **Automated Inventory Control:** Prevent booth double-booking and schedule collisions at the database constraint level.
4. **Real-Time Communication:** In-app messaging, automated 24-hour reminders, and notification center.
5. **Actionable Insights:** Platform-wide and organizer-level analytics with CSV export and printable PDF reports.

---

## 🚀 Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | **React.js 18** | Single-page application built with Create React App, React Context, and CSS Modules. |
| **Backend** | **Node.js + Express.js** | Stateless REST API adhering to controller-service patterns with strict RBAC middleware. |
| **Database** | **MongoDB Atlas** | Cloud NoSQL database with Mongoose 8 ODM, compound unique indexes, and schema validation. |
| **Authentication** | **JWT + Bcrypt.js** | Stateless JSON Web Tokens (HS256) and Bcrypt (salt 10) password hashing. |
| **File Storage** | **Multer** | Secure disk storage with binary magic-byte validation (JPEG, PNG, WEBP) and 5MB cap. |
| **Reporting** | **Zero-Dependency SVG** | Lightweight native SVG charts (`LineChart`, `BarChart`, `DonutProgress`), RFC 4180 CSV export. |

---

## 👥 User Roles & Capabilities

- 👑 **Administrator:** Manages user accounts, activates/deactivates accounts, views system-wide analytics, audits all expos.
- 🎪 **Organizer:** Creates and manages expos, designs color-coded booth floor plans, approves/rejects exhibitor applications, allocates booths with double-booking prevention, manages speaker sessions, exports CSV/PDF reports.
- 🏢 **Exhibitor:** Manages company profile, products, and documents, applies to exhibit at published expos, tracks application decisions, views allocated booth space, chats with attendees.
- 🎟️ **Attendee:** Discovers published expos, registers for events (generating unique `ES-REG-...` pass-codes), bookmarks sessions, receives automated 24h reminders, searches exhibitor directory, submits 1–5 star reviews.

---

## 📁 Repository Structure

```
EventSphere/
├── client/                      # React frontend
│   ├── public/                  # Static assets, SVG icon, _redirects (SPA routing)
│   ├── src/
│   │   ├── components/          # Reusable UI components (Navbar, AccessDenied, Charts)
│   │   ├── context/             # AuthContext (JWT management & global auth state)
│   │   ├── pages/               # 21 role-based screen components
│   │   ├── services/            # Centralized API service with JWT injection
│   │   ├── styles/              # CSS stylesheets
│   │   ├── App.jsx              # Root component & role-gated routing
│   │   └── App.test.js          # Automated React QA test suite
│   ├── .env.example             # Client environment template
│   ├── package.json             # React dependencies & scripts
│   └── vercel.json              # Vercel deployment rewrites & cache headers
│
├── server/                      # Express backend API
│   ├── src/
│   │   ├── config/              # MongoDB connection helper
│   │   ├── controllers/         # 14 business logic controllers
│   │   ├── middleware/          # authMiddleware, uploadMiddleware, rateLimiter, errorHandler
│   │   ├── models/              # 12 Mongoose models with compound unique indexes
│   │   ├── routes/              # Express REST routes
│   │   └── utils/               # sanitize, generateToken, reminderScheduler, logger
│   ├── test/                    # 16 automated backend test suites (models, security, analytics)
│   ├── uploads/                 # Local avatar storage (gitignored)
│   ├── .env.example             # Server environment template
│   └── package.json             # Express dependencies & scripts
│
├── docs/                        # Comprehensive project documentation
│   ├── deployment-guide.md      # Step-by-step production deployment guide
│   ├── user-guide.md            # Role-by-role user manual
│   ├── developer-guide.md       # Architecture & engineering handbook
│   ├── troubleshooting.md       # Diagnosis and resolution guide
│   ├── security-qa-audit.md     # Task 14 Security & QA audit report
│   └── task15-completion-report.md # Task 15 Completion report
│
├── .env.example                 # Root environment template
├── .gitignore                   # Multi-tier exclusion list
├── plan.md                      # Master project specification
├── render.yaml                  # Render Blueprint (Infrastructure-as-Code)
└── task.md                      # Task breakdown & progress log
```

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js** ≥ 18.0.0 ([Download](https://nodejs.org/))
- **npm** ≥ 9.0.0
- **MongoDB Atlas** account (or local MongoDB on port 27017)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd "EventSphere Management System"

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` templates in both `server/` and `client/`:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

Edit `server/.env` with your actual database and JWT values:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/eventsphere?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=your_super_secret_key_at_least_32_characters
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE_MB=5
REMINDER_WINDOW_HOURS=24
```

### 3. Start the Servers
Open two terminal windows:

```bash
# Terminal 1 — Start Express backend (runs on http://localhost:5000)
cd server
npm run dev

# Terminal 2 — Start React frontend (runs on http://localhost:3000)
cd client
npm start
```

Visit **http://localhost:3000** in your web browser.

---

## 🧪 Testing Commands

```bash
# Backend Model Validation Tests (20 tests passed)
cd server
node test/models.test.js

# Backend Security, Auth, ReDoS, Magic-Bytes & Rate Limiting (21 tests passed)
node test/security.test.js

# Backend Analytics & Reporting Unit Tests (11 tests passed)
node test/analytics.test.js

# Run full security test suite
npm run test:security

# Frontend Component & Route Guard Tests (3 tests passed)
cd ../client
npm test -- --watchAll=false
```

---

## 🌐 Production Deployment Architecture

EventSphere is prepared for zero-downtime production deployment across modern cloud platforms:

- **Frontend:** Hosted on **Vercel** as a Create React App Single Page Application with SPA rewrites (`client/vercel.json`).
- **Backend:** Hosted on **Render** as a Node.js Web Service (`render.yaml`) with health check at `/api/health`.
- **Database:** Hosted on **MongoDB Atlas** (M0 Free Tier or Dedicated Cluster) with replica set and automated backups.

Detailed step-by-step instructions are available in the [`docs/deployment-guide.md`](docs/deployment-guide.md).

### Live Deployment Status
- **Backend API:** Prepared for Render deployment (`render.yaml`).
- **Frontend App:** Prepared for Vercel deployment (`client/vercel.json` + `_redirects`).
- **Health Check Endpoint:** `GET /api/health`
- *Note:* Live production URLs will be populated once external hosting accounts are connected in accordance with the deployment plan.

---

## 📚 Complete Project Documentation Index

- 📖 [User Guide](docs/user-guide.md) — Step-by-step role manual for Admins, Organizers, Exhibitors, and Attendees.
- 🛠️ [Developer Guide](docs/developer-guide.md) — Architecture, Mongoose models, coding conventions, and API organization.
- 🚀 [Deployment Guide](docs/deployment-guide.md) — Production hosting setup on Vercel, Render, and MongoDB Atlas.
- 🔧 [Troubleshooting Guide](docs/troubleshooting.md) — Common error diagnosis and resolutions.
- 🔒 [Security & QA Audit Report](docs/security-qa-audit.md) — Detailed Task 14 security findings and verification results.
- 📊 [Task 15 Completion Report](docs/task15-completion-report.md) — Final summary of deployment preparation and documentation deliverables.
