// client/src/components/notifications/NotificationEmptyState.jsx
//
// Friendly empty state for the notification dropdown and page.

import { BellOff } from "lucide-react";

export default function NotificationEmptyState({
  title = "You're all caught up!",
  subtitle = "New notifications will show up here.",
  compact = false,
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-10 px-6" : "py-20 px-4"}`}>
      <div className={`rounded-2xl bg-primary/8 flex items-center justify-center mb-4
        ${compact ? "w-12 h-12" : "w-16 h-16"}`}>
        <BellOff size={compact ? 22 : 28} className="text-primary/50" />
      </div>
      <h3 className={`text-text font-bold ${compact ? "text-sm mb-1" : "text-lg mb-2"}`}>
        {title}
      </h3>
      <p className={`text-muted leading-relaxed max-w-xs ${compact ? "text-xs" : "text-sm"}`}>
        {subtitle}
      </p>
    </div>
  );
}
