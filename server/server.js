// server/server.js

require("dotenv").config();

// ── Startup guard: JWT_SECRET ─────────────────────────────────────────────────
const JWT_SECRET_PLACEHOLDER = "CHANGE_ME_replace_with_a_64byte_random_hex_string";
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === JWT_SECRET_PLACEHOLDER) {
  console.error(
    "❌ FATAL: JWT_SECRET is not configured.\n" +
    "  Generate a secure value with:\n" +
    "    node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"\n" +
    "  Then set JWT_SECRET in your .env file."
  );
  process.exit(1);
}

// ── Startup guard: MONGODB_URI ────────────────────────────────────────────────
if (!process.env.MONGODB_URI) {
  console.error(
    "❌ FATAL: MONGODB_URI is not configured.\n" +
    "  Set MONGODB_URI in your .env file.\n" +
    "  Example (Atlas): mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>?appName=<app>"
  );
  process.exit(1);
}

// ── Startup guard: Firebase / reCAPTCHA / Email ───────────────────────────────
// These power signup (Firebase), booking confirmation (reCAPTCHA) and the
// confirmation email. Fail fast so a misconfigured deploy never half-works.
{
  const required = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "RECAPTCHA_SECRET_KEY",
    "EMAIL_USER",
    "EMAIL_APP_PASSWORD",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(
      "❌ FATAL: Missing required env vars:\n" +
      missing.map((k) => `    • ${k}`).join("\n") +
      "\n  See server/.env.example for setup instructions."
    );
    process.exit(1);
  }
}

const dns      = require("dns");
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const helmet   = require("helmet");
const { initFirebase } = require("./services/firebaseAdmin");

// Initialize Firebase Admin SDK at startup (verifies credentials are loadable).
initFirebase();

// ── Force public DNS for MongoDB Atlas SRV resolution ────────────────────────
// Windows and some ISP resolvers refuse SRV record lookups (ECONNREFUSED on
// querySrv). Overriding to Google + Cloudflare public DNS resolves this before
// mongoose.connect() fires.
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

// ── Process-level safety handlers ─────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

const app = express();

// Behind a reverse proxy (nginx / Cloudflare) in production — trust the first
// proxy hop so req.ip and express-rate-limit see the real client address.
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────
// Allow the customer + admin frontends (custom domains and their Vercel
// fallbacks) plus local dev. The env vars are additive and may be a single
// origin or a comma-separated list, so origins can be tweaked in Railway
// without a code change. Duplicates/blanks are stripped.
const ALLOWED_ORIGINS = [
  // Production — custom domains
  "https://upkeep.austrum.co.in",
  "https://upkeep-admin.austrum.co.in",
  // Production — Vercel deployment fallbacks
  "https://upkeep-steel.vercel.app",
  "https://upkeep-sgng.vercel.app",
  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  // Extra origins from env (single value or comma-separated)
  ...(process.env.CLIENT_ORIGIN       || "").split(","),
  ...(process.env.ADMIN_CLIENT_ORIGIN || "").split(","),
  ...(process.env.EXTRA_CORS_ORIGINS  || "").split(","),
]
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin header) and any allow-listed origin.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // answer OPTIONS preflight for every route
app.use(express.json({ limit: "50kb" }));

// Routes
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/reviews",  require("./routes/reviewRoutes"));
app.use("/api/services", require("./routes/serviceRoutes")); // public
app.use("/api/admin",    require("./routes/adminRoutes"));   // protected
app.use("/api/config",   require("./routes/configRoutes"));  // public config (time-slots, etc.)

// Health check
app.get("/", (_, res) => res.json({ status: "Austrum API running ✅" }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = (typeof err.status === "number" && err.status >= 400 && err.status < 600)
    ? err.status
    : 500;
  res.status(status).json({ message: "An unexpected error occurred." });
});

const PORT = process.env.PORT || 5000;

const uri = process.env.MONGODB_URI;
console.log("⏳ Connecting to MongoDB Atlas...");
console.log(`   Host: ${uri.replace(/\/\/[^@]+@/, "//***:***@")}`); // mask credentials

mongoose
  .connect(uri, {
    family:                    4,      // force IPv4 — avoids IPv6 SRV issues on Windows
    serverSelectionTimeoutMS:  10000,  // fail fast with a clear error instead of 30 s hang
    socketTimeoutMS:           45000,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB Atlas connection failed:", err.message);
    process.exit(1);
  });