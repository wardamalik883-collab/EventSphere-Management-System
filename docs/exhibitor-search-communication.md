# EventSphere — Exhibitor Search & Communication

## Task 11 Documentation

---

## 1. Overview

Task 11 adds two major capabilities to EventSphere:

1. **Exhibitor Directory** — A public searchable directory of exhibitor company profiles.
2. **In-App Messaging** — A secure conversation system for attendees and organizers to contact exhibitors.

---

## 2. Exhibitor Directory

### 2.1 Features

- Paginated listing of all public exhibitor profiles
- Search by company name or description
- Filter by industry (dropdown)
- Filter by location (text)
- Filter by expo participation (`expoId` query param — returns only exhibitors with approved applications)
- Sort: Alphabetical (A–Z) | Newest | Oldest
- Exhibitor cards show: logo, company name, exhibitor name, industry, location, short description, website link
- "View Profile" button navigates to full public profile detail page
- "Message" button (attendees and organizers only) pre-fills the new conversation composer

### 2.2 Public Profile Detail

Each public profile shows:
- Company name, logo, description
- Industry and location
- Public website link
- Products & services list (name, category, description)
- Participating expos (approved, published only)
- Booth information (number, zone, type, dimensions) for allocated booths

### 2.3 Privacy Rules

| Field | Public? |
|---|---|
| Company name | ✅ |
| Company description | ✅ |
| Industry | ✅ |
| Location | ✅ |
| Website | ✅ |
| Logo | ✅ |
| Products (name, description, category) | ✅ |
| Contact person email | ❌ Never |
| Contact person phone | ❌ Never |
| Internal documents | ❌ Never |
| User account email | ❌ Never |
| User password | ❌ Never |

---

## 3. Communication (In-App Messaging)

### 3.1 Supported Participant Pairs

| Initiator | Recipient | Requirement |
|---|---|---|
| Attendee | Exhibitor | None (any attendee can contact any exhibitor) |
| Organizer | Exhibitor | Exhibitor must have an application in the organizer's expo; `expoId` required |
| Exhibitor | Attendee | Bidirectional reply to any existing conversation |
| Exhibitor | Organizer | Bidirectional reply to any existing conversation |

### 3.2 Communication Workflow

1. Attendee or organizer visits the Exhibitor Directory.
2. Clicks "Message" on a card or profile → navigates to MessagesPage with pre-filled recipient.
3. Fills in subject and message body → submits.
4. Exhibitor sees the conversation in their Messages page.
5. Both parties can reply; unread count updates on the conversation list.
6. Either party can mark messages as read via the UI (or PATCH endpoint).

### 3.3 Validation Rules

- Message body: required, 1–2000 characters, whitespace-only rejected.
- Subject: required, 1–200 characters.
- Recipient: must be a valid active user.
- Sender cannot message themselves.
- Duplicate open conversations (same participant pair + same expo) return the existing one (200) instead of creating a duplicate.

---

## 4. Database Changes

### New Models

#### `Conversation`
| Field | Type | Notes |
|---|---|---|
| `participants` | `[ObjectId]` ref User | Exactly 2, stored in sorted order |
| `subject` | String | Required, max 200 chars |
| `relatedExpo` | ObjectId ref Expo | Optional |
| `status` | `'open'` / `'closed'` | Default `'open'` |
| `lastMessageAt` | Date | Denormalised for sort |
| `messageCount` | Number | Maintained by controller |

**Indexes:**
- `{ participants: 1 }` — membership lookup
- `{ 'participants.0': 1, 'participants.1': 1, relatedExpo: 1 }` — unique per pair+expo

#### `Message`
| Field | Type | Notes |
|---|---|---|
| `conversation` | ObjectId ref Conversation | Required, indexed |
| `sender` | ObjectId ref User | Required, always from `req.user._id` |
| `body` | String | Required, 1–2000 chars |
| `isRead` | Boolean | Default `false` |
| `readAt` | Date | Set when marked read |

**Indexes:**
- `{ conversation: 1, createdAt: 1 }` — chronological retrieval
- `{ conversation: 1, isRead: 1, sender: 1 }` — unread count per sender

### Modified Models

#### `ExhibitorProfile`
Added `location` field (String, optional, max 200 chars, indexed). Backwards-compatible additive change.

---

## 5. API Endpoints

### Exhibitor Directory

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/exhibitors/directory` | None | Paginated list with search/filter |
| `GET` | `/api/exhibitors/directory/:id` | None | Single public profile |

**Query Parameters (listing):**
- `search` — full-text search on company name and description
- `industry` — filter by industry (regex, case-insensitive)
- `location` — filter by location (regex)
- `expoId` — filter to exhibitors with approved applications for this expo
- `page` — page number (default: 1)
- `limit` — results per page (default: 12, max: 50)
- `sort` — `companyName` (default) | `newest` | `oldest`

### Messaging

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| `POST` | `/api/messages/conversations` | Required | attendee, exhibitor, organizer | Start or join a conversation |
| `GET` | `/api/messages/conversations` | Required | all | List my conversations |
| `GET` | `/api/messages/conversations/:id` | Required | participant only | Conversation + history |
| `POST` | `/api/messages/conversations/:id/reply` | Required | participant only | Send reply |
| `PATCH` | `/api/messages/conversations/:id/read` | Required | participant only | Mark messages read |

---

## 6. Frontend Pages

| Page | Route | Auth Required | Access |
|---|---|---|---|
| `ExhibitorDirectoryPage` | `/exhibitor-directory` | No | Public |
| `ExhibitorPublicProfilePage` | `/exhibitor-public-profile/:id` | No | Public |
| `MessagesPage` | `/messages` | Yes | attendee, exhibitor, organizer |

---

## 7. Security Notes

- The `sender` field is always taken from `req.user._id` — never from the request body.
- Participant validation is enforced on every conversation read/write endpoint.
- Organizer–exhibitor conversations are further scoped to the organizer's own expos.
- All response objects strip passwords, emails, phones, documents, and contact-person data.
- Inactive user profiles are excluded from the directory.
