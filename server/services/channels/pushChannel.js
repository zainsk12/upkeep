// server/services/channels/pushChannel.js
//
// STUB — Web/mobile Push notifications. Not implemented (Module 6 prepares the
// architecture only). A future module would send via FCM / Web Push here and
// flip isConfigured() to check for the relevant credentials. No SDK is imported.

const { createChannel } = require("./channelInterface");

module.exports = createChannel({
  key: "push",
  label: "Push",
  // e.g. () => Boolean(process.env.FCM_SERVER_KEY) once implemented.
  isConfigured: () => false,
  // No send() → defaults to the inert "not_implemented" no-op.
});
