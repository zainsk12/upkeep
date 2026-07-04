// admin-client/src/constants/notifications.js
//
// Admin-side notification taxonomy — mirrors the server taxonomy
// (server/constants/notifications.js) so the compose form, preview and history
// table render notification types/categories/priorities consistently.

import {
  CalendarPlus, CalendarCheck, UserCheck, PlayCircle, CheckCircle2,
  CreditCard, XCircle, BadgePercent, UserCog, KeyRound, PartyPopper,
  Bell, Gift, Megaphone, Info, AlertTriangle, Tag, Sparkles, Wrench, Star,
} from "lucide-react";

/* type → display meta (label + icon + colour). Keys match the server enum. */
export const TYPE_META = {
  booking_created:     { label: "Booking Created",     icon: CalendarPlus,  color: "text-sky-600",     bg: "bg-sky-50" },
  booking_confirmed:   { label: "Booking Confirmed",   icon: CalendarCheck, color: "text-blue-600",    bg: "bg-blue-50" },
  technician_assigned: { label: "Technician Assigned", icon: UserCheck,     color: "text-indigo-600",  bg: "bg-indigo-50" },
  service_started:     { label: "Service Started",     icon: PlayCircle,    color: "text-cyan-600",    bg: "bg-cyan-50" },
  service_completed:   { label: "Service Completed",   icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50" },
  payment_successful:  { label: "Payment Successful",  icon: CreditCard,    color: "text-green-600",   bg: "bg-green-50" },
  payment_failed:      { label: "Payment Failed",      icon: XCircle,       color: "text-red-600",     bg: "bg-red-50" },
  special_offer:       { label: "Special Offer",       icon: BadgePercent,  color: "text-amber-600",   bg: "bg-amber-50" },
  profile_updated:     { label: "Profile Updated",     icon: UserCog,       color: "text-slate-600",   bg: "bg-slate-100" },
  password_changed:    { label: "Password Changed",    icon: KeyRound,      color: "text-orange-600",  bg: "bg-orange-50" },
  welcome:             { label: "Welcome",             icon: PartyPopper,   color: "text-primary",     bg: "bg-primary/8" },
};

export const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label }));

/* Sensible default category per type (mirrors the server catalog) — used to
   auto-fill the category when the admin picks a type. */
export const TYPE_DEFAULT_CATEGORY = {
  booking_created: "bookings", booking_confirmed: "bookings", technician_assigned: "bookings",
  service_started: "bookings", service_completed: "bookings",
  payment_successful: "payments", payment_failed: "payments",
  special_offer: "offers", profile_updated: "account", password_changed: "account", welcome: "system",
};

export const CATEGORY_OPTIONS = [
  { value: "bookings", label: "Bookings" },
  { value: "payments", label: "Payments" },
  { value: "offers",   label: "Offers"   },
  { value: "system",   label: "System"   },
  { value: "account",  label: "Account"  },
];

export const PRIORITY_META = {
  low:    { label: "Low",    color: "text-gray-600 bg-gray-100 border-gray-200" },
  normal: { label: "Normal", color: "text-blue-700 bg-blue-50 border-blue-200" },
  high:   { label: "High",   color: "text-red-700 bg-red-50 border-red-200" },
};
export const PRIORITY_OPTIONS = Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }));

export const STATUS_META = {
  scheduled: { label: "Scheduled", color: "text-violet-700 bg-violet-50 border-violet-200" },
  sending:   { label: "Sending",   color: "text-amber-700 bg-amber-50 border-amber-200" },
  sent:      { label: "Sent",      color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "text-gray-600 bg-gray-100 border-gray-200" },
  failed:    { label: "Failed",    color: "text-red-700 bg-red-50 border-red-200" },
};

/* Curated icon choices for the "Icon" selector (stored as a name string). */
export const ICON_OPTIONS = [
  "Bell", "Gift", "Tag", "Megaphone", "BadgePercent", "Sparkles",
  "Info", "AlertTriangle", "CheckCircle2", "CalendarCheck", "CreditCard",
  "Wrench", "Star", "PartyPopper",
];

const ICON_COMPONENTS = {
  Bell, Gift, Tag, Megaphone, BadgePercent, Sparkles, Info, AlertTriangle,
  CheckCircle2, CalendarCheck, CreditCard, Wrench, Star, PartyPopper,
  CalendarPlus, UserCheck, PlayCircle, XCircle, UserCog, KeyRound,
};

/** Resolve an icon: prefer the stored icon name, else fall back to the type icon. */
export function resolveIcon(iconName, type) {
  return ICON_COMPONENTS[iconName] || TYPE_META[type]?.icon || Bell;
}
