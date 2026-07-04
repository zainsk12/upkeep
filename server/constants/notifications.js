// server/constants/notifications.js
//
// Shared notification taxonomy — the single source of truth for notification
// types, categories, priorities and the per-type default metadata used when
// generating notifications. Imported by the Notification model (for enums) and
// the notification service (for the catalog). Keeping it standalone avoids a
// circular require between the model and the service.
//
// NOTE: `icon` is a lucide-react icon *name* stored for records/future use. The
// Module 1 frontend maps its own icon + colour by `type`, so it does not depend
// on this value — the backend only needs to send a `type`/`category` the
// frontend already understands.

const NOTIFICATION_CATEGORIES = ["bookings", "payments", "offers", "system", "account"];
const NOTIFICATION_PRIORITIES = ["low", "normal", "high"];

// type → { category, icon, priority }
const NOTIFICATION_CATALOG = {
  booking_created:     { category: "bookings", icon: "CalendarPlus",  priority: "normal" },
  booking_confirmed:   { category: "bookings", icon: "CalendarCheck", priority: "normal" },
  quote_rejected:      { category: "bookings", icon: "XCircle",       priority: "high"   },
  revision_requested:  { category: "bookings", icon: "FileEdit",      priority: "high"   },
  quote_revised:       { category: "bookings", icon: "FileText",      priority: "high"   },
  request_closed:      { category: "bookings", icon: "Archive",       priority: "normal" },
  technician_assigned: { category: "bookings", icon: "UserCheck",     priority: "normal" },
  service_started:     { category: "bookings", icon: "Wrench",        priority: "normal" },
  service_completed:   { category: "bookings", icon: "CheckCircle2",  priority: "normal" },
  payment_successful:  { category: "payments", icon: "CreditCard",    priority: "normal" },
  payment_failed:      { category: "payments", icon: "XCircle",       priority: "high"   },
  special_offer:       { category: "offers",   icon: "BadgePercent",  priority: "low"    },
  profile_updated:     { category: "account",  icon: "UserCog",       priority: "low"    },
  password_changed:    { category: "account",  icon: "KeyRound",      priority: "high"   },
  welcome:             { category: "system",   icon: "PartyPopper",   priority: "normal" },
};

const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_CATALOG);

module.exports = {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CATALOG,
  NOTIFICATION_TYPES,
};
