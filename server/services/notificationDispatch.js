// server/services/notificationDispatch.js
//
// Turns an admin NotificationCampaign into individual per-user notifications.
// Audience resolution + fan-out live here so BOTH the immediate-send path
// (controller) and the scheduled path (scheduler) share one implementation and
// never duplicate business logic. Delivery itself reuses the Module 2
// notification service (which also emits the Module 3 Socket.IO event).

const mongoose = require("mongoose");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const { createNotification } = require("./notificationService");
const { filterInAppEnabled } = require("./notificationPreferenceService");
const { campaign: campaignCfg } = require("../config/notifications");

const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toObjectId = (id) =>
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id));

/**
 * Resolve an audience descriptor to a de-duplicated list of recipient user ids.
 * Never targets admin accounts (all paths are scoped to role "user" / customer
 * bookings). Returns ObjectId[].
 */
async function resolveRecipientIds(audience = {}) {
  const mode = audience.mode;

  if (mode === "user") {
    return (audience.userIds || []).slice(0, 1).map(toObjectId);
  }

  if (mode === "users") {
    const unique = [...new Set((audience.userIds || []).map(String))];
    return unique.map(toObjectId);
  }

  if (mode === "all") {
    const users = await User.find({ role: "user" }).select("_id").lean();
    return users.map((u) => u._id);
  }

  if (mode === "service") {
    if (!audience.service) return [];
    // Everyone who has ever booked this service.
    const ids = await Booking.distinct("userId", { service: audience.service });
    return ids.map(toObjectId);
  }

  if (mode === "city") {
    if (!audience.city) return [];
    // No structured city field exists, so match the free-text address on both
    // the user's saved address and their booking addresses (union).
    const rx = new RegExp(escapeRegex(audience.city), "i");
    const [byBooking, byUser] = await Promise.all([
      Booking.distinct("userId", { address: rx }),
      User.find({ role: "user", address: rx }).select("_id").lean(),
    ]);
    const set = new Set([
      ...byBooking.map(String),
      ...byUser.map((u) => String(u._id)),
    ]);
    return [...set].map(toObjectId);
  }

  return [];
}

/** Human-readable audience summary for the history table's "Recipient" column. */
function buildAudienceLabel(audience = {}, recipientCount) {
  const n = typeof recipientCount === "number" ? ` (${recipientCount})` : "";
  switch (audience.mode) {
    case "all":     return `All users${n}`;
    case "user":    return `Single user${n}`;
    case "users":   return `${(audience.userIds || []).length} selected users${n}`;
    case "city":    return `City: ${audience.city || "—"}${n}`;
    case "service": return `Service: ${audience.service || "—"}${n}`;
    default:        return `—`;
  }
}

/** Error thrown when a campaign resolves to more recipients than allowed. */
class MaxRecipientsError extends Error {
  constructor(count, max) {
    super(`Audience of ${count} exceeds the maximum campaign size of ${max}.`);
    this.name = "MaxRecipientsError";
    this.code = "MAX_RECIPIENTS";
  }
}

/**
 * Fan a campaign out into per-user notifications and mark it sent.
 *
 * Idempotency: safe to re-run for the same campaign. Each per-recipient insert
 * is guarded by the partial-unique { campaignId, userId } index, so a
 * re-dispatch after a crash/overlap/partial failure fills only the gaps and
 * never creates duplicates. `recipientCount` is derived from the ACTUAL stored
 * notifications, so it stays correct across retries.
 *
 * The scheduler additionally claims a campaign atomically (scheduled → sending)
 * before calling this, so overlapping ticks can't both dispatch it.
 *
 * @throws {MaxRecipientsError} if the resolved audience exceeds the configured cap.
 * @returns {Promise<{ delivered: number }>}
 */
async function dispatchCampaign(campaign) {
  const resolvedIds = await resolveRecipientIds(campaign.audience);

  // Cap check runs on the RESOLVED audience (before preference filtering) so the
  // safety valve reflects the true targeted size, not the post-opt-out subset.
  if (resolvedIds.length > campaignCfg.maxRecipients) {
    throw new MaxRecipientsError(resolvedIds.length, campaignCfg.maxRecipients);
  }

  // Honour per-user in-app category preferences with ONE bulk query, so users
  // who opted this category out don't receive the broadcast (Module 6). Done
  // here (not per-recipient) to keep fan-out efficient.
  const recipientIds = await filterInAppEnabled(resolvedIds, campaign.category);

  await Promise.allSettled(
    recipientIds.map((uid) =>
      createNotification({
        userId:   uid,
        type:     campaign.type,
        title:    campaign.title,
        message:  campaign.message,
        link:     campaign.link,
        category: campaign.category,
        icon:     campaign.icon,
        priority: campaign.priority,
        metadata: { campaignId: campaign._id, source: "admin", expiresAt: campaign.expiresAt || null },
        campaignId: campaign._id,
        // Already preference-filtered above — skip the per-recipient re-check.
        respectPreferences: false,
      })
    )
  );

  // Derive the delivered count from what's actually stored — correct even when a
  // re-dispatch skipped already-existing notifications via the unique index.
  const delivered = await Notification.countDocuments({ campaignId: campaign._id });

  campaign.status = "sent";
  campaign.sentAt = new Date();
  campaign.recipientCount = delivered;
  campaign.audienceLabel = buildAudienceLabel(campaign.audience, delivered);
  await campaign.save();

  return { delivered };
}

module.exports = { resolveRecipientIds, buildAudienceLabel, dispatchCampaign, MaxRecipientsError };
