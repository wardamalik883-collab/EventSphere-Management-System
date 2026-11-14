# EventSphere Management — Authentication & Authorization Specification

This document provides complete developer documentation for the authentication and role-based access control (RBAC) architecture in EventSphere Management.

---

## 1. Overview & Technology Choices

- **Password Hashing**: `bcryptjs` with salt work factor of 10. Passwords are never stored in plaintext and never exposed in responses or logs.
- **Token Mechanism**: JSON Web Tokens (`jsonwebtoken`) signed with a 256-bit or 512-bit HMAC secret stored in `JWT_SECRET`.
- **Token Claims**: Contains authenticated user ID (`id`) and verified database role (`role`).
- **Token Expiry**: Configurable via `JWT_EXPIRES_IN` (defaults to `7d`).
- **Stateless Design**: Tokens are validated cryptographically on each request with active-account database confirmation.

---

## 2. Supported User Roles

EventSphere implements four distinct roles:
1. `admin` — System administration and platform governance.
2. `organizer` — Expo creation, booth assignment, schedule management, and application reviews.
3. `exhibitor` — Company profiles, expo participation applications, and booth reservations.
4. `attendee` — Public discovery, expo registrations, session bookmarks, and feedback.

### Privilege Escalation Safeguard
- Public registration (`POST /api/auth/register`) **always assigns the `attendee` role by default**.
- Any request body attempting to set `role: 'admin'`, `role: 'organizer'`, or `role: 'exhibitor'` during public registration is strictly disregarded.
- Privileged roles (such as organizer or admin) can only be granted through authorized administrative mechanisms or administrative seeding.

---

## 3. Authentication Endpoints

### 3.1 Register User
- **Route**: `POST /api/auth/register`
- **Access**: Public
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "StrongPassword123!",
  "phone": "+1-555-0199",
  "avatarUrl": "https://example.com/avatar.png"
}
```

**Validation Rules:**
- `name`: Required, min 2 characters, max 100 characters.
- `email`: Required, valid email format, normalized to lowercase and trimmed.
- `password`: Required, minimum 8 characters.
- Duplicate email check: Returns `409 Conflict` if the email address is already registered.

**Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6640c31a89f...",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "attendee",
      "phone": "+1-555-0199",
      "avatarUrl": "https://example.com/avatar.png",
      "isActive": true,
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3.2 Login User
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "email": "jane.doe@example.com",
  "password": "StrongPassword123!"
}
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "6640c31a89f...",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "attendee",
      "phone": "+1-555-0199",
      "avatarUrl": "https://example.com/avatar.png",
      "isActive": true,
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Failure Response (`401 Unauthorized`):**
Generic message to prevent user enumeration attacks:
```json
{
  "success": false,
  "status": "error",
  "statusCode": 401,
  "message": "Invalid email or password"
}
```

---

### 3.3 Get Current Authenticated User Profile
- **Route**: `GET /api/auth/me`
- **Access**: Protected (Requires valid JWT)
- **Headers**:
  ```http
  Authorization: Bearer <token>
  ```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Current user profile retrieved successfully",
  "data": {
    "user": {
      "_id": "6640c31a89f...",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "attendee",
      "phone": "+1-555-0199",
      "avatarUrl": "https://example.com/avatar.png",
      "isActive": true,
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:00:00.000Z"
    }
  }
}
```

---

### 3.4 Logout
- **Route**: `POST /api/auth/logout`
- **Access**: Public
- **Behavior**: Because EventSphere implements stateless JWT tokens, the client must delete the token from local storage / cookies upon receipt of this response.

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Logged out successfully. Please remove your token from client storage."
}
```

---

## 4. Middleware Implementation

### 4.1 Authentication Guard (`protect`)
The `protect` middleware:
1. Inspects `req.headers.authorization` for the `Bearer <token>` format.
2. Cryptographically verifies the token using `JWT_SECRET`.
3. Handles token expiration (`TokenExpiredError`) and tampering (`JsonWebTokenError`) with explicit HTTP 401 responses.
4. Loads the user from MongoDB Atlas using `User.findById(decoded.id).select('-password')`.
5. Verifies `user.isActive === true`.
6. Attaches the clean user document to `req.user`.

### 4.2 Authorization Guard (`authorize(...roles)`)
The `authorize` middleware restricts access by permitted role(s):
```javascript
// Example usage:
router.post('/expos', protect, authorize('admin', 'organizer'), createExpo);
```
- If caller's role is not in the permitted list, returns **HTTP 403 Forbidden**:
  ```json
  {
    "success": false,
    "status": "error",
    "statusCode": 403,
    "message": "Access denied: Role 'attendee' is not authorized to access this resource"
  }
  ```

---

## 5. Security Checklist

- [x] Bcrypt password hashing with salting.
- [x] Passwords stripped from all JSON serialization (`toJSON` transform & `-password` queries).
- [x] JWT signature validation with non-committed secret (`JWT_SECRET`).
- [x] Role escalation blocked (public signup defaults to `attendee`).
- [x] Generic error messages on login to prevent username enumeration.
- [x] Inactive/deactivated account access blocked in real time.
- [x] Zero credential logging in console or network output.
