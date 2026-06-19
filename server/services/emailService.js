// server/services/emailService.js
// Transactional email via Gmail (nodemailer).
//
// Sends from the configured EMAIL_USER (currently upkeep.austrum@gmail.com) using
// a Gmail App Password (NOT the account password). Enable 2FA on the account,
// then create an App Password.
//
// Required env vars:
//   EMAIL_USER          (e.g. upkeep.austrum@gmail.com)
//   EMAIL_APP_PASSWORD  (16-char Gmail app password)
//   EMAIL_FROM          (optional display, default '"UpKeep by Austrum" <EMAIL_USER>')
// Optional env vars:
//   CUSTOMER_APP_URL    (customer site origin, default https://upkeep.austrum.co.in)
//   EMAIL_LOGO_URL      (absolute logo URL, default `${CUSTOMER_APP_URL}/upkeep_logo.png`)

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
    // Pooling keeps authenticated SMTP connections open and reuses them across
    // sends, so each email no longer pays the full DNS+TCP+TLS+AUTH handshake
    // (the ~2–6s cost that previously blocked the request).
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  // Verify (and thereby warm) the connection once when the transport is first
  // created — fire-and-forget so it never blocks a send. After this resolves,
  // the pool holds a ready authenticated connection for subsequent sends.
  transporter.verify().then(
    () => console.log("[EMAIL] SMTP transport ready (pooled)"),
    (err) => console.error("[EMAIL] SMTP verify failed:", err.message)
  );

  return transporter;
}

/**
 * Warm the pooled SMTP transport at startup so the first email reuses an
 * already-authenticated connection instead of opening a cold one. Safe to call
 * when email is unconfigured — it just throws, which the caller is expected to
 * catch and ignore.
 */
function warmEmailTransport() {
  getTransporter();
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

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Always resolve a human-readable booking reference. New bookings carry a real
// `bookingId` (e.g. UPK-20260618-ACE7Z); legacy records predate that field, so
// we derive a stable fallback from the Mongo _id instead of showing "undefined".
function bookingRef(booking) {
  if (booking.bookingId) return booking.bookingId;
  const tail = String(booking._id || "").slice(-6).toUpperCase();
  return tail ? `UPK-${tail}` : "—";
}

/**
 * Send the customer notification email AFTER a worker has been assigned.
 * Best-effort: logs and rethrows so the caller can decide whether to surface it.
 *
 * @param {{ name?: string, email?: string }} user      - the customer
 * @param {object} booking                               - the Booking document (confirmed + worker assigned)
 * @param {object} [worker]                              - the assigned Worker document (for skills/experience)
 */
async function sendWorkerAssignedEmail(user, booking, worker) {
  if (!user?.email) {
    console.warn(`[EMAIL] Skipped — customer ${user?.name || "?"} has no email on file.`);
    return { skipped: true, reason: "no-email" };
  }

  const from = process.env.EMAIL_FROM || `"UpKeep by Austrum" <${process.env.EMAIL_USER}>`;
  const appUrl  = (process.env.CUSTOMER_APP_URL || "https://upkeep.austrum.co.in").replace(/\/+$/, "");
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/upkeep_logo.png`;
  const trackUrl = `${appUrl}/my-bookings`;

  const ref     = bookingRef(booking);
  const total   = booking.quotation?.total ?? booking.price ?? 0;

  // Assigned-professional details. Name + customer-facing phone come from the
  // booking snapshot (admin may have overridden the phone); designation/category
  // is derived from the worker's skills, falling back to the booked service.
  const proName  = booking.assignedWorker?.name || worker?.name || "Your professional";
  const proPhone = booking.assignedWorker?.phone || worker?.phone || "";
  const designation = (worker?.skills && worker.skills.length)
    ? worker.skills.join(", ")
    : booking.service;
  const experience = worker?.experience
    ? `${worker.experience}+ ${worker.experience === 1 ? "year" : "years"} experience`
    : "";

  const subject = `Professional Assigned — ${ref}`;

  // ── Plain-text fallback ────────────────────────────────────────────────────
  const text =
    `Hi ${user.name || "there"},\n\n` +
    `Good news — a professional has been assigned to your booking. 🎉\n\n` +
    `Booking ID   : ${ref}\n` +
    `Service      : ${booking.service}\n` +
    `Date         : ${formatDate(booking.date)}\n` +
    `Time         : ${booking.time}\n` +
    `Address      : ${booking.address}\n` +
    `Amount       : ${rupees(total)}\n\n` +
    `Assigned Professional\n` +
    `  Name       : ${proName}\n` +
    (designation ? `  Specialism : ${designation}\n` : "") +
    (experience  ? `  Experience : ${experience}\n` : "") +
    (proPhone    ? `  Contact    : ${proPhone}\n` : "") +
    `\nTrack your booking: ${trackUrl}\n\n` +
    `— UpKeep by Austrum`;

  // ── Branded responsive HTML (table-based for email-client compatibility) ────
  const NAVY = "#08354A", PRIMARY = "#0E4A63", INK = "#0b1d3a", MUTE = "#64748b", LINE = "#e2e8f0";
  const row = (label, value) => `
    <tr>
      <td style="padding:8px 0;color:${MUTE};font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:8px 0 8px 16px;color:${INK};font-size:13px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
    </tr>`;

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;box-shadow:0 8px 30px rgba(8,53,74,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:${NAVY};padding:24px 28px;" align="left">
            <img src="${escapeHtml(logoUrl)}" width="40" height="40" alt="UpKeep by Austrum"
                 style="vertical-align:middle;border-radius:50%;background:#ffffff;" />
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;vertical-align:middle;padding-left:10px;">UpKeep <span style="color:#9fd0e0;font-weight:500;">by Austrum</span></span>
          </td>
        </tr>

        <!-- Status banner -->
        <tr>
          <td style="background:#ecfdf5;border-top:1px solid #d1fae5;border-bottom:1px solid #d1fae5;padding:14px 28px;" align="left">
            <span style="color:#15803d;font-size:14px;font-weight:700;">✓ Professional Assigned</span>
            <span style="color:#3f6212;font-size:13px;"> &nbsp;— your booking is ready to go.</span>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:28px 28px 8px;">
            <h1 style="margin:0 0 6px;color:${NAVY};font-size:20px;">A professional is on the way 🎉</h1>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Hi ${escapeHtml(user.name || "there")}, we've assigned a verified professional to your booking. Here are the details.</p>
          </td>
        </tr>

        <!-- Booking summary card -->
        <tr>
          <td style="padding:16px 28px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;">
              <tr><td style="padding:14px 18px 4px;color:${PRIMARY};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Booking Summary</td></tr>
              <tr><td style="padding:0 18px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row("Booking ID", ref)}
                  ${row("Service", booking.service)}
                  ${row("Date", formatDate(booking.date))}
                  ${row("Time", booking.time)}
                  ${row("Address", booking.address)}
                  ${row("Amount", rupees(total))}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Assigned professional card -->
        <tr>
          <td style="padding:16px 28px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;background:#f8fafc;">
              <tr><td style="padding:14px 18px 4px;color:${PRIMARY};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Assigned Professional</td></tr>
              <tr><td style="padding:0 18px 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row("Name", proName)}
                  ${designation ? row("Specialism", designation) : ""}
                  ${experience ? row("Experience", experience) : ""}
                  ${proPhone ? row("Contact", proPhone) : ""}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Track booking button -->
        <tr>
          <td align="center" style="padding:24px 28px 8px;">
            <a href="${escapeHtml(trackUrl)}" target="_blank"
               style="display:inline-block;background:${PRIMARY};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 30px;border-radius:10px;">
              Track Booking →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 28px 28px;" align="center">
            <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
              Need help? Reply to this email and our team will get back to you.<br/>
              © UpKeep by Austrum
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const tStart = Date.now();
    const tx = getTransporter();
    const txReadyMs = Date.now() - tStart;
    const sendStart = Date.now();
    const info = await tx.sendMail({ from, to: user.email, subject, text, html });
    const sendMs = Date.now() - sendStart;
    console.log(
      `[EMAIL] Worker-assigned notice sent to ${user.email} for ${ref} (${info.messageId}) ` +
      `[TIMING] transporter_ready_ms=${txReadyMs} smtp_sendMail_ms=${sendMs}`
    );
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL] Failed to send worker-assigned notice to ${user.email}:`, err.message);
    throw err;
  }
}

module.exports = { sendWorkerAssignedEmail, warmEmailTransport };
