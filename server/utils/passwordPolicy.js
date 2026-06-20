// server/utils/passwordPolicy.js
// Shared password constraints used across signup, password reset, and any other
// password-change flow so the rules stay consistent.
//
// bcrypt only hashes the first 72 BYTES of input and silently ignores the rest.
// A password longer than that is misleading (the tail is never checked), so we
// reject it up front. The limit is measured in UTF-8 BYTES, not characters —
// a 70-character string of emoji can easily exceed 72 bytes.

"use strict";

const MAX_PASSWORD_BYTES = 72;

/** UTF-8 byte length of a password (the unit bcrypt actually cares about). */
function passwordByteLength(pw) {
  return Buffer.byteLength(String(pw ?? ""), "utf8");
}

/** True when the password exceeds bcrypt's effective 72-byte limit. */
function exceedsBcryptLimit(pw) {
  return passwordByteLength(pw) > MAX_PASSWORD_BYTES;
}

/** User-friendly "too long" message (shared so wording stays consistent). */
const TOO_LONG_MESSAGE =
  "Password is too long. Please use 72 bytes or fewer " +
  "(roughly 72 characters — note that emoji and some accented characters use several bytes each).";

module.exports = {
  MAX_PASSWORD_BYTES,
  passwordByteLength,
  exceedsBcryptLimit,
  TOO_LONG_MESSAGE,
};
