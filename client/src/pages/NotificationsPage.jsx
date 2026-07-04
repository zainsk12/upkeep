// client/src/pages/NotificationsPage.jsx
//
// The full Notification Center. Search, filter chips, sort, Load More, empty +
// error states and skeleton loaders — all driven by the shared
// NotificationsContext (backend-backed) so it stays in sync with the navbar bell.

import { useState, useMemo } from "react";
import { CheckCheck, Search, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { useNotifications } from "../context/NotificationsContext";
import { NOTIFICATION_CATEGORIES, getNotificationMeta } from "../constants/notifications";
import NotificationItem from "../components/notifications/NotificationItem";
import NotificationSkeleton from "../components/notifications/NotificationSkeleton";
import NotificationEmptyState from "../components/notifications/NotificationEmptyState";

/* Filter chips — value maps to a category key, or the special all/unread modes. */
const FILTERS = [
  { key: "all",      label: "All" },
  { key: "unread",   label: "Unread" },
  { key: "bookings", label: NOTIFICATION_CATEGORIES.bookings },
  { key: "payments", label: NOTIFICATION_CATEGORIES.payments },
  { key: "offers",   label: NOTIFICATION_CATEGORIES.offers },
  { key: "system",   label: NOTIFICATION_CATEGORIES.system },
  { key: "account",  label: NOTIFICATION_CATEGORIES.account },
];

const PAGE_SIZE = 6;

export default function NotificationsPage() {
  const {
    notifications, loading, error, unreadCount, newIds,
    markAsRead, markAllAsRead, removeNotification, refetch,
  } = useNotifications();

  const [filter, setFilter]   = useState("all");
  const [query, setQuery]     = useState("");
  const [sort, setSort]       = useState("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = notifications.filter((n) => {
      // Filter chip
      if (filter === "unread" && n.read) return false;
      if (filter !== "all" && filter !== "unread") {
        if (getNotificationMeta(n.type).category !== filter) return false;
      }
      // Search
      if (q && !(`${n.title} ${n.description}`.toLowerCase().includes(q))) return false;
      return true;
    });

    result.sort((a, b) => {
      const diff = new Date(a.createdAt) - new Date(b.createdAt);
      return sort === "newest" ? -diff : diff;
    });
    return result;
  }, [notifications, filter, query, sort]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  // Reset pagination whenever the result set changes shape.
  const resetVisible = () => setVisible(PAGE_SIZE);

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-primary dark:bg-primary-dark text-white">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-blush text-xs font-semibold uppercase tracking-widest mb-2">Your account</p>
              <h1 className="landing-heading text-3xl md:text-4xl font-bold leading-tight">Notifications</h1>
              <p className="text-white/70 text-sm mt-2">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
                  : "You're all caught up."}
              </p>
            </div>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10
                hover:bg-white/20 text-white text-sm font-medium transition-all
                disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto
                focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <CheckCheck size={15} />
              Mark all as read
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 lg:px-8 py-8 md:py-12">
        {/* Toolbar: search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetVisible(); }}
              placeholder="Search notifications…"
              aria-label="Search notifications"
              className="input-base pl-10"
            />
          </div>
          <div className="relative sm:w-44">
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); resetVisible(); }}
              className="input-base appearance-none pr-10 cursor-pointer"
              aria-label="Sort notifications"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter notifications">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const showCount = f.key === "unread" && unreadCount > 0;
            return (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); resetVisible(); }}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-150 border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
                  ${active
                    ? "bg-primary text-white border-primary shadow-sm shadow-primary/25"
                    : "bg-card text-muted border-border hover:border-primary/40 hover:text-primary"}`}
              >
                {f.label}
                {showCount && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                    rounded-full text-[10px] font-bold
                    ${active ? "bg-white/25 text-white" : "bg-primary/10 text-primary"}`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden card-shadow">
          {loading ? (
            <div className="divide-y divide-border/60 p-1.5">
              {[1, 2, 3, 4, 5].map((i) => <NotificationSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <AlertCircle size={26} className="text-red-500" />
              </div>
              <h3 className="text-text font-bold text-lg mb-1">Couldn't load notifications</h3>
              <p className="text-muted text-sm max-w-xs mb-5">
                Something went wrong. Please check your connection and try again.
              </p>
              <button
                onClick={refetch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary
                  hover:bg-primary-hover text-white text-sm font-semibold transition-all
                  hover:-translate-y-0.5 shadow-md shadow-primary/25"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : shown.length === 0 ? (
            <NotificationEmptyState
              subtitle={query || filter !== "all"
                ? "No notifications match your filters."
                : "New notifications will show up here."}
            />
          ) : (
            <div className="divide-y divide-border/60 p-1.5">
              {shown.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onDelete={removeNotification}
                  isNew={newIds.has(n.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Load more */}
        {!loading && !error && hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border
                bg-card text-primary text-sm font-semibold hover:border-primary/40 hover:bg-primary/5
                transition-all"
            >
              Load More
              <span className="text-muted font-normal">({filtered.length - visible})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
