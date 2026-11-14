# EventSphere Management — Expo Management Documentation

**Task:** 06 — Expo Management  
**Status:** ✅ Complete  
**Date:** 2026-11-11

---

## 1. Overview

The Expo Management module allows authorized organizers and administrators to create, view, update, and delete expo events. Attendees and exhibitors can browse published expos. All permissions are enforced on the server.

---

## 2. Expo Data Model

**Collection:** `expos`  
**Mongoose Model:** [`server/src/models/Expo.js`](../server/src/models/Expo.js)

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | String | ✅ | Expo name (3–200 chars) |
| `description` | String | ✅ | Full description (max 5000 chars) |
| `theme` | String | ❌ | Sub-topic or theme tag |
| `category` | String | ✅ | Industry/topic category |
| `startDate` | Date | ✅ | Expo start date/time |
| `endDate` | Date | ✅ | Expo end date/time (must be ≥ startDate) |
| `location.venue` | String | ✅ | Venue name |
| `location.city` | String | ✅ | City |
| `location.country` | String | ✅ | Country |
| `location.address` | String | ❌ | Street address |
| `organizer` | ObjectId (User) | ✅ | Reference to organizer user |
| `status` | String (enum) | — | Default: `draft` |
| `bannerUrl` | String | ❌ | External banner image URL |
| `capacity` | Number | — | Attendee capacity (0 = unlimited) |
| `createdAt` | Date | — | Auto-generated |
| `updatedAt` | Date | — | Auto-updated |

### Status Values

| Status | Description |
|---|---|
| `draft` | Created but not yet public |
| `published` | Visible to attendees and exhibitors |
| `ongoing` | Currently in progress |
| `completed` | Ended |
| `cancelled` | Cancelled — no deletion required |

### Valid Status Transitions

| From | Allowed transitions to |
|---|---|
| `draft` | `draft`, `published`, `cancelled` |
| `published` | `published`, `ongoing`, `cancelled`, `draft` |
| `ongoing` | `ongoing`, `completed`, `cancelled` |
| `completed` | `completed` (terminal) |
| `cancelled` | `cancelled` (terminal) |

---

## 3. API Endpoints

**Base path:** `/api/expos`

| Method | Endpoint | Auth Required | Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/expos` | ✅ | organizer, admin | Create new expo |
| `GET` | `/api/expos` | ❌ (optional) | all | List expos (role-scoped) |
| `GET` | `/api/expos/:id` | ❌ (optional) | all | Get expo detail (role-scoped visibility) |
| `PATCH` | `/api/expos/:id` | ✅ | organizer (own), admin | Update expo |
| `DELETE` | `/api/expos/:id` | ✅ | organizer (own), admin | Delete expo |

---

## 4. Request & Response Examples

### POST /api/expos — Create Expo

**Request:**
```json
{
  "title": "Global Tech Expo 2027",
  "description": "Annual technology exhibition for innovators.",
  "category": "Technology",
  "theme": "AI & Sustainability",
  "startDate": "2027-03-15",
  "endDate": "2027-03-18",
  "location": {
    "venue": "Grand Convention Center",
    "city": "New York",
    "country": "USA",
    "address": "100 Convention Ave"
  },
  "status": "draft",
  "capacity": 5000
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Expo created successfully",
  "data": {
    "_id": "6640c3...",
    "title": "Global Tech Expo 2027",
    "organizer": "...",
    "status": "draft",
    "createdAt": "2027-01-15T10:00:00.000Z"
  }
}
```

### GET /api/expos — List Expos

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (1-based) |
| `limit` | number | 10 | Items per page (max 100) |
| `search` | string | — | Search in title (regex) |
| `status` | string | — | Filter by status |
| `category` | string | — | Filter by category (regex) |
| `sort` | string | `-createdAt` | Sort field (prefix `-` for desc) |

**Response (200):**
```json
{
  "success": true,
  "message": "Expos retrieved successfully",
  "data": [{ "_id": "...", "title": "...", "status": "published" }],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalDocs": 24,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### PATCH /api/expos/:id — Update Expo

**Request (partial update):**
```json
{
  "title": "Updated Expo Title",
  "status": "published",
  "capacity": 8000
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Expo updated successfully",
  "data": { "_id": "...", "title": "Updated Expo Title", "status": "published" }
}
```

### DELETE /api/expos/:id — Delete Expo

**Response when blocked (422):**
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Cannot delete expo: related records exist.",
  "data": {
    "relatedCounts": {
      "exhibitorApplications": 3,
      "booths": 0,
      "sessions": 0,
      "attendeeRegistrations": 0
    }
  }
}
```

---

## 5. Role-Based Access Control

| Action | Admin | Organizer | Exhibitor | Attendee | Public |
|---|---|---|---|---|---|
| Create expo | ✅ | ✅ | ❌ | ❌ | ❌ |
| View published expos | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own expos (draft etc.) | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| View any expo by ID | ✅ | ✅ (own) | ✅ (published/ongoing) | ✅ (published/ongoing) | ✅ (published) |
| Update expo | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Delete expo | ✅ | ✅ (own) | ❌ | ❌ | ❌ |

**Key security rules:**
- Organizer ID is **always** taken from `req.user._id` (never from request body) — prevents IDOR
- Organizers cannot access, modify, or delete another organizer's expos
- All write operations require a valid JWT Bearer token
- Invalid or malformed ObjectIds return `400 Bad Request` immediately

---

## 6. Data Integrity: Deletion Policy

The `DELETE /api/expos/:id` endpoint performs a **pre-deletion integrity check**:

Before deleting, the system counts related records in:
- `ExhibitorApplication` (expo field)
- `Booth` (expo field)
- `Session` (expo field)
- `AttendeeRegistration` (expo field)

If **any** related records exist, the deletion is **blocked** with `422 Unprocessable Entity` and a breakdown of the counts is returned.

**Recommendation:** Use `status: "cancelled"` to archive expos that cannot be deleted.

---

## 7. Validation Rules

| Field | Rule |
|---|---|
| `title` | Required, 3–200 characters |
| `description` | Required, max 5000 characters |
| `category` | Required |
| `startDate` | Required, valid ISO date |
| `endDate` | Required, must be ≥ `startDate` |
| `location.venue` | Required |
| `location.city` | Required |
| `location.country` | Required |
| `status` | Must be one of the 5 allowed values |
| `capacity` | Non-negative integer |
| `organizer` | Injected from `req.user._id`; not user-supplied |

---

## 8. Frontend Pages

| Page | Route / View | Description |
|---|---|---|
| Expo List | `/expo-list` | Cards grid with search, filters, pagination |
| Create Expo | `/expo-create` | Form with validation and success feedback |
| Edit Expo | `/expo-edit/:id` | Pre-filled form with status transition logic |
| Expo Detail | `/expo-detail/:id` | Full detail with sidebar, manage actions |

**Navigation:** Authenticated organizers and admins see an **"Expos"** link in the Navbar.

---

## 9. Known Limitations

| Limitation | Notes |
|---|---|
| Banner image stored as external URL | File upload is handled via `POST /api/users/me/avatar` pattern; a dedicated expo banner upload endpoint is deferred to Task 14 |
| No public attendee expo listing page | Public browsing is available via the API; a dedicated attendee discovery UI is Task 10 |
| No real-time status auto-update | Status (e.g., draft→ongoing based on dates) is not automatically updated by a background job; manual status update via PATCH is required |
| Delete requires removing all related records first | By design, to maintain referential integrity |
