// server/services/channels/whatsappChannel.js
//
// STUB — WhatsApp notifications. Not implemented (Module 6 prepares the
// architecture only). A future module would call the WhatsApp Business API
// inside send() and flip isConfigured() to check its credentials. No
// provider/SDK is wired here.

const { createChannel } = require("./channelInterface");

module.exports = createChannel({
  key: "whatsapp",
  label: "WhatsApp",
  isConfigured: () => false,
  // No send() → defaults to the inert "not_implemented" no-op.
});
