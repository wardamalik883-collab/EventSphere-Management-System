# EventSphere Management — Developer Guide

**Task 15 Documentation**  
**Audience:** Software Engineers, Backend/Frontend Developers, System Integrators  
**Stack:** MongoDB Atlas, Express.js, React.js, Node.js (MERN)

---

## 1. Architectural Architecture

EventSphere follows a clean, decoupled client-server architecture:

```
EventSphere/
├── client/                      # React Single Page Application (CRA, React 18)
│   ├── public/                  # Static assets, favicon, _redirects for SPA routing
│   └── src/
│       ├── components/          # Shared visual components (Navbar, AccessDenied, Charts)
│       ├── context/             # Global React Context providers (AuthContext)
│       ├── pages/               # Top-level screen components (21 pages)
│       ├── services/            # API communication services (fetch wrapper with JWT injection)
│       └── styles/              # Scoped CSS style sheets
│
└── server/                      # Express REST API (Node.js 18+)
    ├── src/
    │   ├── config/              # Database connection (Mongoose 8)
    │   ├── controllers/         # Request handling & business logic (14 controllers)
    │   ├── middleware/          # Auth, RBAC, uploads, rate limiting, error handling
    │   ├── models/              # Mongoose schema definitions (12 models)
    │   ├── routes/              # Express API route declarations
    │   └── utils/               # Sanitization, token generation, background scheduler
    ├── test/                    # Automated unit, integration & security test suites
    └── uploads/                 # Local media storage directory for avatars
```

---

## 2. Coding Conventions & Best Practices

### Backend Standards
- **Asynchronous Flow:** Use `async/await` with `try/catch` wrapping. Always pass caught errors to `next(error)` for centralized handling.
- **Data Projections:** Apply `.select('-password')` and `.lean()` on read-only queries to minimize memory consumption and prevent password leaks.
- **Input Sanitization:** Always sanitize user search queries using `escapeRegex()` from `src/utils/sanitize.js` before constructing regular expressions for MongoDB `$regex`.
- **Atomic Concurrency:** Never use a separate `findOne` followed by `save` for critical inventory allocations (like booth reservation). Use atomic operations like `Booth.findOneAndUpdate({ status: 'available', assignedTo: null }, ...)`.
- **Status Codes:**
  - `200 OK` for successful reads, updates, and deletes with payload.
  - `201 Created` for successfully created resources.
  - `400 Bad Request` for validation failures and malformed IDs.
  - `401 Unauthorized` for missing, expired, or invalid JWTs.
  - `403 Forbidden` for role or ownership violations.
  - `404 Not Found` for non-existent documents.
  - `409 Conflict` for duplicate unique constraint violations.
  - `422 Unprocessable Entity` for domain logic rejections (e.g., event concluded, capacity full).
  - `429 Too Many Requests` when rate limits are exceeded.

### Frontend Standards
- **Component Design:** Functional components with React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
- **State Management:** `AuthContext` provides global authentication state (`user`, `role`, `token`, `isAuthenticated`, `login`, `logout`). Page-level state is maintained locally.
- **API Communication:** All network calls use the unified `api` service (`src/services/api.js`). Never call `fetch()` directly from components without utilizing the auth token header.
- **Styling:** CSS classes with semantic naming. No global inline styles for layouts. All components adhere to the dark navy (`#0f172a`), slate (`#64748b`), and indigo/blue theme.

---

## 3. Database Models & Schema Reference

All 12 Mongoose models reside in [`server/src/models`](file:///d:/EventSphere Management System/server/src/models):

| Model | Collection | Primary Keys / Compound Indexes | Description |
|---|---|---|---|
| `User` | `users` | `{ email: 1 }` (unique) | Core accounts (`admin`, `organizer`, `exhibitor`, `attendee`). Implements bcrypt hashing in `pre('save')`. |
| `Expo` | `expos` | `{ status: 1, category: 1, startDate: 1 }` | Expo events. Organizers own expos; date validation (`endDate >= startDate`). |
| `Booth` | `booths` | `{ expo: 1, boothNumber: 1 }` (unique)<br>`{ expo: 1, assignedTo: 1 }` (unique partial) | Floor plan inventory. Prevents duplicate numbers and duplicate assignments per expo. |
| `ExhibitorProfile` | `exhibitorprofiles` | `{ user: 1 }` (unique) | Company profile, products array, document links. Linked 1:1 with exhibitor user. |
| `ExhibitorApplication` | `exhibitorapplications` | `{ expo: 1, exhibitor: 1 }` (unique) | Application to exhibit at an expo (`pending`, `approved`, `rejected`, `cancelled`). |
| `Session` | `sessions` | `{ expo: 1, room: 1, startTime: 1 }` | Scheduled talks, panels, and workshops. Room collision validation enforced. |
| `AttendeeRegistration` | `attendeeregistrations` | `{ expo: 1, attendee: 1 }` (unique)<br>`{ registrationNumber: 1 }` (unique) | Ticket badge registration for attendees. Generates unique `ES-REG-...` pass-codes. |
| `Bookmark` | `bookmarks` | `{ user: 1, session: 1 }` (unique) | Saved sessions bookmarked by attendees. |
| `Notification` | `notifications` | `{ recipient: 1, isRead: 1, createdAt: -1 }` | In-app user notifications with polymorphism (`relatedType`, `relatedId`). |
| `Feedback` | `feedbacks` | `{ expo: 1, user: 1 }` (unique) | 1–5 star reviews with comments. Limited strictly to verified attendees. |
| `Conversation` | `conversations` | `{ 'participants.0': 1, 'participants.1': 1, relatedExpo: 1 }` (unique) | 1-on-1 messaging threads between two participants. |
| `Message` | `messages` | `{ conversation: 1, createdAt: 1 }` | Individual chat messages inside a conversation thread. |

---

## 4. Authentication & Authorization Middleware

### `protect` (`server/src/middleware/authMiddleware.js`)
1. Reads `Authorization: Bearer <token>` header.
2. Calls `verifyToken(token)` using `JWT_SECRET`.
3. Queries database: `User.findById(decoded.id).select('-password')`.
4. Checks `user.isActive`. If false, returns `401 Deactivated account`.
5. Attaches `req.user = user` to the request object.

### `authorize(...roles)` (`server/src/middleware/authMiddleware.js`)
1. Verifies that `req.user` is defined.
2. Checks whether `roles.includes(req.user.role)`.
3. If unauthorized, returns `403 Access denied: Role '...' is not authorized`.

---

## 5. Background Scheduled Jobs

[`server/src/utils/reminderScheduler.js`](file:///d:/EventSphere Management System/server/src/utils/reminderScheduler.js) runs automated recurring checks for upcoming events:
- **Interval:** Runs every 60 minutes (unref'd timer).
- **Window:** Defaults to 24 hours (`REMINDER_WINDOW_HOURS=24`).
- **Expo Reminders:** Notifies confirmed attendees of published expos starting within the window.
- **Session Reminders:** Notifies users who bookmarked active sessions starting within the window.
- **Duplicate Protection:** Queries `Notification.exists({ recipient, type: 'expo_reminder', relatedId })` before dispatching to guarantee zero duplicate messages.

---

## 6. Testing Strategy & Execution

The test suite covers model constraints, security controls, API integration, and frontend components:

```bash
# Run complete model validation tests (in-memory Mongoose schema tests)
cd server
node test/models.test.js

# Run security, auth, ReDoS, magic-byte upload & rate limiting tests
node test/security.test.js

# Run analytics unit tests
node test/analytics.test.js

# Run all backend tests combined
npm test

# Run frontend React component & route guard tests
cd ../client
npm test -- --watchAll=false
```

---

## 7. Extending the System

To add a new feature module (e.g. Workshop Materials):
1. **Model:** Define schema in `server/src/models/Material.js` with validation and export in `server/src/models/index.js`.
2. **Controller:** Implement handlers in `server/src/controllers/materialController.js` using `escapeRegex` for search.
3. **Route:** Create `server/src/routes/materialRoutes.js`, attach `protect` and `authorize(...)` middleware.
4. **Mount:** In `server/src/index.js`, mount route: `app.use('/api/materials', materialRoutes)`.
5. **Frontend Service:** Add service methods in `client/src/services/materialService.js` calling `api.get/post`.
6. **Frontend Page:** Create page in `client/src/pages/MaterialPage.jsx` and register in `client/src/App.jsx`.
