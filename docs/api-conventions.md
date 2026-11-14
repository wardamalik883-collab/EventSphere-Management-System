# EventSphere Management — API Conventions & Architecture Standards

This document establishes the official REST API design standards, endpoint conventions, response envelopes, status codes, and query patterns for the EventSphere Management system.

---

## 1. REST Architecture & URI Structure

### Base URL Pattern
All endpoints are exposed under `/api` (or `/api/v1` for versioned routing):
```
http://localhost:5000/api/<resource>
```

### Resource Naming Guidelines
1. **Plural Nouns**: Resource paths use lowercase plural nouns (e.g., `/api/expos`, `/api/booths`, `/api/sessions`).
2. **Kebab-case for Multi-word Resources**: Paths with multiple words use hyphens (e.g., `/api/exhibitor-applications`, `/api/attendee-registrations`).
3. **Hierarchical / Nested Sub-resources**:
   - For tightly bound sub-entities:
     - `GET /api/expos/:expoId/sessions` (Get sessions for an expo)
     - `GET /api/expos/:expoId/booths` (Get booths for an expo)
     - `POST /api/expos/:expoId/applications` (Apply to an expo)
   - For direct manipulation when resource ID is known:
     - `GET /api/sessions/:id`
     - `PATCH /api/booths/:id`

---

## 2. HTTP Methods & Semantics

| HTTP Method | Purpose | Idempotent | Request Body | Success Code |
|:---|:---|:---:|:---:|:---:|
| `GET` | Retrieve resource(s) | Yes | No | `200 OK` |
| `POST` | Create a new resource or trigger an action | No | Yes (JSON) | `201 Created` / `200 OK` |
| `PUT` | Complete replacement of a resource | Yes | Yes (JSON) | `200 OK` |
| `PATCH` | Partial update of resource fields | No | Yes (JSON) | `200 OK` |
| `DELETE` | Delete or deactivate a resource | Yes | Optional | `200 OK` / `204 No Content` |

---

## 3. Standard JSON Response Envelopes

Every API endpoint returns a uniform JSON envelope to ensure predictable client consumption.

### 3.1 Standard Success Response (Single Resource / Action)
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {
    "id": "6640c3...",
    "title": "Tech Expo 2026",
    "status": "published",
    "createdAt": "2026-11-11T05:00:00.000Z"
  }
}
```

### 3.2 Standard Success Response (Paginated Collection)
```json
{
  "success": true,
  "message": "Expos retrieved successfully",
  "data": [
    { "id": "6640c1...", "title": "Tech Expo 2026" },
    { "id": "6640c2...", "title": "Healthcare Summit" }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalDocs": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 3.3 Standard Error Response
```json
{
  "success": false,
  "status": "error",
  "statusCode": 400,
  "message": "Invalid input data provided",
  "errors": [
    {
      "field": "endDate",
      "message": "End date must be greater than or equal to start date"
    },
    {
      "field": "title",
      "message": "Expo title must be at least 3 characters long"
    }
  ],
  "stack": "Error: Invalid input data... (development only)"
}
```

---

## 4. Standard HTTP Status Codes

| Status Code | Reason | Usage in EventSphere |
|:---|:---|:---|
| `200 OK` | Success | Successful `GET`, `PUT`, `PATCH`, or non-creation `POST` |
| `201 Created` | Created | Successful `POST` creating a User, Expo, Application, etc. |
| `204 No Content`| No Content | Successful `DELETE` when no response body is returned |
| `400 Bad Request` | Client Error | Malformed JSON, failed validation, missing required field |
| `401 Unauthorized` | Auth Required | Missing or invalid authentication token |
| `403 Forbidden` | Access Denied | Authenticated user lacks permission (e.g. Attendee editing Expo) |
| `404 Not Found` | Not Found | Requested resource ID does not exist |
| `409 Conflict` | Conflict | Unique constraint violation (e.g. duplicate email, duplicate booth) |
| `422 Unprocessable`| Semantic Error | Business rule violation (e.g. reserving already-allocated booth) |
| `500 Server Error` | Server Error | Unhandled server exceptions (caught by global error handler) |

---

## 5. Query Parameters: Filtering, Sorting, & Pagination

All list endpoints support standardized query parameters:

### 5.1 Pagination
- `page`: 1-based index (default: `1`).
- `limit`: Number of items per page (default: `10`, maximum: `100`).
```
GET /api/expos?page=2&limit=15
```

### 5.2 Sorting
- `sort`: Field name to sort by. Prefix with `-` for descending order.
```
GET /api/expos?sort=-startDate
GET /api/booths?sort=boothNumber
```

### 5.3 Filtering
- Exact match: `GET /api/expos?status=published&category=Technology`
- Text search: `GET /api/expos?search=robotics`
- Date range: `GET /api/expos?startDate[gte]=2026-01-01`

---

## 6. Role-Based Access Control (RBAC) Matrix

| Resource / Action | Admin | Organizer | Exhibitor | Attendee | Public |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Browse Published Expos** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create / Edit Expos** | ✅ | ✅ (Own) | ❌ | ❌ | ❌ |
| **Delete Expos** | ✅ | ✅ (Own) | ❌ | ❌ | ❌ |
| **Manage Booth Inventory** | ✅ | ✅ (Own Expo) | ❌ | ❌ | ❌ |
| **Apply for Booth / Expo** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Approve / Reject Applications**| ✅ | ✅ (Own Expo) | ❌ | ❌ | ❌ |
| **Allocate Booth** | ✅ | ✅ (Own Expo) | ❌ | ❌ | ❌ |
| **Create / Edit Sessions** | ✅ | ✅ (Own Expo) | ❌ | ❌ | ❌ |
| **Register for Expo** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Bookmark Sessions** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Submit Feedback** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **View Analytics** | ✅ | ✅ (Own Expo) | ❌ | ❌ | ❌ |
| **User Administration** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 7. Planned Endpoint Directory

### Authentication (Task 03 — Implemented)
- `POST /api/auth/register` — Register new user (defaults to attendee role, prevents escalation)
- `POST /api/auth/login` — Authenticate user and issue JWT token
- `GET /api/auth/me` — Retrieve profile of currently authenticated user (Bearer token required)
- `POST /api/auth/logout` — Client token clearing guidance
- Detailed guide: See `docs/authentication.md`

### User & Profile Management (Task 04 — Implemented)
- `GET /api/users/me` — Retrieve current user profile (Bearer token required)
- `PUT /api/users/me` — Update permitted profile fields (whitelisted, no role escalation)
- `POST /api/users/me/avatar` — Upload profile picture (multipart/form-data, max 5MB)
- `GET /api/users` — Admin-only: Paginated user list with search and filters
- `GET /api/users/:id` — Admin-only: View user details by ID
- `PUT /api/users/:id/status` — Admin-only: Activate or deactivate user account
- Detailed guide: See `docs/user-management.md`

### Expos (Task 06)
- `GET /api/expos` — List expos (filterable by status, category, date)
- `POST /api/expos` — Create expo (Organizer / Admin)
- `GET /api/expos/:id` — Get expo details
- `PATCH /api/expos/:id` — Update expo (Organizer / Admin)
- `DELETE /api/expos/:id` — Delete / archive expo (Organizer / Admin)

### Exhibitor Profiles & Applications (Task 07)
- `GET /api/exhibitor-profiles/me` — Current exhibitor profile
- `PUT /api/exhibitor-profiles/me` — Create or update profile
- `POST /api/exhibitor-applications` — Submit application
- `GET /api/exhibitor-applications` — List applications (Organizer / Exhibitor)
- `PATCH /api/exhibitor-applications/:id/status` — Review application (Organizer)

### Booths (Task 08)
- `GET /api/expos/:expoId/booths` — List booths for an expo
- `POST /api/expos/:expoId/booths` — Add booth (Organizer)
- `PATCH /api/booths/:id` — Update booth details (Organizer)
- `POST /api/booths/:id/allocate` — Allocate booth to exhibitor (Organizer)

### Sessions & Schedules (Task 09)
- `GET /api/expos/:expoId/sessions` — List sessions for an expo
- `POST /api/expos/:expoId/sessions` — Add session (Organizer)
- `PATCH /api/sessions/:id` — Update session (Organizer)
- `DELETE /api/sessions/:id` — Delete session (Organizer)

### Attendee Registrations & Bookmarks (Tasks 10 & 11)
- `POST /api/expos/:expoId/register` — Register attendee for expo
- `GET /api/attendee/my-registrations` — View attendee's registrations
- `POST /api/bookmarks` — Bookmark session
- `DELETE /api/bookmarks/:sessionId` — Remove bookmark
- `GET /api/bookmarks` — View attendee's bookmarked sessions

### Notifications & Feedback (Task 12)
- `GET /api/notifications` — Get user's notifications
- `PATCH /api/notifications/:id/read` — Mark notification read
- `POST /api/feedback` — Submit feedback for an expo
- `GET /api/expos/:expoId/feedback` — View feedback for an expo
