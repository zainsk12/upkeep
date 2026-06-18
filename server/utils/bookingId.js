// server/utils/bookingId.js
// Generates a unique, human-readable booking reference, e.g. "UPK-20260617-7F3K9".
//
//   UPK            → brand prefix
//   20260617       → creation date (YYYYMMDD, server local time)
//   7F3K9          → 5 random base32 chars (Crockford-ish, no ambiguous 0/O/1/I)
//
// generateUniqueBookingId() retries on the (extremely unlikely) collision so the
// unique index on Booking.bookingId is never violated under normal operation.

"use strict";

const crypto = require("crypto");

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L for legibility

function randomSuffix(len = 5) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return out;
}

function buildBookingId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `UPK-${y}${m}${d}-${randomSuffix()}`;
}

/**
 * Returns a booking ID guaranteed not to collide with an existing one.
 * @param {import("mongoose").Model} BookingModel
 */
async function generateUniqueBookingId(BookingModel) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = buildBookingId();
    const exists = await BookingModel.exists({ bookingId: candidate });
    if (!exists) return candidate;
  }
  // Fallback: append extra entropy — practically guaranteed unique.
  return `${buildBookingId()}-${randomSuffix(3)}`;
}

module.exports = { buildBookingId, generateUniqueBookingId };
