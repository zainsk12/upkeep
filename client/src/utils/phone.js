// client/src/utils/phone.js
// Single source of truth for phone handling on the client.
// Mirrors the server's server/utils/phone.js so client and backend agree on what
// a valid Indian mobile number is and how it normalizes.

/**
 * Normalize a raw phone string to a clean 10-digit Indian number
 * (strips spaces/dashes/parens and a leading +91 / 91 / 0).
 */
export function normalizePhone(raw) {
  let p = String(raw).replace(/[\s\-()]/g, "");
  if (p.startsWith("+91") && p.length === 13) return p.slice(3);
  if (p.startsWith("91")  && p.length === 12) return p.slice(2);
  if (p.startsWith("0")   && p.length === 11) return p.slice(1);
  return p;
}

/** True if `raw` normalizes to a valid 10-digit Indian mobile (starts 6–9). */
export function isValidIndianPhone(raw) {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

/** E.164 form for Firebase (e.g. "+919876543210"). */
export function toE164(raw) {
  return `+91${normalizePhone(raw)}`;
}
