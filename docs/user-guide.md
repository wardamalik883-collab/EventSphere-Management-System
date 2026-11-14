# EventSphere Management — User Guide

**Task 15 Documentation**  
**Audience:** End Users, Administrators, Event Organizers, Exhibitors, and Event Attendees

---

## 1. Introduction to EventSphere

EventSphere Management is an integrated platform for trade shows, industrial expositions, and conferences. It centralizes event planning, exhibitor recruitment, booth management, session schedules, and attendee engagement into a single web application.

The system supports four distinct user roles:
- 👑 **Administrator:** Oversees platform users, all expos, and macro-level analytics.
- 🎪 **Organizer:** Creates expos, designs booth floor plans, reviews exhibitor applications, schedules speakers, and tracks event metrics.
- 🏢 **Exhibitor:** Maintains company profiles, applies for expo participation, manages booth space, and connects with attendees.
- 🎟️ **Attendee:** Discovers published expos, registers for events, browses multi-day schedules, bookmarks sessions, and leaves verified reviews.

---

## 2. Getting Started & Authentication

### 2.1 Public Registration
1. Visit the EventSphere homepage.
2. Click **Get Started** or **Register** in the navigation bar.
3. Enter your **Full Name**, a valid **Email Address**, and a secure **Password** (minimum 8 characters).
4. Click **Create Account**.
5. All public registrations default to the **Attendee** role. (Organizers and Exhibitors are provisioned or upgraded by an Administrator).

### 2.2 Logging In
1. Click **Log In** in the navigation bar.
2. Enter your registered email and password.
3. Click **Sign In**.
4. Upon successful authentication, you will be automatically redirected to your role's dedicated dashboard.

### 2.3 Managing Your Profile & Avatar
1. Click your name or profile badge in the top-right corner of the navigation bar.
2. You can update your **Display Name**, **Phone Number**, and upload a new **Profile Picture** (`.jpg`, `.png`, `.webp`, max 5MB).
3. Click **Save Changes**.

---

## 3. Administrator Guide

### 3.1 Admin Dashboard
- **Access:** Navigate to `/admin` or click **Admin** in the navigation bar.
- **Key Metrics:** View real-time cards showing Total Users, Active Expos, Total Exhibitor Applications, and Total Registrations.
- **Role Distribution:** Visual progress bars illustrate the breakdown between Admins, Organizers, Exhibitors, and Attendees.

### 3.2 User Management & Moderation
1. Scroll down to the **User Directory** on the Admin Dashboard.
2. **Search & Filter:** Find users by typing a name or email address in the search box, or filter by role (`Admin`, `Organizer`, `Exhibitor`, `Attendee`).
3. **Account Status:** Toggle a user's account between `Active` and `Deactivated`.
   > [!NOTE]
   > The platform enforces built-in safeguards preventing the last active administrator from deactivating their own account.

### 3.3 Platform-Wide Analytics
1. Navigate to `/analytics` from the top navigation.
2. Select time-range filter: `Today`, `Last 7 Days`, `Last 30 Days`, `Last 90 Days`, `This Year`, or `Custom Date Range`.
3. Review interactive SVG line charts tracking registration trends and application volume over time.

---

## 4. Organizer Guide

### 4.1 Creating & Editing Expos
1. Navigate to **Organizer Dashboard** (`/organizer`) or **Expos** (`/expo-list`).
2. Click **+ Create New Expo**.
3. Fill out the event details:
   - **Title:** e.g., "Global Technology Expo 2026"
   - **Category:** Technology, Healthcare, Education, Manufacturing, etc.
   - **Dates:** Select Start Date and End Date (End date must be on or after Start date).
   - **Location:** Venue name, City, Country, Address.
   - **Capacity:** Maximum permitted attendees (0 for unlimited).
   - **Description & Theme:** Detailed event scope.
4. Set status to `Draft` (private while editing) or `Published` (visible to exhibitors and attendees).
5. Click **Create Expo**.

### 4.2 Booth Floor-Plan & Allocation Management
1. Open your expo details and click **Manage Booths** (`/organizer-booths/:expoId`).
2. **Add Booth:** Click **+ Add Booth**, specify Booth Number (e.g. `A-101`), Zone (e.g. `Tech Pavilion`), Type (`Standard`, `Corner`, `Island`, `Premium`), Dimensions (`3x3m`), and Price.
3. **Color-Coded Status:**
   - 🟢 **Available:** Ready for allocation.
   - 🔵 **Allocated:** Assigned to an exhibitor.
   - 🟠 **Reserved:** Held for processing.
   - ⚪ **Maintenance:** Blocked.
4. **Assign Booth:** Click **Allocate**, select an approved exhibitor application from the dropdown, and confirm. The system prevents double-booking at the database constraint level.
5. **Unassign Booth:** Click **Release** to return an occupied booth back to available inventory.

### 4.3 Reviewing Exhibitor Applications
1. Click **Applications** in the navigation bar (`/organizer-applications`).
2. Review pending applications submitted by exhibitors.
3. Click an application to inspect the company profile, requested booth size, and requirements.
4. Select **Approve** or **Reject**, optionally provide feedback notes, and click **Submit Decision**.
5. An automated in-app notification is sent to the exhibitor immediately.

### 4.4 Scheduling Sessions & Speakers
1. From the expo management view, click **Manage Sessions** (`/organizer-sessions/:expoId`).
2. Click **+ Add Session**.
3. Enter Title, Topic/Category, Speaker Name, Speaker Title/Company, Room/Hall, Start Time, and End Time.
4. The system automatically validates that:
   - Session dates fall within the expo duration.
   - End Time is strictly after Start Time.
   - No conflicting session is booked in the same room at the same time.

### 4.5 Exporting Reports (CSV & PDF)
1. Go to **Analytics** (`/analytics`).
2. Select an individual expo from the dropdown.
3. **CSV Export:** Click **Export CSV** to download a standards-compliant RFC 4180 spreadsheet containing ticket numbers, attendee names, booth assignments, and registration timestamps.
4. **Printable PDF:** Click **Print / PDF Report** to view a formatted audit summary with capacity progress rings and click Print to save as PDF.

---

## 5. Exhibitor Guide

### 5.1 Setting Up Company Profile
1. Navigate to **Exhibitor Portal** → **Company Profile** (`/exhibitor-profile`).
2. Enter your Company Name, Industry, Website, Description, and Contact Person details.
3. Add Products/Services that you will showcase at the event.
4. Upload documents or certification links.
5. Save your profile. This information appears in the public **Exhibitor Directory**.

### 5.2 Applying to Participate in an Expo
1. Go to **Browse Expos** (`/exhibitor-expos`).
2. Filter published expos by category or location.
3. Click **Apply to Exhibit** on your chosen event.
4. Select your preferred booth size (`Small`, `Medium`, `Large`, `Custom`) and enter any special power or booth location requirements.
5. Submit your application. Track status (`Pending`, `Approved`, `Rejected`) under **My Applications** (`/exhibitor-applications`).

### 5.3 Viewing Assigned Booth
1. Once your application is approved and allocated by the organizer, you will receive an in-app notification.
2. Go to **My Booths** (`/exhibitor-booths`) to view your booth number, zone, dimensions, and floor-plan location.

### 5.4 Connecting with Attendees
1. Check **Messages** (`/messages`) in the navigation bar.
2. Reply directly to inquiries sent by attendees interested in your products.

---

## 6. Attendee Guide

### 6.1 Discovering & Browsing Expos
1. Click **Expos** (`/expo-list`) or **Browse Events** (`/attendee-browse`).
2. Search by title, filter by industry category, or sort by upcoming start dates.
3. Click on any expo card to view complete event details, agenda, and venue information.

### 6.2 Registering for an Expo
1. On the Expo Details page, click **Register for Expo**.
2. Select your registration pass type (`Standard`, `VIP`, `Student`, `Press`).
3. Confirm registration. You will receive an immediate confirmation badge with a unique code (e.g. `ES-REG-XXXX-YYYY`).
4. Access all your active tickets anytime under **My Registrations** (`/attendee-registrations`).
5. If your plans change, you can click **Cancel Registration** with a single click.

### 6.3 Schedule & Bookmarking Sessions
1. Navigate to **Schedule** (`/expo-schedule/:expoId`).
2. Browse sessions grouped chronologically across event days.
3. Filter sessions by topic pills (e.g., Keynote, AI, Workshop, Networking).
4. Click the ⭐ **Bookmark** icon on any session to save it to your schedule. The background scheduler will dispatch a reminder notification 24 hours before the session begins!

### 6.4 Searching the Exhibitor Directory
1. Click **Exhibitors** (`/exhibitor-directory`).
2. Search by company name or filter by industry (Technology, Health, Energy, etc.).
3. Click on a company profile to view their description, booth location, and product catalog.
4. Click **Message Exhibitor** to send an inquiry directly through the platform.

### 6.5 Submitting Feedback & Ratings
1. After attending an expo, navigate to the Expo Details page.
2. Scroll to the **Feedback & Reviews** section.
3. Select a rating from 1 to 5 stars, choose a category (`Overall`, `Organization`, `Venue`, `Sessions`, `Exhibitors`), and write your review.
4. Submit your feedback. Your review helps organizers improve future events!
