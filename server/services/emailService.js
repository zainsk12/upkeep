// server/services/emailService.js
// Transactional email via Gmail (nodemailer).
//
// Sends from upkeep.austrum@gmail.com using a Gmail App Password (NOT the
// account password). Enable 2FA on the account, then create an App Password.
//
// Required env vars:
//   EMAIL_USER          (e.g. upkeep.austrum@gmail.com)
//   EMAIL_APP_PASSWORD  (16-char Gmail app password)
//   EMAIL_FROM          (optional display, default '"UpKeep by Austrum" <EMAIL_USER>')

"use strict";

const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "[EMAIL CONFIG ERROR] EMAIL_USER and EMAIL_APP_PASSWORD must be set in .env"
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

function rupees(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return String(d);
  }
}

/**
 * Send a booking confirmation email.
 * Best-effort: logs and rethrows so the caller can decide whether to surface it.
 *
 * @param {{ name: string, email?: string }} user
 * @param {object} booking - a confirmed Booking document
 */
async function sendBookingConfirmationEmail(user, booking) {
  if (!user?.email) {
    console.warn(`[EMAIL] Skipped — user ${user?.name || "?"} has no email on file.`);
    return { skipped: true, reason: "no-email" };
  }

  const from = process.env.EMAIL_FROM || `"UpKeep by Austrum" <${process.env.EMAIL_USER}>`;
  const total = booking.quotation?.total ?? booking.price ?? 0;

  const subject = `Booking Confirmed — ${booking.bookingId}`;

  const text =
    `Hi ${user.name},\n\n` +
    `Your booking is confirmed. 🎉\n\n` +
    `Booking ID : ${booking.bookingId}\n` +
    `Service    : ${booking.service}\n` +
    `Date       : ${formatDate(booking.date)}\n` +
    `Time       : ${booking.time}\n` +
    `Address    : ${booking.address}\n` +
    `Amount     : ${rupees(total)}\n\n` +
    `We'll be in touch with your assigned professional's details.\n\n` +
    `— UpKeep by Austrum`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#0b1d3a;">
    <h2 style="color:#08354a;margin:0 0 4px;">Booking Confirmed 🎉</h2>
    <p style="color:#475569;margin:0 0 20px;">Hi ${user.name}, your booking is confirmed.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#64748b;">Booking ID</td><td style="padding:6px 0;font-weight:700;">${booking.bookingId}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Service</td><td style="padding:6px 0;">${booking.service}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Date</td><td style="padding:6px 0;">${formatDate(booking.date)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Time</td><td style="padding:6px 0;">${booking.time}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Address</td><td style="padding:6px 0;">${booking.address}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Amount</td><td style="padding:6px 0;font-weight:700;">${rupees(total)}</td></tr>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">— UpKeep by Austrum</p>
  </div>`;

  try {
    const info = await getTransporter().sendMail({ from, to: user.email, subject, text, html });
    console.log(`[EMAIL] Confirmation sent to ${user.email} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL] Failed to send confirmation to ${user.email}:`, err.message);
    throw err;
  }
}

module.exports = { sendBookingConfirmationEmail };
