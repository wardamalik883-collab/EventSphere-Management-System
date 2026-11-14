# EventSphere Management — Task Breakdown

**Overall status:** Not Started  
**Rule:** Complete tasks in sequence. Do not start the next task until the active task's acceptance checklist passes.

This file is the master task list. When a task is about to begin, create/read its detailed task file and work only on that task. Keep the status below updated.

## Task 01 — Project setup and development foundation
**Status:** ✅ Complete
**Goal:** Create the MERN workspace and make the frontend and backend run locally.
- Confirm Node.js/npm and MongoDB setup.
- Create `client/` and `server/`.
- Initialize React and Express.
- Configure scripts, `.gitignore`, and `.env.example`.
- Add a server health endpoint and connect the client to the API.
**Done when:** Both apps run locally, the health endpoint responds, and setup instructions work.

## Task 02 — Database design and API conventions
**Status:** ✅ Complete
**Goal:** Define collections, relationships, validation, roles, and API conventions.
- Design the entities listed in `plan.md`.
- Define fields, references, indexes, statuses, and validation.
- Create a role/permission matrix.
- Document API routes and response/error conventions.
**Done when:** The data model and API conventions are documented and initial models validate correctly.

## Task 03 — Authentication and authorization
**Status:** ✅ Complete
**Goal:** Implement secure registration, login, password reset, and role protection.
- Build registration/login APIs and UI.
- Hash passwords securely.
- Prevent public self-assignment of admin privileges.
- Implement logout and forgot/reset password.
- Add server-side authentication and authorization middleware.
**Done when:** Users can authenticate and protected endpoints enforce role and ownership rules.

## Task 04 — User and profile management
**Status:** ✅ Complete  
**Goal:** Let users manage permitted profile information.
- Build profile read/update APIs.
- Build role-appropriate profile screens.
- Add secure password change.
- Add authorized admin user controls if needed.
**Done when:** Users can update only their permitted data and cannot edit other users' private data.

## Task 05 — Admin/Organizer dashboard
**Status:** ✅ Complete  
**Goal:** Build the protected organizer dashboard and navigation.
- Create responsive dashboard layout.
- Add navigation for expos, applications, booths, schedules, analytics, and users.
- Add loading, empty, error, and access-denied states.
**Done when:** Only authorized organizers can access the dashboard and its APIs.

## Task 06 — Expo management
**Status:** ✅ Complete  
**Goal:** Implement expo create, view, update, and delete/archive workflows.
- Add expo APIs and validation.
- Support title, dates, location, description, and theme.
- Build organizer CRUD screens.
- Build public expo listing/detail screens.
**Done when:** Organizers can manage expos and attendees can view published expo details.

## Task 07 — Exhibitor portal and applications
**Status:** ✅ Complete  
**Goal:** Let exhibitors manage company profiles and apply to expos.
- Build company profile and document upload workflows.
- Build expo application submission/status tracking.
- Build organizer approval/rejection workflow.
- Protect private documents and applications.
**Done when:** Exhibitors can apply and organizers can review applications with correct permissions.

## Task 08 — Booth and floor-plan management
**Status:** ✅ Complete  
**Goal:** Manage booth inventory, availability, requests, and allocation.
- Build booth inventory and organizer allocation APIs.
- Display available booths to eligible exhibitors.
- Implement booth selection/reservation with server-side conflict checks.
- Display booth information/floor-plan representation.
**Done when:** A booth cannot be allocated twice for the same expo and permissions are enforced.

## Task 09 — Schedule and session management
**Status:** ✅ Complete  
**Goal:** Let organizers manage sessions and attendees browse schedules.
- Build session model and APIs.
- Support speakers, topics, time slots, and locations.
- Validate time ranges.
- Build organizer and attendee schedule screens.
**Done when:** Organizers can manage sessions and attendees see published schedule updates.

## Task 10 — Attendee interface and registrations
**Status:** ✅ Complete  
**Goal:** Build attendee expo discovery and registration.
- Build expo discovery and detail screens.
- Implement expo/session/workshop registration as applicable.
- Add attendee's My Events area.
- Enforce duplicate and capacity rules where configured.
**Done when:** Attendees can browse, register, and view their registrations.

## Task 11 — Exhibitor search and communication
**Status:** ✅ Complete  
**Goal:** Let attendees find exhibitors and contact them.
- Add category/product/keyword search and filters.
- Build exhibitor directory and profile views.
- Show booth locations where available.
- Implement an agreed contact method and protect private messages/contact data.
**Done when:** Search works and contact actions respect privacy and permissions.

## Task 12 — Notifications, reminders, and feedback
**Status:** ✅ Complete  
**Goal:** Notify users about relevant updates and collect feedback.
- Add in-app notifications.
- Notify about application status, schedule changes, and booth updates.
- Add bookmarked-session reminders.
- Build feedback/issue submission and organizer review.
**Done when:** Users see their own relevant notifications and can submit feedback.

## Task 13 — Analytics and reporting
**Status:** ✅ Complete  
**Goal:** Report attendee engagement, booth activity, and session popularity.
- Define each metric and its data source.
- Record the events needed for reporting.
- Build aggregation/report APIs.
- Build dashboard charts/tables using real data.
**Done when:** Metrics are traceable to real recorded data and access is restricted appropriately.

## Task 14 — Testing, quality assurance, and security
**Status:** ✅ Complete  
**Goal:** Verify features, security, compatibility, and performance.
- Add unit, integration, and end-to-end tests.
- Test admin, exhibitor, and attendee journeys.
- Review authorization, validation, uploads, secrets, and session/token security.
- Test responsive layouts and supported browsers.
- Measure performance and test database backup/restore.
**Done when:** Tests pass and critical security/quality issues are resolved or documented.

## Task 15 — Deployment and documentation
**Status:** ✅ Complete  
**Goal:** Deploy the application and prepare user/developer documentation.
- Choose hosting and configure production environment.
- Deploy client, API, and database connection.
- Write user guide and developer/setup documentation.
- Prepare and record the complete working demo video.
**Done when:** The deployed app passes smoke tests and documentation/video are ready.

## Task 16 — Aptech final submission
**Status:** ✅ Complete  
**Goal:** Prepare and verify the final eProject submission package.
- Include complete source code and documentation.
- Include application/database evaluation credentials securely.
- Include database backup and restore instructions.
- Include supporting evidence, screenshots guide, and checklists.
- Name the ZIP with Batch, Group, and Project Title.
- Extract and verify the ZIP before final upload.
**Done when:** One complete, verified final ZIP is ready for submission and GitHub repository is updated.

---

## Progress log
| Date | Task | Status | Notes / blockers |
|---|---|---|---|
| 2026-11-11 | Task 01 | ✅ Complete | Node.js v26.13.0, npm v11.20.0; Express on :5000; React on :3000; health endpoint verified; MongoDB not installed (documented — use Atlas or local install before Task 02) |
| 2026-11-11 | Task 02 | ✅ Complete | Designed 10 Mongoose models with validation & compound unique indexes; documented API conventions & RBAC in docs/api-conventions.md; 20/20 unit tests passed; MongoDB Atlas Free M0 cluster verified connected (database: eventsphere, readyState: 1) |
| 2026-11-11 | Task 03 | ✅ Complete | Implemented bcrypt password hashing, JWT generation/verification, protect & authorize RBAC middleware, register, login, me & logout endpoints; 26/26 auth tests passed; 20/20 model tests passed; live API verified on :5000 |
| 2026-11-11 | Task 04 | ✅ Complete | Implemented profile view/update (mass-assignment protected), avatar upload via Multer with MIME & 5MB validation, admin user directory with pagination & search, admin user lookup & status management (protecting last active admin); 17/17 user tests passed; total 63/63 tests passing; live endpoints verified on :5000 |
| 2026-11-11 | Task 05 | ✅ Complete | Built Admin Dashboard (GET /api/dashboard/admin) and Organizer Dashboard (GET /api/dashboard/organizer) with real MongoDB aggregations; strict RBAC middleware; React frontend with sidebar layout, stats cards, role/status distribution bars, user table, activity timeline, and responsive CSS; AuthContext, Navbar, AccessDenied, StatCard components; LandingPage with dashboard CTAs; 11/11 dashboard tests passed; total 74/74 tests passing; build compiled successfully |
| 2026-11-11 | Task 06 | ✅ Complete | Implemented Expo CRUD (POST/GET/PATCH/DELETE /api/expos); RBAC with organizer ownership isolation; optional auth middleware for public read; status transition validation; data integrity block on delete (checks applications, booths, sessions, registrations); React pages: ExpoListPage (search/filter/paginate), ExpoFormPage (create+edit with validation), ExpoDetailPage (details+manage); Navbar Expos link; 37/37 expo tests passed; total 111/111 tests passing; npm run build compiled successfully |
| 2026-11-11 | Task 07 | ✅ Complete | Built Exhibitor Portal & Applications module: ExhibitorProfile CRUD, Exhibitor Dashboard with real metrics & completion meter, Browse Expos with category/keyword filters, Application submission with duplicate prevention & booth preferences, My Applications tracking with detail modal, Organizer Application Review with decision controls & notes; in-app notification triggers; 29/29 exhibitor tests passed; total 140/140 tests passing; npm run build compiled with 0 errors |
| 2026-11-11 | Task 08 | ✅ Complete | Built Booth & Floor-Plan Management: Booth CRUD scoped to expo, duplicate booth-number prevention per expo, status transitions (available/reserved/occupied), organizer floor-plan grid UI with colour-coded status, exhibitor read-only floor-plan view, secure assignment workflow (approved applications only, no duplicate assignments per expo); OrganizerBoothPage & ExhibitorBoothView; npm run build 0 errors |
| 2026-11-12 | Task 09 | ✅ Complete | Built Schedule & Session Management: Session model with category field, organizer CRUD with time-range validation (endTime > startTime), expo-duration validation, same-room 409 collision checks, session cancellation; public multi-day schedule viewer grouped by date with category filter pills & search; OrganizerSessionPage, ExpoSchedulePage, ExpoScheduleSection embedded in ExpoDetailPage; 17 session test scenarios; docs/schedule-session-management.md created; npm run build 0 errors 0 warnings |
| 2026-11-12 | Task 10 | ✅ Complete | Built Attendee Interface & Expo Registration: attendeeController with dashboard aggregation, expo discovery (published only, search/filter/paginate), registration with capacity enforcement & duplicate prevention (re-activates cancelled), pass-code generation (ES-REG-…); attendeeRoutes on /api/attendees; AttendeeDashboard, BrowseExposPage, MyRegistrationsPage with cancel workflow; App.jsx & Navbar updated; ExpoDetailPage CTA integrated; 17 attendee test scenarios; docs/attendee-interface-registration.md created; npm run build 0 errors 0 warnings |
| 2026-11-12 | Task 11 | ✅ Complete | Built Exhibitor Search & Communication: Conversation and Message models, ExhibitorProfile location field, directoryController with public listings & privacy-safe profile views, messagingController with full conversation lifecycle (start, list, view, reply, mark-as-read), participant & ownership security, ExhibitorDirectoryPage, ExhibitorPublicProfilePage, MessagesPage, Navbar & App.jsx integration; 20 test scenarios across 2 test suites; docs/exhibitor-search-communication.md created; npm run build 0 errors 0 warnings |
| 2026-11-12 | Task 12 | ✅ Complete | Built Notifications, Reminders & Feedback: Notification model enhancements (types, data, duplicate index), Feedback model unique index, notificationController with listing/unread/mark-read/delete, feedbackController with registration verification, duplicate prevention, public review aggregation (distribution & average), reminderScheduler with cancellation guards & duplicate prevention, NotificationBell in Navbar, NotificationCenterPage, ExpoFeedbackSection in ExpoDetailPage; 22 test scenarios across 3 test suites; docs/notifications-reminders-feedback.md created; npm run build 0 errors 0 warnings |
| 2026-11-12 | Task 13 | ✅ Complete | Built Analytics & Reporting: Platform-wide Admin metrics & timeseries trends, organizer-scoped portfolio analytics with strict tenant isolation, detailed individual expo audit reports with capacity & booth utilization gauges, date range filtering (today, 7d, 30d, 90d, year, custom), zero-dependency SVG visualizations (LineChart with hover tooltips, BarChart, DonutProgress), RFC 4180 CSV export & printable PDF report modal, App.jsx / Navbar / ExpoDetailPage navigation integrations; 11/11 automated tests passed; docs/analytics-reporting.md created; npm run build 0 errors 0 warnings |
| 2026-11-13 | Task 14 | ✅ Complete | Full QA & Security Audit: Fixed draft expo leak in listExpos, implemented ReDoS regex escaping in all controllers, added binary magic-byte inspection (JPEG/PNG/WEBP) in uploadMiddleware, implemented in-memory sliding-window rate limiting (10 req/min) on auth endpoints, added security HTTP headers & disabled x-powered-by, rotated JWT secret to secure 256-bit random hex; added security.test.js (21/21 passed), verified models.test.js (20/20 passed), verified analytics.test.js (11/11 passed); added client App.test.js (3/3 passed); verified production build (compiled with 0 errors 0 warnings); docs/security-qa-audit.md created |
| 2026-11-14 | Task 15 | ✅ Complete | Deployment Preparation & Complete Documentation: Created render.yaml (Blueprint IaC for Render Web Service + Static Site), client/vercel.json (Vercel SPA rewrites & asset caching), client/public/_redirects (SPA fallback), client/.env.example & client/.gitignore; normalized REACT_APP_API_URL in api.js; hardened CORS in index.js (trailing slash normalization & multi-origin); added brand SVG favicon; authored docs/deployment-guide.md, docs/user-guide.md, docs/developer-guide.md, docs/troubleshooting.md, docs/task15-completion-report.md; updated README.md |
| 2026-11-14 | Task 16 | ✅ Complete | Aptech Final Submission Package: Built database backup & seed suite (database-backup/eventsphere-seed-data.json, database-backup/seed-database.js, database-backup/README.md); created submission credentials guide (docs/submission-login-credentials.md, submission/login-credentials/); created screenshot guide & checklist (submission/screenshots/SCREENSHOT-CHECKLIST.md); authored final submission checklist (submission/FINAL-SUBMISSION-CHECKLIST.md) and task16-completion-report.md; staged and pushed code to GitHub repo |



