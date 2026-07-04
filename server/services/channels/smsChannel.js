// server/services/channels/smsChannel.js
//
// STUB — SMS notifications. Not implemented (Module 6 prepares the architecture
// only). A future module would call an SMS gateway inside send() and flip
// isConfigured() to check its credentials. No provider/SDK is wired here.

const { createChannel } = require("./channelInterface");

module.exports = createChannel({
  key: "sms",
  label: "SMS",
  isConfigured: () => false,
  // No send() → defaults to the inert "not_implemented" no-op.
});
