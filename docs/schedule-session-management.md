# EventSphere Management — Schedule & Session Management

**Module:** Task 09 — Schedule & Session Management  
**Status:** ✅ Complete  
**Date:** 2026-11-12

---

## 1. Overview

The Schedule & Session Management module provides organizers with fine-grained control to curate event programs (keynotes, workshops, breakout sessions, panels, and networking tracks), assign speakers, specify rooms and capacities, and prevent physical room collisions. Simultaneously, attendees and public visitors gain a chronological, multi-day schedule interface with category and search filtering to explore the event agenda.

All actions strictly enforce multi-tenant expo ownership, role-based authorization, date boundary constraints, and room collision prevention.

---

## 2. Session Data Model

### Mongoose Model: `Session` (`sessions`)
- `expo`: ObjectId ref `Expo` (required, immutable reference).
- `title`: String (required, 2–200 characters, trimmed).
- `description`: String (trimmed, max 3000 chars, default `''`).
- `speaker`: Subdocument:
  - `name`: String (required, trimmed).
  - `title`: String (e.g. "VP of Artificial Intelligence").
  - `company`: String (e.g. "Google DeepMind").
  - `bio`: String (speaker biography / background).
- `room`: String (required, room or hall identifier, e.g. "Auditorium A", "Workshop Lab 1").
- `startTime`: Date (required, indexed).
- `endTime`: Date (required, must be strictly greater than `startTime`).
- `category`: String (e.g. `'Keynote'`, `'Workshop'`, `'Panel Discussion'`, `'Technical Talk'`, `'Networking'`, `'General'`).
- `capacity`: Number (min 0, default 0 representing unlimited).
- `status`: String enum `['scheduled', 'in_progress', 'completed', 'cancelled']` (default `'scheduled'`).

### Indexes:
- `{ expo: 1, startTime: 1 }` — Enables chronological sorting and multi-day grouping.
- `{ expo: 1, room: 1, startTime: 1 }` — Optimizes room conflict lookups.

---

## 3. Validation & Scheduling Rules

1. **Chronological Time Validation**:
   `endTime` must be strictly later than `startTime` ($endTime > startTime$).
2. **Expo Duration Boundaries**:
   Sessions must be held within the parent expo's valid dates. The system allows sessions anywhere between the start of the expo's `startDate` ($00:00:00.000$) and the end of the expo's `endDate` ($23:59:59.999$).
3. **Same-Room Collision Guard**:
   To prevent double-booking of physical spaces, whenever a session is created or its times/room are modified, the system checks for any overlapping non-cancelled session in the same expo and same room:
   $$\text{existing.startTime} < \text{new.endTime} \quad \text{and} \quad \text{existing.endTime} > \text{new.startTime}$$
   If an overlap exists, the API rejects the request with **`409 Conflict`** and returns the conflicting session details. Cancelled sessions do not block room availability.

---

## 4. REST API Endpoints

| Method | Path | Access Control | Description |
|---|---|---|---|
| `POST` | `/api/expos/:expoId/sessions` | Organizer (owner) / Admin | Creates a new session with room collision checks. |
| `GET` | `/api/expos/:expoId/sessions` | Public (published) / Organizer (owner) / Admin | Lists all sessions for an expo with search, category, status, and date filters. |
| `GET` | `/api/expos/:expoId/schedule` | Public (published) / Organizer (owner) / Admin | Public chronological schedule grouped by calendar date tabs (`Day 1`, `Day 2`, etc.). |
| `GET` | `/api/sessions/:id` | Public (published expo) / Authenticated | Retrieves detailed session record with populated expo info. |
| `PATCH` | `/api/sessions/:id` | Organizer (owner) / Admin | Updates session attributes and re-validates room conflicts. |
| `DELETE` | `/api/sessions/:id` | Organizer (owner) / Admin | Safely deletes a session. |
| `PATCH` | `/api/sessions/:id/cancel` | Organizer (owner) / Admin | Marks session status as `'cancelled'` without deleting. |

---

## 5. Frontend User Experience

1. **`OrganizerSessionPage.jsx` (`/organizer-sessions`)**:
   - **Metrics Ribbon**: Live counters for Total Sessions, Scheduled, In Progress, and Cancelled.
   - **Expo Selector**: Allows organizers to manage multiple events.
   - **Dual Views**:
     - **Cards View**: Visual timeline cards color-coded by status, speaker avatar chip, room and time badges, and direct action buttons (Edit, Cancel, Delete).
     - **Table View**: Compact tabular overview with sorting and status pills.
   - **Interactive Modal**: Form with input validation for title, speaker, room, date/time pickers, category, and capacity.

2. **`ExpoSchedulePage.jsx` (`/expo-schedule/:expoId`)**:
   - **Multi-day Tabs**: Automatically detects session dates and generates "Day 1 (Nov 20)", "Day 2 (Nov 21)", etc., or "All Days".
   - **Chronological Timeline Cards**: Highlights start/end times with down-arrow divider, category pills, room badges, capacity limits, and speaker bio boxes.
   - **Search & Category Filtering**: Instant filtering by topic and search keyword.

3. **`ExpoScheduleSection.jsx`**:
   - Embedded directly inside [`ExpoDetailPage.jsx`](file:///d:/EventSphere%20Management%20System/client/src/pages/ExpoDetailPage.jsx) providing visitors with an immediate preview of the event program and links to the full schedule.
