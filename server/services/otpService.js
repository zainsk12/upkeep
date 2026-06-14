// server/services/otpService.js
// Handles OTP generation, hashing, storage, and SMS delivery.
//
// OTP_PROVIDER controls the delivery backend:
//   "dev"    → Prints OTP to terminal (local development ONLY)
//   "msg91"  → Sends via MSG91 OTP API v5 (recommended for India / DLT compliant)
//   "twilio" → Sends via Twilio Messages REST API
//
// ⚠️  STRICT MODE: If OTP_PROVIDER is missing or set to an unknown value,
//     the service throws a hard configuration error instead of falling back
//     to dev mode. This prevents accidental dev-mode leaks in production.

"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const axios  = require("axios");
const OTP    = require("../models/OTP");

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  let p = String(raw).replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("+91") && p.length === 13) return p.slice(3);
  if (p.startsWith("91")  && p.length === 12) return p.slice(2);
  if (p.startsWith("0")   && p.length === 11) return p.slice(1);
  return p;
}

function isValidIndianPhone(raw) {
  const p = normalizePhone(raw);
  return /^[6-9]\d{9}$/.test(p);
}

function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

// ── Provider resolution ───────────────────────────────────────────────────────

function resolveProvider() {
  const raw = process.env.OTP_PROVIDER;
  if (!raw || raw.trim() === "") {
    throw new Error(
      "[OTP CONFIG ERROR] OTP_PROVIDER is not set in your .env file.\n" +
      "  → For local development: OTP_PROVIDER=dev\n" +
      "  → For production (India): OTP_PROVIDER=msg91\n" +
      "  → For production (global): OTP_PROVIDER=twilio\n" +
      "Server will NOT start until this is set."
    );
  }
  const provider = raw.trim().toLowerCase();
  if (!["dev", "msg91", "twilio"].includes(provider)) {
    throw new Error(
      `[OTP CONFIG ERROR] Unknown OTP_PROVIDER value: "${raw}"\n` +
      `  Allowed values: "dev" | "msg91" | "twilio"\n` +
      `  Check your .env file.`
    );
  }
  return provider;
}

// ── SMS Providers ─────────────────────────────────────────────────────────────

async function sendViaMSG91(phone10, otp, messageBody) {
  const authKey    = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId   = process.env.MSG91_SENDER_ID || "AUSTRM";

  if (!authKey)    throw new Error("[MSG91 CONFIG ERROR] MSG91_AUTH_KEY is not set in .env");
  if (!templateId) throw new Error("[MSG91 CONFIG ERROR] MSG91_TEMPLATE_ID is not set in .env");

  const payload = {
    template_id: templateId,
    sender:      senderId,
    short_url:   "0",
    mobiles:     `91${phone10}`,
    VAR1:        otp,
  };

  let response;
  try {
    response = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      payload,
      {
        headers: {
          authkey:        authKey,
          "Content-Type": "application/JSON",
          accept:         "application/json",
        },
        timeout: 10000,
      }
    );
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`[MSG91 NETWORK ERROR] ${detail}`);
  }

  const result = response.data;
  if (result?.type === "error" || result?.type === "ERROR") {
    throw new Error(`[MSG91 API ERROR] ${result.message || JSON.stringify(result)}`);
  }

  console.log(`[OTP] MSG91 delivery confirmed for +91${phone10}`);
  return result;
}

async function sendViaTwilio(phone10, otp, messageBody) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM_NUMBER;

  const missing = [];
  if (!sid)   missing.push("TWILIO_ACCOUNT_SID");
  if (!token) missing.push("TWILIO_AUTH_TOKEN");
  if (!from)  missing.push("TWILIO_FROM_NUMBER");
  if (missing.length > 0) {
    throw new Error(`[TWILIO CONFIG ERROR] Missing env vars: ${missing.join(", ")}`);
  }

  const body = messageBody || `Your Austrum OTP is ${otp}. Valid for 10 minutes. Do NOT share with anyone.`;

  const params = new URLSearchParams({ To: `+91${phone10}`, From: from, Body: body });

  let response;
  try {
    response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      params.toString(),
      {
        auth:    { username: sid, password: token },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      }
    );
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`[TWILIO NETWORK ERROR] ${detail}`);
  }

  if (response.data?.status === "failed") {
    throw new Error(`[TWILIO API ERROR] ${response.data.error_message}`);
  }

  console.log(`[OTP] Twilio delivery confirmed for +91${phone10}`);
  return response.data;
}

function sendViaDev(phone10, otp, messageBody) {
  console.log("\n" + "━".repeat(50));
  console.log(`  🔑 [DEV OTP]  Phone: +91${phone10}`);
  console.log(`  🔑 [DEV OTP]  OTP:   ${otp}`);
  if (messageBody) console.log(`  🔑 [DEV OTP]  MSG:   ${messageBody}`);
  console.log("━".repeat(50) + "\n");
}

// ── Internal: deliver SMS via configured provider ─────────────────────────────

async function deliverSMS(phone10, otp, messageBody) {
  const provider = resolveProvider();
  switch (provider) {
    case "msg91":  return await sendViaMSG91(phone10, otp, messageBody);
    case "twilio": return await sendViaTwilio(phone10, otp, messageBody);
    case "dev":    return sendViaDev(phone10, otp, messageBody);
    default:
      throw new Error(`[OTP BUG] Unreachable branch: provider="${provider}"`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Standard signup OTP: one active OTP per phone, purpose="signup".
 */
async function sendOTP(rawPhone) {
  const phone   = normalizePhone(rawPhone);
  const otp     = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  await OTP.findOneAndUpdate(
    { phone, purpose: "signup" },
    { phone, purpose: "signup", bookingId: null, userId: null, otpHash, attempts: 0, createdAt: new Date() },
    { upsert: true, new: true }
  );

  const msg = `Your Austrum OTP is ${otp}. Valid for 10 minutes. Do NOT share with anyone.`;
  await deliverSMS(phone, otp, msg);
  return phone;
}

/**
 * Quotation confirmation OTP.
 * Scoped to a specific booking + user so one OTP can't be reused across bookings.
 *
 * @param {string} rawPhone - user's registered phone
 * @param {ObjectId|string} bookingId
 * @param {ObjectId|string} userId
 */
async function sendQuotationConfirmOTP(rawPhone, bookingId, userId) {
  const phone   = normalizePhone(rawPhone);
  const otp     = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  // One active quotation OTP per (phone + bookingId)
  await OTP.findOneAndUpdate(
    { phone, purpose: "quotation_confirm", bookingId },
    {
      phone,
      purpose:   "quotation_confirm",
      bookingId,
      userId,
      otpHash,
      attempts:  0,
      createdAt: new Date(),
    },
    { upsert: true, new: true }
  );

  const msg =
    `Austrum Verification Code: ${otp}\n` +
    `Use this OTP to confirm your service quotation acceptance. Valid for 10 minutes. Do NOT share.`;

  await deliverSMS(phone, otp, msg);
  return phone;
}

/**
 * Verify a signup OTP.
 */
async function verifyOTP(rawPhone, otp) {
  const phone  = normalizePhone(rawPhone);
  const record = await OTP.findOne({ phone, purpose: "signup" });

  if (!record) return { success: false, reason: "OTP expired or not found." };

  if (record.attempts >= 5) {
    await OTP.deleteOne({ _id: record._id });
    return { success: false, reason: "Too many attempts. Please request a new OTP." };
  }

  const match = await record.compareOtp(otp);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return { success: false, reason: "Incorrect OTP. Please try again." };
  }

  await OTP.deleteOne({ _id: record._id });
  return { success: true };
}

/**
 * Verify a quotation confirmation OTP.
 * Extra checks: bookingId + userId must match the stored record.
 *
 * @param {string} rawPhone
 * @param {string} otp
 * @param {ObjectId|string} bookingId
 * @param {ObjectId|string} userId
 */
async function verifyQuotationConfirmOTP(rawPhone, otp, bookingId, userId) {
  const phone  = normalizePhone(rawPhone);
  const record = await OTP.findOne({
    phone,
    purpose:   "quotation_confirm",
    bookingId: bookingId.toString(),
  });

  if (!record) return { success: false, reason: "OTP expired or not found. Please request a new one." };

  // Extra guard: ensure OTP belongs to this user
  if (record.userId && record.userId.toString() !== userId.toString()) {
    return { success: false, reason: "OTP mismatch. Please request a new one." };
  }

  // Max 5 attempts
  if (record.attempts >= 5) {
    await OTP.deleteOne({ _id: record._id });
    return { success: false, reason: "Too many failed attempts. Please request a new OTP." };
  }

  const match = await record.compareOtp(otp);
  if (!match) {
    record.attempts += 1;
    await record.save();
    const remaining = 5 - record.attempts;
    return {
      success: false,
      reason:  `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // ✅ Correct — delete immediately (single-use)
  await OTP.deleteOne({ _id: record._id });
  return { success: true };
}

module.exports = {
  normalizePhone,
  isValidIndianPhone,
  sendOTP,
  verifyOTP,
  sendQuotationConfirmOTP,
  verifyQuotationConfirmOTP,
};