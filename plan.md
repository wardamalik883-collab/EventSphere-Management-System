# EventSphere Management — Project Plan

## 1. Project overview
EventSphere Management is a web application for managing expos and trade shows. It supports three main user roles: Admin/Organizer, Exhibitor, and Attendee.

## 2. Technology stack
The supplied project specification identifies the MERN stack:
- MongoDB — database
- Express.js — backend framework
- React.js — frontend library
- Node.js — backend runtime

Supporting libraries, hosting, and deployment choices will be confirmed during project setup and documented before use.

## 3. Main objectives
1. Replace manual and disconnected expo-management processes with one platform.
2. Provide secure registration, login, password recovery, and role-based access.
3. Let organizers manage expos, exhibitors, booths, schedules, and reports.
4. Let exhibitors manage company profiles, apply for expos, and manage booth requests.
5. Let attendees discover expos, register for events/sessions, search exhibitors, and bookmark sessions.
6. Provide updates, communication, feedback, and support.
7. Build a responsive, tested, secure, and documented application.

## 4. User roles
### Admin / Organizer
- Create, edit, and delete/manage expo events.
- Manage expo information and booth floor-plan inventory.
- Review exhibitor applications and approve or reject them.
- Assign booths and manage event schedules.
- View analytics and reports.
- Manage relevant users and feedback.

### Exhibitor
- Register and maintain a company profile.
- Submit products/services and required documents.
- Apply to participate in expos and track application status.
- View and request available booths.
- Maintain booth details and staff information.
- Contact organizers and, where implemented, other exhibitors.

### Attendee
- Browse expo information, schedules, exhibitor lists, and floor plans.
- Register for expos, sessions, or workshops.
- Search and filter exhibitors.
- View exhibitor profiles and booth locations.
- Bookmark sessions and receive reminders.
- Contact exhibitors and submit feedback.

## 5. Main system modules
1. Authentication and authorization
2. User and profile management
3. Admin/Organizer dashboard
4. Expo management
5. Exhibitor portal and applications
6. Booth and floor-plan management
7. Schedule and session management
8. Attendee interface and registrations
9. Exhibitor search and communication
10. Notifications, reminders, and feedback
11. Analytics and reporting
12. Testing, security, deployment, and documentation

## 6. Proposed architecture
- `client/`: React frontend
- `server/`: Node.js and Express REST API
- MongoDB: persistent data storage
- Backend modules: routes, controllers, services, models, middleware, validation, and configuration

Keep frontend and backend responsibilities separate. Validate data on the server and enforce permissions on every protected API. Store secrets in environment variables; commit only an `.env.example` containing placeholders.

## 7. Initial database entities
The following are proposed entities to refine in the database-design phase:
- User
- Expo
- ExhibitorProfile
- ExhibitorApplication
- Booth
- BoothReservation / BoothAllocation
- Session
- AttendeeRegistration
- SessionBookmark
- Message / ContactRequest
- Notification
- Feedback
- AuditLog (recommended for important administrative actions)

Relationships, fields, indexes, statuses, and validation rules will be documented before implementing feature modules.

## 8. Quality requirements from the project brief
- Most operations should respond within 1–2 seconds.
- Plan for growth and hundreds of concurrent users.
- Protect sensitive data in storage and transmission.
- Enforce authentication, authorization, and user-data privacy.
- Consider user consent and applicable privacy requirements.
- Aim for 99% uptime and regular backups.
- Provide responsive, accessible UI.
- Support Chrome, Firefox, Safari, and Edge.
- Include logging, monitoring, unit/integration/end-to-end testing, and security testing.
- Provide user documentation, developer documentation, and a video demonstrating the complete application.

These are targets to verify through testing and evidence, not claims to make without measurement.

## 9. Development workflow
1. Read the active task before coding.
2. Inspect the existing code before changing it.
3. Work only within the active task's scope.
4. Run the app and relevant tests after each meaningful change.
5. Fix errors before moving forward.
6. Update task status and record decisions/blockers.
7. Commit each completed task or coherent milestone to Git.
8. Keep screenshots and test evidence for project reporting.

## 10. Aptech eProject reporting and submission
The supplied student guide requests two status reports at approximately equal intervals. Each report should contain:
- Overall project progress
- Completed tasks and current status
- Challenges, if any
- Supporting source code, database scripts, screenshots, or other evidence

The final ZIP should contain complete source code, project documentation, application/database login details for evaluation, database backup, and other relevant files. The guide states that only one final submission is allowed per group, so verify the archive carefully before uploading.

The project specification also requests user/developer documentation and a video showing the complete working application.

## 11. Scope decisions to confirm
The supplied specification does not define payment processing, ticket pricing, QR check-in, a sophisticated visual floor-plan editor, or a specific email/SMS provider or hosting service. Do not treat these as required unless the instructor confirms them. Implement the explicit requirements first and document any simplified workflows.
