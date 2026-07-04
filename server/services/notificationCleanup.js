// server/services/notificationCleanup.js
//
// Automatic, configurable retention/cleanup for the notification system
// (Module 5). SAFETY FIRST: it never deletes UNREAD notifications — only READ
// ones past the retention window, terminal campaigns past their retention, and
// empty campaigns that delivered to nobody. All windows are config-driven
// (config/notifications.js → env). Follows the existing resetCleanup job pattern.

const Notification = require("../models/Notification");
const NotificationCampaign = require("../models/NotificationCampaign");
const { cleanup: cfg } = require("../config/notifications");

const DAY = 24 * 60 * 60 * 1000;

let timer = null;
let running = false;

async function runCleanup() {
  if (running) return; // never overlap
  running = true;
  const summary = { oldReadNotifications: 0, oldCampaigns: 0, emptyCampaigns: 0 };
  try {
    const now = Date.now();

    // 1) READ notifications older than the retention window. Unread are NEVER
    //    touched (the filter requires isRead:true).
    const readCutoff = new Date(now - cfg.readRetentionDays * DAY);
    const r1 = await Notification.deleteMany({ isRead: true, createdAt: { $lt: readCutoff } });
    summary.oldReadNotifications = r1.deletedCount || 0;

    // 2) Terminal campaigns (completed/cancelled/failed) older than the campaign
    //    retention window — "completed scheduled jobs" + old broadcast metadata.
    const campCutoff = new Date(now - cfg.campaignRetentionDays * DAY);
    const r2 = await NotificationCampaign.deleteMany({
      status: { $in: ["sent", "cancelled", "failed"] },
      createdAt: { $lt: campCutoff },
    });
    summary.oldCampaigns = r2.deletedCount || 0;

    // 3) Orphaned/empty campaigns: sent to nobody (recipientCount 0) and past a
    //    short grace period — safe to remove (no user data attached).
    const emptyCutoff = new Date(now - cfg.emptyCampaignGraceDays * DAY);
    const r3 = await NotificationCampaign.deleteMany({
      status: "sent",
      recipientCount: 0,
      createdAt: { $lt: emptyCutoff },
    });
    summary.emptyCampaigns = r3.deletedCount || 0;

    const total = summary.oldReadNotifications + summary.oldCampaigns + summary.emptyCampaigns;
    if (total > 0) {
      console.log(`[NOTIF CLEANUP] Purged ${JSON.stringify(summary)}`);
    }
  } catch (e) {
    console.error("[NOTIF CLEANUP] error:", e.message);
  } finally {
    running = false;
  }
  return summary;
}

function startNotificationCleanup() {
  if (!cfg.enabled) {
    console.log("[NOTIF CLEANUP] disabled via config (NOTIF_CLEANUP_ENABLED=false).");
    return;
  }
  if (timer) return;

  // First pass shortly after boot (off the startup hot path), then on interval.
  const kickoff = setTimeout(runCleanup, 60 * 1000);
  if (kickoff.unref) kickoff.unref();

  timer = setInterval(runCleanup, cfg.intervalMs);
  if (timer.unref) timer.unref();

  console.log(
    `✅ Notification cleanup scheduled (every ${Math.round(cfg.intervalMs / 3600000)}h; ` +
    `read retention ${cfg.readRetentionDays}d, campaign retention ${cfg.campaignRetentionDays}d).`
  );
}

module.exports = { startNotificationCleanup, runCleanup };
