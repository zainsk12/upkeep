// server/routes/auth.js
// Phone-centric authentication routes.
//
// New endpoints:
//   POST /api/auth/send-otp      — send OTP to phone (signup only)
//   POST /api/auth/verify-otp   — verify OTP, receive signupToken
//
// Updated endpoints:
//   POST /api/auth/register     — requires signupToken from verify-otp
//   POST /api/auth/login        — accepts phone OR email + password
//   GET  /api/auth/me           — unchanged
//   PUT  /api/auth/profile      — unchanged

const express   = require("express");
const jwt       = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User      = require("../models/User");
const protect   = require("../middleware/auth");
const {
  sendOTP,
  verifyOTP,
  normalizePhone,
  isValidIndianPhone,
} = require("../services/otpService");

const router = express.Router();

// ── Rate Limiters ─────────────────────────────────────────────────────────────

// Max 3 OTP requests per IP per 10 minutes
const otpSendLimiter = rateLimit({
  windowMs:        10 * 60 * 1000, // 10 minutes
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many OTP requests. Please wait 10 minutes and try again." },
});

// Max 10 verify attempts per IP per 10 minutes
const otpVerifyLimiter = rateLimit({
  windowMs:        10 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many attempts. Please wait 10 minutes." },
});

// Max 10 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many login attempts. Please try again later." },
});

// ── Token helpers ─────────────────────────────────────────────────────────────

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

/**
 * Short-lived signup token — proves phone was verified.
 * Passed from /verify-otp → /register to complete account creation.
 * Expires in 10 minutes.
 */
const signSignupToken = (phone) =>
  jwt.sign(
    { phone, purpose: "signup" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Generates and sends an OTP to the given Indian phone number.
// Only for new accounts — rejects already-registered phones.
router.post("/send-otp", otpSendLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone)
      return res.status(400).json({ message: "Phone number is required." });

    if (!isValidIndianPhone(phone))
      return res.status(400).json({
        message: "Enter a valid Indian mobile number (10 digits, starting with 6–9).",
      });

    const normalised = normalizePhone(phone);

    // Block if phone already registered
    const existing = await User.findOne({ phone: normalised });
    if (existing)
      return res.status(409).json({ message: "This phone number is already registered. Please log in." });

    await sendOTP(normalised);

    res.json({ message: "OTP sent successfully." });
  } catch (err) {
    console.error("send-otp error:", err.message);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Verifies the OTP.  On success, returns a short-lived signupToken that
// /register requires to create the account.
router.post("/verify-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp)
      return res.status(400).json({ message: "Phone and OTP are required." });

    if (!isValidIndianPhone(phone))
      return res.status(400).json({ message: "Invalid phone number." });

    const result = await verifyOTP(phone, String(otp).trim());

    if (!result.success)
      return res.status(400).json({ message: result.reason });

    // Issue a short-lived token that proves this phone was verified
    const signupToken = signSignupToken(normalizePhone(phone));

    res.json({ message: "Phone verified successfully.", signupToken });
  } catch (err) {
    console.error("verify-otp error:", err.message);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Creates a new user account.
// Requires a valid signupToken from /verify-otp.
router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password, signupToken } = req.body;

    // ── Basic field validation ──────────────────────────────────────────────
    if (!name || !name.trim())
      return res.status(400).json({ message: "Full name is required." });

    if (!phone)
      return res.status(400).json({ message: "Phone number is required." });

    if (!isValidIndianPhone(phone))
      return res.status(400).json({
        message: "Enter a valid Indian mobile number.",
      });

    if (!password || password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: "Enter a valid email address." });

    // ── Validate signupToken ────────────────────────────────────────────────
    if (!signupToken)
      return res.status(400).json({ message: "Phone verification is required to create an account." });

    let decoded;
    try {
      decoded = jwt.verify(signupToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Verification expired. Please verify your phone again." });
    }

    if (decoded.purpose !== "signup")
      return res.status(400).json({ message: "Invalid verification token." });

    const normalised = normalizePhone(phone);

    if (decoded.phone !== normalised)
      return res.status(400).json({ message: "Phone number does not match the verified number." });

    // ── Duplicate checks ────────────────────────────────────────────────────
    const phoneExists = await User.findOne({ phone: normalised });
    if (phoneExists)
      return res.status(409).json({ message: "Phone number already registered. Please log in." });

    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists)
        return res.status(409).json({ message: "Email is already associated with another account." });
    }

    // ── Create user ─────────────────────────────────────────────────────────
    const user = await User.create({
      name:            name.trim(),
      phone:           normalised,
      email:           email ? email.toLowerCase() : null,
      password,
      isPhoneVerified: true,
    });

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