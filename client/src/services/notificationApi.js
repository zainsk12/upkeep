// client/src/services/notificationApi.js
//
// Thin REST wrapper for the notification endpoints. The backend stores
// `_id / message / isRead`; the Module 1 UI expects `id / description / read`,
// so `mapNotification` normalises a server document into the frontend shape in
// one place (keeps the components untouched).

import api from "./axios";

/** Normalise a backend notification document → the shape the UI components use. */
export const mapNotification = (n) => ({
  id:          n._id,
  type:        n.type,
  title:       n.title,
  description: n.message,
  category:    n.category,
  icon:        n.icon,
  priority:    n.priority,
  read:        n.isRead,
  link:        n.link || "",
  createdAt:   n.createdAt,
  metadata:    n.metadata || {},
});

/** GET /api/notifications — supports { page, limit, unread, category, sort }. */
export const fetchNotifications = (params = {}) =>
  api.get("/api/notifications", { params });

/** GET /api/notifications/unread-count → { unreadCount }. */
export const fetchUnreadCount = () => api.get("/api/notifications/unread-count");

/** PATCH /api/notifications/:id/read → marks one read. */
export const markNotificationRead = (id) =>
  api.patch(`/api/notifications/${id}/read`);

/** PATCH /api/notifications/read-all → marks every notification read. */
export const markAllNotificationsRead = () =>
  api.patch("/api/notifications/read-all");

/** DELETE /api/notifications/:id → deletes one. */
export const deleteNotificationApi = (id) =>
  api.delete(`/api/notifications/${id}`);

/* ─── Preferences (Module 6) ───────────────────────────────────────────────── */

/** Client-side default preferences — mirrors the server model defaults. Used as
 *  the optimistic baseline before the first fetch resolves. */
export const DEFAULT_PREFERENCES = {
  categories: { bookings: true, payments: true, offers: true, system: true, account: true },
  sound: false,
  toasts: true,
  channels: {
    push:     { enabled: false },
    email:    { enabled: false },
    sms:      { enabled: false },
    whatsapp: { enabled: false },
  },
};

/** GET /api/notifications/preferences → { preferences }. */
export const fetchPreferences = () => api.get("/api/notifications/preferences");

/** PUT /api/notifications/preferences → persists a partial update. */
export const updatePreferencesApi = (patch) =>
  api.put("/api/notifications/preferences", patch);
