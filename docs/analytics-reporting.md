# EventSphere — Analytics & Reporting Engine

## Task 13 Documentation

---

## 1. Overview

Task 13 introduces a comprehensive Analytics & Reporting Engine for the EventSphere Management System:

1. **Admin Analytics Command Center** — Platform-wide business intelligence directly aggregated from MongoDB, covering user growth, role distributions, expo statuses, booth allocation rates, exhibitor application funnel, and attendee feedback.
2. **Organizer Analytics Portfolio** — Strict tenant-isolated analytics scoped solely to the logged-in organizer's expos (`organizer: req.user._id`), including registration counts, application review rates, floor plan occupancy, and feedback ratings.
3. **Expo Performance & Audit Reports** — Deep-dive audit report modal for individual expos with registration velocity timelines, capacity gauges, booth space breakdown, rating distributions, and instant tabular data export.
4. **Pure SVG Responsive Data Visualizations** — Custom React SVG charting components (`LineChart`, `BarChart`, `DonutProgress`) providing 100% React 18 compatibility, zero external bundle bloat, responsive viewBox scaling, interactive hover tooltips, and crisp vector rendering.
5. **Printable PDF & CSV Export Workflows** — Browser print layout (`@media print`) generating presentation-ready PDF reports and client-side RFC 4180 CSV export for platform, organizer, and expo metrics.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   React Frontend                       │
│  - AnalyticsDashboardPage (Admin & Organizer Views)    │
│  - ExpoReportModal (Detailed Audit Report + Print/PDF) │
│  - Pure SVG Visualizations (LineChart, BarChart, Donut)│
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (JWT Protected)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Express Analytics Routes                 │
│                 /api/analytics/...                     │
│  - protect middleware (JWT authentication)             │
│  - authorize middleware (role-based boundaries)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             analyticsController.js                     │
│  - parseDateRange (today, 7d, 30d, 90d, year, custom)  │
│  - buildDailyTimeline (zero-filled calendar series)    │
│  - Tenant Isolation Guards (req.user._id verification) │
└──────────────────────────┬─────────────────────────────┘
                           │ MongoDB Aggregations
                           ▼
┌────────────────────────────────────────────────────────┐
│                MongoDB Collections                     │
│   Users | Expos | AttendeeRegistrations | Booths       │
│     ExhibitorApplications | Sessions | Feedback        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Analytics REST APIs

All endpoints require `Authorization: Bearer <token>`.

### 3.1 Admin Analytics (`role === 'admin'`)

| Method | Endpoint | Query Parameters | Description |
|---|---|---|---|
| `GET` | `/api/analytics/admin/overview` | `period`, `startDate`, `endDate` | Platform-wide totals for users, expos, registrations, applications, booths, and feedback. |
| `GET` | `/api/analytics/admin/trends` | `period`, `startDate`, `endDate` | Daily timeseries timeline arrays for registrations, user signups, and expos created. |

#### Sample Response: `GET /api/analytics/admin/overview`
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 142,
      "byRole": { "admin": 2, "organizer": 15, "exhibitor": 40, "attendee": 85 }
    },
    "expos": {
      "total": 18,
      "published": 10,
      "upcoming": 8,
      "ongoing": 2,
      "completed": 5,
      "draft": 3
    },
    "applications": {
      "total": 64,
      "approved": 48,
      "pending": 10,
      "rejected": 6,
      "approvalRate": 75.0
    },
    "booths": {
      "total": 120,
      "allocated": 85,
      "available": 35,
      "allocationRate": 70.8
    },
    "registrations": {
      "total": 520,
      "active": 490,
      "cancelled": 30
    },
    "feedback": {
      "count": 180,
      "averageRating": 4.6
    }
  }
}
```

### 3.2 Organizer Analytics (`role === 'organizer' || 'admin'`)

| Method | Endpoint | Query Parameters | Description |
|---|---|---|---|
| `GET` | `/api/analytics/organizer/overview` | `expoId`, `period`, `startDate`, `endDate` | Scoped totals across expos owned by `req.user._id` (or filtered to single owned expo). |
| `GET` | `/api/analytics/organizer/trends` | `expoId`, `period`, `startDate`, `endDate` | Scoped daily timeseries arrays for registrations and applications. |

### 3.3 Expo Performance Report (`admin` or owning `organizer`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/expos/:expoId` | Detailed audit report for a specific expo, including capacity utilization %, booth occupancy %, feedback rating breakdown, and registration velocity timeline. |

---

## 4. Security & Tenant Isolation

1. **Role Enforcement**:
   - `/api/analytics/admin/*` explicitly rejects non-admin users with `403 Forbidden: Access denied. Required role(s): admin`.
   - `/api/analytics/organizer/*` rejects attendee and exhibitor users with `403 Forbidden`.
2. **Organizer Tenant Boundary**:
   - Organizers can only aggregate data where `organizer === req.user._id`.
   - The query automatically filters: `const expos = await Expo.find({ organizer: req.user._id });`.
3. **Expo Performance Report Access**:
   - For `/api/analytics/expos/:expoId`, if the requester is an organizer, the controller verifies:
     ```javascript
     if (req.user.role === 'organizer' && expo.organizer._id.toString() !== req.user._id.toString()) {
       return res.status(403).json({
         success: false,
         message: 'You are not authorized to view performance reports for this expo'
       });
     }
     ```
   - Third-party organizers cannot inspect another organizer's tickets, financials, or exhibitor lists.
4. **Input Validation**:
   - Malformed MongoDB ObjectIds return `400 Bad Request`.
   - Missing expos return `404 Not Found`.
   - Custom date ranges validate that `startDate` is earlier than or equal to `endDate`; inverted dates or invalid ISO strings return `400 Bad Request`.

---

## 5. Pure SVG Visualizations (`ChartComponents.jsx`)

To ensure reliability, maximum rendering performance, and zero dependency incompatibilities, all charts are built natively using React and SVG:

1. **`LineChart`**:
   - Responsive viewBox coordinate mapping (`preserveAspectRatio="none"`).
   - Filled gradient under the curve.
   - Interactive hover points with dynamic floating tooltips displaying formatted date and entry counts.
   - Automated gridlines with scale calculation.
2. **`BarChart`**:
   - Distribution bars showing category labels, raw counts, and computed percentages.
   - Smooth CSS width animations.
3. **`DonutProgress`**:
   - Circular SVG gauge calculating `strokeDashoffset` based on circumference `2 * π * r`.
   - Centered large percentage value and descriptive status label.

---

## 6. Export Workflows

### 6.1 CSV Export
- Generates RFC 4180-compliant `.csv` files using UTF-8 encoding in the browser via data URI.
- Exports tabular metrics including summary counts, role breakdowns, dates, registration history, and audit logs.
- Automatically handles special characters, commas, and quotes.

### 6.2 Printable PDF Report
- Triggered directly from `ExpoReportModal` via `window.print()`.
- Styled using `@media print` rules:
  - Hides navigation bars, buttons, and backgrounds.
  - Expands modal view into standard 8.5x11 paper dimensions.
  - Preserves vector SVGs and clean typography for clean PDF saving.

---

## 7. Verification & Automated Tests

Automated testing is maintained in `server/test/analytics.test.js`:
- Unit validation of date range periods (`today`, `7d`, `30d`, `90d`, `year`, `custom`).
- Boundary tests for custom date input validation (inverted dates, missing params).
- Zero-filled daily timeline calculations.
- Route authentication guards (401 without token).
- Role authorization boundaries (403 for unauthorized roles).
- Tenant isolation verification (organizers blocked from other organizers' expos).
- Client bundle production build passed with **0 errors and 0 warnings**.
