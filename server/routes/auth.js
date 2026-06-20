// server/routes/auth.js
// Phone-centric authentication routes.
//
// Signup uses Firebase Phone Authentication:
//   1. Client (web SDK) verifies the phone via Firebase (SMS OTP + Firebase's own
//      reCAPTCHA) and obtains a Firebase ID token.
//   2. Client calls POST /api/auth/register with that idToken.
//   3. Server verifies the token via the Firebase Admin SDK, confirms the phone
//      matches, and creates the account storing firebaseUid + isPhoneVerified.
//
// Login remains password-based (phone OR email + password) — unchanged.
//
// Endpoints:
//   POST /api/auth/register   — create account (requires firebaseIdToken)
//   POST /api/auth/login      — phone OR email + password
//   GET  /api/auth/me         — current user
//   PUT  /api/auth/profile    — update name/phone/address

const express   = require("express");
const jwt       = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User      = require("../models/User");
const protect   = require("../middleware/auth");
const { normalizePhone, isValidIndianPhone } = require("../utils/phone");
const { exceedsBcryptLimit, TOO_LONG_MESSAGE } = require("../utils/passwordPolicy");
const { verifyFirebaseToken } = require("../services/firebaseAdmin");
const {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require("../controllers/passwordResetController");

const router = express.Router();

// ── Rate Limiters ─────────────────────────────────────────────────────────────

// Max 10 registrations per IP per 15 minutes (Firebase already rate-limits SMS)
const registerLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many signup attempts. Please try again later." },
});

// Max 10 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many login attempts. Please try again later." },
});

// Forgot-password (initial request AND resend share this endpoint): a per-IP
// ceiling that only blunts bulk/scripted abuse from a single IP. It is intentionally
// generous because the precise anti-bombing control is now the PER-ACCOUNT cooldown
// (60s between emails, max 10 / 24h — see passwordResetService.evaluateResetThrottle),
// which is IP-independent and victim-scoped. Keeping this tight (it was 5/15m) would
// wrongly block a legitimate user doing an initial request + a few resends; the
// per-account throttle still caps a single victim's inbox regardless of this value.
const forgotPasswordLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             15,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many reset requests. Please try again in a few minutes." },
});

// OTP verification: a little more headroom than sending, but still tight to blunt
// brute-forcing the 6-digit code from a single IP (the per-account 5-attempt cap
// is the primary guard; this backstops IP-level enumeration).
const resetVerifyLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many attempts. Please try again in a few minutes." },
});

// ── Token helper ──────────────────────────────────────────────────────────────

/**
 * Full session token — stored in localStorage, used for all API calls.
 */
const signSessionToken = (user) =>
  jwt.sign(
    {
      id:              user._id,
      email:           user.email   || "",
      role:            user.role,
      name:            user.name,
      phone:           user.phone   || "",
      address:         user.address || "",
      isPhoneVerified: user.isPhoneVerified || false,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Creates a new user account.
// Requires a Firebase ID token proving the phone number was verified.
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { name, phone, email, password, firebaseIdToken } = req.body;

    // ── Basic field validation ──────────────────────────────────────────────
    if (!name || !name.trim())
      return res.status(400).json({ message: "Full name is required." });

    if (!phone)
      return res.status(400).json({ message: "Phone number is required." });

    if (!isValidIndianPhone(phone))
      return res.status(400).json({ message: "Enter a valid Indian mobile number." });

    if (!password || password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    // bcrypt only hashes the first 72 bytes — reject longer passwords so the
    // ignored tail can't give users a false sense of strength (UTF-8 byte length).
    if (exceedsBcryptLimit(password))
      return res.status(400).json({ message: TOO_LONG_MESSAGE });

    // Email is OPTIONAL. Normalise blank/whitespace to "no email" and only
    // validate the format when an actual value was supplied.
    const cleanEmail =
      email && email.trim() ? email.trim().toLowerCase() : null;

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return res.status(400).json({ message: "Enter a valid email address." });

    // ── Verify Firebase phone authentication ──────────────────────────────────
    if (!firebaseIdToken)
      return res.status(400).json({ message: "Phone verification is required to create an account." });

    let verified;
    try {
      verified = await verifyFirebaseToken(firebaseIdToken);
    } catch (err) {
      console.error("Firebase token verification failed:", err.message);
      return res.status(400).json({ message: "Phone verification expired or invalid. Please verify again." });
    }

    const normalised = normalizePhone(phone);

    // The phone proven by Firebase must match the phone being registered.
    if (!verified.phone || normalizePhone(verified.phone) !== normalised)
      return res.status(400).json({ message: "Phone number does not match the verified number." });

    // ── Duplicate checks ────────────────────────────────────────────────────
    const phoneExists = await User.findOne({ phone: normalised });
    if (phoneExists)
      return res.status(409).json({ message: "Phone number already registered. Please log in." });

    const uidExists = await User.findOne({ firebaseUid: verified.uid });
    if (uidExists)
      return res.status(409).json({ message: "This phone is already linked to an account. Please log in." });

    if (cleanEmail) {
      const emailExists = await User.findOne({ email: cleanEmail });
      if (emailExists)
        return res.status(409).json({ message: "Email is already associated with another account." });
    }

    // ── Create user ─────────────────────────────────────────────────────────
    // Build the payload conditionally: when no email was supplied the field is
    // omitted entirely (never stored as null), so the partial unique index
    // correctly ignores email-less accounts.
    const userData = {
      name:            name.trim(),
      phone:           normalised,
      password,
      firebaseUid:     verified.uid,
      isPhoneVerified: true,
    };
    if (cleanEmail) userData.email = cleanEmail;

    const user = await User.create(userData);

    const token = signSessionToken(user);

    res.status(201).json({
      token,
      user: {
        id:              user._id,
        name:            user.name,
        phone:           user.phone,
        email:           user.email || "",
        role:            user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (err) {
    console.error("register error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Accepts a single "credential" field: phone number OR email address.
// Logic: if credential contains "@" → treat as email, else → treat as phone.
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { credential, password } = req.body;

    if (!credential || !password)
      return res.status(400).json({ message: "Phone/email and password are required." });

    let user;

    if (credential.includes("@")) {
      // ── Email login ──────────────────────────────────────────────────────
      user = await User.findOne({ email: credential.toLowerCase().trim() });
    } else {
      // ── Phone login ──────────────────────────────────────────────────────
      const normalised = normalizePhone(credential.trim());
      user = await User.findOne({ phone: normalised });
    }

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Invalid credentials. Please try again." });

    const token = signSessionToken(user);

    res.json({
      token,
      user: {
        id:              user._id,
        name:            user.name,
        phone:           user.phone,
        email:           user.email || "",
        role:            user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (err) {
    console.error("login error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ── Password reset flow ───────────────────────────────────────────────────────
// POST /api/auth/forgot-password   — request a reset code (email OTP or phone)
// POST /api/auth/verify-reset-otp  — verify the code → returns a reset token
// POST /api/auth/reset-password    — set a new password with the reset token
router.post("/forgot-password",  forgotPasswordLimiter, forgotPassword);
router.post("/verify-reset-otp",  resetVerifyLimiter,    verifyResetOtp);
router.post("/reset-password",    resetVerifyLimiter,    resetPassword);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
// Update name, phone, address. Email and password are not modified here.
// Changing phone resets isPhoneVerified if the number is different.
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ message: "Name cannot be empty." });

    if (phone && !isValidIndianPhone(phone))
      return res.status(400).json({ message: "Enter a valid Indian mobile number." });

    const updateData = {
      name:    name.trim(),
      address: address ? address.trim() : "",
    };

    if (phone) {
      const normalised = normalizePhone(phone);
      // Check if new phone is taken by another user
      const conflict = await User.findOne({ phone: normalised, _id: { $ne: req.user._id } });
      if (conflict)
        return res.status(409).json({ message: "This phone number is already in use." });
      updateData.phone = normalised;
      // Reset verification if the phone number actually changed
      if (normalised !== req.user.phone) {
        updateData.isPhoneVerified = false;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser)
      return res.status(404).json({ message: "User not found." });

    const token = signSessionToken(updatedUser);

    res.json({
      message: "Profile updated successfully.",
      token,
      user: {
        id:              updatedUser._id,
        name:            updatedUser.name,
        email:           updatedUser.email || "",
        role:            updatedUser.role,
        phone:           updatedUser.phone,
        address:         updatedUser.address,
        isPhoneVerified: updatedUser.isPhoneVerified,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
