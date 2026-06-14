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
| Authentication | JWT, bcryptjs, OTP via MSG91 / Twilio |
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3 |
| Admin | React 18, Vite 5, React Router 6, Tailwind CSS 3 |
| Security | Helmet, CORS, express-rate-limit |

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB (local or Atlas URI)
- npm >= 9.x

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/austrum.git
cd austrum
```

### 2. Set up the server

```bash
cd server
cp env.example .env        # Fill in JWT_SECRET, MONGO_URI, OTP_PROVIDER
npm install
npm run dev                # Starts on http://localhost:5000
```

### 3. Set up the client

```bash
cd client
cp .env.example .env       # No required vars currently; edit if needed
npm install
npm run dev                # Starts on http://localhost:3000
```

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
| `server/` | `server/env.example` | `JWT_SECRET`, `MONGO_URI`, `OTP_PROVIDER` |
| `client/` | `client/.env.example` | *(none required currently)* |
| `admin-client/` | `admin-client/.env.example` | *(none required currently)* |

---

## API Overview

| Prefix | Description | Auth |
|---|---|---|
| `POST /api/auth/*` | Registration, login, OTP | Public |
| `GET /api/services` | List available services | Public |
| `GET /api/config/*` | Site config, booking limits | Public |
| `GET/POST /api/bookings/*` | User bookings | JWT required |
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

## OTP Configuration

Set `OTP_PROVIDER` in `server/.env`:

| Value | Behaviour |
|---|---|
| `dev` | Logs OTP to server console (local development only) |
| `msg91` | Sends real SMS via MSG91 (India, DLT-compliant) |
| `twilio` | Sends real SMS via Twilio |

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
