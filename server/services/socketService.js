// server/services/socketService.js
//
// Modular Socket.IO layer that rides on the existing Express HTTP server.
// Responsibilities:
//   • Authenticate every socket handshake with the SAME JWT scheme as the REST
//     API (middleware/auth.js), including the password-change session watermark.
//   • Put each authenticated socket into a private per-user room so events can be
//     delivered ONLY to that user's own sessions (never broadcast globally).
//   • Expose emitToUser() so the notification service/controller can push
//     real-time events without knowing anything about socket internals.
//
// This ENHANCES the backend — the REST APIs are unchanged and still the source
// of truth. Sockets only carry deltas.

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { rateLimit: rlCfg } = require("../config/notifications");

let io = null;

const roomForUser = (userId) => `user:${userId}`;

// Event names — shared contract with the frontend socket integration.
const NOTIFICATION_EVENTS = {
  CREATED:  "notification:created",
  READ:     "notification:read",
  READ_ALL: "notification:read-all",
  DELETED:  "notification:deleted",
};

// ── Per-IP handshake rate limiter (in-memory sliding window) ────────────────────
// Blunts scripted socket-auth abuse without a external dependency. Entries are
// pruned lazily so the map stays bounded.
const attempts = new Map(); // ip -> { count, resetAt }
function tooManyAttempts(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + rlCfg.socketWindowMs });
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
    }
    return false;
  }
  rec.count += 1;
  return rec.count > rlCfg.socketMax;
}

const clientIp = (socket) =>
  (socket.handshake.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
  socket.handshake.address ||
  "unknown";

// Handshake auth — mirrors middleware/auth.js. Never trusts a client-supplied
// user id; the identity comes solely from the verified token.
async function authenticateSocket(socket, next) {
  const ip = clientIp(socket);
  try {
    if (tooManyAttempts(ip)) {
      console.warn(`[SOCKET] Rate-limited handshake from ${ip}.`);
      return next(new Error("Too many connection attempts. Please try again later."));
    }

    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");

    if (!token) {
      console.warn(`[SOCKET] Handshake rejected (no token) from ${ip}.`);
      return next(new Error("Authentication required."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("passwordChangedAt");
    if (!user) {
      console.warn(`[SOCKET] Handshake rejected (unknown user) from ${ip}.`);
      return next(new Error("User not found."));
    }

    // Reject tokens issued before the last password change (session invalidation),
    // exactly like the HTTP middleware.
    if (user.passwordChangedAt && decoded.iat) {
      const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSec) {
        console.warn(`[SOCKET] Handshake rejected (stale token) for user ${decoded.id}.`);
        return next(new Error("Session expired."));
      }
    }

    socket.userId = String(decoded.id);
    next();
  } catch (err) {
    console.warn(`[SOCKET] Handshake auth failed from ${ip}: ${err.message}`);
    next(new Error("Invalid or expired token."));
  }
}

/**
 * Attach Socket.IO to the given HTTP server.
 * @param {http.Server} httpServer
 * @param {string[]} allowedOrigins  same CORS allow-list as the REST API
 */
function initSocket(httpServer, allowedOrigins) {
  const { Server } = require("socket.io");

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    // All of a user's tabs/devices share one room → multi-session support with
    // strict per-user isolation. socket.io auto-removes the socket from its rooms
    // on disconnect, so there is nothing to clean up manually.
    socket.join(roomForUser(socket.userId));
  });

  console.log("✅ Socket.IO initialised");
  return io;
}

/**
 * Emit an event to every active socket of a single user. No-op if sockets are
 * not initialised (e.g. during isolated unit tests) or userId is missing.
 */
function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(roomForUser(String(userId))).emit(event, payload);
}

/**
 * Whether the user currently has at least one connected socket. Lets callers
 * skip work (e.g. unread-count queries) that only feeds a real-time emit —
 * emitting to an empty room is a no-op anyway. NOTE: accurate for the default
 * in-memory adapter (single server instance); if a multi-node socket adapter
 * (e.g. Redis) is ever introduced, revisit this check.
 */
function hasActiveSockets(userId) {
  if (!io || !userId) return false;
  const room = io.sockets.adapter.rooms.get(roomForUser(String(userId)));
  return !!room && room.size > 0;
}

module.exports = { initSocket, emitToUser, hasActiveSockets, NOTIFICATION_EVENTS };
