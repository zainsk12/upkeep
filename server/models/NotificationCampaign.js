// server/models/NotificationCampaign.js
//
// An admin "broadcast" — the template + audience + schedule for a batch of
// notifications sent from the Admin Panel (Module 4). When a campaign is
// dispatched it FANS OUT into individual Notification documents (one per
// recipient) via the existing notification service, so per-user delivery,
// Socket.IO push and analytics all reuse Module 2/3 infrastructure.

const mongoose = require("mongoose");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
} = require("../constants/notifications");

const AUDIENCE_MODES = ["all", "user", "users", "city", "service"];
const CAMPAIGN_STATUSES = ["scheduled", "sending", "sent", "cancelled", "failed"];

const audienceSchema = new mongoose.Schema(
  {
    mode:    { type: String, enum: AUDIENCE_MODES, required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    city:    { type: String, trim: true, default: "" },
    service: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    // ── Notification template (mirrors the fields the service accepts) ──
    title:    { type: String, required: true, trim: true },
    message:  { type: String, required: true, trim: true },
    type:     { type: String, enum: NOTIFICATION_TYPES, required: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, default: "system" },
    icon:     { type: String, default: "Bell", trim: true },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, default: "normal" },
    link:     { type: String, default: "", trim: true },
    expiresAt:{ type: Date, default: null },

    // ── Audience ──
    audience:      { type: audienceSchema, required: true },
    audienceLabel: { type: String, default: "", trim: true }, // human-readable, for the history table

    // ── Scheduling & lifecycle ──
    scheduledAt: { type: Date, default: null }, // null → immediate
    // No standalone status index — the compound { status, scheduledAt } and
    // { status, createdAt } indexes below both start with status.
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: "scheduled",
    },
    sentAt:         { type: Date, default: null },
    recipientCount: { type: Number, default: 0 }, // recipients actually delivered to

    // Admin who created it (audit).
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Scheduler lookup: due, still-scheduled campaigns (status + scheduledAt).
campaignSchema.index({ status: 1, scheduledAt: 1 });
// History list, unfiltered: newest first.
campaignSchema.index({ createdAt: -1 });
// History list filtered by status (+ sort) AND retention cleanup by status+age.
campaignSchema.index({ status: 1, createdAt: -1 });

campaignSchema.statics.AUDIENCE_MODES = AUDIENCE_MODES;
campaignSchema.statics.CAMPAIGN_STATUSES = CAMPAIGN_STATUSES;

module.exports = mongoose.model("NotificationCampaign", campaignSchema);
module.exports.AUDIENCE_MODES = AUDIENCE_MODES;
module.exports.CAMPAIGN_STATUSES = CAMPAIGN_STATUSES;
