# EventSphere Management System — Aptech Evaluation Screenshot Checklist

This checklist defines the 18 essential UI views required for Aptech eProject submission, project reports, and examiner documentation.

---

## Screenshot Inventory & Specifications

| # | Screen / Feature | Route / URL | Role | Key Elements to Capture | File Name |
| :- | :--- | :--- | :--- | :--- | :--- |
| **01** | Landing Page | `/` | Guest | Hero banner, navigation bar, featured expos grid, CTA buttons | `01-landing-page.png` |
| **02** | User Login | `/login` | Guest | Responsive form, email/password fields, role demo hints | `02-login-page.png` |
| **03** | Admin Dashboard | `/admin` | Admin | Total counts, active users metric, system status banner | `03-admin-dashboard.png` |
| **04** | Admin User Management | `/admin` | Admin | Users data table, status toggle badges, role filters | `04-admin-users-table.png` |
| **05** | Organizer Dashboard | `/organizer` | Organizer | Expo overview cards, quick actions, event statistics | `05-organizer-dashboard.png` |
| **06** | Expo Creation Form | `/expos/new` | Organizer | Title, category, date picker, venue inputs, banner URL | `06-expo-create-form.png` |
| **07** | Expo Details Page | `/expos/:id` | Any | Cover image, date/location badges, schedule tabs | `07-expo-detail-view.png` |
| **08** | Booth Management Grid | `/organizer/booths/:id` | Organizer | Floor plan grid, status colors (allocated/available), stall modal | `08-booth-management.png` |
| **09** | Session Schedule Planner | `/organizer/sessions/:id` | Organizer | Timeline/table of sessions, speaker info, room, capacity | `09-session-management.png` |
| **10** | Organizer Application Review | `/organizer/applications/:id` | Organizer | Exhibitor applications list, status badges, approve/reject buttons | `10-organizer-applications.png` |
| **11** | Exhibitor Dashboard | `/exhibitor` | Exhibitor | Application progress summary, assigned booth card | `11-exhibitor-dashboard.png` |
| **12** | Exhibitor Company Profile | `/exhibitor/profile` | Exhibitor | Logo, website, description, contact details, product list | `12-exhibitor-profile.png` |
| **13** | Exhibitor Directory & Search | `/directory` | Any | Filter chips, search bar, exhibitor cards, stand numbers | `13-exhibitor-directory.png` |
| **14** | Attendee Dashboard | `/attendee` | Attendee | My upcoming events, registration numbers, quick actions | `14-attendee-dashboard.png` |
| **15** | Attendee Ticket / Registrations | `/attendee/my-registrations` | Attendee | Digital badges, ticket numbers (`EXP-GTE-8921`), cancellation | `15-attendee-registrations.png` |
| **16** | Real-Time Messaging | `/messages` | Any | Conversation list, chat history, send message input | `16-messaging-center.png` |
| **17** | Notification Center | `/notifications` | Any | Unread alerts, application status, session reminder notifications | `17-notification-center.png` |
| **18** | Analytics & Report Export | `/analytics` | Organizer/Admin | Revenue charts, attendee trends, CSV and PDF download modal | `18-analytics-reporting.png` |

---

## Instructions for Taking Screenshots

1. **Resolution**: Standard 1920x1080 (1080p Full HD) or 1440x900 viewport.
2. **Theme**: Standard light mode (as styled in system CSS).
3. **Data State**: Seed the database first using `node database-backup/seed-database.js` to ensure all numbers, charts, and tables display rich realistic data.
4. **Browser**: Google Chrome or Microsoft Edge with bookmark bar hidden (`Ctrl+Shift+B`).
5. **Format**: PNG format for crystal-clear text readability in printed reports and Word documents.
