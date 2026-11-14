# EventSphere Management — Production Deployment Guide

**Task 15 Documentation**  
**Version:** 1.0.0  
**Stack:** MERN (MongoDB Atlas + Express.js + React.js + Node.js)

---

## 1. Production Architecture Overview

EventSphere Management is designed with a decoupled client-server architecture:

```
┌────────────────────────────────┐         HTTPS / REST API          ┌───────────────────────────────────┐
│        React Frontend          │ ────────────────────────────────> │        Node / Express API         │
│  Hosted on Vercel / Netlify    │                                   │       Hosted on Render Web        │
│  (Single-Page App + SPA Rules) │ <──────────────────────────────── │    (Stateless REST API Service)   │
└────────────────────────────────┘          JSON Responses           └───────────────────────────────────┘
                                                                                       │
                                                                                       │ Mongoose 8 (TLS/SSL)
                                                                                       ▼
                                                                     ┌───────────────────────────────────┐
                                                                     │       MongoDB Atlas Cluster       │
                                                                     │     Database: 'eventsphere'       │
                                                                     │     Replica Set + Auto-Backup     │
                                                                     └───────────────────────────────────┘
```

| Component | Recommended Host | Free-Tier Specs | Key Responsibilities |
|---|---|---|---|
| **Frontend** | **Vercel** (or Render Static) | Unlimited traffic, global Edge CDN | React SPA delivery, client-side routing, JWT caching. |
| **Backend** | **Render** (Web Service) | 512 MB RAM, 0.1 CPU, automatic TLS | Express REST API, RBAC enforcement, reminder scheduler, file uploads. |
| **Database** | **MongoDB Atlas** (M0 Free Tier) | 512 MB storage, shared RAM, TLS 1.3 | Document persistence, compound unique indexes, data integrity. |

---

## 2. MongoDB Atlas Database Setup

### Step 2.1: Create Cluster & Database
1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a new **M0 (Free)** cluster in your preferred cloud region (e.g., AWS `us-east-1` or `eu-west-1`).
3. Set Cluster Name to `Cluster0` (or `eventsphere-cluster`).

### Step 2.2: Configure Database User (Least Privilege)
1. In the Atlas dashboard, navigate to **Security** → **Database Access**.
2. Click **Add New Database User**.
3. Choose **Password** authentication.
4. Set Username: `eventsphere_admin` (or user of your choice).
5. Generate a secure 24+ character password.
   > [!IMPORTANT]
   > If the password contains special characters like `@`, `:`, `/`, or `%`, ensure they are URL-encoded in the connection string (e.g. `@` becomes `%40`).
6. Set Database User Privileges: Select **Built-in Role** → **Read and write to any database** (scoped to `eventsphere`).

### Step 2.3: Configure Network Access (IP Whitelist)
1. In the Atlas dashboard, navigate to **Security** → **Network Access**.
2. Click **Add IP Address**.
3. For deployment on dynamic hosting providers like Render:
   - Add `0.0.0.0/0` (Allow Access from Anywhere) with a description: `Render Backend Production`.
   - *Security Note:* Atlas enforces strong SCRAM-SHA-256 user authentication and TLS encryption for all incoming connections, preventing unauthorized access even with `0.0.0.0/0`.
4. If testing locally, also add your current machine's IP address.

### Step 2.4: Obtain Connection String
1. Go to **Databases** → **Deployment** → Click **Connect**.
2. Select **Drivers** (Node.js version 4.1 or later).
3. Copy the SRV URI:
   ```
   mongodb+srv://<username>:<password>@<cluster-url>.mongodb.net/eventsphere?retryWrites=true&w=majority
   ```
4. Note that `/eventsphere` must be explicitly specified as the database path before query parameters (`?retryWrites=true...`).

---

## 3. Backend Deployment on Render

### Step 3.1: Connect Repository to Render
1. Sign in to [Render](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your Git repository containing the EventSphere Management codebase.

### Step 3.2: Configure Service Parameters
Configure the service with the following settings:

| Setting | Value |
|---|---|
| **Name** | `eventsphere-api` |
| **Region** | Closest to your MongoDB Atlas region (e.g., Ohio or Frankfurt) |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### Step 3.3: Set Environment Variables on Render
Under the **Environment Variables** tab in your Render Web Service settings, add:

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations and disables error stack traces. |
| `PORT` | `10000` | Render assigns ports dynamically via `process.env.PORT`. |
| `MONGO_URI` | `mongodb+srv://.../eventsphere?...` | Full MongoDB Atlas connection string with credentials. |
| `JWT_SECRET` | *(64-char random hex)* | 256-bit cryptographically secure secret for JWT signing. |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime (default 7 days). |
| `CLIENT_ORIGIN` | `https://eventsphere.vercel.app` | Comma-separated list of allowed frontend domains. |
| `MAX_FILE_SIZE_MB` | `5` | Maximum upload size for avatars. |
| `REMINDER_WINDOW_HOURS` | `24` | Automated lookahead window for upcoming event notifications. |

### Step 3.4: Configure Health Check Path
- Scroll down to **Advanced** → **Health Check Path**.
- Set path to: `/api/health`.
- Render will ping `/api/health` during zero-downtime deployments.

### Step 3.5: Deploy Backend
- Click **Create Web Service**.
- Monitor the deployment log. Once deployed, Render provides your public API URL:
  `https://eventsphere-api.onrender.com`

---

## 4. Frontend Deployment on Vercel

### Step 4.1: Import Project into Vercel
1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your EventSphere repository.

### Step 4.2: Configure Build & Output Settings
1. **Framework Preset:** `Create React App`
2. **Root Directory:** Click Edit and select `client`.
3. **Build Command:** `npm run build`
4. **Output Directory:** `build`
5. **Install Command:** `npm install`

### Step 4.3: Set Frontend Environment Variables
In the **Environment Variables** section, add:

| Key | Value | Notes |
|---|---|---|
| `REACT_APP_API_URL` | `https://eventsphere-api.onrender.com` | Live backend URL (**no trailing slash**). |

### Step 4.4: Verify SPA Fallback Routing
- Ensure [`client/vercel.json`](file:///d:/EventSphere Management System/client/vercel.json) or [`client/public/_redirects`](file:///d:/EventSphere Management System/client/public/_redirects) is present in the repository.
- Vercel automatically applies the rewrite rule `{ "source": "/(.*)", "destination": "/index.html" }` so that refreshing deep routes (like `/expo-detail/:id`) renders the application without 404 errors.

### Step 4.5: Deploy Frontend
1. Click **Deploy**.
2. Vercel compiles the React application and delivers it to global Edge CDNs.
3. Your live production frontend URL will look like:
   `https://eventsphere.vercel.app`

---

## 5. Post-Deployment Handshake (CORS Synchronization)

Once both frontend and backend are deployed:

1. Return to the **Render Web Service** dashboard (`eventsphere-api`).
2. Go to **Environment Variables**.
3. Update `CLIENT_ORIGIN` with your exact live Vercel domain:
   ```env
   CLIENT_ORIGIN=https://eventsphere.vercel.app
   ```
4. Click **Save Changes**. Render will automatically trigger a zero-downtime redeployment.

---

## 6. Alternative: Full-Stack Monorepo on Render Blueprint

If you prefer to deploy both frontend and backend under a single Render account, use the provided [`render.yaml`](file:///d:/EventSphere Management System/render.yaml):

1. Go to **Render Dashboard** → **New +** → **Blueprint**.
2. Select your repository.
3. Render reads `render.yaml` and provisions both services:
   - `eventsphere-api` (Express REST service)
   - `eventsphere-client` (Static site with SPA rewrite rules)
4. Populate `MONGO_URI` and `JWT_SECRET` in the dashboard when prompted.

---

## 7. Production Verification & Smoke Testing

Perform the following smoke tests on your deployed URLs:

| # | Check | Verification Method | Expected Result |
|---|---|---|---|
| 1 | **API Health** | `GET https://<api-domain>/api/health` | HTTP 200 `{ "status": "ok", "environment": "production" }` |
| 2 | **CORS Policy** | Check headers from frontend console | `Access-Control-Allow-Origin: https://<client-domain>` |
| 3 | **Home Page** | Navigate to `https://<client-domain>/` | Landing page renders with stats, hero, and CTAs. |
| 4 | **Deep Link Refresh** | Refresh `https://<client-domain>/exhibitor-directory` directly | Page reloads without 404 (SPA rewrite working). |
| 5 | **User Registration** | Register a new attendee | Returns 201, issues JWT, redirects to Attendee Dashboard. |
| 6 | **Role Login** | Log in with organizer and admin accounts | Distinct dashboards render for respective roles. |
| 7 | **Avatar Upload** | Upload an avatar image in Profile | File uploaded to backend, displayed in UI. |
| 8 | **Expo Lifecycle** | Create, publish, register, and bookmark | Data persists in MongoDB Atlas. |

---

## 8. Deployment Troubleshooting

### Common Issue 1: MongoDB Connection Timeout (`MongooseServerSelectionError`)
- **Cause:** Current server IP is not in Atlas IP Access List.
- **Fix:** In MongoDB Atlas, verify that `0.0.0.0/0` is listed under **Network Access**. Ensure the database password is correctly encoded.

### Common Issue 2: CORS Header Missing / Network Error
- **Cause:** Mismatch between `CLIENT_ORIGIN` in backend and the browser origin.
- **Fix:** Ensure `CLIENT_ORIGIN` in Render does not have a trailing slash (`https://eventsphere.vercel.app`, not `https://eventsphere.vercel.app/`).

### Common Issue 3: Refreshing Sub-Pages Returns 404
- **Cause:** Static file host is looking for physical files instead of falling back to `index.html`.
- **Fix:** Ensure [`client/vercel.json`](file:///d:/EventSphere Management System/client/vercel.json) or [`client/public/_redirects`](file:///d:/EventSphere Management System/client/public/_redirects) is deployed.
