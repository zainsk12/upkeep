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

const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const helmet   = require("helmet");

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

app.use(helmet({ contentSecurityPolicy: false }));

const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN       || "http://localhost:3000",
  process.env.ADMIN_CLIENT_ORIGIN || "http://localhost:3001",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });