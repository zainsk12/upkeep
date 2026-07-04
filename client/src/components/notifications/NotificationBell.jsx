// client/src/components/notifications/NotificationBell.jsx
//
// Navbar bell button + unread badge + anchored dropdown. Open state is lifted
// to the Navbar (like AvatarDropdown) so the bell, avatar menu and mobile menu
// stay mutually exclusive. Rendered on both desktop and mobile.

import { useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";
import NotificationDropdown from "./NotificationDropdown";

const PANEL_ID = "notification-panel";

export default function NotificationBell({ open, onOpenChange }) {
  const ref = useRef(null);
  const btnRef = useRef(null);
  const { unreadCount } = useNotifications();

  // Close on outside click. Only the VISIBLE instance reacts — the other
  // breakpoint's instance is display:none (offsetParent === null), mirroring
  // the AvatarDropdown pattern so both instances can share one open state.
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && ref.current.offsetParent !== null && !ref.current.contains(e.target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOpenChange, ref]);

  // Close on Escape and return focus to the bell (keyboard accessibility) — but
  // only for the visible instance, so the hidden breakpoint copy doesn't steal
  // focus across viewports.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      onOpenChange(false);
      if (btnRef.current && btnRef.current.offsetParent !== null) btnRef.current.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={() => onOpenChange(!open)}
        className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10
          transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
      >
        <Bell size={20} strokeWidth={2} />

        {/* Unread badge — hidden automatically when count is 0. `key` re-keys on
            count change so the pop animation replays. */}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center" aria-hidden="true">
            {/* Subtle ping ring while there are unread notifications (motion-safe) */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500/70 animate-ping motion-reduce:hidden" />
            <span
              key={unreadCount}
              className="badge-pop relative inline-flex items-center justify-center
                min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white
                text-[10px] font-bold leading-none ring-2 ring-primary dark:ring-primary-dark"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        // Mobile: viewport-anchored just below the navbar with side gutters so a
        // wide panel never clips off-screen. ≥640px: anchored under the bell.
        <div className="fixed inset-x-3 top-[70px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-[calc(100%+10px)] z-[100]">
          <NotificationDropdown id={PANEL_ID} onClose={() => onOpenChange(false)} />
        </div>
      )}
    </div>
  );
}
