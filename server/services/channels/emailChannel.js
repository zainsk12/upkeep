// server/services/channels/emailChannel.js
//
// STUB — Email notifications. Not implemented (Module 6 prepares the
// architecture only). A future module would reuse the existing emailService
// (server/services/emailService.js) inside send() and flip isConfigured() to
// check EMAIL_USER/EMAIL_APP_PASSWORD. No provider is wired here.

const { createChannel } = require("./channelInterface");

module.exports = createChannel({
  key: "email",
  label: "Email",
  isConfigured: () => false,
  // No send() → defaults to the inert "not_implemented" no-op.
});
