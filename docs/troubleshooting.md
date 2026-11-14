# EventSphere Management — Troubleshooting Guide

**Task 15 Documentation**  
**Audience:** Developers, DevOps Engineers, and Administrators

---

## 1. MongoDB & Database Errors

### Issue 1.1: `MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster` / `SSL alert number 80`
- **Symptom:** Backend logs show connection failure on startup, or requests hang/time out with `Operation users.find() buffering timed out after 10000ms`.
- **Cause:** MongoDB Atlas terminates TLS connections (SSL alert 80) if the incoming IP address is not whitelisted in the Atlas Network Access list.
- **Resolution:**
  1. Open the [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
  2. Navigate to **Security** → **Network Access**.
  3. If running locally: Click **Add IP Address** → **Add Current IP Address**.
  4. If running on Render, Vercel, or cloud hosts: Click **Add IP Address** → Select **Allow Access from Anywhere** (`0.0.0.0/0`). Atlas requires this for dynamic hosting provider IPs.
  5. Wait 1–2 minutes for the change to propagate, then restart the server.

### Issue 1.2: Authentication Failed / Password Error (`MongoServerError: bad auth`)
- **Symptom:** `AuthenticationFailed: bad auth: Authentication failed`.
- **Cause:** Incorrect username or password in `MONGO_URI`, or special characters in the password are not URL-encoded.
- **Resolution:**
  - If your password contains `@`, replace it with `%40`.
  - If your password contains `:`, replace it with `%3A`.
  - If your password contains `/`, replace it with `%2F`.
  - If your password contains `?`, replace it with `%3F`.
  - Ensure the database name is explicitly present: `...mongodb.net/eventsphere?retryWrites=true...`.

### Issue 1.3: Duplicate Key Error (`E11000 duplicate key error collection`)
- **Symptom:** API returns `409 Conflict`.
- **Cause:** Attempting to create an attendee registration, booth number, or user email that already exists.
- **Resolution:** This is an expected data-integrity constraint. The backend controllers catch code `11000` and return user-friendly messages. If testing, delete previous test records or use unique test identifiers.

---

## 2. Environment & Configuration Errors

### Issue 2.1: `JWT_SECRET is not configured in environment variables`
- **Symptom:** User registration or login crashes with 500 error.
- **Cause:** `JWT_SECRET` is missing from `server/.env` or hosting provider environment variables.
- **Resolution:**
  - Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate a 256-bit key.
  - Set `JWT_SECRET=<generated_key>` in `server/.env` and your hosting dashboard.

### Issue 2.2: `Port 5000 is already in use (EADDRINUSE)`
- **Symptom:** Backend fails to start locally: `Error: listen EADDRINUSE: address already in use :::5000`.
- **Cause:** Another process or previous node instance is still holding port 5000.
- **Resolution:**
  - Find and stop the process:
    ```powershell
    # Windows PowerShell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
    ```
  - Or specify an alternative port in `server/.env`: `PORT=5001`.

---

## 3. Frontend & API Communication Errors

### Issue 3.1: CORS Error in Browser Console (`CORS: origin '...' is not allowed`)
- **Symptom:** Browser console outputs: `Access to fetch at ... from origin 'https://eventsphere.vercel.app' has been blocked by CORS policy`.
- **Cause:** The live frontend domain is not listed in `CLIENT_ORIGIN` in the backend environment variables, or has an extra trailing slash.
- **Resolution:**
  - Update `CLIENT_ORIGIN` in Render to match your exact frontend domain without trailing slash:
    ```env
    CLIENT_ORIGIN=https://eventsphere.vercel.app,http://localhost:3000
    ```
  - Restart the backend web service.

### Issue 3.2: Double Slash in API URLs (`https://api.domain.com//api/health`)
- **Symptom:** API requests return 404 or fail with malformed URL.
- **Cause:** `REACT_APP_API_URL` was defined with a trailing slash (e.g. `https://api.domain.com/`).
- **Resolution:** EventSphere normalizes `BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '')`. Ensure `REACT_APP_API_URL` does not include `/api` or trailing slashes. Correct: `REACT_APP_API_URL=https://eventsphere-api.onrender.com`.

### Issue 3.3: Page Refresh Returns 404 on Vercel / Netlify
- **Symptom:** Direct URL access to `/expo-detail/123` or `/admin` displays 404 Not Found when refreshed in the browser.
- **Cause:** Static file servers look for a physical file at `/expo-detail/123/index.html` unless SPA rewrite rules are configured.
- **Resolution:**
  - For Vercel: Ensure [`client/vercel.json`](file:///d:/EventSphere Management System/client/vercel.json) is deployed with rewrite rules `{ "source": "/(.*)", "destination": "/index.html" }`.
  - For Netlify: Ensure [`client/public/_redirects`](file:///d:/EventSphere Management System/client/public/_redirects) is deployed with `/* /index.html 200`.

---

## 4. Authentication & Authorization Errors

### Issue 4.1: Access Denied (403 Forbidden)
- **Symptom:** Screen displays the `Access Denied: Role 'attendee' is not authorized to access this resource` page.
- **Cause:** Logged-in user has an attendee role and is attempting to access organizer or admin screens.
- **Resolution:** Log out and log in with an authorized account, or promote the user role in the Admin Dashboard (`/admin`).

### Issue 4.2: Rate Limited (`429 Too Many Requests`)
- **Symptom:** Repeated login attempts return HTTP 429: `Too many authentication attempts. Please wait 1 minute before trying again.`
- **Cause:** The in-memory sliding-window rate limiter triggered after 10 failed/repeated authentication requests within 60 seconds.
- **Resolution:** Wait 60 seconds for the rate window to reset. The response includes a standard `Retry-After: 60` header.

---

## 5. File Upload Issues

### Issue 5.1: `Security validation failed: File contents do not match a valid image signature`
- **Symptom:** Avatar upload returns HTTP 400.
- **Cause:** The uploaded file's binary magic bytes do not match JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), or WEBP (`RIFF...WEBP`). This occurs if a text document or script was renamed to `.jpg` or `.png`.
- **Resolution:** Upload an authentic image exported directly from an image editor or camera.

### Issue 5.2: `File too large: Maximum allowed size is 5MB`
- **Symptom:** Avatar upload fails with `400 Bad Request`.
- **Cause:** File exceeds the 5MB upload limit.
- **Resolution:** Compress the image before uploading or adjust `MAX_FILE_SIZE_MB` in `server/.env`.
