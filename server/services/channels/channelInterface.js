// server/services/channels/channelInterface.js
//
// FUTURE CHANNEL ARCHITECTURE (Module 6) — the contract every out-of-app
// delivery channel (push / email / sms / whatsapp) must satisfy. This is
// PREPARATION, not implementation: the stubs in this folder are inert no-ops so
// the notification pipeline already has a clean, typed extension point for a
// future module to plug real providers into, WITHOUT touching core logic.
//
// A channel is a plain object:
//   {
//     key:   string        // stable id — matches NotificationPreferences.channels.<key>
//     label: string        // human-readable name (UI/logging)
//     isConfigured(): bool  // are the provider credentials/env present? (stubs: false)
//     async send(ctx): {status, reason?}   // deliver ONE notification via this channel
//   }
//
// send() receives: { notification, userId, user?, preferences }
// send() MUST resolve (never throw) to a result:
//   { status: "sent" | "skipped" | "failed", reason?: string }
//
// A future implementation should:
//   1. Add its SDK/provider call inside send() (guarded, resolving to a result).
//   2. Flip isConfigured() to check the relevant env vars.
//   3. Nothing else — the registry + deliverExternal already route to it based on
//      the user's per-channel preference. See ./index.js and NOTIFICATION_SYSTEM.md.

/** Result shapes returned by a channel's send(). */
const CHANNEL_STATUS = { SENT: "sent", SKIPPED: "skipped", FAILED: "failed" };

/**
 * Normalise a partial channel definition into a complete channel object with
 * safe defaults. Missing pieces default to an inert "not implemented" no-op, so
 * declaring a stub is a one-liner and can never crash the pipeline.
 */
function createChannel({ key, label, isConfigured, send } = {}) {
  if (!key) throw new Error("createChannel: `key` is required.");
  return {
    key,
    label: label || key,
    isConfigured: typeof isConfigured === "function" ? isConfigured : () => false,
    send:
      typeof send === "function"
        ? send
        : async () => ({ status: CHANNEL_STATUS.SKIPPED, reason: "not_implemented" }),
  };
}

module.exports = { createChannel, CHANNEL_STATUS };
