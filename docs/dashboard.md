# EventSphere Management — Dashboard Specification

This document describes the Admin and Organizer Dashboard architecture, endpoints, data definitions, role-based access rules, and frontend structure for EventSphere Management.

---

## 1. Overview

The Dashboard module provides real-time, role-scoped analytics and operational summaries for authorized platform members.

| Dashboard | Authorized Role | Scope |
|---|---|---|
| Admin Dashboard | `admin` | Platform-wide — all users, all expos, all applications |
| Organizer Dashboard | `organizer` | Account-scoped — only the requesting organizer's own expos and application inflows |

**Security principle**: Both dashboards are authenticated and role-locked at the backend middleware level. The API never serves data beyond the requesting user's permission boundary regardless of frontend state.

---

## 2. API Endpoints

### 2.1 Admin Dashboard

| Property | Value |
|---|---|
| **Route** | `GET /api/dashboard/admin` |
| **Authentication** | Required — `Authorization: Bearer <JWT>` |
| **Authorization** | `admin` role only. Any other role or unauthenticated request receives `403 Forbidden`. |
| **Controller** | `server/src/controllers/dashboardController.js` → `getAdminDashboard` |

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Admin dashboard statistics retrieved successfully",
  "data": {
    "stats": {
      "totalUsers": 42,
      "totalAttendees": 30,
      "totalExhibitors": 7,
      "totalOrganizers": 4,
      "totalAdmins": 1,
      "totalActiveUsers": 40,
      "totalInactiveUsers": 2,
      "totalExpos": 8,
      "totalApplications": 15
    },
    "roleDistribution": [
      { "role": "attendee",  "label": "Attendees",       "count": 30, "percentage": 71.4 },
      { "role": "exhibitor", "label": "Exhibitors",      "count": 7,  "percentage": 16.7 },
      { "role": "organizer", "label": "Organizers",      "count": 4,  "percentage": 9.5  },
      { "role": "admin",     "label": "Administrators",  "count": 1,  "percentage": 2.4  }
    ],
    "statusDistribution": {
      "active": 40,
      "inactive": 2,
      "activePercentage": 95.2,
      "inactivePercentage": 4.8
    },
    "recentUsers": [
      { "_id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "attendee", "isActive": true, "createdAt": "2026-11-11T..." }
    ],
    "recentActivities": [
      { "id": "user-...", "type": "user_registration", "title": "New User Registered", "description": "Jane Doe registered as attendee", "timestamp": "2026-11-11T..." }
    ],
    "generatedAt": "2026-11-11T07:56:11.438Z"
  }
}
```

---

### 2.2 Organizer Dashboard

| Property | Value |
|---|---|
| **Route** | `GET /api/dashboard/organizer` |
| **Authentication** | Required — `Authorization: Bearer <JWT>` |
| **Authorization** | `organizer` role only. Admin, Attendee, Exhibitor, or unauthenticated → `403 Forbidden`. |
| **Controller** | `server/src/controllers/dashboardController.js` → `getOrganizerDashboard` |
| **Data Scope** | Strictly scoped to `req.user._id`. No organizer can view another organizer's statistics. |

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Organizer dashboard statistics retrieved successfully",
  "data": {
    "organizer": {
      "_id": "...",
      "name": "Alice Organizer",
      "email": "alice@eventsphere.com",
      "role": "organizer",
      "phone": "+1-555-0100"
    },
    "stats": {
      "totalExpos": 3,
      "upcomingExpos": 1,
      "ongoingExpos": 1,
      "completedExpos": 1,
      "draftExpos": 0,
      "publishedExpos": 2,
      "totalApplications": 7,
      "pendingApplications": 3,
      "approvedApplications": 3,
      "rejectedApplications": 1
    },
    "expoStatusDistribution": [
      { "status": "upcoming",  "label": "Upcoming",  "count": 1 },
      { "status": "ongoing",   "label": "Ongoing",   "count": 1 },
      { "status": "completed", "label": "Completed", "count": 1 },
      { "status": "draft",     "label": "Draft",     "count": 0 }
    ],
    "applicationStatusDistribution": [
      { "status": "pending",  "label": "Pending",  "count": 3 },
      { "status": "approved", "label": "Approved", "count": 3 },
      { "status": "rejected", "label": "Rejected", "count": 1 }
    ],
    "recentExpos": [ ... ],
    "recentApplications": [ ... ],
    "recentActivities": [ ... ],
    "generatedAt": "2026-11-11T07:56:11.438Z"
  }
}
```

---

## 3. Statistics Definitions

### Admin Statistics

| Field | Definition |
|---|---|
| `totalUsers` | `User.countDocuments()` — all registered accounts |
| `totalAttendees` | `User.countDocuments({ role: 'attendee' })` |
| `totalExhibitors` | `User.countDocuments({ role: 'exhibitor' })` |
| `totalOrganizers` | `User.countDocuments({ role: 'organizer' })` |
| `totalAdmins` | `User.countDocuments({ role: 'admin' })` |
| `totalActiveUsers` | `User.countDocuments({ isActive: true })` |
| `totalInactiveUsers` | `User.countDocuments({ isActive: false })` |
| `totalExpos` | `Expo.countDocuments()` — all expos on platform |
| `totalApplications` | `ExhibitorApplication.countDocuments()` — all applications |
| `roleDistribution` | Array of `{ role, label, count, percentage }` for all 4 roles |
| `statusDistribution` | Active vs inactive user counts and percentages |
| `recentUsers` | Last 8 registrations sorted by `createdAt DESC`, password excluded |
| `recentActivities` | Merged list of user registrations + system notifications, sorted by timestamp DESC |

### Organizer Statistics

| Field | Definition |
|---|---|
| `totalExpos` | `Expo.countDocuments({ organizer: req.user._id })` |
| `upcomingExpos` | Expos where `startDate > now` and `organizer === req.user._id` |
| `ongoingExpos` | Expos where `startDate ≤ now ≤ endDate` and `organizer === req.user._id` |
| `completedExpos` | Expos where `endDate < now` and `organizer === req.user._id` |
| `draftExpos` | Expos where `status === 'draft'` and `organizer === req.user._id` |
| `publishedExpos` | Expos where `status === 'published'` and `organizer === req.user._id` |
| `totalApplications` | Applications for all of this organizer's expos |
| `pendingApplications` | Applications with `status === 'pending'` for this organizer's expos |
| `approvedApplications` | Applications with `status === 'approved'` |
| `rejectedApplications` | Applications with `status === 'rejected'` |
| `recentExpos` | Last 5 expos created by this organizer |
| `recentApplications` | Last 5 exhibitor applications with populated exhibitor and expo references |
| `recentActivities` | Merged activities from recent expos, applications, and notifications |

---

## 4. Role-Based Access Rules

| Requesting Role | `GET /api/dashboard/admin` | `GET /api/dashboard/organizer` |
|---|:---:|:---:|
| `admin` | ✅ 200 OK | ❌ 403 Forbidden |
| `organizer` | ❌ 403 Forbidden | ✅ 200 OK (own data only) |
| `exhibitor` | ❌ 403 Forbidden | ❌ 403 Forbidden |
| `attendee` | ❌ 403 Forbidden | ❌ 403 Forbidden |
| Unauthenticated | ❌ 401 Unauthorized | ❌ 401 Unauthorized |

**Tenant Isolation**: Each organizer calling `GET /api/dashboard/organizer` only receives statistics computed from expos where `organizer === req.user._id`. It is architecturally impossible for one organizer to view another's data through this endpoint.

---

## 5. Frontend Structure

### 5.1 New Files Created

| File | Purpose |
|---|---|
| `client/src/context/AuthContext.jsx` | JWT persistence, login/logout, user state via React Context |
| `client/src/components/Navbar.jsx` | Sticky top navigation with role badge and user chip |
| `client/src/components/StatCard.jsx` | Reusable metric card component |
| `client/src/components/AccessDenied.jsx` | 403 Access Denied boundary screen |
| `client/src/pages/AdminDashboard.jsx` | Full admin command centre with sidebar, stats grid, charts, table, activity |
| `client/src/pages/OrganizerDashboard.jsx` | Organizer portal with expo list, application pipeline, and activity feed |
| `client/src/pages/LoginPage.jsx` | Standard login form with evaluation credential presets |
| `client/src/services/dashboardService.js` | Axios-pattern wrappers for dashboard API calls |
| `client/src/styles/AdminDashboard.css` | Admin dashboard responsive dark theme styles |
| `client/src/styles/OrganizerDashboard.css` | Organizer dashboard styles |
| `client/src/styles/Navbar.css` | Navigation bar styles |
| `client/src/styles/LoginPage.css` | Authentication page styles |

### 5.2 Modified Files

| File | Change |
|---|---|
| `client/src/App.jsx` | Added role-based routing (`admin`, `organizer`, `login`, `landing`), AuthProvider wrapper, popstate history support |
| `client/src/pages/LandingPage.jsx` | Added `onNavigate` prop and dashboard CTA buttons |
| `client/src/services/api.js` | Added JWT auto-injection via `tokenStorage`, FormData support |
| `client/src/styles/global.css` | Added `.access-denied-*`, `.role-pill`, `.btn-primary`, `.btn-secondary` utility classes |

### 5.3 Routing Logic

```
Route: /            → LandingPage (always public)
Route: /login       → LoginPage (always public)
Route: /admin       → Requires auth + role=admin
                     → If unauthenticated: redirect to LoginPage
                     → If wrong role:      AccessDenied (403 UI)
                     → If admin:           AdminDashboard
Route: /organizer   → Requires auth + role=organizer
                     → If unauthenticated: redirect to LoginPage
                     → If wrong role:      AccessDenied (403 UI)
                     → If organizer:       OrganizerDashboard
```

---

## 6. Error & Empty States

### API Error States

| Scenario | HTTP Status | Response |
|---|---|---|
| No token / malformed header | 401 | `Not authorized: Missing or malformed token…` |
| Expired/invalid JWT | 401 | `Not authorized: Token is not valid` |
| Deactivated account | 401 | `Not authorized: This user account has been deactivated` |
| Wrong role | 403 | `Access denied: Role '…' is not authorized…` |
| Database error | 500 | Global error handler: `Internal Server Error` |

### Frontend Empty States

Each section in both dashboards renders a visually distinct empty state when no data exists:

| Section | Empty Message |
|---|---|
| Recent Users | "No registered users found." |
| System Activity | "No recent activity events recorded." |
| My Expos (Organizer) | "Zero Expos on Record — Create expos in Expo Management (Task 06)" |
| Applications (Organizer) | "Zero Applications — No exhibitors have applied yet" |
| Activities (Organizer) | "No Recent Activity" |

The Organizer Dashboard accurately reflects **zero counts** when no expos or applications exist, using real MongoDB query results (not stubs).

---

## 7. Backend Server Files

| File | Description |
|---|---|
| `server/src/controllers/dashboardController.js` | Implements `getAdminDashboard` and `getOrganizerDashboard` |
| `server/src/routes/dashboardRoutes.js` | Express router: `GET /admin` and `GET /organizer` with middleware chain |
| `server/src/index.js` | Mounts `app.use('/api/dashboard', dashboardRoutes)` |

---

## 8. Automated Test Suite

**Test file**: `server/test/dashboard.test.js`

Covers:

1. Admin dashboard returns real `totalUsers`, `totalAttendees`, `totalOrganizers`, etc.
2. Admin dashboard excludes password hashes from `recentUsers`.
3. Organizer 1 dashboard: 2 expos, 1 application, correctly scoped.
4. Organizer 2 dashboard: 0 expos, 0 applications, empty arrays returned.
5. Attendee blocked from Admin Dashboard (403).
6. Exhibitor blocked from Admin Dashboard (403).
7. Organizer blocked from Admin Dashboard (403).
8. Admin blocked from Organizer Dashboard (403).
9. Attendee blocked from Organizer Dashboard (403).
10. Exhibitor blocked from Organizer Dashboard (403).
11. Unauthenticated request blocked (401).

**Result**: 11/11 tests passing.

---

## 9. Known Limitations

| Limitation | Reason | Resolution |
|---|---|---|
| Expo CRUD not available | Task 06 not started | Organizer Dashboard accurately shows 0 expos when none exist |
| Exhibitor Portal not available | Task 07 not started | Application counts default to 0 for organizers with no applications |
| No real-time WebSocket updates | Out of scope for Task 05 | Manual "Refresh" button available on both dashboards |
| No chart library (Recharts/Chart.js) | Avoids adding a large dependency without data | Custom pure-CSS progress bars used; full chart library can be added in Task 13 (Analytics) |
