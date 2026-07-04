// server/services/channels/index.js
//
// FUTURE CHANNEL REGISTRY (Module 6). The single place the notification pipeline
// routes out-of-app delivery through. Today every registered channel is an inert
// stub (see ./channelInterface.js), so deliverExternal() is a guaranteed no-op —
// the in-app channel (Modules 2/3) remains the only active delivery path.
//
// This exists so a FUTURE push/email/sms/whatsapp module can:
//   • drop a real implementation into the matching stub file, and
//   • have it automatically invoked for users who opted the channel in —
// without editing notificationService or any core logic.

const push = require("./pushChannel");
const email = require("./emailChannel");
const sms = require("./smsChannel");
const whatsapp = require("./whatsappChannel");
const { CHANNEL_STATUS } = require("./channelInterface");

// key → channel. Order is delivery order.
const registry = new Map([
  [push.key, push],
  [email.key, email],
  [sms.key, sms],
  [whatsapp.key, whatsapp],
]);

/** All registered future channels. */
const getChannels = () => [...registry.values()];

/** Look up one channel by key. */
const getChannel = (key) => registry.get(key) || null;

/** Register/override a channel (used by a future module to swap in a real impl). */
const register = (channel) => {
  if (!channel || !channel.key) throw new Error("register: invalid channel.");
  registry.set(channel.key, channel);
};

/**
 * Deliver a stored notification across every FUTURE channel the user has opted
 * into. In-app delivery is NOT handled here (it already happened in the service).
 *
 * Fully fail-safe: never throws, per-channel errors are isolated, and a channel
 * only fires when BOTH the user enabled it AND it reports isConfigured(). With
 * the current stubs nothing is configured, so this returns [] and does no work.
 *
 * @param {{ notification: object, userId: any, user?: object, preferences: object }} ctx
 * @returns {Promise<Array<{ key: string, status: string, reason?: string }>>}
 */
async function deliverExternal({ notification, userId, user, preferences } = {}) {
  const prefChannels = (preferences && preferences.channels) || {};
  const results = [];

  for (const channel of registry.values()) {
    const optedIn = prefChannels[channel.key] && prefChannels[channel.key].enabled === true;
    if (!optedIn) continue; // user hasn't enabled this channel — skip silently
    if (!channel.isConfigured()) {
      results.push({ key: channel.key, status: CHANNEL_STATUS.SKIPPED, reason: "not_configured" });
      continue;
    }
    try {
      const r = await channel.send({ notification, userId, user, preferences });
      results.push({ key: channel.key, ...(r || { status: CHANNEL_STATUS.SKIPPED }) });
    } catch (err) {
      // Isolated: one channel failing must never affect the others or the caller.
      results.push({ key: channel.key, status: CHANNEL_STATUS.FAILED, reason: err.message });
    }
  }
  return results;
}

module.exports = { getChannels, getChannel, register, deliverExternal, CHANNEL_STATUS };
