// client/src/pages/SettingsPage.jsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sun, Moon, User, Palette, BookOpen, ChevronRight, ChevronDown, KeyRound, Bell } from "lucide-react";
import { getTheme, setTheme } from "../utils/theme";
import NotificationPreferencesPanel from "../components/notifications/NotificationPreferencesPanel";

/* ─── Settings nav items ─────────────────────────────────────────────────── */
const SETTINGS_ITEMS = [
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    description: "Choose what you're notified about, sounds and toasts",
    to: "/settings/notifications",
  },
  {
    id: "appearance",
    icon: Palette,
    label: "Appearance",
    description: "Switch between light and dark theme",
    to: "/settings/appearance",
  },
  {
    id: "getting-started",
    icon: BookOpen,
    label: "Getting started with UpKeep",
    description: "Learn how to book and manage services",
    to: "/settings/getting-started",
  },
];

/* ─── FAQ data ───────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: "How do I book a service?",
    a: "Head over to the Services page and browse the available categories — plumbing, electrical, cleaning, and more. Select the service you need, choose a convenient date and time, and briefly describe the issue. Our team reviews your request and sends you a price quote before anything is confirmed.",
  },
  {
    q: "How are service prices decided?",
    a: "Prices are not fixed upfront — they are assessed after you submit your request. Our team evaluates the complexity of the job, materials likely required, and travel distance before quoting a fair price. You only proceed once you explicitly accept the quote, so there are no surprises.",
  },
  {
    q: "Can I reschedule or cancel a booking?",
    a: "Yes. From the My Bookings page you can request a reschedule or cancel a booking that has not yet been assigned to a technician. Once a technician is assigned and the appointment is confirmed, please contact our support team to make changes — we will do our best to accommodate you.",
  },
  {
    q: "What if I am not satisfied with the service?",
    a: "Your satisfaction is our priority. If the work does not meet your expectations, raise a complaint within 48 hours of job completion through the My Bookings page. We will arrange a revisit at no additional cost or issue a partial refund, depending on the nature of the issue.",
  },
  {
    q: "Are the technicians verified and trained?",
    a: "All UpKeep technicians go through a background verification process and practical skill assessment before they are onboarded. You can view the assigned technician's name and rating before they arrive at your doorstep, giving you confidence and transparency at every step.",
  },
  {
    q: "Is my personal information safe?",
    a: "We take data privacy seriously. Your name, phone number, and address are used solely to facilitate service delivery and are never shared with third parties for marketing purposes. All data is encrypted in transit and stored securely on our servers.",
  },
];

/* ─── FAQ Accordion ──────────────────────────────────────────────────────── */
function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(null);
  const toggle = (i) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <div className="flex flex-col divide-y divide-border">
      {FAQ_ITEMS.map(({ q, a }, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left
                hover:bg-primary/[0.03] transition-colors duration-150 group"
            >
              <span
                className={`text-sm font-semibold leading-snug transition-colors duration-150
                  ${isOpen ? "text-primary" : "text-text group-hover:text-primary"}`}
              >
                {q}
              </span>
              <ChevronDown
                size={16}
                strokeWidth={2.2}
                className={`flex-shrink-0 transition-all duration-300 ease-in-out
                  ${isOpen ? "rotate-180 text-primary" : "text-muted/50 group-hover:text-primary/50"}`}
              />
            </button>
            <div
              style={{
                maxHeight: isOpen ? "300px" : "0px",
                overflow: "hidden",
                transition: "max-height 0.3s ease-in-out",
              }}
            >
              <p className="px-5 pb-4 text-sm text-muted leading-relaxed">{a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Theme Toggle Switch ────────────────────────────────────────────────── */
function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      role="switch"
      aria-checked={isDark}
      onClick={onToggle}
      className={`relative inline-flex items-center w-12 h-6 rounded-full
        transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30
        ${isDark ? "bg-primary" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow-sm
          flex items-center justify-center
          transition-transform duration-300
          ${isDark ? "translate-x-6" : "translate-x-0"}`}
      >
        {isDark
          ? <Moon size={11} className="text-primary" strokeWidth={2.5} />
          : <Sun  size={11} className="text-amber-500" strokeWidth={2.5} />
        }
      </span>
    </button>
  );
}

/* ─── Appearance Panel ───────────────────────────────────────────────────── */
function AppearancePanel() {
  const [isDark, setIsDark] = useState(getTheme() === "dark");

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    setIsDark(!isDark);
  };

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-text font-bold text-sm">Theme</p>
        <p className="text-muted text-xs mt-0.5">
          Choose how UpKeep looks to you
        </p>
      </div>

      {/* Light option */}
      <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Preview swatch */}
          <div className="w-9 h-9 rounded-xl border border-border flex items-center
            justify-center bg-[#F3F6F8] flex-shrink-0">
            <Sun size={16} className="text-amber-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-text text-sm font-semibold">Light</p>
            <p className="text-muted text-xs mt-0.5">Cool off-white &amp; navy</p>
          </div>
        </div>
        <div
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all
            ${!isDark
              ? "border-primary bg-primary"
              : "border-border bg-transparent"
            }`}
        />
      </div>

      {/* Dark option */}
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Preview swatch */}
          <div className="w-9 h-9 rounded-xl border border-border flex items-center
            justify-center bg-[#081821] flex-shrink-0">
            <Moon size={16} className="text-[#3AA0C4]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-text text-sm font-semibold">Dark</p>
            <p className="text-muted text-xs mt-0.5">Midnight navy &amp; slate</p>
          </div>
        </div>
        <div
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all
            ${isDark
              ? "border-primary bg-primary"
              : "border-border bg-transparent"
            }`}
        />
      </div>

      {/* Toggle row */}
      <div className="px-5 py-4 border-t border-border
        flex items-center justify-between gap-4 bg-bg">
        <div>
          <p className="text-text text-sm font-semibold">
            {isDark ? "Dark mode is on" : "Light mode is on"}
          </p>
          <p className="text-muted text-xs mt-0.5">
            Your preference is saved automatically
          </p>
        </div>
        <ThemeToggle isDark={isDark} onToggle={handleToggle} />
      </div>
    </div>
  );
}

/* ─── Account Management Panel ───────────────────────────────────────────────
   A lightweight menu that links to the EXISTING flows — no duplicated logic:
     • Update Profile  → ProfilePage (PUT /api/auth/profile)
     • Change Password → ForgotPasswordPage (the same Firebase phone/email OTP
       + reset-password flow). The user's phone is carried via the shared
       `forgotPasswordIdentifier` sessionStorage key so it prefills.            */
function AccountPanel({ items }) {
  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {items.map(({ id, icon: Icon, label, description, onClick }) => (
        <button
          key={id}
          onClick={onClick}
          className="w-full flex items-center gap-4 px-5 py-4 text-left
            hover:bg-primary/[0.04] transition-all duration-150 group"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center
            flex-shrink-0 bg-primary/8 group-hover:bg-primary/14 transition-colors">
            <Icon size={17} className="text-primary" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text font-semibold text-sm">{label}</p>
            <p className="text-muted text-xs mt-0.5 truncate">{description}</p>
          </div>
          <ChevronRight
            size={15}
            className="text-muted/40 group-hover:text-primary flex-shrink-0 transition-colors"
          />
        </button>
      ))}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAppearance     = pathname === "/settings/appearance";
  const isGettingStarted = pathname === "/settings/getting-started";
  const isAccount        = pathname === "/settings/account";
  const isNotifications  = pathname === "/settings/notifications";
  const isRoot           = !isAppearance && !isGettingStarted && !isAccount && !isNotifications;

  let heading    = "Settings";
  let subheading = "Manage your app preferences and find help";
  if (isAppearance)     { heading = "Appearance";    subheading = "Switch between light and dark theme"; }
  if (isGettingStarted) { heading = "Help & FAQs";   subheading = "Everything you need to know about using UpKeep"; }
  if (isAccount)        { heading = "Account";        subheading = "Update your profile or change your password"; }
  if (isNotifications)  { heading = "Notifications";  subheading = "Control what you're notified about and how"; }

  // Account menu rows — both delegate to existing screens/flows (no new logic).
  const accountItems = [
    {
      id: "update-profile",
      icon: User,
      label: "Update Profile",
      description: "Edit your name, phone, and address",
      onClick: () => navigate("/profile"),
    },
    {
      id: "change-password",
      icon: KeyRound,
      label: "Change Password",
      description: "Verify via OTP, then set a new password",
      // Dedicated authenticated flow — reuses the same OTP/reset logic via the
      // shared usePasswordResetFlow hook (NOT a redirect to /forgot-password).
      onClick: () => navigate("/settings/change-password"),
    },
  ];

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Back navigation. Root Settings and the Account page (reached from the
            avatar dropdown) return Home; the other sub-pages return to the
            Settings list. */}
        <button
          onClick={() => navigate(isRoot || isAccount ? "/" : "/settings")}
          className="flex items-center gap-1.5 text-primary/60 hover:text-primary
            text-sm font-medium mb-2 transition-colors group w-fit"
        >
          <ChevronRight
            size={14}
            strokeWidth={2.2}
            className="rotate-180 group-hover:-translate-x-0.5 transition-transform"
          />
          {isRoot || isAccount ? "Back to Home" : "Back to Settings"}
        </button>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-text leading-tight font-sans">
            {heading}
          </h1>
          <p className="text-muted text-sm mt-1">{subheading}</p>
        </div>

        {/* ── Root settings list ── */}
        {isRoot && (
          <div
            className="bg-card rounded-2xl border border-border
              overflow-hidden divide-y divide-border"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
          >
            {SETTINGS_ITEMS.map(({ id, icon: Icon, label, description, to }) => (
              <button
                key={id}
                onClick={() => navigate(to)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left
                  hover:bg-primary/[0.04] transition-all duration-150 group"
              >
                {/* Icon box */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center
                  flex-shrink-0 bg-primary/8 group-hover:bg-primary/14 transition-colors">
                  <Icon size={17} className="text-primary" strokeWidth={1.8} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-text font-semibold text-sm">{label}</p>
                  <p className="text-muted text-xs mt-0.5 truncate">{description}</p>
                </div>

                {/* Trailing chevron */}
                <ChevronRight
                  size={15}
                  className="text-muted/40 group-hover:text-primary flex-shrink-0
                    transition-colors"
                />
              </button>
            ))}
          </div>
        )}

        {/* ── Account management panel ── */}
        {isAccount && <AccountPanel items={accountItems} />}

        {/* ── Notification preferences panel ── */}
        {isNotifications && <NotificationPreferencesPanel />}

        {/* ── Appearance panel ── */}
        {isAppearance && <AppearancePanel />}

        {/* ── Getting started / FAQ panel ── */}
        {isGettingStarted && (
          <div
            className="bg-card rounded-2xl border border-border overflow-hidden"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="px-5 py-4 border-b border-border">
              <p className="text-text font-bold text-sm">Frequently Asked Questions</p>
              <p className="text-muted text-xs mt-0.5">Tap a question to expand the answer</p>
            </div>
            <FaqAccordion />
          </div>
        )}

      </div>
    </div>
  );
}