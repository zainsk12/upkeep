// client/src/services/socket.js
//
// Single Socket.IO connection per browser tab (module-level singleton) so the
// app never opens multiple sockets from one tab. The token is read fresh on
// every (re)connect via the `auth` callback, so reconnects after a token change
// authenticate correctly. Built-in reconnection handles network interruptions.

import { io } from "socket.io-client";
import env from "../utils/env";
import { getToken } from "../utils/tokenStorage";

let socket = null;

/** Lazily create (once) and return the singleton socket. Does not auto-connect. */
export function getSocket() {
  if (socket) return socket;

  // Dev: apiBaseUrl is "" → connect same-origin so Vite's /socket.io ws proxy
  // forwards to the backend. Prod: target the API origin directly.
  socket = io(env.apiBaseUrl || undefined, {
    autoConnect: false,
    // Function form → re-evaluated on each connection attempt (fresh token).
    auth: (cb) => cb({ token: getToken() }),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });

  return socket;
}

/** Connect the singleton if not already connected. */
export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/** Fully tear down the socket (logout) so a later login reconnects fresh. */
export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
