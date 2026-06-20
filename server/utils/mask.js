// server/utils/mask.js
// Single source of truth for masking personally-identifiable values so the same
// redaction is used in user-facing responses/emails AND in server logs (PII
// reduction). Logic is intentionally identical to the previous inline maskers so
// existing response/email output is unchanged.

"use strict";

/** z***@gmail.com — keeps the first char + domain, masks the rest of the local part. */
function maskEmail(email) {
  if (email == null) return email;
  const [local, domain] = String(email).split("@");
  if (!domain) return String(email);
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(3, local.length - 1))}@${domain}`;
}

/** +91 ******1234 — shows only the last 4 digits of a 10-digit Indian number. */
function maskPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "").slice(-10);
  if (digits.length < 4) return "+91 ******";
  return `+91 ******${digits.slice(-4)}`;
}

module.exports = { maskEmail, maskPhone };
