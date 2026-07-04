// server/middleware/notificationRateLimits.js
//
// Rate limiters for the notification endpoints (Module 5), built on the existing
// express-rate-limit dependency and driven by config/notifications.js. Limits
// are intentionally generous so normal usage is unaffected — they only blunt
// abuse / runaway loops.

const rateLimit = require("express-rate-limit");
const { rateLimit: cfg } = require("../config/notifications");

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

module.exports = {
  userApiLimiter: make(
    cfg.userWindowMs, cfg.userMax,
    "Too many notification requests. Please slow down and try again shortly."
  ),
  adminCreateLimiter: make(
    cfg.adminCreateWindowMs, cfg.adminCreateMax,
    "Too many notifications created in a short time. Please wait a moment."
  ),
  adminResendLimiter: make(
    cfg.adminResendWindowMs, cfg.adminResendMax,
    "Too many resend attempts. Please wait a moment before retrying."
  ),
  adminDeleteLimiter: make(
    cfg.adminDeleteWindowMs, cfg.adminDeleteMax,
    "Too many delete requests. Please wait a moment."
  ),
};
