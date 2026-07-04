// client/src/components/notifications/NotificationSkeleton.jsx
//
// Skeleton loader mirroring the NotificationItem layout (icon + two text
// lines + timestamp). Uses the project's `.shimmer` utility for the sweep.

export default function NotificationSkeleton({ compact = false }) {
  return (
    <div className={`w-full flex items-start gap-3 ${compact ? "px-3 py-2.5" : "px-3.5 py-3.5"}`}>
      <div className={`flex-shrink-0 rounded-xl shimmer ${compact ? "w-9 h-9" : "w-10 h-10"}`} />
      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
        <div className="h-3 w-2/5 rounded shimmer" />
        <div className="h-2.5 w-11/12 rounded shimmer" />
        <div className="h-2.5 w-1/4 rounded shimmer mt-1" />
      </div>
    </div>
  );
}
