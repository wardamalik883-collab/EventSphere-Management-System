# EventSphere — Notifications, Reminders & Feedback

## Task 12 Documentation

---

## 1. Overview

Task 12 introduces a unified notification, automated reminder, and expo feedback system into EventSphere Management:

1. **Centralized In-App Notifications** — Lifecycle events for registrations, cancellations, schedule changes, booth allocations, and organizer announcements.
2. **Automated Reminders Scheduler** — Server-side background worker scanning upcoming expos and sessions with duplicate prevention and cancellation guards.
3. **Attendee Feedback & Rating System** — Review submission for verified registered attendees with star ratings (1–5), categories, public rating aggregation, and ownership protection.

---

## 2. Notification System

### 2.1 Supported Event Types

| Event Type | Trigger | Recipient |
|---|---|---|
| `registration_confirmed` | Attendee registers (or re-activates) an expo pass | Attendee |
| `registration_cancelled` | Attendee cancels an existing pass | Attendee |
| `application_update` | Organizer approves or rejects exhibitor application | Exhibitor |
| `booth_assigned` | Organizer assigns or re-assigns booth to exhibitor | Exhibitor |
| `schedule_change` | Session time, room, or status changes / cancels | Registered Attendees & Bookmarkers |
| `expo_reminder` | Background reminder worker finds upcoming expo | Registered Attendees |
| `session_reminder` | Background reminder worker finds upcoming session | Registered Attendees & Bookmarkers |
| `expo_update` | Organizer edits expo details/dates | Registered Attendees |
| `announcement` | Important organizer announcement | Targeted Users / Attendees |
| `system` | Administrative platform notices | Targeted Users |
| `general` | General platform alerts | Targeted Users |

### 2.2 Notification APIs (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Required | Paginated user notifications (`page`, `limit`, `unreadOnly`, `type`) |
| `GET` | `/api/notifications/unread-count` | Required | Fast count of unread notifications |
| `PATCH` | `/api/notifications/:id/read` | Required | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | Required | Mark all user notifications as read |
| `DELETE` | `/api/notifications/:id` | Required | Delete notification (owner only) |

---

## 3. Reminder Scheduler System

### 3.1 Architecture & Workflow

The reminder system operates via `server/src/utils/reminderScheduler.js`:
- An asynchronous timer runs in the background at configurable intervals (`REMINDER_INTERVAL_MINUTES`, default: 30m).
- Scans for published expos and active sessions occurring within `REMINDER_WINDOW_HOURS` (default: 24h).
- Reminders are dispatched as in-app `Notification` documents with types `expo_reminder` and `session_reminder`.

### 3.2 Duplicate Prevention & Safety Guarantees

1. **Duplicate Prevention**: Before sending any reminder, the system queries:
   ```javascript
   await Notification.exists({
     recipient: attendeeId,
     type: 'expo_reminder' | 'session_reminder',
     relatedId: eventId,
   });
   ```
   If a reminder already exists for that user and event, it is immediately skipped.
2. **Cancelled Registration Safety**: Only registrations with `status: 'confirmed'` or `'checked_in'` are queried. Users with `status: 'cancelled'` are strictly excluded.
3. **Cancelled Event Safety**: Cancelled expos (`status: 'cancelled'`) and cancelled sessions (`status: 'cancelled'`) are bypassed.
4. **Non-blocking & Controlled Testing**: The scheduler runs unref'd without blocking the Express HTTP server, and exports `checkAndSendReminders({ referenceDate, windowHours })` for instant unit testing with zero timer delay.

---

## 4. Feedback & Rating System

### 4.1 Features

- Attendees who hold confirmed or checked-in registrations can submit a 1 to 5 star rating and comment (up to 2000 characters).
- Feedback category selection: `overall`, `organization`, `venue`, `sessions`, `exhibitors`, `other`.
- **Duplicate Prevention**: Enforced via a unique compound index `{ expo: 1, user: 1 }` and controller check.
- Attendees can update their existing feedback via `PATCH /api/feedback/:id` or delete it via `DELETE /api/feedback/:id`.
- Public expo feedback aggregation calculates:
  - Average rating (rounded to 1 decimal place)
  - Total review count
  - 5-star to 1-star distribution breakdown

### 4.2 Privacy & Security

- Public reviews sanitize attendee identities (e.g. `"John Doe"` is displayed as `"John D."`).
- Email addresses, phone numbers, and user passwords are never exposed in feedback endpoints.
- Non-registered attendees cannot submit reviews (returns `403 Forbidden`).

### 4.3 Feedback APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/expos/:expoId/feedback` | Required (Attendee) | Submit feedback for an expo |
| `GET` | `/api/expos/:expoId/feedback` | Public | Public aggregated reviews, distribution & average |
| `GET` | `/api/feedback/my-feedback` | Required | List feedback submitted by authenticated user |
| `PATCH` | `/api/feedback/:id` | Required (Owner) | Edit own rating and comment |
| `DELETE` | `/api/feedback/:id` | Required (Owner/Admin) | Delete feedback |

---

## 5. Frontend Components

| Component / Page | Location | Description |
|---|---|---|
| `NotificationBell` | `client/src/components/NotificationBell.jsx` | Navbar bell icon with unread count badge & quick-view dropdown |
| `NotificationCenterPage` | `client/src/pages/NotificationCenterPage.jsx` | Full notification center with tabs, pagination, mark-read, delete |
| `ExpoFeedbackSection` | `client/src/components/ExpoFeedbackSection.jsx` | Embedded rating summary, distribution bars, reviews grid & feedback modal |
| `notificationService` | `client/src/services/notificationService.js` | Axios API service for notifications |
| `feedbackService` | `client/src/services/feedbackService.js` | Axios API service for feedback |
