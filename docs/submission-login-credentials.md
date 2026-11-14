# EventSphere Management System — Demo Login Credentials & User Guide

This document provides credentials and verification workflows for Aptech examiners, faculty evaluators, and peer reviewers to test every role in **EventSphere Management System**.

---

## 1. Credentials Summary Table

| # | Role | Email | Password | Primary Interface / Features |
| :- | :--- | :--- | :--- | :--- |
| **1** | **Administrator** | `admin@eventsphere.demo` | `AdminPass123!` | `/admin` — System overview, user management, activation toggles, platform-wide metrics. |
| **2** | **Event Organizer** | `organizer@eventsphere.demo` | `OrganizerPass123!` | `/organizer` — Expo creation/editing, booth floor plan & allocation, session schedule, analytics, CSV/PDF reports. |
| **3** | **Exhibitor** | `exhibitor@eventsphere.demo` | `ExhibitorPass123!` | `/exhibitor` — Company profile management, expo booth applications, assigned booth view, real-time messaging. |
| **4** | **Attendee** | `attendee@eventsphere.demo` | `AttendeePass123!` | `/attendee` — Browse expos, ticket registration, session bookmarks, rating/feedback submission. |

---

## 2. Additional Secondary Accounts

For testing multi-user interactions, conversations, and applications:

| Role | Name | Email | Password | Role Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Exhibitor 2** | Marcus Vance | `novatech@eventsphere.demo` | `ExhibitorPass123!` | NovaTech Medical Systems exhibitor account with booth C-302. |
| **Attendee 2** | Sarah Johnson | `sarah.johnson@eventsphere.demo` | `AttendeePass123!` | Second attendee registered for Global Tech Expo (Ticket #EXP-GTE-8922). |

---

## 3. Step-by-Step Role Verification Guide

### Role 1: System Administrator (`admin@eventsphere.demo`)
1. Navigate to `/login`.
2. Enter email `admin@eventsphere.demo` and password `AdminPass123!`.
3. Upon login, you are automatically directed to the **Admin Dashboard** (`/admin`).
4. **Inspect Metrics**: Verify total system users, active expos, booth occupancy rate, and recent registrations.
5. **Manage Users**: Review the registered users table. Use the toggle to activate or deactivate accounts and filter by role (`Admin`, `Organizer`, `Exhibitor`, `Attendee`).

---

### Role 2: Event Organizer (`organizer@eventsphere.demo`)
1. Login with `organizer@eventsphere.demo` / `OrganizerPass123!`.
2. You will be routed to the **Organizer Dashboard** (`/organizer`).
3. **Expo Management**:
   - View your organized events: *Global Tech Innovation Expo 2026* and *Future Health & MedTech World Congress 2026*.
   - Click **Create New Expo** (`/expos/new`) to draft a new expo.
4. **Booth Allocation**:
   - Access **Booth Management** (`/organizer/booths/:expoId`).
   - Review booths A-101 (Allocated), A-102 (Reserved), and B-201/B-202 (Available).
   - Test booth allocation and status changes.
5. **Schedule & Sessions**:
   - Access **Session Management** (`/organizer/sessions/:expoId`).
   - Review scheduled keynotes and technical tracks.
   - Add a new session with speaker details, track category, room, and capacity.
6. **Applications & Approval**:
   - Navigate to `/organizer/applications/:expoId` to approve or reject pending exhibitor applications.
7. **Analytics & Export**:
   - Open **Analytics** (`/analytics`).
   - Review registrations chart, revenue metrics, and rating distributions.
   - Test **CSV Export** and **PDF Report Generation**.

---

### Role 3: Exhibitor (`exhibitor@eventsphere.demo`)
1. Login with `exhibitor@eventsphere.demo` / `ExhibitorPass123!`.
2. You will be routed to the **Exhibitor Portal** (`/exhibitor`).
3. **Profile Management**:
   - Visit `/exhibitor/profile` to view or edit the company profile (*CyberDynamics AI Technologies*), website, logo, and product catalog.
4. **My Booths & Applications**:
   - Navigate to `/exhibitor/applications` to review status: *Approved for Global Tech Expo 2026*.
   - View assigned stall details for **Booth A-101** in Zone A.
5. **Direct Messaging**:
   - Open `/messages` to view the active communication thread with the Event Organizer.
   - Send and receive messages regarding booth setup and technical requirements.

---

### Role 4: Attendee (`attendee@eventsphere.demo`)
1. Login with `attendee@eventsphere.demo` / `AttendeePass123!`.
2. You will be routed to the **Attendee Dashboard** (`/attendee`).
3. **Browse Expos**:
   - Navigate to `/expos` to search, filter by category (*Technology*, *Healthcare*), and view event details.
4. **Registrations & Badge**:
   - Open `/attendee/my-registrations` to view confirmed ticket `#EXP-GTE-8921` for *Global Tech Innovation Expo 2026*.
5. **Session Schedule & Bookmarks**:
   - View the interactive conference schedule.
   - Bookmark sessions or view previously saved bookmarks.
6. **Feedback & Rating**:
   - Submit a star rating (1–5) and review for attended expos.

---

## 4. Security Notes
- Plain-text passwords are never stored in the database.
- All tokens are issued via signed JSON Web Tokens (JWT) using HMAC-SHA256.
- Role-based access control (RBAC) middleware strictly prevents privilege escalation (e.g., an Attendee cannot access `/api/admin` or `/api/organizer`).
