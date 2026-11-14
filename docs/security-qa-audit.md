# EventSphere Management System — Security, Quality Assurance (QA) & Audit Report

**Task 14 Deliverable**  
**Project:** EventSphere Management System (MERN Stack)  
**Date:** November 13, 2026  
**Auditor:** QA & Security Engineering  
**Scope:** Complete Codebase (Tasks 01–13 Verification, Backend, Frontend, Database, Configuration, Dependencies)

---

## 1. Project Modules Tested

The complete application was systematically audited across 14 distinct functional modules:

1. **Authentication & Session Management** (`/api/auth`): Registration, login, logout, password hashing, JWT signing/verification.
2. **User & Profile Management** (`/api/users`): Profile reading/editing, avatar media upload, admin directory, account activation status.
3. **Admin Dashboard** (`/api/dashboard/admin`): System-wide aggregations, user distribution, activity feed.
4. **Organizer Dashboard** (`/api/dashboard/organizer`): Organizer-scoped expo portfolio, pending applications, booth occupancy metrics.
5. **Expo Event Management** (`/api/expos`): CRUD lifecycle, date/capacity validation, status transitions, deletion referential integrity checks.
6. **Exhibitor Portal & Applications** (`/api/exhibitors`): Profile creation, document attachments, booth preference submission, application review workflow (`/api/organizer/applications`).
7. **Booth & Floor-Plan Management** (`/api/booths`): Booth inventory, floor plan grid, atomic allocation (`findOneAndUpdate`), double-booking guard, unallocation release.
8. **Schedule & Session Management** (`/api/sessions`): Session CRUD, speaker information, same-room collision detection, multi-day public schedule viewer.
9. **Attendee Interface & Registrations** (`/api/attendees`): Public expo discovery, ticket generation (`ES-REG-...`), capacity enforcement, duplicate prevention & re-activation.
10. **Exhibitor Search & Directory** (`/api/exhibitors/directory`): Keyword search, category/industry filters, privacy-safe public exhibitor profile view.
11. **In-App Messaging** (`/api/messages`): Direct 1-on-1 participant conversations, unread counters, message length restrictions, participant isolation.
12. **Notifications & Reminders** (`/api/notifications`): In-app notification center, background automated scheduler (`reminderScheduler.js`), duplicate prevention.
13. **Feedback & Reviews** (`/api/feedback`): Verified attendee reviews, 1–5 star ratings, star distribution aggregations, reviewer name anonymization.
14. **Analytics & Reporting** (`/api/analytics`): Multi-range time series trends, booth utilization gauge, zero-dependency SVG charts, RFC 4180 CSV export, printable PDF report modal.

---

## 2. Authentication Audit

- **Password Hashing:** Passwords are encrypted using `bcryptjs` with salt rounds = 10 via the Mongoose `pre('save')` hook in `User.js`. Plaintext passwords are never persisted to the database.
- **Credential Verification:** Authentication uses `User.prototype.matchPassword` to compare candidate passwords with the stored bcrypt hash. Invalid password attempts do not distinguish between non-existent emails and wrong passwords (preventing user enumeration).
- **JWT Verification & Signing:** JSON Web Tokens are signed using `HS256` with claims `{ id, role }`. Tokens have a configurable expiration (default 7 days).
- **JWT Secret Rotation:** The placeholder secret was replaced with a cryptographically secure 256-bit random hex string (`4d21f3d5d428b522...`) in `server/.env`.
- **Token Invalidation & Expiry:** Expired tokens throw `TokenExpiredError` and return `401 Token has expired. Please log in again.` Tampered tokens throw `JsonWebTokenError` and return `401 Invalid authentication token`.
- **Deactivated Accounts:** The `protect` middleware checks `user.isActive` in the database for each authenticated request, immediately invalidating access for deactivated accounts.

---

## 3. Authorization & Access Control (RBAC) Audit

- **Role Separation:** 4 distinct user roles are strictly enforced: `admin`, `organizer`, `exhibitor`, `attendee`.
- **Privilege Escalation Prevention:**
  - `POST /api/auth/register` ignores any `role` attribute passed in the request body and enforces the default role `attendee`.
  - `PUT /api/users/me` uses strict field whitelisting (`name`, `phone`, `avatarUrl`) and ignores `role`, `isActive`, or `password`.
- **Tenant Isolation (IDOR Prevention):**
  - **Organizers:** Can only view, update, delete, or manage booths/sessions for expos they created. Attempting to manage another organizer's expo returns `403 Access denied`.
  - **Exhibitors:** Can only view and edit their own profiles and applications.
  - **Attendees:** Can only view their own registrations and notifications (`recipient: req.user._id`).
  - **Messaging:** Direct messaging endpoints enforce `conversation.participants.some(p => p._id.equals(req.user._id))`; non-participants receive `403 Access denied`.
- **Draft Expo Privacy:** Fixed an issue where `GET /api/expos?status=draft` could previously be queried by public users. The controller now explicitly restricts `draft` queries to `admin` and `organizer` (owner) with `403 Access denied`.

---

## 4. API & Backend Security Audit

- **NoSQL Injection & ReDoS Protection:**
  - Created `server/src/utils/sanitize.js` with `escapeRegex()`.
  - Applied regex escaping to all search and filter queries across `userController.js`, `expoController.js`, `boothController.js`, `directoryController.js`, and `sessionController.js`.
  - Special characters like `.*+?^${}()|[]\` are escaped to prevent catastrophic backtracking and unhandled syntax errors.
- **Rate Limiting:**
  - Implemented an in-memory sliding window rate limiter in `server/src/middleware/rateLimiter.js`.
  - Protected sensitive authentication endpoints (`POST /api/auth/login`, `POST /api/auth/register`) with a limit of 10 requests per minute per IP.
  - Returns HTTP `429 Too Many Requests` with a standard `Retry-After` header.
- **Security HTTP Headers:**
  - `X-Content-Type-Options: nosniff` (prevents MIME type sniffing).
  - `X-Frame-Options: DENY` (clickjacking protection).
  - `X-XSS-Protection: 1; mode=block` (legacy XSS filter).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `app.disable('x-powered-by')` removes the Express fingerprint.
- **CORS Configuration:** Restricts allowed origins via `CLIENT_ORIGIN` environment variable (`http://localhost:3000`).
- **Production Error Handling:** Global error handler in `errorHandler.js` suppresses internal stack traces in production mode (`NODE_ENV === 'production'`).

---

## 5. File Upload Security Findings

- **Allowed Extensions & MIME Types:** Only `.jpg`, `.jpeg`, `.png`, and `.webp` extensions and matching MIME types are permitted.
- **Magic Bytes Binary Validation:**
  - Implemented `verifyImageMagicBytes` in `uploadMiddleware.js` to inspect the initial 12 bytes of uploaded files.
  - Validates JPEG signature (`FF D8 FF`), PNG signature (`89 50 4E 47`), and WEBP signature (`RIFF....WEBP`).
  - Disguised executable files (e.g. PHP or shell scripts renamed to `.png`) are rejected immediately, and the file is deleted from disk.
- **File Size Restrictions:** Enforces a 5MB limit (`maxFileSizeMB = 5`) via Multer with friendly error messages.
- **Sanitized Filenames & Path Traversal Prevention:** Uploads use timestamped random filenames (`avatar-<userId>-<timestamp>-<random><ext>`) stored in a dedicated directory. Path traversal attempts via `originalname` are completely neutralized.
- **Old File Cleanup:** When a user uploads a new avatar, `userController.js` removes their previous avatar from disk to prevent storage bloat.

---

## 6. Database & Data Integrity Checks

- **Compound Unique Indexes:**
  - `User`: `{ email: 1 }` (unique).
  - `Booth`: `{ expo: 1, boothNumber: 1 }` (unique).
  - `Booth`: `{ expo: 1, assignedTo: 1 }` (unique with partial filter `{ assignedTo: { $type: 'objectId' } }` preventing double-booking).
  - `ExhibitorApplication`: `{ expo: 1, exhibitor: 1 }` (unique).
  - `AttendeeRegistration`: `{ expo: 1, attendee: 1 }` (unique), `{ registrationNumber: 1 }` (unique).
  - `Feedback`: `{ expo: 1, user: 1 }` (unique).
  - `Conversation`: `{ 'participants.0': 1, 'participants.1': 1, relatedExpo: 1 }` (unique).
  - `Bookmark`: `{ user: 1, session: 1 }` (unique).
- **Concurrency & Atomic Operations:**
  - Booth allocation uses atomic `Booth.findOneAndUpdate({ _id, status: { $in: ['available', 'reserved'] }, assignedTo: null }, ...)` to eliminate race conditions.
  - Registration capacity check and unique index handle concurrent signups gracefully (MongoDB error code 11000 caught and converted to HTTP 409).
- **Safe Deletion Guards:**
  - Deleting an Expo is blocked if active exhibitor applications, booths, sessions, or registrations exist.
  - Deleting an allocated booth is blocked until it is unallocated.

---

## 7. Frontend Quality Assurance Results

- **Routing & Navigation:**
  - 21 pages verified in `client/src/App.jsx`.
  - Browser history synchronization (`pushState` / `popState`) verified.
  - URL deep-linking supported for sub-routes (`/expo-detail/:id`, `/organizer-booths/:id`, `/expo-schedule/:id`, etc.).
- **Role-Based View Guards:**
  - Unauthenticated access to protected routes redirects to `LoginPage`.
  - Unauthorized role access renders the `AccessDenied` component with clear guidance and back-navigation.
- **Loading & Empty States:**
  - `dashboard-spinner` renders during data fetches.
  - Empty states render across tables and lists when no records are found.
- **API Error Handling:** Form submission errors and API failure messages are displayed to users via clear inline banners.
- **Automated Frontend Tests:** Added `client/src/App.test.js` verifying component rendering, route protection, and navigation.

---

## 8. Responsive Design Checks

The interface was verified across key viewport breakpoints:

| Viewport | Screen Width | Navbar | Dashboard Grid | Tables | Modals |
|---|---|---|---|---|---|
| **Mobile** | < 640px | Collapses to hamburger / vertical stack | Single-column (1 col) | Horizontal scroll wrapper | Full-width overlay |
| **Tablet** | 641px – 1024px | Wrap layout with icon badges | 2-column grid | Compact columns | Centered modal (90% width) |
| **Desktop** | > 1024px | Full horizontal navigation bar | 3 to 4-column cards | Full data table | Centered modal (max 700px) |

---

## 9. Accessibility (a11y) Checks

- **Form Labels & Inputs:** Forms use semantic `<label>` tags with matching `htmlFor` attributes.
- **Keyboard Navigation:** All interactive elements (`<button>`, `<a>`, custom clickable cards) support keyboard focus (`tabIndex={0}`) and Enter/Space trigger.
- **Focus Rings:** Visible `:focus-visible` outline styles are maintained in CSS for accessible keyboard navigation.
- **Color Contrast:** Navy (`#0f172a`), slate (`#64748b`), and accent blue (`#2563eb`) meet WCAG 2.1 AA contrast requirements against light backgrounds.
- **Image Alt Attributes:** Profile avatars and expo banners include descriptive `alt` text.

---

## 10. Performance Testing & Optimization

- **Database Indexes:** Compound indexes support sorting and filtering by `status`, `category`, and `startDate`.
- **Lean Query Projections:** Aggregations and read-only endpoints utilize `.lean()` to reduce Mongoose document overhead.
- **Pagination:** All listing endpoints (`/api/expos`, `/api/users`, `/api/notifications`, `/api/exhibitors/directory`) enforce maximum limits (e.g. 50 or 100 items per page).
- **SVG Visualizations:** Zero third-party heavyweight charting libraries; custom lightweight SVG components (`LineChart`, `BarChart`, `DonutProgress`) eliminate bundle bloat.
- **Frontend Bundle Size:** Optimized production build weighs only **98.53 kB gzip** (`main.js`) and **21.99 kB gzip** (`main.css`).

---

## 11. Dependency & Configuration Audit

- **Server Dependencies (`server/package.json`):**
  - `bcryptjs` ^3.0.3, `cors` ^2.8.5, `dotenv` ^16.4.5, `express` ^4.19.2, `jsonwebtoken` ^9.0.3, `mongoose` ^8.4.1, `multer` ^2.5.0.
  - `npm audit` on server: 0 high/critical vulnerabilities in production dependencies (2 moderate vulnerabilities in devDependency `nodemon`/`minimatch`).
- **Client Dependencies (`client/package.json`):**
  - Standard Create-React-App dependencies (`react-scripts 5.0.1`).
  - No major breaking package upgrades forced to maintain stack stability.
- **Environment & Secrets:**
  - `.env` files are excluded from Git via root and subfolder `.gitignore`.
  - `.env.example` provides complete placeholders with zero committed secrets.
  - MongoDB connection string redacts user credentials in public health checks and log outputs.

---

## 12. Bugs Discovered & Remediations

| ID | Module | Vulnerability / Bug | Severity | Status | Remediation Details |
|---|---|---|---|---|---|
| **BUG-01** | Expo Controller | `listExpos` allowed public visitors to view draft expos via `?status=draft` query override. | High | ✅ Fixed | Added privilege check: non-admin/non-organizer queries with `status=draft` return `403 Access denied`. |
| **BUG-02** | Search Endpoints | Unsanitized user search input passed to `new RegExp()` risked ReDoS attacks and syntax errors. | Medium | ✅ Fixed | Created `server/src/utils/sanitize.js` with `escapeRegex()` and applied across all search endpoints. |
| **BUG-03** | File Upload | Avatar upload validated extension and MIME header, but lacked binary magic byte inspection. | Medium | ✅ Fixed | Implemented `verifyImageMagicBytes()` in `uploadMiddleware.js` checking JPEG, PNG, and WEBP signatures. |
| **BUG-04** | Authentication | Lack of rate limiting on login and registration endpoints. | Medium | ✅ Fixed | Built in-memory sliding window rate limiter (`rateLimiter.js`) enforcing 10 attempts/min per IP with HTTP 429. |
| **BUG-05** | Configuration | `JWT_SECRET` was set to default placeholder text in `server/.env`. | Medium | ✅ Fixed | Generated and configured a cryptographically random 256-bit secret. |
| **BUG-06** | Test Runner | Test files hung when MongoDB Atlas was unreachable due to IP whitelisting. | Low | ✅ Fixed | Added explicit connection guards and `process.exit()` handlers across test suites. |
| **BUG-07** | Frontend Tests | Missing automated React integration tests. | Low | ✅ Fixed | Created `client/src/App.test.js` covering rendering, role gating, and Navbar navigation. |

---

## 13. Remaining Known Issues / Operational Notes

1. **MongoDB Atlas IP Whitelisting:**
   - The remote MongoDB Atlas cluster (`cluster0.nabqr4w.mongodb.net`) requires incoming client IPs to be listed in the Atlas Network Access tab.
   - For live deployment or running integration tests connecting directly to Atlas, ensure the current external IP (`223.123.54.133`) or `0.0.0.0/0` (anywhere) is whitelisted in Atlas.
2. **Stateless JWT Blacklisting:**
   - Tokens remain valid until expiration (7 days). For high-security enterprise deployments, a Redis token blacklist or shorter expiration with refresh tokens can be introduced.

---

## 14. Test Execution Results

### Backend Automated Test Suite
- **Model Validation Suite (`test/models.test.js`):** **20 / 20 Passed (100%)**
- **Security & QA Audit Suite (`test/security.test.js`):** **21 / 21 Passed (100%)**
- **Analytics Unit Suite (`test/analytics.test.js`):** **11 / 11 Passed (100%)**
- **Combined Backend Total:** **52 Passed, 0 Failed**

### Frontend Automated Test Suite
- **Component & QA Tests (`src/App.test.js`):** **3 / 3 Passed (100%)**
  - Test 1: App renders without crashing and loads LandingPage.
  - Test 2: AccessDenied component renders 403 status and required role.
  - Test 3: Navbar renders branding and navigation links.

---

## 15. Production Build Verification

- **Frontend Compilation (`npm run build`):**
  - Tool: `react-scripts build`
  - Result: **Compiled successfully with 0 errors and 0 warnings.**
  - Output artifacts:
    - `build/static/js/main.2f738639.js` (98.53 kB gzip)
    - `build/static/css/main.0a6838e6.css` (21.99 kB gzip)
- **Backend API Startup (`GET /api/health`):**
  - HTTP Status: **200 OK**
  - Response body: `{"status":"ok","message":"EventSphere API is running","environment":"development",...}`
  - Security headers present: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.

---

## 16. Security Recommendations

1. **Enforce HTTPS in Production:** Ensure a reverse proxy (e.g. Nginx, Cloudflare, AWS ALB) terminates TLS with an active SSL certificate.
2. **CORS Hardening:** In production, restrict `CLIENT_ORIGIN` to the exact deployed frontend domain (e.g. `https://eventsphere.example.com`).
3. **Environment Security:** Maintain separate `.env` files for staging and production environments and rotate secrets periodically.

---

## 17. Conclusion & Quality Sign-Off

The EventSphere Management System has completed full QA and security testing for Task 14. All discovered vulnerabilities have been resolved, regression and security test suites are passing, the frontend production build compiles cleanly, and the project is fully stabilized for deployment.
