// client/src/components/notifications/NotificationItem.jsx
//
// A single notification card — shared by the navbar dropdown and the
// /notifications page. Purely presentational: it renders the type icon,
// title, description, relative time and an unread dot, and delegates the
// click (mark-as-read + future routing) to its parent. When `onDelete` is
// provided, a subtle hover-reveal dismiss button is shown.

import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { getNotificationMeta } from "../../constants/notifications";
import { timeAgo } from "../../utils/timeAgo";

export default function NotificationItem({ notification, onRead, onDelete, compact = false, isNew = false }) {
  const navigate = useNavigate();
  const meta = getNotificationMeta(notification.type);
  const Icon = meta.icon;

  const handleClick = () => {
    onRead?.(notification.id);
    // Layout is prepared for future routing — navigate when a link is provided.
    if (notification.link) navigate(notification.link);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  // Full spoken label so screen-reader users get read-state, content and age in
  // one pass rather than tabbing through fragments.
  const ariaLabel = `${notification.read ? "" : "Unread. "}${notification.title}. ${
    notification.description || ""
  } ${timeAgo(notification.createdAt)}`.trim();

  return (
    <div className={`group relative ${isNew ? "animate-in" : ""}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        className={`w-full flex items-start gap-3 text-left rounded-xl
          transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
          ${compact ? "px-3 py-2.5" : "px-3.5 py-3.5"}
          ${onDelete ? "pr-9" : ""}
          ${notification.read
            ? "hover:bg-bg"
            : "bg-primary/[0.04] hover:bg-primary/[0.07]"}`}
      >
        {/* Type icon */}
        <span
          className={`flex-shrink-0 rounded-xl flex items-center justify-center ${meta.bg}
            ${compact ? "w-9 h-9" : "w-10 h-10"}`}
        >
          <Icon size={compact ? 16 : 18} strokeWidth={2} className={meta.color} />
        </span>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-text font-semibold leading-snug truncate
              ${compact ? "text-[13px]" : "text-sm"}`}>
              {notification.title}
            </h4>
            {/* Unread dot */}
            {!notification.read && (
              <span
                className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-primary"
                aria-label="Unread"
              />
            )}
          </div>
          <p className={`text-muted leading-snug mt-0.5 ${compact ? "text-xs line-clamp-2" : "text-[13px] line-clamp-2"}`}>
            {notification.description}
          </p>
          <p className="text-muted/70 text-[11px] font-medium mt-1.5">
            {timeAgo(notification.createdAt)}
          </p>
        </div>
      </button>

      {/* Dismiss — hover-reveal (focusable for keyboard/touch). Only when wired. */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete notification"
          className="absolute top-1/2 -translate-y-1/2 right-2 w-6 h-6 rounded-lg
            flex items-center justify-center text-muted
            opacity-0 group-hover:opacity-100 focus:opacity-100
            hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500
            transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
