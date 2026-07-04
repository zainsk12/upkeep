// client/src/context/NotificationsContext.jsx
//
// Backend-driven, REAL-TIME notification store (Modules 2 + 3). Fetches the
// authenticated user's notifications over REST and keeps the navbar bell badge,
// the dropdown and the /notifications page in sync. A single Socket.IO
// connection (per tab) pushes live deltas so every session updates instantly
// without refetching. Actions stay optimistic with rollback-on-error.
//
// Only active when authenticated — an anonymous REST call would 401 (interceptor
// bounces to /login) and the socket only connects with a valid token.

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationApi,
  mapNotification,
  fetchPreferences,
  updatePreferencesApi,
  DEFAULT_PREFERENCES,
} from "../services/notificationApi";
import { connectSocket, disconnectSocket } from "../services/socket";
import { getNotificationMeta } from "../constants/notifications";
import { toast } from "../utils/toast";
import { playNotificationSound } from "../utils/notificationSound";

const NotificationsContext = createContext(null);

// How many recent notifications to load for the bell + center. Server-side
// pagination/filtering exists for future infinite-scroll; the Module 1 UI does
// its own client-side filter/sort/"Load More" over this set.
const FETCH_LIMIT = 50;

// Socket event names — must match server/services/socketService.js.
const EV = {
  CREATED:  "notification:created",
  READ:     "notification:read",
  READ_ALL: "notification:read-all",
  DELETED:  "notification:deleted",
};

// Shallow-merge a preferences patch into the current object, one level deep for
// the nested `categories` / `channels` maps so a partial update never drops the
// sibling keys the server still holds.
const mergePreferences = (base, patch = {}) => ({
  ...base,
  ...patch,
  categories: { ...base.categories, ...(patch.categories || {}) },
  channels: {
    ...base.channels,
    ...Object.fromEntries(
      Object.entries(patch.channels || {}).map(([k, v]) => [k, { ...base.channels?.[k], ...v }])
    ),
  },
});

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  // Ids of notifications that just arrived over the socket — briefly flagged so
  // the UI can play a one-shot entrance animation, then cleared.
  const [newIds, setNewIds]               = useState(() => new Set());

  // User notification preferences (Module 6). Starts at the all-enabled default
  // so behaviour is correct before the first fetch resolves.
  const [preferences, setPreferences]     = useState(DEFAULT_PREFERENCES);
  // Politely-announced text for screen readers when a notification arrives.
  const [liveMessage, setLiveMessage]     = useState("");

  // Guards against a stale response overwriting fresher state after logout.
  const reqIdRef = useRef(0);
  // Ids we've already surfaced this session — dedupes list entries AND toasts
  // (e.g. a "created" event re-delivered after a reconnect).
  const seenIdsRef = useRef(new Set());
  // Latest preferences, read by the (stable) socket handlers without making them
  // a dependency — so toggling a preference never tears down the socket.
  const prefsRef = useRef(preferences);
  useEffect(() => { prefsRef.current = preferences; }, [preferences]);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchNotifications({ limit: FETCH_LIMIT, sort: "newest" });
      if (myReq !== reqIdRef.current) return; // superseded (e.g. logout) — ignore
      const mapped = (data.notifications || []).map(mapNotification);
      // Reset the seen-set to the authoritative server list — keeps it bounded and
      // ensures post-reconnect "created" events for already-loaded ids are deduped.
      seenIdsRef.current = new Set(mapped.map((n) => n.id));
      setNotifications(mapped);
      setUnreadCount(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : mapped.filter((n) => !n.read).length
      );
    } catch (err) {
      if (myReq !== reqIdRef.current) return;
      // 401 is handled globally by the axios interceptor (redirect to login);
      // surface everything else as a retry-able error.
      if (err?.response?.status !== 401) {
        setError("Couldn't load notifications.");
      }
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [isAuthenticated]);

  // Load the user's notification preferences (falls back to defaults on error so
  // the UI is never blocked by a preferences hiccup).
  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await fetchPreferences();
      if (data?.preferences) setPreferences(mergePreferences(DEFAULT_PREFERENCES, data.preferences));
    } catch {
      /* keep defaults — non-blocking */
    }
  }, [isAuthenticated]);

  // Fetch on login; clear on logout.
  useEffect(() => {
    if (isAuthenticated) {
      load();
      loadPreferences();
    } else {
      reqIdRef.current++; // invalidate any in-flight request
      seenIdsRef.current.clear();
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, [isAuthenticated, load, loadPreferences]);

  // Persist a preferences patch (optimistic, with rollback on failure).
  const updatePreferences = useCallback(async (patch) => {
    const previous = prefsRef.current;
    const optimistic = mergePreferences(previous, patch);
    setPreferences(optimistic);
    try {
      const { data } = await updatePreferencesApi(patch);
      if (data?.preferences) setPreferences(mergePreferences(DEFAULT_PREFERENCES, data.preferences));
      return true;
    } catch {
      setPreferences(previous); // rollback
      toast.error("Couldn't save your preference. Please try again.");
      return false;
    }
  }, []);

  // ── Live notification arrival: toast + sound + screen-reader announce ────────
  // Reads the latest preferences via prefsRef so this stays a stable callback
  // (changing a preference must not re-subscribe the socket). Respects the user's
  // toast + sound settings; the SR announcement always fires (accessibility).
  const announceArrival = useCallback((n) => {
    const prefs = prefsRef.current;

    if (prefs.toasts) {
      const meta = getNotificationMeta(n.type);
      const Icon = meta.icon;
      toast.message(n.title, {
        description: n.description,
        icon: <Icon size={18} className={meta.color} />,
      });
    }

    if (prefs.sound) playNotificationSound();

    // Announce to assistive tech regardless of the visual toast preference.
    setLiveMessage(`New notification: ${n.title}. ${n.description || ""}`.trim());
  }, []);

  // ── Socket.IO real-time layer ───────────────────────────────────────────────
  // One connection per tab. All handlers use functional setState + absolute
  // server-provided counts, so they're idempotent (safe against the echo a tab
  // receives for its own REST action, and against reconnect re-delivery).
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const s = connectSocket();

    const onCreated = (payload) => {
      const mapped = mapNotification(payload.notification);
      const isNew = !seenIdsRef.current.has(mapped.id);
      if (isNew) {
        seenIdsRef.current.add(mapped.id);
        setNotifications((prev) =>
          prev.some((n) => n.id === mapped.id) ? prev : [mapped, ...prev]
        );
        // Flag for the entrance animation, then clear after it plays.
        setNewIds((prev) => new Set(prev).add(mapped.id));
        setTimeout(() => {
          setNewIds((prev) => {
            if (!prev.has(mapped.id)) return prev;
            const next = new Set(prev);
            next.delete(mapped.id);
            return next;
          });
        }, 600);
      }
      if (typeof payload.unreadCount === "number") setUnreadCount(payload.unreadCount);
      if (isNew) announceArrival(mapped); // never fires for mark-as-read / duplicates
    };

    const onRead = (payload) => {
      setNotifications((prev) => prev.map((n) => (n.id === payload.id ? { ...n, read: true } : n)));
      if (typeof payload.unreadCount === "number") setUnreadCount(payload.unreadCount);
    };

    const onReadAll = (payload) => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(payload?.unreadCount ?? 0);
    };

    const onDeleted = (payload) => {
      setNotifications((prev) => prev.filter((n) => n.id !== payload.id));
      if (typeof payload.unreadCount === "number") setUnreadCount(payload.unreadCount);
    };

    // After a reconnect, resync from REST so any events missed while offline are
    // reconciled (load() replaces state wholesale → no duplicates).
    const onReconnect = () => { load(); };

    s.on(EV.CREATED, onCreated);
    s.on(EV.READ, onRead);
    s.on(EV.READ_ALL, onReadAll);
    s.on(EV.DELETED, onDeleted);
    s.io.on("reconnect", onReconnect);

    return () => {
      s.off(EV.CREATED, onCreated);
      s.off(EV.READ, onRead);
      s.off(EV.READ_ALL, onReadAll);
      s.off(EV.DELETED, onDeleted);
      s.io.off("reconnect", onReconnect);
      disconnectSocket();
    };
  }, [isAuthenticated, load, announceArrival]);

  // ── Optimistic mutations ───────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return; // no-op if already read/absent
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const { data } = await markNotificationRead(id);
      if (typeof data?.unreadCount === "number") setUnreadCount(data.unreadCount);
    } catch (err) {
      // A 404 means it was already gone server-side — keep the optimistic state.
      if (err?.response?.status !== 404) load(); // resync on real failure
    }
  }, [notifications, load]);

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    const snapshot = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      setNotifications(snapshot); // rollback
      load();
    }
  }, [notifications, unreadCount, load]);

  const removeNotification = useCallback(async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!target.read) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const { data } = await deleteNotificationApi(id);
      if (typeof data?.unreadCount === "number") setUnreadCount(data.unreadCount);
    } catch (err) {
      if (err?.response?.status !== 404) load(); // resync unless it was already gone
    }
  }, [notifications, load]);

  const value = useMemo(
    () => ({
      notifications,
      loading,
      error,
      unreadCount,
      newIds,
      preferences,
      refetch: load,
      markAsRead,
      markAllAsRead,
      removeNotification,
      updatePreferences,
    }),
    [notifications, loading, error, unreadCount, newIds, preferences, load, markAsRead, markAllAsRead, removeNotification, updatePreferences]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {/* Visually-hidden polite live region — screen readers announce new
          notifications as they arrive, independent of the visual toast. */}
      <div aria-live="polite" role="status" className="sr-only">{liveMessage}</div>
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
};
