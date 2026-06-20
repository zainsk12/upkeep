// client/src/pages/ServicesPage.jsx
//
// MODULE 2 — SMART BOOKING & SCHEDULING VALIDATION
// TIME_SLOTS are fetched from the backend (single source of truth).
// No hardcoded TIME_SLOTS array. No dependency on constants/services.js
// for service rendering — all services come from the DB.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../utils/toast";
import {
  X, CalendarDays, Clock, MapPin, FileText, ArrowRight,
  CheckCircle2, Phone, AlertCircle, ShieldCheck, AlertTriangle,
  Clock4, Wrench,
  Zap, Droplets, Sparkles, Hammer, Wind, Paintbrush2, Bug,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createBooking } from "../services/bookingApi";
import { getPublicServices, getTimeSlots } from "../services/adminApi";
import {
  getLocalDateString,
  isPastDate,
  isToday,
  getAvailableSlots,
  allSlotsDisabled,
} from "../utils/bookingValidation";

// ─── Scalable icon/style palette for dynamic services ────────────────────────
// Maps known service names to icons; unknown services cycle through palette.
const KNOWN_ICONS = {
  "Electrical":  { icon: Zap,        color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-100 dark:border-amber-800/40" },
  "Plumbing":    { icon: Droplets,   color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/20",     border: "border-blue-100 dark:border-blue-800/40" },
  "Cleaning":    { icon: Sparkles,   color: "text-emerald-500",bg: "bg-emerald-50 dark:bg-emerald-900/20",border: "border-emerald-100 dark:border-emerald-800/40" },
  "Carpentry":   { icon: Hammer,     color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-100 dark:border-orange-800/40" },
  "AC Service":  { icon: Wind,       color: "text-sky-500",    bg: "bg-sky-50 dark:bg-sky-900/20",       border: "border-sky-100 dark:border-sky-800/40" },
  "Painting":    { icon: Paintbrush2,color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-100 dark:border-violet-800/40" },
  "Pest Control":{ icon: Bug,        color: "text-lime-600",   bg: "bg-lime-50 dark:bg-lime-900/20",     border: "border-lime-100 dark:border-lime-800/40" },
};

const FALLBACK_PALETTE = [
  { color: "text-primary",     bg: "bg-primary/10",         border: "border-primary/20" },
  { color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-900/20",   border: "border-rose-100 dark:border-rose-800/40" },
  { color: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-900/20",   border: "border-teal-100 dark:border-teal-800/40" },
  { color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-900/20",border: "border-indigo-100 dark:border-indigo-800/40" },
  { color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-900/20",   border: "border-pink-100 dark:border-pink-800/40" },
  { color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-900/20",   border: "border-cyan-100 dark:border-cyan-800/40" },
];

function getServiceMeta(name = "") {
  if (KNOWN_ICONS[name]) {
    return { icon: KNOWN_ICONS[name].icon, ...KNOWN_ICONS[name] };
  }
  // Deterministic palette assignment for unknown services
  const idx = (name.charCodeAt(0) || 0) % FALLBACK_PALETTE.length;
  const palette = FALLBACK_PALETTE[idx];
  return { icon: Wrench, ...palette };
}

function FieldLabel({ icon: Icon, label, required }) {
  return (
    <label className="flex items-center gap-2 text-text text-sm font-semibold">
      <Icon size={14} className="text-primary" strokeWidth={2} />
      {label}
      {required && <span className="text-primary text-xs font-normal ml-0.5">*</span>}
    </label>
  );
}

/* ─── Booking modal ───────────────────────────────────────────────────────── */
function BookingModal({ service, timeSlots, onClose }) {
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const registeredPhone  = user?.phone || "";

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  // Prefill the service address from the user's saved profile address (editable).
  // This is a per-booking copy only — edits here are stored on the booking record
  // and never written back to the user's profile (see booking flow).
  const [form, setForm] = useState(() => ({
    date: "", time: "", address: user?.address || "", serviceIssue: "", notes: "",
  }));
  const [useAltPhone, setUseAltPhone]     = useState(false);
  const [altPhone, setAltPhone]           = useState("");
  const [altPhoneError, setAltPhoneError] = useState("");
  const [loading, setLoading]             = useState(false);

  const today = getLocalDateString(now);
  const enrichedSlots = getAvailableSlots(timeSlots, form.date, now);
  const noSlotsLeft   = form.date && allSlotsDisabled(timeSlots, form.date, now);

  useEffect(() => {
    if (!form.time || !form.date) return;
    const match = enrichedSlots.find((s) => s.slot === form.time);
    if (match?.disabled) setForm((f) => ({ ...f, time: "" }));
  }, [now, form.date]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = useCallback((e) => {
    const newDate = e.target.value;
    setForm((f) => {
      const stillValid =
        f.time &&
        !getAvailableSlots(timeSlots, newDate, now).find(
          (s) => s.slot === f.time
        )?.disabled;
      return { ...f, date: newDate, time: stillValid ? f.time : "" };
    });
  }, [now, timeSlots]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validateAltPhone = (val) => {
    if (useAltPhone && val && !/^\d{10}$/.test(val)) {
      setAltPhoneError("Must be a 10-digit number.");
      return false;
    }
    setAltPhoneError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) { toast.error("Please select a booking date."); return; }
    if (isPastDate(form.date)) { toast.error("Past dates cannot be selected."); return; }
    if (!form.time) { toast.error("Please select a time slot."); return; }
    const chosenSlot = enrichedSlots.find((s) => s.slot === form.time);
    if (chosenSlot?.disabled) {
      toast.error(chosenSlot.reason || "This time slot is no longer available.");
      setForm((f) => ({ ...f, time: "" }));
      return;
    }
    if (!form.address.trim()) { toast.error("Please fill in all required fields."); return; }
    if (!form.serviceIssue.trim()) { toast.error("Please describe the service issue or requirement."); return; }
    if (useAltPhone && !validateAltPhone(altPhone)) return;

    const contactPhone = useAltPhone && altPhone.trim() ? altPhone.trim() : registeredPhone;

    setLoading(true);
    try {
      await createBooking({
        service:      service.name,
        date:         form.date,
        time:         form.time,
        address:      form.address.trim(),
        serviceIssue: form.serviceIssue.trim(),
        phone:        contactPhone,
        notes:        form.notes.trim(),
      });
      toast.success(`Booking request sent! We'll review and send you a price estimate soon. 📋`);
      onClose();
      navigate("/my-bookings");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 rounded-xl border text-sm text-text
    focus:outline-none focus:ring-2 transition-all bg-bg hover:bg-card
    placeholder:text-muted
    ${hasError
      ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/20"
      : "border-border focus:ring-primary/20 focus:border-primary/50"
    }`;

  const { icon: Icon, bg, color } = service.meta;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(11,29,58,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl
        overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col"
        style={{ boxShadow: "0 24px 64px rgba(8,53,74,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}>

        {/* Header */}
        <div className="bg-primary dark:bg-primary-dark px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={color} strokeWidth={2} />
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Book Service</p>
              <h2 className="text-white font-bold text-base sm:text-lg leading-tight">{service.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20
            flex items-center justify-center transition-colors flex-shrink-0" aria-label="Close">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Workflow note */}
        <div className="px-5 sm:px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/40">
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle size={12} className="flex-shrink-0" />
            After booking, our team will review your request and send you a price estimate for approval.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 space-y-4">

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel icon={CalendarDays} label="Date" required />
              <input
                type="date"
                min={today}
                value={form.date}
                onChange={handleDateChange}
                className={inputCls(false)}
                required
              />
              {form.date && isPastDate(form.date) && (
                <p className="text-red-500 text-xs flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} className="flex-shrink-0" />
                  Past dates cannot be selected
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <FieldLabel icon={Clock} label="Time" required />
              <select
                value={form.time}
                onChange={set("time")}
                className={`${inputCls(false)} cursor-pointer`}
                required
              >
                <option value="">Select</option>
                {enrichedSlots.map(({ slot, disabled, reason }) => (
                  <option
                    key={slot}
                    value={slot}
                    disabled={disabled}
                    title={disabled ? reason : undefined}
                    style={disabled ? { color: "var(--color-muted, #9ca3af)" } : undefined}
                  >
                    {slot}{disabled ? " (unavailable)" : ""}
                  </option>
                ))}
              </select>

              {noSlotsLeft && (
                <p className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1 mt-0.5">
                  <Clock4 size={11} className="flex-shrink-0" />
                  No more slots available today. Please choose another date.
                </p>
              )}
              {!noSlotsLeft && form.time && isToday(form.date) && (
                <p className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={11} className="flex-shrink-0" />
                  Slot available for today
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <FieldLabel icon={MapPin} label="Service Address" required />
            <input
              type="text"
              value={form.address}
              onChange={set("address")}
              placeholder="House no., street, area, Nashik"
              className={inputCls(false)}
              required
            />
          </div>

          {/* Service issue */}
          <div className="space-y-1.5">
            <FieldLabel icon={AlertCircle} label="Describe the Issue / Requirement" required />
            <textarea
              value={form.serviceIssue}
              onChange={set("serviceIssue")}
              rows={3}
              placeholder={`e.g. "Fan not working", "AC making noise", "Need 2 rooms painted"`}
              className={`${inputCls(false)} resize-none`}
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <FieldLabel icon={Phone} label="Contact Number" />
            <div className="relative">
              <input
                type="text"
                value={registeredPhone || "Not available"}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm bg-bg text-muted cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">registered</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useAltPhone}
                onChange={(e) => {
                  setUseAltPhone(e.target.checked);
                  if (!e.target.checked) { setAltPhone(""); setAltPhoneError(""); }
                }}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-text text-sm">Use a different contact number</span>
            </label>
            {useAltPhone && (
              <div>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => { setAltPhone(e.target.value); validateAltPhone(e.target.value); }}
                  placeholder="Enter alternate 10-digit number"
                  maxLength={10}
                  className={inputCls(!!altPhoneError)}
                />
                {altPhoneError && <p className="text-red-500 text-xs mt-1">{altPhoneError}</p>}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-text">
              <FileText size={14} className="text-primary" strokeWidth={2} />
              Additional Notes
              <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Any other instructions for the technician…"
              className={`${inputCls(false)} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-muted
              hover:bg-bg text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || noSlotsLeft}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-primary hover:bg-primary-hover text-white text-sm font-bold
                transition-all hover:-translate-y-0.5 shadow-md shadow-primary/30
                disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Send Request <ArrowRight size={15} strokeWidth={2.5} /></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Service card ─────────────────────────────────────────────────────────── */
function ServiceCard({ service, onBook }) {
  const { icon: Icon, bg, color, border } = service.meta;
  const disabled = !service.isEnabled;
  const reason   = service.disabledReason;
  const description = service.description || "";

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden flex flex-col gap-0
         transition-all duration-300 group
         ${disabled ? "border-border opacity-60" : "border-border hover:shadow-xl hover:shadow-primary/[0.12] hover:-translate-y-1.5 hover:border-primary/15"}`}
      style={{ boxShadow: disabled ? "none" : "0 2px 12px rgba(8,53,74,0.06)" }}>

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className={`w-12 h-12 rounded-2xl ${bg} ${border} border
          flex items-center justify-center ${disabled ? "" : "group-hover:scale-105"} transition-transform duration-300`}>
          <Icon size={22} className={disabled ? "text-muted" : color} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-base mb-1.5 leading-snug ${disabled ? "text-muted" : "text-text"}`}>
            {service.name}
          </h3>
          <p className="text-muted text-sm leading-relaxed">{description}</p>
        </div>
      </div>

      {disabled ? (
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold">Currently Unavailable</p>
            {reason && <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">{reason}</p>}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          <button
            onClick={() => onBook(service)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
              bg-primary hover:bg-primary-hover text-white text-sm font-semibold
              transition-all hover:-translate-y-0.5 shadow-sm shadow-primary/20
              group-hover:shadow-md group-hover:shadow-primary/25">
            Book Now
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function ServicesPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeService, setActiveService] = useState(null);
  const [services, setServices]           = useState([]);
  const [timeSlots, setTimeSlots]         = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    Promise.allSettled([getPublicServices(), getTimeSlots()])
      .then(([svcResult, slotsResult]) => {
        if (svcResult.status === "fulfilled") {
          setServices(svcResult.value.data.services || []);
        }
        if (slotsResult.status === "fulfilled") {
          setTimeSlots(slotsResult.value.data.timeSlots || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Build enriched service list: attach icon/style meta to each DB service
  const enrichedServices = services
    .filter((s) => s.isEnabled !== false || true) // show all (disabled shown as unavailable)
    .map((dbSvc) => ({
      ...dbSvc,
      meta: getServiceMeta(dbSvc.name),
    }));

  const handleBook = (service) => {
    if (!isAuthenticated) {
      toast.error("Please log in to book a service.");
      navigate("/login", { state: { from: { pathname: "/services" } } });
      return;
    }
    setActiveService(service);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero banner */}
      <div className="bg-primary dark:bg-primary-dark text-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12 md:py-16">
          <p className="text-blush text-xs font-semibold uppercase tracking-widest mb-3">What we offer</p>
          <h1 className="landing-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">Our Services</h1>
          <p className="text-white/65 text-sm md:text-base max-w-md leading-relaxed">
            Vetted professionals, transparent pricing, and on-time service — all booked in under a minute.
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10 md:py-14">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-bg mb-4" />
                <div className="h-4 bg-bg rounded w-1/2 mb-2" />
                <div className="h-3 bg-bg rounded w-full mb-1" />
                <div className="h-3 bg-bg rounded w-4/5 mb-6" />
                <div className="h-11 bg-bg rounded-xl" />
              </div>
            ))}
          </div>
        ) : enrichedServices.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <Wrench size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-base font-medium">No services available right now.</p>
            <p className="text-sm mt-1">Please check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {enrichedServices.map((svc) => (
              <ServiceCard
                key={svc._id || svc.name}
                service={svc}
                onBook={handleBook}
              />
            ))}
          </div>
        )}

        <div className="mt-10 md:mt-12 flex items-center justify-center gap-2 text-muted text-sm">
          <ShieldCheck size={15} className="text-emerald-500 flex-shrink-0" />
          All professionals are background-verified and certified.
        </div>
      </div>

      {activeService && (
        <BookingModal
          service={activeService}
          timeSlots={timeSlots}
          onClose={() => setActiveService(null)}
        />
      )}
    </div>
  );
}