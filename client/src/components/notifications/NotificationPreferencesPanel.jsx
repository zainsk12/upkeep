// client/src/components/notifications/NotificationPreferencesPanel.jsx
//
// Notification preferences (Module 6). Lets a user toggle which in-app
// notification categories they receive, the arrival sound and in-app toasts, and
// previews the future delivery channels (push/email/sms/whatsapp) as disabled
// "coming soon" rows. Each change is saved immediately (optimistic) through
// NotificationsContext → PUT /api/notifications/preferences.

import {
  CalendarCheck, CreditCard, BadgePercent, Bell, UserCog,
  Volume2, MessageSquare, Smartphone, Mail, MessageCircle,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";

/* In-app category toggles — key matches server NOTIFICATION_CATEGORIES. */
const CATEGORY_ROWS = [
  { key: "bookings", icon: CalendarCheck, label: "Booking updates",  desc: "Confirmations, technician assignment, service status" },
  { key: "payments", icon: CreditCard,    label: "Payments",         desc: "Payment success and failure alerts" },
  { key: "offers",   icon: BadgePercent,  label: "Offers & promos",  desc: "Discounts and seasonal offers" },
  { key: "system",   icon: Bell,          label: "System",           desc: "Welcome and general app updates" },
  { key: "account",  icon: UserCog,       label: "Account & security", desc: "Profile changes and password activity" },
];

/* Future delivery channels — stored but not yet implemented (placeholders). */
const FUTURE_ROWS = [
  { key: "push",     icon: Smartphone,    label: "Push notifications" },
  { key: "email",    icon: Mail,          label: "Email notifications" },
  { key: "sms",      icon: MessageCircle, label: "SMS notifications" },
  { key: "whatsapp", icon: MessageSquare, label: "WhatsApp notifications" },
];

/* ─── Accessible toggle switch (mirrors the Appearance page switch) ────────── */
function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex items-center w-12 h-6 rounded-full flex-shrink-0
        transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        focus-visible:ring-offset-2 focus-visible:ring-offset-card
        ${disabled ? "bg-border/60 cursor-not-allowed" : checked ? "bg-primary cursor-pointer" : "bg-border cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow-sm
          transition-transform duration-300 ${checked ? "translate-x-6" : "translate-x-0"}`}
      />
    </button>
  );
}

/* ─── One settings row ─────────────────────────────────────────────────────── */
function PrefRow({ icon: Icon, label, desc, checked, onChange, disabled, badge }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/8">
          <Icon size={16} className="text-primary" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-text text-sm font-semibold truncate">{label}</p>
            {badge && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full
                bg-primary/10 text-primary flex-shrink-0">
                {badge}
              </span>
            )}
          </div>
          {desc && <p className="text-muted text-xs mt-0.5 truncate">{desc}</p>}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

/* ─── Section wrapper card ─────────────────────────────────────────────────── */
function Section({ title, subtitle, children }) {
  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div className="px-5 py-4 border-b border-border">
        <p className="text-text font-bold text-sm">{title}</p>
        {subtitle && <p className="text-muted text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export default function NotificationPreferencesPanel() {
  const { preferences, updatePreferences } = useNotifications();
  const cats = preferences.categories || {};
  const channels = preferences.channels || {};

  return (
    <div className="flex flex-col gap-6">
      {/* In-app categories */}
      <Section title="In-app notifications" subtitle="Choose which updates appear in your notification centre">
        {CATEGORY_ROWS.map(({ key, icon, label, desc }) => (
          <PrefRow
            key={key}
            icon={icon}
            label={label}
            desc={desc}
            checked={cats[key] !== false}
            onChange={(v) => updatePreferences({ categories: { [key]: v } })}
          />
        ))}
      </Section>

      {/* Delivery behaviour */}
      <Section title="Alerts" subtitle="How you're alerted when a new notification arrives">
        <PrefRow
          icon={MessageSquare}
          label="Desktop toasts"
          desc="Show a pop-up toast for new notifications"
          checked={preferences.toasts !== false}
          onChange={(v) => updatePreferences({ toasts: v })}
        />
        <PrefRow
          icon={Volume2}
          label="Notification sound"
          desc="Play a subtle chime on new notifications"
          checked={preferences.sound === true}
          onChange={(v) => updatePreferences({ sound: v })}
        />
      </Section>

      {/* Future channels — placeholders (disabled) */}
      <Section title="More channels" subtitle="Additional delivery options are coming soon">
        {FUTURE_ROWS.map(({ key, icon, label }) => (
          <PrefRow
            key={key}
            icon={icon}
            label={label}
            desc="Not available yet"
            badge="Soon"
            checked={channels[key]?.enabled === true}
            onChange={() => {}}
            disabled
          />
        ))}
      </Section>
    </div>
  );
}
