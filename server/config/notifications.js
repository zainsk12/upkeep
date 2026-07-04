// server/config/notifications.js
//
// Central, env-overridable configuration for the notification system (Module 5).
// Every tunable that used to be hardcoded across the scheduler, dispatcher,
// cleanup job, rate limiters and pagination now lives here with a safe default,
// so production values can be set via environment without code changes.

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
const bool = (v, d) => (v == null || v === "" ? d : /^(true|1|yes|on)$/i.test(String(v).trim()));

const DAY = 24 * 60 * 60 * 1000;

module.exports = {
  scheduler: {
    // How often the scheduled-campaign dispatcher polls for due campaigns.
    pollMs: int(process.env.NOTIF_SCHEDULER_POLL_MS, 30 * 1000),
  },

  cleanup: {
    enabled:    bool(process.env.NOTIF_CLEANUP_ENABLED, true),
    intervalMs: int(process.env.NOTIF_CLEANUP_INTERVAL_MS, DAY),
    // READ notifications older than this are purged. Unread are NEVER deleted.
    readRetentionDays:     int(process.env.NOTIF_READ_RETENTION_DAYS, 90),
    // Terminal campaigns (sent/cancelled/failed) older than this are purged.
    campaignRetentionDays: int(process.env.NOTIF_CAMPAIGN_RETENTION_DAYS, 180),
    // Empty campaigns that delivered to nobody, older than this, are purged.
    emptyCampaignGraceDays: int(process.env.NOTIF_EMPTY_CAMPAIGN_GRACE_DAYS, 7),
  },

  campaign: {
    // Hard cap on a single campaign's resolved recipient count (safety valve).
    maxRecipients:     int(process.env.NOTIF_MAX_CAMPAIGN_RECIPIENTS, 50000),
    // Window used to reject accidental duplicate immediate-send requests.
    duplicateWindowMs: int(process.env.NOTIF_DUPLICATE_WINDOW_MS, 5 * 1000),
  },

  pagination: {
    userDefaultLimit:  int(process.env.NOTIF_USER_PAGE_LIMIT, 20),
    adminDefaultLimit: int(process.env.NOTIF_ADMIN_PAGE_LIMIT, 15),
    maxLimit:          int(process.env.NOTIF_MAX_PAGE_LIMIT, 100),
  },

  rateLimit: {
    // Generous limits — sized so normal usage is never affected, only abuse.
    userWindowMs: int(process.env.NOTIF_RL_USER_WINDOW_MS, 60 * 1000),
    userMax:      int(process.env.NOTIF_RL_USER_MAX, 240),

    adminCreateWindowMs: int(process.env.NOTIF_RL_ADMIN_CREATE_WINDOW_MS, 60 * 1000),
    adminCreateMax:      int(process.env.NOTIF_RL_ADMIN_CREATE_MAX, 30),

    adminResendWindowMs: int(process.env.NOTIF_RL_ADMIN_RESEND_WINDOW_MS, 60 * 1000),
    adminResendMax:      int(process.env.NOTIF_RL_ADMIN_RESEND_MAX, 20),

    adminDeleteWindowMs: int(process.env.NOTIF_RL_ADMIN_DELETE_WINDOW_MS, 60 * 1000),
    adminDeleteMax:      int(process.env.NOTIF_RL_ADMIN_DELETE_MAX, 60),

    // Per-IP Socket.IO handshake attempts.
    socketWindowMs: int(process.env.NOTIF_RL_SOCKET_WINDOW_MS, 60 * 1000),
    socketMax:      int(process.env.NOTIF_RL_SOCKET_MAX, 30),
  },

  // When true, run Mongoose syncIndexes() on the notification collections at
  // startup to reconcile the DB with the schema (drops obsolete indexes). Left
  // OFF by default so production never drops indexes without an explicit opt-in.
  syncIndexes: bool(process.env.NOTIF_SYNC_INDEXES, false),
};
