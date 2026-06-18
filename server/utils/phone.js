// server/utils/phone.js
// Phone normalization + validation helpers for Indian mobile numbers.
//
// Extracted from the (now-removed) MSG91 otpService so the rest of the codebase
// can keep using these helpers after the Firebase migration.

"use strict";

/**
 * Normalize a raw phone string to a clean 10-digit Indian number
 * (strips spaces/dashes/parens and a leading +91 / 91 / 0).
 */
function normalizePhone(raw) {
  let p = String(raw).replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("+91") && p.length === 13) return p.slice(3);
  if (p.startsWith("91")  && p.length === 12) return p.slice(2);
  if (p.startsWith("0")   && p.length === 11) return p.slice(1);
  return p;
}

/** True if `raw` normalizes to a valid 10-digit Indian mobile (starts 6-9). */
function isValidIndianPhone(raw) {
  const p = normalizePhone(raw);
  return /^[6-9]\d{9}$/.test(p);
}

module.exports = { normalizePhone, isValidIndianPhone };
