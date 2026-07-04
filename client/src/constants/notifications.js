// client/src/constants/notifications.js
//
// Notification System — frontend type catalog.
// Central source of truth for notification *types* (icon + colour + category)
// used to render each notification. Types/categories mirror the backend
// taxonomy (server/constants/notifications.js) so API data renders directly.

import {
  CalendarCheck, CalendarPlus, UserCheck, PlayCircle, CheckCircle2, CreditCard,
  XCircle, BadgePercent, UserCog, KeyRound, PartyPopper,
} from "lucide-react";

/* ─── Filter categories (used by the /notifications filter chips) ─────────── */
export const NOTIFICATION_CATEGORIES = {
  bookings: "Bookings",
  payments: "Payments",
  offers:   "Offers",
  system:   "System",
  account:  "Account",
};

/* ─── Type config — icon, colour tokens, label & filter category per type ────
   Colours follow the existing dynamic-icon pattern (see MyBookingsPage):
   `color` = foreground icon shade, `bg` = soft tinted chip that adapts in dark. */
export const NOTIFICATION_TYPES = {
  booking_created: {
    icon: CalendarPlus,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    category: "bookings",
    label: "Booking",
  },
  booking_confirmed: {
    icon: CalendarCheck,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    category: "bookings",
    label: "Booking",
  },
  technician_assigned: {
    icon: UserCheck,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    category: "bookings",
    label: "Technician",
  },
  service_started: {
    icon: PlayCircle,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    category: "bookings",
    label: "Service",
  },
  service_completed: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    category: "bookings",
    label: "Service",
  },
  payment_successful: {
    icon: CreditCard,
    color: "text-green-600 dark:text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    category: "payments",
    label: "Payment",
  },
  payment_failed: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    category: "payments",
    label: "Payment",
  },
  special_offer: {
    icon: BadgePercent,
    color: "text-accent",
    bg: "bg-blush/70 dark:bg-blush/10",
    category: "offers",
    label: "Offer",
  },
  profile_updated: {
    icon: UserCog,
    color: "text-secondary",
    bg: "bg-slate-100 dark:bg-slate-700/30",
    category: "account",
    label: "Profile",
  },
  password_changed: {
    icon: KeyRound,
    color: "text-amber-600 dark:text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    category: "account",
    label: "Security",
  },
  welcome: {
    icon: PartyPopper,
    color: "text-primary",
    bg: "bg-primary/10",
    category: "system",
    label: "Welcome",
  },
};

/* Safe fallback so an unknown type never crashes the UI. */
export const FALLBACK_TYPE = {
  icon: CheckCircle2,
  color: "text-primary",
  bg: "bg-primary/10",
  category: "system",
  label: "Update",
};

export const getNotificationMeta = (type) =>
  NOTIFICATION_TYPES[type] || FALLBACK_TYPE;
