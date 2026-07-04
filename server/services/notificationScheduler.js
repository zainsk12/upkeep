// server/services/notificationScheduler.js
//
// Lightweight in-process scheduler that dispatches due scheduled campaigns.
// Polls on an interval; each due campaign is claimed ATOMICALLY (status
// scheduled → sending) so it can only ever be picked up once, preventing
// duplicate sends even if a tick overlaps. Mirrors the existing resetCleanup
// job pattern (services/resetCleanup.js) — no external cron dependency.

const NotificationCampaign = require("../models/NotificationCampaign");
const { dispatchCampaign } = require("./notificationDispatch");
const { scheduler: schedulerCfg } = require("../config/notifications");

const POLL_INTERVAL_MS = schedulerCfg.pollMs; // configurable (NOTIF_SCHEDULER_POLL_MS)

let timer = null;
let running = false; // guards against overlapping ticks

async function processDueCampaigns() {
  if (running) return;
  running = true;
  try {
    // Loop so a burst of due campaigns all go out in one tick.
    // The atomic claim guarantees each is handled exactly once.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const campaign = await NotificationCampaign.findOneAndUpdate(
        { status: "scheduled", scheduledAt: { $lte: new Date() } },
        { $set: { status: "sending" } },
        { new: true, sort: { scheduledAt: 1 } }
      );
      if (!campaign) break; // nothing due

      try {
        const { delivered } = await dispatchCampaign(campaign);
        console.log(`[NOTIF SCHED] Dispatched campaign ${campaign._id} → ${delivered} recipient(s).`);
      } catch (err) {
        // Mark failed so it isn't retried in a tight loop; admin can resend.
        console.error(`[NOTIF SCHED] Dispatch failed for ${campaign._id}:`, err.message);
        try {
          campaign.status = "failed";
          await campaign.save();
        } catch (saveErr) {
          console.error("[NOTIF SCHED] Could not mark campaign failed:", saveErr.message);
        }
      }
    }
  } catch (err) {
    console.error("[NOTIF SCHED] tick error:", err.message);
  } finally {
    running = false;
  }
}

function startNotificationScheduler() {
  if (timer) return; // already started
  // Recover any campaigns left "sending" by a crash mid-dispatch: revert to
  // scheduled so the next tick re-claims and completes them. Safe because
  // re-dispatch is idempotent (partial-unique { campaignId, userId } index).
  NotificationCampaign.updateMany(
    { status: "sending" },
    { $set: { status: "scheduled" } }
  )
    .then((r) => {
      if (r.modifiedCount) console.log(`[NOTIF SCHED] Recovered ${r.modifiedCount} interrupted campaign(s) → re-queued.`);
    })
    .catch((e) => console.error("[NOTIF SCHED] recovery sweep failed:", e.message));

  timer = setInterval(processDueCampaigns, POLL_INTERVAL_MS);
  // Don't keep the event loop alive solely for this timer.
  if (timer.unref) timer.unref();
  console.log(`✅ Notification scheduler started (every ${POLL_INTERVAL_MS / 1000}s)`);
}

module.exports = { startNotificationScheduler, processDueCampaigns };
