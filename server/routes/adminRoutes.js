// server/routes/adminRoutes.js

const express      = require("express");
const router       = express.Router();
const jwt          = require("jsonwebtoken");
const rateLimit    = require("express-rate-limit");
const User         = require("../models/User");
const auth         = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const {
  getAllBookings,
  updateBooking,
  deleteBooking,
  getRescheduleSettings,
  updateRescheduleSettings,
  getServices,
  createService,
  updateService,
  deleteService,
  // MODULE 6 — Reviews
  getAllReviewsAdmin,
  toggleFeatureReview,
  deleteReviewAdmin,
  getReviewSettings,
  updateReviewSettings,
} = require("../controllers/adminController");
const {
  getAllWorkers,
  createWorker,
  updateWorker,
  toggleWorker,
} = require("../controllers/workerController");

// ── Rate Limiter ───────────────────────────────────────────────────────────────
// Stricter than the user login limiter (5 attempts vs 10, same 15-min window).
// Mirrors the pattern used in routes/auth.js.
const adminLoginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many login attempts. Please try again later." },
});

// ── POST /api/admin/login ──────────────────────────────────────────────────────
router.post("/login", adminLoginLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    if (!rawEmail || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const email = rawEmail.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Invalid credentials." });

    if (user.role !== "admin")
      return res.status(403).json({ message: "Access denied. Not an admin account." });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      admin: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("admin login error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
});

// All routes below require auth + admin role
router.use(auth, requireAdmin);

// ── Bookings ───────────────────────────────────────────────────────────────────
// NOTE: Static sub-routes (/reschedule-settings) MUST be registered before the
// dynamic /:id route to avoid Express treating "reschedule-settings" as an id.
router.get("/bookings/reschedule-settings",   getRescheduleSettings);
router.patch("/bookings/reschedule-settings", updateRescheduleSettings);

router.get("/bookings",          getAllBookings);
router.patch("/bookings/:id",    updateBooking);
router.delete("/bookings/:id",   deleteBooking);

// ── Services ───────────────────────────────────────────────────────────────────
router.get("/services",        getServices);
router.post("/services",       createService);
router.patch("/services/:id",  updateService);
router.delete("/services/:id", deleteService);

// ── Workers ────────────────────────────────────────────────────────────────────
router.get("/workers",              getAllWorkers);
router.post("/workers",             createWorker);
router.put("/workers/:id",          updateWorker);
router.patch("/workers/:id/toggle", toggleWorker);

// ── MODULE 6: Reviews ─────────────────────────────────────────────────────────
// Settings must come before /:id routes to avoid param collision
router.get("/reviews/settings",         getReviewSettings);
router.patch("/reviews/settings",       updateReviewSettings);
router.get("/reviews",                  getAllReviewsAdmin);
router.patch("/reviews/:id/feature",    toggleFeatureReview);
router.delete("/reviews/:id",           deleteReviewAdmin);

module.exports = router;