# Notification System — Developer Guide

_UpKeep by Austrum • Modules 1–6_

This document is the single reference for the in-app notification system: how it
is put together, how a notification travels from an application event to a user's
screen, every API and event, and how to extend it (including how the prepared
Push / Email / SMS / WhatsApp channels should be wired up in future).

> **Scope.** Only **in-app** notifications are implemented (real-time via
> Socket.IO, persisted in MongoDB). Push / Email / SMS / WhatsApp are
> **architecturally prepared but intentionally not implemented** — see
> [Future channels](#future-channels).

---

## 1. Architecture overview

Three deployables share one backend:

| Piece | Path | Role |
| --- | --- | --- |
| API + realtime | `server/` | REST endpoints, Socket.IO, campaign scheduler, cleanup jobs |
| Customer app | `client/` | Bell, dropdown, notification centre, preferences |
| Admin app | `admin-client/` | Compose / schedule / track broadcast campaigns |

```
 Application event (booking, auth, admin campaign…)
        │
        ▼
 notificationService.createNotification()
        │  ├─ preference gate (per-user, per-category)
        │  ├─ Notification.create()  ── persisted (source of truth)
        │  ├─ emitToUser()           ── Socket.IO delta to that user's sessions
        │  └─ deliverExternal()      ── future channels (currently no-op)
        ▼
 client NotificationsContext
        ├─ REST fetch on load / reconnect (authoritative)
        ├─ socket deltas (created / read / read-all / deleted)
        └─ toast + sound + SR announce (respecting preferences)
```

**Key principle:** REST is the source of truth; sockets only carry deltas. After
any reconnect the client re-fetches over REST, so a missed socket event can never
cause permanent drift.

---

## 2. Notification lifecycle

1. **Trigger.** An app event calls a helper in `notificationService.js`
   (`notifyBookingConfirmed`, `notifyWelcome`, …) or the campaign dispatcher calls
   `createNotification` directly.
2. **Preference gate (Module 6).** Unless `respectPreferences: false`, the
   service loads the user's preferences and **skips creation** if they opted that
   category out. Fail-open: a missing/unreadable preferences doc = allowed.
3. **Persist.** A `Notification` document is written. For admin campaigns a
   partial-unique `{ campaignId, userId }` index guarantees at most one
   notification per (campaign, user) → idempotent re-dispatch.
4. **Real-time push.** `emitToUser` emits `notification:created` (plus the
   authoritative unread count) to the user's private Socket.IO room.
5. **Future channels.** `deliverExternal` routes the notification through any
   channel the user opted into — currently all no-ops.
6. **Client render.** `NotificationsContext` inserts it, updates the badge, and
   (per preferences) shows a toast, plays a sound, and announces it to screen
   readers.
7. **Read / delete.** User actions hit REST; the controller emits
   `notification:read` / `read-all` / `deleted` to sync the user's other sessions.
8. **Retention.** The cleanup job eventually purges old **read** notifications
   (never unread) — see [Cleanup](#6-cleanup-jobs).

---

## 3. REST APIs

All under `/api/notifications`, all require auth, all rate-limited
(`userApiLimiter`). Every query is scoped to `req.user._id` — a user can only
ever see or mutate their own data.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/notifications` | List (query: `page`, `limit`, `unread=true`, `category`, `sort=newest\|oldest`) |
| `GET` | `/api/notifications/unread-count` | `{ unreadCount }` |
| `PATCH` | `/api/notifications/:id/read` | Mark one read |
| `PATCH` | `/api/notifications/read-all` | Mark all read |
| `DELETE` | `/api/notifications/:id` | Delete one |
| `GET` | `/api/notifications/preferences` | Get preferences (created lazily) |
| `PUT` | `/api/notifications/preferences` | Partial update of preferences |

**Admin** (under `/api/admin/notifications`, admin-only, per-action rate limits):

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Campaign history (paginated, filterable) |
| `POST` | `/` | Create/schedule a campaign |
| `GET` | `/analytics` | Aggregate delivery analytics |
| `GET` | `/users` | User search (audience picker) |
| `POST` | `/audience-count` | Preview reach for an audience |
| `GET` | `/:id` | One campaign + analytics |
| `POST` | `/:id/resend` | Re-dispatch (idempotent) |
| `PATCH` | `/:id/cancel` | Cancel a scheduled campaign |
| `DELETE` | `/:id` | Delete a campaign |

Pagination/sort are hardened (`utils/queryOptions.js`): bad input is clamped, and
sort is whitelisted — the client value is never passed to Mongo directly.

---

## 4. Socket.IO events

One connection per browser tab (`client/src/services/socket.js`). The handshake
uses the **same JWT scheme as REST** (`socketService.authenticateSocket`),
including the password-change session watermark, and is per-IP rate-limited. Each
authenticated socket joins a private room `user:<userId>`, so events reach only
that user's own sessions (multi-device safe).

| Event | Payload | Emitted when |
| --- | --- | --- |
| `notification:created` | `{ notification, unreadCount }` | New notification stored |
| `notification:read` | `{ id, unreadCount }` | One marked read |
| `notification:read-all` | `{ unreadCount: 0 }` | All marked read |
| `notification:deleted` | `{ id, unreadCount }` | One deleted |

Names are defined once in `server/services/socketService.js` (`NOTIFICATION_EVENTS`)
and mirrored in `client/src/context/NotificationsContext.jsx` (`EV`). **Keep them
in sync.** All client handlers are idempotent and use the server's absolute
`unreadCount`, so a self-echo or a reconnect re-delivery can never cause drift.

---

## 5. Campaign flow & scheduler

**Compose (admin) → dispatch → analytics.**

- `POST /api/admin/notifications` creates a `NotificationCampaign`. Immediate
  sends dispatch inline; scheduled sends store `scheduledAt` and return.
- A duplicate-request guard rejects an identical immediate send within
  `NOTIF_DUPLICATE_WINDOW_MS` (returns 409).
- **Dispatch** (`notificationDispatch.dispatchCampaign`):
  1. Resolve the audience → recipient ids (`all` / `users` / `city` / `service`).
  2. Enforce `NOTIF_MAX_CAMPAIGN_RECIPIENTS` (throws `MaxRecipientsError` → 400).
  3. **Bulk-filter** recipients by their in-app preference for the campaign's
     category (one query), then fan out with `respectPreferences: false`.
  4. Fan out via `createNotification` (idempotent per the unique index).
  5. `recipientCount` is derived from **actually-stored** notifications, so it is
     correct even across a partial re-dispatch.

**Scheduler** (`notificationScheduler.js`): polls every
`NOTIF_SCHEDULER_POLL_MS`. Each due campaign is **claimed atomically**
(`scheduled → sending`) via `findOneAndUpdate`, so overlapping ticks can never
double-send. On startup it **recovers** any campaign left `sending` by a crash
(reverts to `scheduled` for re-claim; safe because dispatch is idempotent). A
failed dispatch marks the campaign `failed` (admin can resend).

---

## 6. Cleanup jobs

`notificationCleanup.startNotificationCleanup()` runs shortly after boot then on
an interval (`NOTIF_CLEANUP_INTERVAL_MS`). Three passes, all age-based:

1. **Read notifications** older than `NOTIF_READ_RETENTION_DAYS`
   → `{ isRead: true, createdAt < cutoff }`. **Unread are NEVER deleted.**
2. **Terminal campaigns** (`sent` / `cancelled` / `failed`) older than
   `NOTIF_CAMPAIGN_RETENTION_DAYS`.
3. **Empty campaigns** (delivered to nobody) older than
   `NOTIF_EMPTY_CAMPAIGN_GRACE_DAYS`.

An overlap guard prevents concurrent runs; timers are `unref`'d so they never
block shutdown; a summary is logged only when something was actually deleted.

---

## 7. Notification preferences (Module 6)

Per-user document (`models/NotificationPreferences.js`), created **lazily** on
first read/update. Existing users have no document and therefore get the
all-enabled defaults — Modules 1–5 behaviour is unchanged for them.

```jsonc
{
  "categories": { "bookings": true, "payments": true, "offers": true,
                  "system": true, "account": true },   // in-app gates (active)
  "sound": false,                                        // arrival chime (client)
  "toasts": true,                                        // in-app toast (client)
  "channels": {                                          // future — stored, inert
    "push":     { "enabled": false },
    "email":    { "enabled": false },
    "sms":      { "enabled": false },
    "whatsapp": { "enabled": false }
  }
}
```

- **`categories`** gate what the server actually creates (see lifecycle step 2).
- **`sound` / `toasts`** are client-side arrival behaviours read by
  `NotificationsContext`. The chime is synthesised with the Web Audio API
  (`utils/notificationSound.js`) — no asset, CSP-safe, and it can never autoplay
  before a user gesture (the AudioContext stays suspended until then).
- All preference logic lives in `services/notificationPreferenceService.js` and
  is **fail-open**: any error defaults to "enabled" so a preferences bug can
  never silently swallow a user's notifications.

UI: `client/src/pages/SettingsPage.jsx` → `/settings/notifications` →
`components/notifications/NotificationPreferencesPanel.jsx`.

---

## 8. Future channels

Push / Email / SMS / WhatsApp are **prepared, not implemented**. The extension
point lives in `server/services/channels/`:

```
channels/
  channelInterface.js  → createChannel({ key, label, isConfigured, send })
  index.js             → registry + deliverExternal({ notification, userId, preferences })
  pushChannel.js       → stub (no-op)
  emailChannel.js      → stub (no-op)
  smsChannel.js        → stub (no-op)
  whatsappChannel.js   → stub (no-op)
```

`deliverExternal` (called fire-and-forget from `createNotification`) iterates the
registry and invokes a channel **only if** the user opted it in **and**
`isConfigured()` is true. Today every stub reports `isConfigured() === false`, so
this is a guaranteed no-op.

**To implement a channel (future module):**

1. In the matching stub file, provide a real `send({ notification, userId, user,
   preferences })` that resolves to `{ status, reason? }` (never throws).
2. Flip `isConfigured()` to check the relevant env vars (e.g. an SMS gateway key).
3. That's it — the registry already routes opted-in users to it, and the
   preferences UI already exposes the toggle (currently disabled/"Soon").

Do **not** add core-logic changes: no edits to `notificationService`,
`Notification`, or the controllers are required to light up a channel.

---

## 9. Configuration & environment variables

All tunables live in `server/config/notifications.js` with safe defaults; set the
env var only to override. Nothing production-specific is hardcoded.

| Env var | Default | Meaning |
| --- | --- | --- |
| `NOTIF_SCHEDULER_POLL_MS` | `30000` | Scheduled-campaign poll interval |
| `NOTIF_CLEANUP_ENABLED` | `true` | Master switch for the retention job |
| `NOTIF_CLEANUP_INTERVAL_MS` | `86400000` | Cleanup run interval |
| `NOTIF_READ_RETENTION_DAYS` | `90` | Age after which **read** notifs are purged |
| `NOTIF_CAMPAIGN_RETENTION_DAYS` | `180` | Age after which terminal campaigns are purged |
| `NOTIF_EMPTY_CAMPAIGN_GRACE_DAYS` | `7` | Grace before empty campaigns are purged |
| `NOTIF_MAX_CAMPAIGN_RECIPIENTS` | `50000` | Hard cap on a campaign's audience |
| `NOTIF_DUPLICATE_WINDOW_MS` | `5000` | Duplicate immediate-send rejection window |
| `NOTIF_USER_PAGE_LIMIT` | `20` | Default user list page size |
| `NOTIF_ADMIN_PAGE_LIMIT` | `15` | Default admin list page size |
| `NOTIF_MAX_PAGE_LIMIT` | `100` | Max page size (clamp) |
| `NOTIF_RL_USER_WINDOW_MS` / `NOTIF_RL_USER_MAX` | `60000` / `240` | User API rate limit |
| `NOTIF_RL_ADMIN_CREATE_MAX` | `30` | Admin create rate limit (per min) |
| `NOTIF_RL_ADMIN_RESEND_MAX` | `20` | Admin resend rate limit (per min) |
| `NOTIF_RL_ADMIN_DELETE_MAX` | `60` | Admin delete rate limit (per min) |
| `NOTIF_RL_SOCKET_WINDOW_MS` / `NOTIF_RL_SOCKET_MAX` | `60000` / `30` | Per-IP socket handshake limit |
| `NOTIF_SYNC_INDEXES` | `false` | Opt-in `syncIndexes()` at boot (drops obsolete indexes) |

Preferences add **no new env vars** — defaults are in the model/service.

---

## 10. Folder structure

```
server/
  config/notifications.js               # all env-driven tunables
  constants/notifications.js            # types / categories / priorities / catalog
  controllers/
    notificationController.js           # user CRUD + preferences endpoints
    adminNotificationController.js      # campaigns + analytics
  middleware/notificationRateLimits.js  # express-rate-limit instances
  models/
    Notification.js                     # per-user notification (+ indexes)
    NotificationCampaign.js             # admin broadcast
    NotificationPreferences.js          # per-user preferences (Module 6)
  routes/
    notificationRoutes.js
    adminNotificationRoutes.js
  services/
    notificationService.js              # createNotification + event helpers
    notificationPreferenceService.js    # preference read/gate/filter (Module 6)
    notificationDispatch.js             # audience resolution + fan-out
    notificationScheduler.js            # scheduled dispatch + crash recovery
    notificationCleanup.js              # retention job
    socketService.js                    # Socket.IO auth + emitToUser
    channels/                           # FUTURE push/email/sms/whatsapp (Module 6)

client/src/
  components/notifications/             # Bell, Dropdown, Item, Skeleton, EmptyState,
                                        #   NotificationPreferencesPanel
  context/NotificationsContext.jsx      # store: REST + socket + toast/sound/prefs
  pages/NotificationsPage.jsx           # notification centre
  services/notificationApi.js           # REST wrappers + preferences
  services/socket.js                    # singleton Socket.IO client
  utils/notificationSound.js            # Web Audio chime (Module 6)
  utils/timeAgo.js

admin-client/src/
  pages/NotificationsPage.jsx           # compose / schedule / history / analytics
  constants/notifications.js
```

---

## 11. How to extend

- **New notification type:** add it to `server/constants/notifications.js`
  (`NOTIFICATION_CATALOG`) and add its icon/colour to
  `client/src/constants/notifications.js`. Add a `notify*` helper in
  `notificationService.js` and call it from the triggering flow.
- **New preference:** add a field to `NotificationPreferences.js`, whitelist it in
  `notificationPreferenceService.applyUpdate`, surface it in
  `NotificationPreferencesPanel.jsx`. (Category gating is automatic — it derives
  from the shared `NOTIFICATION_CATEGORIES`.)
- **New channel:** see [Future channels](#8-future-channels).
- **New config value:** add it to `config/notifications.js` with a default and
  document it in section 9 — never hardcode.

---

## 12. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| No real-time updates | Socket didn't authenticate. Check the JWT is present/valid; look for `[SOCKET] Handshake …` warnings. REST still works — client re-syncs on reconnect. |
| Socket keeps disconnecting | Token expired or password changed (session watermark). Re-login. Also check per-IP handshake rate limit (`NOTIF_RL_SOCKET_MAX`). |
| A user isn't getting a notification | They may have opted that **category** out (`GET /preferences`). Preference gating is intended — this is not a bug. |
| Duplicate notifications from a campaign | Should be impossible (partial-unique `{campaignId,userId}`). If seen, verify the index exists (`db.notifications.getIndexes()`); set `NOTIF_SYNC_INDEXES=true` once to reconcile. |
| Scheduled campaign never sent | Scheduler not running, or campaign stuck `sending` after a crash — restart recovers it. Check `[NOTIF SCHED]` logs. |
| Old notifications not purged | `NOTIF_CLEANUP_ENABLED` false, or they're **unread** (never purged by design). |
| Sound never plays | Expected before the first user gesture (AudioContext suspended), if `sound` preference is off, or on browsers without Web Audio — it degrades to silence. |
| `vite build` fails on `@apply` + opacity | Tailwind can't resolve opacity modifiers on CSS-var colours; use `color-mix` instead. |

---

_Last updated for Module 6 (final)._
