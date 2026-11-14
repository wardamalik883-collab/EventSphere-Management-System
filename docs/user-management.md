# EventSphere Management — User & Profile Management Specification

This document details the architecture, endpoints, permissions, upload configurations, and validation rules for User & Profile Management in the EventSphere Management System.

---

## 1. Overview & Capabilities

The User & Profile Management module provides:
1. **Self-Service Profile Management**: Authenticated users across all four roles (`attendee`, `exhibitor`, `organizer`, `admin`) can view and update their profile details (name, phone, avatar).
2. **Profile Picture Uploads**: Secure multipart/form-data image uploads with MIME-type filtering, file size restrictions, sanitized unique naming, and static file serving.
3. **Privilege Escalation Protection**: Users cannot modify their role (`role`), administrative flags (`isActive`), or security credentials through profile update endpoints.
4. **Admin User Administration**: System administrators can view paginated user directories, search users by name or email, filter by role/status, inspect user details, and manage account activation/deactivation.
5. **Safety Protections**: Safeguards against deactivating the last active administrator account.

---

## 2. API Endpoints Directory

| Method | Endpoint | Access | Description |
|:---|:---|:---:|:---|
| `GET` | `/api/users/me` | Protected (Any Role) | Retrieve current user profile |
| `PUT` | `/api/users/me` | Protected (Any Role) | Update caller's permitted profile fields |
| `POST` | `/api/users/me/avatar` | Protected (Any Role) | Upload and set profile avatar |
| `GET` | `/api/users` | Protected (Admin Only) | List all users (paginated, searchable, filterable) |
| `GET` | `/api/users/:id` | Protected (Admin Only) | View single user details by ID |
| `PUT` | `/api/users/:id/status` | Protected (Admin Only) | Activate or deactivate a user account |

---

## 3. Profile Management Endpoints

### 3.1 Get Current User Profile
- **Endpoint**: `GET /api/users/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "6640c31a89f...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "attendee",
      "phone": "+1-555-0199",
      "avatarUrl": "/uploads/avatars/avatar-6640c31a-1794383528-192.png",
      "isActive": true,
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:30:00.000Z"
    }
  }
}
```

---

### 3.2 Update Current User Profile
- **Endpoint**: `PUT /api/users/me`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`

**Permitted Request Fields:**
```json
{
  "name": "Jane Doe Updated",
  "phone": "+1-555-0100",
  "avatarUrl": "https://example.com/custom-avatar.png"
}
```

**Validation & Security Rules:**
- `name`: If supplied, must be between 2 and 100 characters.
- `phone`: Trimmed string.
- `avatarUrl`: Trimmed URL or path string.
- **Mass Assignment Protection**: Attempts to pass `role`, `isActive`, or `password` in `req.body` are strictly ignored. Users cannot elevate their permissions or deactivate their own accounts.
- Password hashes and secrets are never returned in responses.

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "6640c31a89f...",
      "name": "Jane Doe Updated",
      "email": "jane@example.com",
      "role": "attendee",
      "phone": "+1-555-0100",
      "avatarUrl": "https://example.com/custom-avatar.png",
      "isActive": true,
      "updatedAt": "2026-11-11T12:35:00.000Z"
    }
  }
}
```

---

### 3.3 Upload Profile Picture
- **Endpoint**: `POST /api/users/me/avatar`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Field**: `avatar` (File)

**Upload Specifications:**
- **Permitted Formats**: JPEG (`.jpg`, `.jpeg`), PNG (`.png`), WEBP (`.webp`).
- **MIME Types**: `image/jpeg`, `image/png`, `image/webp`.
- **Max File Size**: 5 MB (configurable via `MAX_FILE_SIZE_MB` in environment variables).
- **Storage Location**: `server/uploads/avatars/`.
- **Naming Pattern**: `avatar-<userId>-<timestamp>-<random>.<ext>` to guarantee unique, sanitized filenames and block path traversal.
- **Serving Path**: Static URL `/uploads/avatars/<filename>` accessible over HTTP.
- **Storage Strategy**: File paths are stored in MongoDB; large binary blobs are never stored directly in the database.

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "avatarUrl": "/uploads/avatars/avatar-6640c31a-1794383528-192.png",
    "user": { ... }
  }
}
```

**Error Responses:**
- File size exceeded: `400 Bad Request` — `"File too large: Maximum allowed size is 5MB"`
- Invalid file type: `400 Bad Request` — `"Invalid file type: Only .jpg, .jpeg, .png, and .webp images are allowed"`
- Missing file: `400 Bad Request` — `"Please provide an image file with key 'avatar'"`

---

## 4. Admin User Management Endpoints

All endpoints in this section require:
1. `protect` middleware (valid JWT token).
2. `authorize('admin')` middleware. Non-admin users receive `403 Forbidden`.

### 4.1 List All Users
- **Endpoint**: `GET /api/users`
- **Headers**: `Authorization: Bearer <admin-token>`
- **Query Parameters**:
  - `page`: Page number (default: `1`).
  - `limit`: Items per page (default: `10`, maximum: `100`).
  - `search`: Case-insensitive regex match against `name` and `email`.
  - `role`: Filter by role (`admin`, `organizer`, `exhibitor`, `attendee`).
  - `isActive`: Filter by account status (`true` or `false`).

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "_id": "6640c31a...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "attendee",
      "isActive": true,
      "createdAt": "2026-11-11T12:00:00.000Z"
    }
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

---

### 4.2 Get User by ID
- **Endpoint**: `GET /api/users/:id`
- **Headers**: `Authorization: Bearer <admin-token>`

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "_id": "6640c31a...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "attendee",
      "isActive": true
    }
  }
}
```

**Errors:**
- Invalid ID format: `400 Bad Request` — `"Invalid user ID format"`
- Not found: `404 Not Found` — `"User not found"`

---

### 4.3 Update User Account Status
- **Endpoint**: `PUT /api/users/:id/status`
- **Headers**: `Authorization: Bearer <admin-token>`, `Content-Type: application/json`

**Request Body:**
```json
{
  "isActive": false
}
```

**Safety Safeguard:**
If an administrator attempts to deactivate an administrator account, the server checks the count of remaining active administrators. If only 1 active administrator remains, the operation is rejected:
- `400 Bad Request` — `"Operation forbidden: Cannot deactivate the last active administrator account"`

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "User account deactivated successfully",
  "data": {
    "user": {
      "_id": "6640c31a...",
      "name": "Jane Doe",
      "isActive": false
    }
  }
}
```

---

## 5. Security & RBAC Enforcement Matrix

| Endpoint | Attendee | Exhibitor | Organizer | Admin |
|:---|:---:|:---:|:---:|:---:|
| `GET /api/users/me` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `PUT /api/users/me` | ✅ Own (Allowed fields) | ✅ Own (Allowed fields) | ✅ Own (Allowed fields) | ✅ Own (Allowed fields) |
| `POST /api/users/me/avatar` | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| `GET /api/users` | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Admin Only |
| `GET /api/users/:id` | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Admin Only |
| `PUT /api/users/:id/status` | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Admin Only |
