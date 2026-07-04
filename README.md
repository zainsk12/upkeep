# Austrum — Home Services Booking Platform

> Nashik's trusted home services platform. Book, manage, and review professional home services — all from one place.

---

## Project Structure

This is a **monorepo** with three independently runnable applications:

```
Austrum_Work/
├── server/          # Express.js REST API (Node.js + MongoDB)
├── client/          # User-facing React app (Vite + Tailwind CSS)
└── admin-client/    # Admin dashboard (Vite + Tailwind CSS)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js, MongoDB, Mongoose |
| Authentication | JWT, bcryptjs, Firebase Phone Authentication (signup) |
| Bot protection | Google reCAPTCHA v3 (booking confirmation) |
| Email | Nodemailer via Gmail (booking confirmation emails) |
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3 |
| Admin | React 18, Vite 5, React Router 6, Tailwind CSS 3 |
| Security | Helmet, CORS, express-rate-limit |

---

## Authentication & Booking Flow

**Signup** — Phone verification is handled by **Firebase Phone Authentication**:
1. The client (Firebase web SDK) verifies the phone via SMS OTP (with Firebase's
   own invisible reCAPTCHA) and obtains a Firebase **ID token**.
2. `POST /api/auth/register` verifies that token with the **Firebase Admin SDK**,
   confirms the phone matches, and stores `firebaseUid` + `isPhoneVerified` on the user.

**Login** — Remains **email/phone + password** (bcrypt). No SMS/OTP at login.

**Booking lifecycle**
1. **Create** → `POST /api/bookings` creates a `pending` booking and generates a
   unique booking reference (e.g. `UPK-20260617-7F3K9`). *No reCAPTCHA on creation.*
2. **Quote** → admin sends a price quotation → status `awaiting_user_confirmation`.
3. **Confirm** → user clicks *Accept Quote*; the client runs **reCAPTCHA v3**
   (action `confirm_booking`) and sends the token to `POST /api/bookings/:id/confirm`.
   The server verifies it:
   - **Success** → status becomes `confirmed` **and** a confirmation email is sent
     from `upkeep.austrum@gmail.com`.
   - **Failure** → status stays `awaiting_user_confirmation`, no email.
4. **Reject** → user clicks *Reject Quote*, confirms, and picks a reason
   (`POST /api/bookings/:id/reject`) → status `quote_rejected`. The rejected
   quotation is snapshotted into `quotationHistory` and admins are notified.
   From here the user chooses:
   - **Request Revised Quote** → `POST /api/bookings/:id/request-revision` →
     status `revision_requested`; admin sends a new quotation → back to
     `awaiting_user_confirmation` (revision history is preserved).
   - **Close Request** → `POST /api/bookings/:id/close` → status `closed`
     (terminal — no further quotations).

   Every transition is appended to the booking's `history` array, rendered as
   the request timeline on both dashboards. Allowed transitions live in
   `server/constants/quoteWorkflow.js`.

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB Atlas account (free tier works)
- npm >= 9.x

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/austrum.git
cd austrum
```

### 2. Set up the server

```bash
cd server
cp .env.example .env       # Fill in JWT_SECRET, MONGODB_URI, FIREBASE_*, RECAPTCHA_SECRET_KEY, EMAIL_*
npm install
npm run dev                # Starts on http://localhost:5000
```

> The server **fails fast at startup** if any required variable is missing
> (`JWT_SECRET`, `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
> `FIREBASE_PRIVATE_KEY`, `RECAPTCHA_SECRET_KEY`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`).

### 3. Set up the client

```bash
cd client
cp .env.example .env       # Fill in VITE_FIREBASE_* and VITE_RECAPTCHA_SITE_KEY
npm install
npm run dev                # Starts on http://localhost:3000
```

> The client validates required `VITE_*` vars at startup (see `client/src/utils/env.js`)
> and throws immediately if any are missing.

### 4. Set up the admin client

```bash
cd admin-client
cp .env.example .env       # No required vars currently; edit if needed
npm install
npm run dev                # Starts on http://localhost:3001
```

---

## Environment Variables

Each application manages its own `.env`. See the `.env.example` / `env.example` in each folder for full documentation.

**Never commit `.env` files. They contain real secrets.**

| App | Example File | Critical Vars |
|---|---|---|
| `server/` | `server/.env.example` | `JWT_SECRET`, `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `RECAPTCHA_SECRET_KEY`, `EMAIL_USER`, `EMAIL_APP_PASSWORD` |
| `client/` | `client/.env.example` | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_RECAPTCHA_SITE_KEY` |
| `admin-client/` | `admin-client/.env.example` | *(none required currently)* |

See the **[Deployment Checklist](#deployment-checklist--environment--firebase)** below for the
complete list with descriptions.

---

## API Overview

| Prefix | Description | Auth |
|---|---|---|
| `POST /api/auth/register` | Create account (requires Firebase ID token) | Public |
| `POST /api/auth/login` | Login with phone/email + password | Public |
| `GET /api/services` | List available services | Public |
| `GET /api/config/*` | Site config, booking limits | Public |
| `POST /api/bookings` | Create a pending booking | JWT required |
| `POST /api/bookings/:id/confirm` | Confirm booking (reCAPTCHA v3 token) | JWT required |
| `GET/POST /api/bookings/*` | User bookings (reschedule, reject, list) | JWT required |
| `GET/POST /api/reviews/*` | Reviews | JWT required |
| `* /api/admin/*` | Admin operations | Admin JWT required |

---

## Scripts

### Server
```bash
npm run dev     # nodemon watch mode
npm start       # production start
```

### Client / Admin
```bash
npm run dev     # Vite dev server
npm run build   # Production build → dist/
npm run preview # Preview production build locally
```

---

## Third-Party Setup

### 1. Firebase Phone Authentication (signup)

1. Go to the [Firebase Console](https://console.firebase.google.com/) → create or select a project.
2. **Build → Authentication → Sign-in method → enable _Phone_.**
3. **Authentication → Settings → Authorized domains** → add `localhost` and your
   production host (`upkeep.austrum.co.in`).
4. **Project Settings → General → Your apps → Web app** → copy the SDK config into
   the client `.env` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`).
5. **Project Settings → Service accounts → Generate new private key** → from the
   downloaded JSON set the server `.env`: `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
   > Keep `FIREBASE_PRIVATE_KEY` on a single line with literal `\n` escapes,
   > wrapped in double quotes. The server un-escapes them at runtime.

### 2. Google reCAPTCHA v3 (booking confirmation)

1. Open the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin) →
   register a new site → choose **reCAPTCHA v3**.
2. Add domains: `localhost` and `upkeep.austrum.co.in`.
3. Put the **Site key** in the client `.env` (`VITE_RECAPTCHA_SITE_KEY`) and the
   **Secret key** in the server `.env` (`RECAPTCHA_SECRET_KEY`).
4. Optional: tune `RECAPTCHA_MIN_SCORE` (server, default `0.5`).

### 3. Gmail (confirmation emails)

1. On the `upkeep.austrum@gmail.com` account, enable **2-Step Verification**.
2. **Google Account → Security → App passwords** → create one (16 chars).
3. Set the server `.env`: `EMAIL_USER=upkeep.austrum@gmail.com`,
   `EMAIL_APP_PASSWORD=<app password>`, optional `EMAIL_FROM`.

---

## Deployment Checklist — Environment & Firebase

Run through this before deploying to **`upkeep.austrum.co.in`**.

### Server (`server/.env`)

| Variable | Required | Notes |
|---|---|---|
| `PORT` | — | Defaults to `5000` |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | 64-byte random hex; server refuses placeholder/empty |
| `JWT_EXPIRES_IN` | — | Defaults to `7d` |
| `CLIENT_ORIGIN` | ✅ (prod) | `https://upkeep.austrum.co.in` |
| `ADMIN_CLIENT_ORIGIN` | ✅ (prod) | Admin panel origin |
| `FIREBASE_PROJECT_ID` | ✅ | From the service account JSON |
| `FIREBASE_CLIENT_EMAIL` | ✅ | From the service account JSON |
| `FIREBASE_PRIVATE_KEY` | ✅ | One line, literal `\n`, double-quoted |
| `RECAPTCHA_SECRET_KEY` | ✅ | reCAPTCHA v3 **secret** key |
| `RECAPTCHA_MIN_SCORE` | — | Default `0.5` |
| `EMAIL_USER` | ✅ | `upkeep.austrum@gmail.com` |
| `EMAIL_APP_PASSWORD` | ✅ | Gmail App Password (not account password) |
| `EMAIL_FROM` | — | Defaults to `"UpKeep by Austrum" <EMAIL_USER>` |

### Client (`client/.env`)

| Variable | Required | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase web config |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase web config |
| `VITE_RECAPTCHA_SITE_KEY` | ✅ | reCAPTCHA v3 **site** key (public) |

### Pre-deploy verification

- [ ] All server vars set — server boots without the startup-guard error.
- [ ] All client `VITE_*` vars set — `npm run build` succeeds and the app loads.
- [ ] Firebase: Phone sign-in enabled; `upkeep.austrum.co.in` in **Authorized domains**.
- [ ] reCAPTCHA: v3 site registered with `upkeep.austrum.co.in` as a domain.
- [ ] Gmail: App Password valid; a test confirmation email is delivered.
- [ ] CORS `CLIENT_ORIGIN` / `ADMIN_CLIENT_ORIGIN` match the deployed hosts.
- [ ] Reverse proxy forwards `X-Forwarded-*` (server uses `trust proxy`).
- [ ] No secrets committed — `.env` files are git-ignored.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## License

This project is proprietary. All rights reserved.

---

*Built with ❤️ in Nashik, Maharashtra.*
