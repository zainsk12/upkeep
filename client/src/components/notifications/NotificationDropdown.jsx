// client/src/components/notifications/NotificationDropdown.jsx
//
// The panel that opens under the navbar bell. Header + "Mark all as read",
// a scrollable list (skeleton / empty / items) and a "See All" footer.
// Positioning + open/close is owned by NotificationBell; this is the content.

import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";
import NotificationItem from "./NotificationItem";
import NotificationSkeleton from "./NotificationSkeleton";
import NotificationEmptyState from "./NotificationEmptyState";

export default function NotificationDropdown({ onClose, id = "notification-panel" }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const {
    notifications, loading, error, unreadCount, newIds,
    markAsRead, markAllAsRead, removeNotification, refetch,
  } = useNotifications();

  // Move focus into the panel when it opens so keyboard/screen-reader users land
  // inside the dialog; Escape (handled in NotificationBell) returns focus out.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const handleItemRead = (id) => {
    markAsRead(id);
    onClose?.();
  };

  const handleSeeAll = () => {
    onClose?.();
    navigate("/notifications");
  };

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-labelledby="notification-panel-heading"
      tabIndex={-1}
      className="animate-in bg-card rounded-2xl border border-border overflow-hidden
        w-full sm:w-[22rem] focus:outline-none"
      style={{ boxShadow: "0 8px 40px rgba(8,53,74,0.15), 0 2px 8px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <h3 id="notification-panel-heading" className="text-text font-bold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5
              rounded-full bg-primary text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-1 text-xs font-semibold text-primary
            hover:text-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCheck size={13} strokeWidth={2.5} />
          Mark all as read
        </button>
      </div>

      {/* List */}
      <div className="max-h-[min(70vh,26rem)] overflow-y-auto p-1.5">
        {loading ? (
          <div className="divide-y divide-border/60">
            {[1, 2, 3, 4].map((i) => <NotificationSkeleton key={i} compact />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-3">
              <AlertCircle size={22} className="text-red-500" />
            </div>
            <p className="text-text font-semibold text-sm mb-1">Couldn't load notifications</p>
            <p className="text-muted text-xs mb-4">Please check your connection and try again.</p>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border
                text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <NotificationEmptyState compact />
        ) : (
          <ul className="flex flex-col list-none m-0 p-0" aria-label="Notifications">
            {notifications.map((n) => (
              <li key={n.id}>
                <NotificationItem
                  notification={n}
                  onRead={handleItemRead}
                  onDelete={removeNotification}
                  isNew={newIds.has(n.id)}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <button
          onClick={handleSeeAll}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
            text-primary text-sm font-semibold hover:bg-primary/6 transition-colors group"
        >
          See All
          <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
