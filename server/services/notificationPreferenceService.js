// server/services/notificationPreferenceService.js
//
// Read/normalise/apply per-user notification preferences and answer the one
// question the notification pipeline needs: "should this in-app notification be
// created for this user?" (Module 6).
//
// Design notes:
//   • FAIL-OPEN. Every preference lookup that gates delivery treats an error (or
//     a missing document) as "enabled", so a preferences bug or DB hiccup can
//     never silently swallow a user's notifications. Preferences only ever
//     SUPPRESS when a user has explicitly opted out.
//   • Defaults live on the model (NotificationPreferences) — a doc is created
//     lazily with those defaults on first access.

const NotificationPreferences = require("../models/NotificationPreferences");
const { NOTIFICATION_CATEGORIES } = require("../constants/notifications");

// Future delivery channels (stored in preferences, not yet implemented).
const FUTURE_CHANNELS = ["push", "email", "sms", "whatsapp"];

/**
 * Fetch a user's preferences, creating the default document on first access.
 * Idempotent under races: a duplicate-key collision falls back to a read.
 */
async function getOrCreatePreferences(userId) {
  let prefs = await NotificationPreferences.findOne({ userId });
  if (prefs) return prefs;
  try {
    prefs = await NotificationPreferences.create({ userId });
    return prefs;
  } catch (err) {
    // Another concurrent request created it first — read the winner.
    if (err && err.code === 11000) return NotificationPreferences.findOne({ userId });
    throw err;
  }
}

/**
 * Validate + apply a partial preferences patch onto a doc. Only known keys are
 * copied (unknown keys are ignored), so a malformed body can never inject fields.
 * Returns the (unsaved) doc for the caller to persist.
 */
function applyUpdate(prefs, patch = {}) {
  if (patch.categories && typeof patch.categories === "object") {
    for (const cat of NOTIFICATION_CATEGORIES) {
      if (typeof patch.categories[cat] === "boolean") prefs.categories[cat] = patch.categories[cat];
    }
  }
  if (typeof patch.sound === "boolean") prefs.sound = patch.sound;
  if (typeof patch.toasts === "boolean") prefs.toasts = patch.toasts;

  if (patch.channels && typeof patch.channels === "object") {
    for (const ch of FUTURE_CHANNELS) {
      const v = patch.channels[ch];
      if (v && typeof v.enabled === "boolean") prefs.channels[ch].enabled = v.enabled;
    }
  }
  return prefs;
}

/**
 * Read a user's preferences as a plain object (or null if they have none yet).
 * Never throws — returns null on error so callers can fail-open.
 */
async function getPreferencesLean(userId) {
  try {
    return await NotificationPreferences.findOne({ userId }).lean();
  } catch (err) {
    console.error("[NOTIF PREF] getPreferencesLean failed:", err.message);
    return null;
  }
}

/**
 * Pure check against an already-loaded (lean) preferences object. Fail-open:
 * no prefs, no category map, or an unknown category → allowed.
 */
function isCategoryAllowed(prefs, category) {
  if (!prefs || !prefs.categories || !category) return true;
  return prefs.categories[category] !== false;
}

/**
 * Bulk variant for campaign fan-out: given many recipient ids and one category,
 * return only the ids that accept it. One query instead of N. Users without a
 * preferences doc, or with the category enabled, are kept (fail-open).
 */
async function filterInAppEnabled(userIds = [], category) {
  if (!category || !NOTIFICATION_CATEGORIES.includes(category)) return userIds;
  if (userIds.length === 0) return userIds;
  try {
    const optedOut = await NotificationPreferences.find({
      userId: { $in: userIds },
      [`categories.${category}`]: false,
    })
      .select("userId")
      .lean();
    if (optedOut.length === 0) return userIds;
    const blocked = new Set(optedOut.map((p) => String(p.userId)));
    return userIds.filter((id) => !blocked.has(String(id)));
  } catch (err) {
    console.error("[NOTIF PREF] filterInAppEnabled failed (keeping all):", err.message);
    return userIds;
  }
}

module.exports = {
  getOrCreatePreferences,
  getPreferencesLean,
  applyUpdate,
  isCategoryAllowed,
  filterInAppEnabled,
};
