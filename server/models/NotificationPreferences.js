// server/models/NotificationPreferences.js
//
// Per-user notification preferences (Module 6). One document per user, created
// lazily with all-enabled defaults the first time a user reads or updates them,
// so EXISTING users (who have no document) implicitly get the default behaviour
// and nothing about Modules 1–5 changes for them.
//
// Two kinds of settings live here:
//   • In-app behaviour (active now): per-category on/off, notification sound,
//     and in-app toasts. These gate what the Module 2 service actually creates
//     and how the Module 1/3 client surfaces it.
//   • Future channels (stored, NOT implemented): push / email / sms / whatsapp.
//     Each is a self-contained sub-object so a future module can add provider
//     fields (tokens, verified addresses, per-category masks) without a
//     migration. They default to disabled and are inert until those modules ship.

const mongoose = require("mongoose");
const { NOTIFICATION_CATEGORIES } = require("../constants/notifications");

// Build the per-category in-app toggle map from the shared taxonomy so this
// never drifts from the notification categories used everywhere else. Every
// category defaults to ON — opting out is an explicit user choice.
const categoryToggles = NOTIFICATION_CATEGORIES.reduce((acc, key) => {
  acc[key] = { type: Boolean, default: true };
  return acc;
}, {});

// A future delivery channel. Kept minimal on purpose — it only records whether
// the user has opted in. Provider-specific fields (device token, verified email,
// etc.) are intentionally omitted until the channel is actually built.
const channelSchema = new mongoose.Schema(
  { enabled: { type: Boolean, default: false } },
  { _id: false }
);

const preferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one preferences doc per user (also the lookup index)
    },

    // ── In-app category toggles (active) ────────────────────────────────────
    // When a category is false, the service skips creating in-app notifications
    // of that category for this user (see notificationPreferenceService).
    categories: { type: new mongoose.Schema(categoryToggles, { _id: false }), default: () => ({}) },

    // Play a short sound when a new notification arrives (client-side, opt-in).
    sound: { type: Boolean, default: false },

    // Show in-app toasts for newly arrived notifications (client-side).
    toasts: { type: Boolean, default: true },

    // ── Future channels (stored, not implemented) ───────────────────────────
    channels: {
      push:     { type: channelSchema, default: () => ({}) },
      email:    { type: channelSchema, default: () => ({}) },
      sms:      { type: channelSchema, default: () => ({}) },
      whatsapp: { type: channelSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationPreferences", preferencesSchema);
