// client/src/pages/MyBookingsPage.jsx

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, Clock, MapPin, FileText,
  Hammer, RefreshCw, PackageOpen, ArrowRight,
  Phone, AlertCircle, Star, X, MessageSquare, CheckCircle2,
  IndianRupee, UserCheck, ThumbsDown, Info,
  ShieldCheck, CalendarClock, XCircle, FileEdit, Archive,
  History, ChevronDown, CalendarX, AlertTriangle, CreditCard,
  Zap, Droplets, Sparkles, Wind, Paintbrush2, Bug, Wrench,
} from "lucide-react";
import { toast } from "../utils/toast";
import {
  getMyBookings,
  confirmBooking,
  rejectBooking,
  requestQuoteRevision,
  closeBookingRequest,
  getCancellationPreview,
  payCancellationFee,
  cancelBooking,
} from "../services/bookingApi";
import { executeRecaptcha } from "../services/recaptcha";
import RescheduleModal from "../components/RescheduleModal";
import { submitReview, fetchMyReviewedBookingIds } from "../services/reviewApi";
import BookingSectionAccordion from "../components/BookingSectionAccordion";
import { formatDate } from "../utils/helpers";

/* ─── Scalable dynamic service icon/style resolver ── */
const _KNOWN_SERVICE_ICONS = {
  "Electrical":   { icon: Zap,         color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20"    },
  "Plumbing":     { icon: Droplets,    color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20"      },
  "Cleaning":     { icon: Sparkles,    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  "Carpentry":    { icon: Hammer,      color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20"  },
  "AC Service":   { icon: Wind,        color: "text-sky-500",     bg: "bg-sky-50 dark:bg-sky-900/20"        },
  "Painting":     { icon: Paintbrush2, color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-900/20"  },
  "Pest Control": { icon: Bug,         color: "text-lime-600",    bg: "bg-lime-50 dark:bg-lime-900/20"      },
};
const _FALLBACK_PALETTE = [
  { icon: Wrench,   color: "text-primary",    bg: "bg-primary/10"                          },
  { icon: Zap,      color: "text-rose-500",   bg: "bg-rose-50 dark:bg-rose-900/20"         },
  { icon: Hammer,   color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-900/20"         },
  { icon: Sparkles, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20"     },
  { icon: Droplets, color: "text-pink-500",   bg: "bg-pink-50 dark:bg-pink-900/20"         },
  { icon: Wind,     color: "text-cyan-500",   bg: "bg-cyan-50 dark:bg-cyan-900/20"         },
];
function getServiceMeta(name = "") {
  if (_KNOWN_SERVICE_ICONS[name]) return _KNOWN_SERVICE_ICONS[name];
  const idx = (name.charCodeAt(0) || 0) % _FALLBACK_PALETTE.length;
  return _FALLBACK_PALETTE[idx];
}

/* ─── Status config ── */
const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    classes: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
    dot: "bg-amber-400",
    accent: "text-amber-600",
    info: "Your request is being reviewed by our team.",
  },
  awaiting_user_confirmation: {
    label: "Quote Ready",
    classes: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/40",
    dot: "bg-purple-500",
    accent: "text-purple-600",
    info: "We've sent you a price estimate. Please accept or reject.",
  },
  confirmed: {
    label: "Confirmed",
    classes: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40",
    dot: "bg-blue-500",
    accent: "text-blue-600",
    info: "Your booking is confirmed. A worker will be assigned shortly.",
  },
  completed: {
    label: "Completed",
    classes: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40",
    dot: "bg-emerald-500",
    accent: "text-emerald-600",
    info: "Service completed. We hope you're happy with the work!",
  },
  quote_rejected: {
    label: "Quote Rejected",
    classes: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40",
    dot: "bg-rose-500",
    accent: "text-rose-600",
    info: "You rejected this quotation. Request a revised quote or close the request below.",
  },
  revision_requested: {
    label: "Revision Requested",
    classes: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800/40",
    dot: "bg-sky-500",
    accent: "text-sky-600",
    info: "We're preparing a revised quotation for you. You'll be notified when it's ready.",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40",
    dot: "bg-red-400",
    accent: "text-red-500",
    info: "This booking has been cancelled.",
  },
  closed: {
    label: "Closed",
    classes: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/50",
    dot: "bg-slate-400",
    accent: "text-slate-500",
    info: "You closed this request. You can book a new service anytime.",
  },
};

/* Statuses that belong to the "Active Bookings" primary area */
const ACTIVE_STATUSES = [
  "awaiting_user_confirmation", "quote_rejected", "revision_requested", "pending", "confirmed",
];

/* The collapsible archive sections */
const ARCHIVE_SECTIONS = [
  { key: "completed", label: "Completed", dot: "bg-emerald-500", accent: "text-emerald-600", emptyMessage: "No completed bookings yet" },
  { key: "cancelled", label: "Cancelled", dot: "bg-red-400",     accent: "text-red-500",     emptyMessage: "No cancelled bookings" },
  { key: "closed",    label: "Closed",    dot: "bg-slate-400",   accent: "text-slate-500",   emptyMessage: "No closed requests" },
];

/* Rejection reasons — must mirror server/constants/quoteWorkflow.js */
const REJECTION_REASONS = [
  "Too expensive",
  "Found another provider",
  "Scope of work is incorrect",
  "Service no longer required",
  "Need a revised quotation",
  "Other",
];

/* NOTE: which bookings may be cancelled / rescheduled is decided by the
   server — every booking payload carries `canCancel` / `canReschedule` flags
   (Booking model virtuals), and cancellation reasons come from the preview
   endpoint. Nothing workflow-related is mirrored here. */

const SUPPORT_EMAIL = "upkeep.austrum@gmail.com";



/* ─── Status badge ── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─── Star rating input ── */
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            size={30}
            className={
              star <= (hovered || value)
                ? "text-amber-400 fill-amber-400"
                : "text-border fill-border"
            }
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

/* ─── Review modal ── */
function ReviewModal({ booking, onClose, onSuccess }) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0)               { toast.error("Please select a star rating.");             return; }
    if (comment.trim().length < 10) { toast.error("Comment must be at least 10 characters."); return; }
    setLoading(true);
    try {
      await submitReview({ bookingId: booking._id, rating, comment: comment.trim() });
      toast.success("Review submitted! Thank you 🙏");
      onSuccess(booking._id);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(11,29,58,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(8,53,74,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
      >
        <div className="bg-primary dark:bg-primary-dark px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Rate your experience</p>
            <h2 className="text-white font-bold text-base sm:text-lg leading-tight">{booking.service}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Star size={13} className="text-primary" />
              Your Rating <span className="text-red-400">*</span>
            </label>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-xs text-amber-600 font-medium">{RATING_LABELS[rating]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text flex items-center gap-1.5">
              <MessageSquare size={13} className="text-primary" />
              Your Review <span className="text-red-400">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Share your experience… (min. 10 characters)"
              className="w-full px-4 py-3 rounded-xl border border-border text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
                transition-all bg-bg hover:bg-card placeholder:text-muted text-text"
            />
            <p className={`text-xs ${comment.trim().length < 10 && comment.length > 0 ? "text-red-400" : "text-muted"}`}>
              {comment.trim().length} / 10 characters minimum
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-primary hover:bg-primary-hover text-white text-sm font-bold
                transition-all hover:-translate-y-0.5 shadow-md shadow-primary/30
                disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : "Submit Review"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Quotation breakdown (reusable) ── */
function QuotationBreakdown({ quotation, fallbackPrice, compact = false }) {
  if (quotation && quotation.labour > 0) {
    const rows = [
      { label: "Labour",          value: quotation.labour },
      { label: "Materials",       value: quotation.materials },
      { label: "Travel",          value: quotation.travel },
      { label: "Inspection",      value: quotation.inspection },
      { label: "Convenience Fee", value: quotation.convenience_fee },
      { label: "Tax",             value: quotation.tax },
    ].filter((r) => r.value > 0);

    return (
      <div className="w-full text-xs">
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between">
              <span className="text-muted">{r.label}</span>
              <span className="text-text font-medium">₹{r.value.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-current/20 flex justify-between items-center">
          <span className="font-bold text-sm text-text">Total</span>
          <span className="font-bold text-base text-text">₹{quotation.total.toLocaleString("en-IN")}</span>
        </div>
        {!compact && quotation.notes && (
          <p className="mt-2 text-muted italic">{quotation.notes}</p>
        )}
      </div>
    );
  }

  if (fallbackPrice != null) {
    return (
      <p className="text-3xl font-bold text-text">
        ₹{fallbackPrice.toLocaleString("en-IN")}
      </p>
    );
  }

  return null;
}

/* ─── Quotation disclaimer ── */
function QuotationDisclaimer() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/15
      border border-amber-200 dark:border-amber-700/40 px-3.5 py-3">
      <Info size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <span className="font-semibold">Note:</span>{" "}
        This estimate is based on the issue described. Final pricing may vary after
        on-site inspection if additional work is required.
      </p>
    </div>
  );
}

/* ─── Shared workflow-modal building blocks ──
   The Reject Quote and Cancel Booking modals share the same shell, header and
   reason-picker markup — defined once here, styled per workflow via accent. */

/* Overlay + card. Click-outside closes unless a request is in flight. */
function WorkflowModalShell({ onClose, busy, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(11,29,58,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ boxShadow: "0 24px 64px rgba(8,53,74,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
      >
        {children}
      </div>
    </div>
  );
}

/* Primary-coloured header bar with tagline, title and close button. */
function WorkflowModalHeader({ tagline, title, onClose, disabled }) {
  return (
    <div className="bg-primary dark:bg-primary-dark px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-shrink-0">
      <div>
        <p className="text-white/60 text-xs font-medium uppercase tracking-widest">{tagline}</p>
        <h2 className="text-white font-bold text-base sm:text-lg leading-tight">{title}</h2>
      </div>
      <button
        onClick={onClose}
        disabled={disabled}
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
        aria-label="Close"
      >
        <X size={16} className="text-white" />
      </button>
    </div>
  );
}

/* Full literal class strings per accent — Tailwind JIT cannot see dynamically
   assembled class names, so these must never be templated. */
const REASON_ACCENTS = {
  rose: {
    selected: "border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 font-semibold",
    idle:     "border-border text-text hover:border-rose-200 hover:bg-bg",
    dot:      "border-rose-500",
    dotFill:  "bg-rose-500",
    focus:    "focus:ring-rose-500/20 focus:border-rose-400/60",
  },
  red: {
    selected: "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-semibold",
    idle:     "border-border text-text hover:border-red-200 hover:bg-bg",
    dot:      "border-red-500",
    dotFill:  "bg-red-500",
    focus:    "focus:ring-red-500/20 focus:border-red-400/60",
  },
};

/* Radio-style reason list + conditional "Tell us more" textarea (reason
   "Other"). Purely controlled — validation stays in the owning modal. */
function ReasonPicker({ label, reasons, value, onSelect, comment, onCommentChange, accent }) {
  const a = REASON_ACCENTS[accent];
  return (
    <>
      <label className="text-sm font-semibold text-text flex items-center gap-1.5 -mb-1">
        <MessageSquare size={13} className="text-primary" />
        {label} <span className="text-red-400">*</span>
      </label>
      <div className="flex flex-col gap-2">
        {reasons.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onSelect(r)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all
              ${value === r ? a.selected : a.idle}`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
              ${value === r ? a.dot : "border-border"}`}
            >
              {value === r && <span className={`w-2 h-2 rounded-full ${a.dotFill}`} />}
            </span>
            {r}
          </button>
        ))}
      </div>
      {value === "Other" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-text">
            Tell us more <span className="text-red-400">*</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Please describe your reason…"
            className={`w-full px-4 py-3 rounded-xl border border-border text-sm resize-none
              focus:outline-none focus:ring-2 ${a.focus}
              transition-all bg-bg hover:bg-card placeholder:text-muted text-text`}
            autoFocus
          />
        </div>
      )}
    </>
  );
}

/* ─── Reject quote modal (two-step: confirm → reason) ── */
function RejectQuoteModal({ booking, onClose, onSubmit, loading }) {
  const [step,    setStep]    = useState(1);
  const [reason,  setReason]  = useState("");
  const [comment, setComment] = useState("");

  const needsComment = reason === "Other";
  // The submit button is disabled until this holds, so no further validation
  // is needed at submit time (the server re-validates regardless).
  const canSubmit    = !!reason && (!needsComment || comment.trim().length > 0);

  return (
    <WorkflowModalShell onClose={onClose} busy={loading}>
        {step === 1 ? (
          /* ── Step 1: confirmation ── */
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800/40 flex items-center justify-center mb-4">
              <ThumbsDown size={24} className="text-rose-500" />
            </div>
            <h2 className="text-text font-bold text-lg text-center leading-tight">
              Reject Quotation?
            </h2>
            <p className="text-muted text-sm text-center mt-2 leading-relaxed">
              Are you sure you want to reject this quotation? This quotation will
              no longer be valid unless a revised quotation is requested.
            </p>
            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl
                  bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold
                  transition-all shadow-md shadow-rose-600/25"
              >
                <ThumbsDown size={14} />
                Reject Quote
              </button>
            </div>
          </div>
        ) : (
          /* ── Step 2: rejection reason ── */
          <>
            <WorkflowModalHeader
              tagline="Reject quotation"
              title={booking.service}
              onClose={onClose}
              disabled={loading}
            />
            <div className="p-5 sm:p-6 flex flex-col gap-4 overflow-y-auto">
              <ReasonPicker
                label="Why are you rejecting this quote?"
                reasons={REJECTION_REASONS}
                value={reason}
                onSelect={setReason}
                comment={comment}
                onCommentChange={setComment}
                accent="rose"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onSubmit(booking, reason, comment.trim())}
                  disabled={loading || !canSubmit}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold
                    transition-all shadow-md shadow-rose-600/25
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><ThumbsDown size={14} /> Reject Quote</>
                  }
                </button>
              </div>
            </div>
          </>
        )}
    </WorkflowModalShell>
  );
}

/* ─── Close request confirmation modal ── */
function CloseRequestModal({ booking, onClose, onConfirm, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(11,29,58,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px rgba(8,53,74,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
      >
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
            <Archive size={24} className="text-slate-500" />
          </div>
          <h2 className="text-text font-bold text-lg text-center leading-tight">
            Close Request?
          </h2>
          <p className="text-muted text-sm text-center mt-2 leading-relaxed">
            This will permanently close your{" "}
            <span className="font-semibold text-text">{booking.service}</span>{" "}
            request. You won't receive any further quotations for it, and this
            cannot be undone.
          </p>
          <div className="flex gap-3 w-full mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(booking)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl
                bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500
                text-white text-sm font-bold transition-all shadow-md shadow-slate-700/25
                disabled:opacity-60"
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Archive size={14} /> Close Request</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Cancel booking modal (window-aware, multi-step) ──
   Steps: confirm (window-specific warning) → reason → pay (charge window only).
   The window/fee shown come from the server preview endpoint; the final cancel
   call re-validates everything server-side. */
function CancelBookingModal({ booking, onClose, onCancelled }) {
  const [preview,    setPreview]    = useState(null);   // server cancellation context
  const [loadError,  setLoadError]  = useState(null);
  const [step,       setStep]       = useState("confirm"); // confirm | reason | pay
  const [reason,     setReason]     = useState("");
  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPreview = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await getCancellationPreview(booking._id);
      setPreview(res.data);
    } catch (err) {
      setLoadError(err?.response?.data?.message || "Failed to load cancellation details.");
    }
  }, [booking._id]);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const reasons      = preview?.reasons || [];
  const needsComment = reason === "Other";
  const canSubmitReason = !!reason && (!needsComment || comment.trim().length > 0);
  // Inside the charge window (drives the fee warning UI)…
  const feeApplies = preview?.allowed && preview.window === "fee_required" && preview.fee > 0;
  // …but the payment step only runs when the server says payment is required
  // (requirePaymentBeforeCancellation may waive it).
  const needsPaymentStep = feeApplies && preview.requiresPayment !== false;

  // No-fee path: reason step submits the cancellation directly.
  const handleCancelNoFee = async () => {
    setSubmitting(true);
    try {
      const res = await cancelBooking(booking._id, { reason, comment: comment.trim() });
      toast.success(res.data.message || "Booking cancelled.");
      onCancelled(res.data.booking);
    } catch (err) {
      if (err?.response?.status === 402) {
        // The booking slipped into the charge window while the modal was open —
        // update the fee from the server response and route through payment.
        setPreview((p) => ({
          ...p,
          window: "fee_required",
          fee: err.response.data.fee,
          requiresPayment: true,
        }));
        setStep("pay");
        toast.error("A cancellation fee now applies — please review before continuing.");
      } else {
        toast.error(err?.response?.data?.message || "Failed to cancel the booking.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Charge-window path: collect the fee, then finalise the cancellation.
  // If payment fails the booking stays active and nothing else happens.
  const handlePayAndCancel = async () => {
    setSubmitting(true);
    let paymentId = null;
    try {
      const payRes = await payCancellationFee(booking._id);
      paymentId = payRes.data.payment.id;
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        "Payment failed. Your booking has not been cancelled."
      );
      setSubmitting(false);
      return;
    }
    try {
      const res = await cancelBooking(booking._id, {
        reason, comment: comment.trim(), paymentId,
      });
      toast.success(res.data.message || "Booking cancelled.");
      onCancelled(res.data.booking);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
        "Something went wrong after payment. Please contact support."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Shared shell ── */
  return (
    <WorkflowModalShell onClose={onClose} busy={submitting}>
        {/* ── Loading / load-error / blocked states ── */}
        {!preview && !loadError && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
            <span className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted text-sm">Checking cancellation details…</p>
          </div>
        )}

        {loadError && (
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/40 flex items-center justify-center mb-4">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <p className="text-muted text-sm text-center leading-relaxed">{loadError}</p>
            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all"
              >
                Close
              </button>
              <button
                onClick={fetchPreview}
                className="flex-1 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {preview && !preview.allowed && (
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
              <Info size={24} className="text-slate-500" />
            </div>
            <h2 className="text-text font-bold text-lg text-center leading-tight">
              Cancellation Not Available
            </h2>
            <p className="text-muted text-sm text-center mt-2 leading-relaxed">{preview.message}</p>
            {preview.code === "support" && (
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary
                  hover:bg-primary-hover text-white text-sm font-semibold transition-all"
              >
                Contact Support
              </a>
            )}
            <button
              onClick={onClose}
              className="w-full mt-5 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all"
            >
              Close
            </button>
          </div>
        )}

        {/* ── Step 1: window-specific confirmation ── */}
        {preview?.allowed && step === "confirm" && (
          <div className="flex flex-col items-center pt-8 pb-6 px-6 overflow-y-auto">
            <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center mb-4
              ${feeApplies
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40"
                : preview.window === "late_warning"
                ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40"
                : preview.window === "early_warning"
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40"}`}
            >
              {feeApplies
                ? <IndianRupee size={24} className="text-red-500" />
                : preview.window === "late_warning" || preview.window === "early_warning"
                ? <AlertTriangle size={24} className={preview.window === "late_warning" ? "text-rose-500" : "text-amber-500"} />
                : <CalendarX size={24} className="text-red-500" />
              }
            </div>

            <h2 className="text-text font-bold text-lg text-center leading-tight">
              {feeApplies
                ? "Cancellation Charge Applies"
                : preview.window === "late_warning"
                ? "Late Cancellation Warning"
                : "Cancel this booking?"}
            </h2>

            {/* Free window */}
            {preview.window === "free" && (
              <p className="text-muted text-sm text-center mt-2 leading-relaxed">
                Your <span className="font-semibold text-text">{booking.service}</span> booking
                will be cancelled. No cancellation fee applies.
              </p>
            )}

            {/* 24h → 4h: courtesy warning */}
            {preview.window === "early_warning" && (
              <div className="mt-3 w-full rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 px-4 py-3">
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Please cancel only if necessary. Early cancellation helps us efficiently
                  allocate technicians and serve other customers.
                </p>
              </div>
            )}

            {/* 4h → 2h: strong warning */}
            {preview.window === "late_warning" && (
              <div className="mt-3 w-full rounded-xl bg-rose-50 dark:bg-rose-900/15 border border-rose-200 dark:border-rose-700/40 px-4 py-3 space-y-2">
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  Your technician has likely reserved this time slot and may have declined
                  other bookings.
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  Frequent late cancellations may reduce your booking priority during
                  high-demand periods.
                </p>
                <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 leading-relaxed">
                  Please cancel only if absolutely necessary.
                </p>
              </div>
            )}

            {/* < 2h: fee breakdown */}
            {feeApplies && (
              <>
                <p className="text-muted text-sm text-center mt-2 leading-relaxed">
                  Your technician has already reserved this slot and preparations for your
                  service are likely complete. Cancelling now requires payment of a
                  cancellation fee before the booking can be cancelled.
                </p>
                <div className="mt-4 w-full rounded-xl border border-red-200 dark:border-red-800/40 overflow-hidden">
                  <div className="px-4 py-2.5 space-y-1.5 bg-red-50/60 dark:bg-red-900/10">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Approved Quote</span>
                      <span className="text-text font-medium">₹{preview.quoteTotal?.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">
                        Fee ({preview.rules?.cancellationFeePercent ?? 20}% · min ₹
                        {(preview.rules?.minimumCancellationFee ?? 100).toLocaleString("en-IN")})
                      </span>
                      <span className="text-text font-medium">₹{preview.fee.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-red-600 flex items-center justify-between">
                    <span className="text-white/80 text-xs font-medium">Cancellation Fee</span>
                    <span className="text-white font-bold text-base">
                      ₹{preview.fee.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all"
              >
                Keep Booking
              </button>
              <button
                onClick={() => setStep("reason")}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl
                  bg-red-600 hover:bg-red-700 text-white text-sm font-bold
                  transition-all shadow-md shadow-red-600/25"
              >
                <CalendarX size={14} />
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: cancellation reason ── */}
        {preview?.allowed && step === "reason" && (
          <>
            <WorkflowModalHeader
              tagline="Cancel booking"
              title={booking.service}
              onClose={onClose}
              disabled={submitting}
            />
            <div className="p-5 sm:p-6 flex flex-col gap-4 overflow-y-auto">
              <ReasonPicker
                label="Why are you cancelling?"
                reasons={reasons}
                value={reason}
                onSelect={setReason}
                comment={comment}
                onCommentChange={setComment}
                accent="red"
              />
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep("confirm")}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => (needsPaymentStep ? setStep("pay") : handleCancelNoFee())}
                  disabled={submitting || !canSubmitReason}
                  className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-red-600 hover:bg-red-700 text-white text-sm font-bold
                    transition-all shadow-md shadow-red-600/25
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : needsPaymentStep
                    ? <><CreditCard size={14} /> Continue to Payment</>
                    : <><CalendarX size={14} /> Cancel Booking</>
                  }
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: cancellation fee payment (charge window only) ── */}
        {preview?.allowed && step === "pay" && (
          <div className="flex flex-col items-center pt-8 pb-6 px-6 overflow-y-auto">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/40 flex items-center justify-center mb-4">
              <CreditCard size={24} className="text-red-500" />
            </div>
            <h2 className="text-text font-bold text-lg text-center leading-tight">
              Pay Cancellation Fee
            </h2>
            <p className="text-muted text-sm text-center mt-2 leading-relaxed">
              Your booking is cancelled only after the payment succeeds. If the
              payment fails, your booking stays active.
            </p>
            <div className="mt-4 w-full rounded-xl border border-red-200 dark:border-red-800/40 overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50/60 dark:bg-red-900/10 flex justify-between text-xs">
                <span className="text-muted">Reason</span>
                <span className="text-text font-medium">{reason}</span>
              </div>
              <div className="px-4 py-2.5 bg-red-600 flex items-center justify-between">
                <span className="text-white/80 text-xs font-medium">Cancellation Fee</span>
                <span className="text-white font-bold text-base">
                  ₹{preview.fee?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={() => setStep("reason")}
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handlePayAndCancel}
                disabled={submitting}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  bg-red-600 hover:bg-red-700 text-white text-sm font-bold
                  transition-all shadow-md shadow-red-600/25 disabled:opacity-60"
              >
                {submitting
                  ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <>
                      <CreditCard size={14} />
                      Pay ₹{preview.fee?.toLocaleString("en-IN")} &amp; Cancel
                    </>
                }
              </button>
            </div>
            <p className="text-xs text-muted flex items-center gap-1.5 mt-4">
              <ShieldCheck size={11} className="text-red-400 flex-shrink-0" />
              Secure payment. No outstanding dues are ever created.
            </p>
          </div>
        )}
    </WorkflowModalShell>
  );
}

/* ─── Post-rejection next steps (no dead ends) ── */
function RejectedNextSteps({ booking, onRequestRevision, onCloseRequest, loading }) {
  const busy = loading === booking._id;
  return (
    <div className="mx-4 mb-4 rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 overflow-hidden">
      <div className="bg-rose-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle size={14} className="text-white" />
          <span className="text-white text-sm font-bold">Quote Rejected</span>
        </div>
        {booking.rejection?.rejectedAt && (
          <span className="text-rose-100 text-xs font-medium">
            {new Date(booking.rejection.rejectedAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-4">
        {booking.rejection?.reason && (
          <div className="rounded-xl bg-card border border-rose-100 dark:border-rose-800/30 px-3.5 py-3">
            <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold uppercase tracking-wider mb-1">
              Your reason
            </p>
            <p className="text-sm text-text font-medium">{booking.rejection.reason}</p>
            {booking.rejection.comment && (
              <p className="text-xs text-muted italic mt-1 leading-relaxed">
                “{booking.rejection.comment}”
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted leading-relaxed">
          What would you like to do next? You can ask our team for an updated
          price estimate, or close this request permanently.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onRequestRevision(booking)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
              bg-primary hover:bg-primary-hover text-white text-sm font-bold
              transition-all shadow-md shadow-primary/25 hover:-translate-y-0.5
              disabled:opacity-60 disabled:translate-y-0"
          >
            {busy
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><FileEdit size={14} /> Request Revised Quote</>
            }
          </button>
          <p className="text-xs text-muted text-center -mt-0.5">
            Our team will review your feedback and send an updated quotation.
          </p>
          <button
            onClick={() => onCloseRequest(booking)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              border border-border text-muted text-sm font-semibold
              hover:border-slate-400 hover:text-text hover:bg-bg
              transition-all disabled:opacity-50"
          >
            <Archive size={13} />
            Close Request
          </button>
          <p className="text-xs text-muted text-center -mt-0.5">
            Permanently ends this request — no further quotations will be sent.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Request timeline / activity history ── */
// Events that represent a negative outcome get a red ✗ marker.
const TIMELINE_NEGATIVE = new Set(["quote_rejected", "cancelled", "closed"]);

// Legacy bookings pre-date the server-side history log — derive a best-effort
// timeline from the fields we do have so the section never renders empty.
function deriveLegacyTimeline(b) {
  const events = [{ event: "requested", label: "Service Requested", at: b.createdAt }];
  if (b.quotation?.total > 0 || b.price != null)
    events.push({ event: "quote_sent", label: "Quote Sent", at: null });
  if (b.status === "confirmed" || b.status === "completed")
    events.push({ event: "confirmed", label: "Quote Accepted — Booking Confirmed", at: null });
  if (b.assignedWorker?.name || b.worker)
    events.push({ event: "worker_assigned", label: "Worker Assigned", at: null });
  if (b.status === "completed")
    events.push({ event: "completed", label: "Service Completed", at: b.updatedAt });
  if (b.status === "cancelled")
    events.push({ event: "cancelled", label: "Booking Cancelled", at: b.updatedAt });
  return events;
}

function BookingTimeline({ booking }) {
  const [open, setOpen] = useState(false);
  const events = booking.history?.length ? booking.history : deriveLegacyTimeline(booking);
  if (!events.length) return null;

  return (
    <div className="pt-3 mt-1 border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-xs font-semibold text-muted
          hover:text-primary transition-colors"
      >
        <History size={13} className="flex-shrink-0" />
        Request Timeline
        <span className="flex-1" />
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <ol className="mt-3 ml-1.5 pb-1">
            {events.map((ev, i) => {
              const negative = TIMELINE_NEGATIVE.has(ev.event);
              const isLast   = i === events.length - 1;
              return (
                <li key={`${ev.event}-${i}`} className="relative pl-6 pb-4 last:pb-0">
                  {/* connector line */}
                  {!isLast && (
                    <span className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                  )}
                  {/* marker */}
                  <span
                    className={`absolute left-0 top-0.5 w-[15px] h-[15px] rounded-full flex items-center justify-center
                      ${negative
                        ? "bg-rose-100 dark:bg-rose-900/40"
                        : "bg-emerald-100 dark:bg-emerald-900/40"}`}
                  >
                    {negative
                      ? <X size={9} strokeWidth={3} className="text-rose-500" />
                      : <CheckCircle2 size={11} className="text-emerald-500" />
                    }
                  </span>
                  <p className={`text-xs font-semibold leading-tight
                    ${isLast ? "text-text" : "text-muted"}`}>
                    {ev.label || ev.event}
                  </p>
                  {ev.at && (
                    <p className="text-[11px] text-muted mt-0.5">
                      {new Date(ev.at).toLocaleString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                  {ev.meta?.reason && (
                    <p className="text-[11px] text-muted italic mt-0.5">
                      Reason: {ev.meta.reason}
                    </p>
                  )}
                  {ev.meta?.windowLabel && ev.meta.windowLabel !== "Free Cancellation" && (
                    <p className="text-[11px] text-muted italic mt-0.5">
                      {ev.meta.windowLabel}
                    </p>
                  )}
                  {ev.meta?.fee > 0 && (
                    <p className="text-[11px] text-muted mt-0.5">
                      Cancellation fee: ₹{ev.meta.fee.toLocaleString("en-IN")}
                    </p>
                  )}
                  {ev.event === "cancellation_fee_paid" && ev.meta?.amount > 0 && (
                    <p className="text-[11px] text-muted mt-0.5">
                      Amount: ₹{ev.meta.amount.toLocaleString("en-IN")}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ─── Quote banner ── */
function QuoteBanner({ booking, onAcceptClick, onReject, loading }) {
  const hasQuotation = booking.quotation && booking.quotation.labour > 0;
  const displayTotal = hasQuotation ? booking.quotation.total : booking.price;

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-purple-200 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
      <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee size={14} className="text-white" />
          <span className="text-white text-sm font-bold">Price Estimate Received</span>
        </div>
        <span className="text-purple-200 text-xs font-medium truncate max-w-[120px]">{booking.service}</span>
      </div>
      <div className="p-4 flex flex-col gap-4">
        {hasQuotation ? (
          <div>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider mb-2.5">
              Cost Breakdown
            </p>
            <QuotationBreakdown quotation={booking.quotation} />
          </div>
        ) : (
          <div>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider mb-1">
              Estimated Price
            </p>
            <p className="text-3xl font-bold text-text">
              ₹{booking.price?.toLocaleString("en-IN")}
            </p>
          </div>
        )}
        {hasQuotation && (
          <div className="rounded-xl bg-purple-600 px-4 py-3 flex items-center justify-between">
            <span className="text-white/80 text-sm font-medium">You pay</span>
            <span className="text-white font-bold text-xl">
              ₹{displayTotal?.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {/* Disclaimer */}
        <QuotationDisclaimer />

        {/* CTA row */}
        <div className="flex gap-3">
          <button
            onClick={() => onReject(booking)}
            disabled={loading === booking._id}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
              border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm font-semibold
              hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
          >
            <ThumbsDown size={14} />
            Reject
          </button>
          <button
            onClick={() => onAcceptClick(booking)}
            disabled={loading === booking._id}
            className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl
              bg-primary text-white text-sm font-bold
              hover:bg-primary-hover transition-all shadow-sm hover:-translate-y-0.5
              disabled:opacity-50 disabled:translate-y-0"
          >
            {loading === booking._id
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><ShieldCheck size={14} /> Accept ₹{displayTotal?.toLocaleString("en-IN")}</>
            }
          </button>
        </div>
        <p className="text-xs text-muted flex items-center gap-1.5">
          <ShieldCheck size={11} className="text-purple-400 flex-shrink-0" />
          Protected by reCAPTCHA. Accepting confirms your booking.
        </p>
      </div>
    </div>
  );
}

/* ─── Worker info strip ── */
function WorkerStrip({ booking }) {
  const assigned      = booking.assignedWorker;
  const workerName    = assigned?.name  || booking.worker || null;
  const contactNumber = assigned?.phone || null;

  if (!workerName) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20
      border border-blue-100 dark:border-blue-800/30 p-3">
      <p className="text-blue-400 text-xs font-bold uppercase tracking-wide">Assigned Worker</p>
      <div className="flex items-center gap-2">
        <UserCheck size={14} className="text-blue-500 flex-shrink-0" />
        <p className="text-blue-700 dark:text-blue-300 font-semibold text-sm">{workerName}</p>
      </div>
      {contactNumber && (
        <div className="flex items-center gap-2">
          <Phone size={12} className="text-blue-400 flex-shrink-0" />
          <a
            href={`tel:${contactNumber}`}
            className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
          >
            {contactNumber}
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Booking card ── */
function BookingCard({
  booking, isReviewed, onLeaveReview, onAcceptClick, onReject,
  onRequestRevision, onCloseRequest, onReschedule, onCancelBooking,
  actionLoading, workflowLoading,
}) {
  const svc        = getServiceMeta(booking.service);
  const Icon       = svc.icon;
  const isCompleted = booking.status === "completed";
  const isAwaiting  = booking.status === "awaiting_user_confirmation";
  const isRejected  = booking.status === "quote_rejected";
  // Server-authoritative capability flags (Booking model virtuals).
  const canReschedule = !!booking.canReschedule;
  const canCancel     = !!booking.canCancel;
  const statusCfg   = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      {/* Card header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${svc.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} className={svc.color} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-text font-bold text-sm leading-tight truncate">{booking.service}</h3>
            <p className="text-muted text-xs mt-0.5">
              Booked {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Status info bar */}
      <div className="px-5 py-2 bg-bg border-b border-border">
        <p className="text-xs text-muted flex items-center gap-1.5">
          <Info size={11} className="flex-shrink-0 text-muted" />
          {statusCfg.info}
        </p>
      </div>

      {/* Quote banner — now delegates accept to OTP flow */}
      {isAwaiting && (
        <div className="pt-4">
          <QuoteBanner
            booking={booking}
            onAcceptClick={onAcceptClick}
            onReject={onReject}
            loading={actionLoading}
          />
        </div>
      )}

      {/* Post-rejection next steps — request a revision or close the request */}
      {isRejected && (
        <div className="pt-4">
          <RejectedNextSteps
            booking={booking}
            onRequestRevision={onRequestRevision}
            onCloseRequest={onCloseRequest}
            loading={workflowLoading}
          />
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays size={14} className="text-primary flex-shrink-0" />
          <span>{formatDate(booking.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Clock size={14} className="text-primary flex-shrink-0" />
          <span>{booking.time}</span>
        </div>
        <div className="flex items-start gap-2 text-sm text-muted">
          <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{booking.address}</span>
        </div>
        {booking.phone && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Phone size={14} className="text-primary flex-shrink-0" />
            <span>{booking.phone}</span>
          </div>
        )}
        {booking.serviceIssue && (
          <div className="flex items-start gap-2 text-sm text-muted">
            <AlertCircle size={14} className="text-primary flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{booking.serviceIssue}</span>
          </div>
        )}
        {booking.notes && (
          <div className="flex items-start gap-2 text-sm text-muted">
            <FileText size={14} className="text-muted flex-shrink-0 mt-0.5" />
            <span className="leading-snug italic">{booking.notes}</span>
          </div>
        )}

        {/* Confirmed / completed — price + worker */}
        {(booking.status === "confirmed" || booking.status === "completed") && (
          <div className="pt-3 mt-1 border-t border-border space-y-3">
            {(booking.quotation?.labour > 0 || booking.price != null) && (
              <div>
                <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <IndianRupee size={11} className="text-emerald-600" />
                  Agreed Price
                </p>
                {booking.quotation?.labour > 0 ? (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 overflow-hidden">
                    <div className="px-3 py-2.5">
                      <QuotationBreakdown quotation={booking.quotation} compact={true} />
                    </div>
                    <div className="px-3 py-2 bg-emerald-600 flex items-center justify-between">
                      <span className="text-white/80 text-xs font-medium">Total paid</span>
                      <span className="text-white font-bold text-sm">
                        ₹{booking.quotation.total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-emerald-600 text-base">
                      ₹{booking.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            )}
            <WorkerStrip booking={booking} />
          </div>
        )}

        {/* Review section (completed only) */}
        {isCompleted && (
          <div className="pt-3 mt-1 border-t border-border">
            {isReviewed ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Review submitted — thank you!
              </div>
            ) : (
              <button
                onClick={() => onLeaveReview(booking)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4
                  rounded-xl border border-primary/20 text-primary text-xs font-semibold
                  hover:bg-primary hover:text-white transition-all duration-200
                  hover:border-primary hover:shadow-sm hover:shadow-primary/20"
              >
                <Star size={12} />
                Leave a Review
              </button>
            )}
            {/* Completed services can't be cancelled — guide toward support. */}
            <p className="text-xs text-muted mt-2.5 leading-relaxed">
              Something not right with this service?{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-medium hover:underline"
              >
                Contact support
              </a>
            </p>
          </div>
        )}

        {/* Activity timeline */}
        <BookingTimeline booking={booking} />

        {/* Reschedule / cancel actions (active bookings only) */}
        {(canReschedule || canCancel) && (
          <div className="pt-3 mt-1 border-t border-border flex gap-2.5">
            {canReschedule && (
              <button
                onClick={() => onReschedule(booking)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4
                  rounded-xl border border-border text-muted text-xs font-semibold
                  hover:border-primary/40 hover:text-primary hover:bg-primary/5
                  transition-all duration-200"
              >
                <CalendarClock size={13} />
                Reschedule
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancelBooking(booking)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4
                  rounded-xl border border-red-200 dark:border-red-800/40
                  text-red-500 dark:text-red-400 text-xs font-semibold
                  hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              >
                <CalendarX size={13} />
                Cancel Booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Skeleton ── */
function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-bg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-3.5 bg-bg rounded w-2/5 mb-2" />
          <div className="h-2.5 bg-bg rounded w-1/3" />
        </div>
        <div className="w-20 h-6 bg-bg rounded-full flex-shrink-0" />
      </div>
      <div className="px-5 py-4 space-y-2.5">
        <div className="h-3 bg-bg rounded w-3/5" />
        <div className="h-3 bg-bg rounded w-1/4" />
        <div className="h-3 bg-bg rounded w-4/5" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5">
        <PackageOpen size={28} className="text-primary/50" />
      </div>
      <h3 className="text-text font-bold text-lg mb-2">No bookings yet</h3>
      <p className="text-muted text-sm max-w-xs leading-relaxed mb-6">
        You haven't booked any services yet. Browse our services and get started.
      </p>
      <Link
        to="/services"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary
          hover:bg-primary-hover text-white text-sm font-semibold transition-all
          hover:-translate-y-0.5 shadow-md shadow-primary/25"
      >
        Browse Services
        <ArrowRight size={14} strokeWidth={2.5} />
      </Link>
    </div>
  );
}

/* ─── Page ── */
export default function MyBookingsPage() {
  const [bookings,      setBookings]      = useState([]);
  const [reviewedIds,   setReviewedIds]   = useState(new Set());
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [activeReview,  setActiveReview]  = useState(null);
  // bookingId whose "Request Revised Quote" call is in flight
  const [revisionLoading, setRevisionLoading] = useState(null);

  // Booking confirmation state
  const [confirming, setConfirming] = useState(null); // bookingId being confirmed

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState(null); // booking object

  // Quote rejection workflow state
  const [rejectModal,      setRejectModal]      = useState(null);  // booking object
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [closeModal,       setCloseModal]       = useState(null);  // booking object
  const [closeSubmitting,  setCloseSubmitting]  = useState(false);

  // Service cancellation workflow state
  const [cancelModal, setCancelModal] = useState(null); // booking object

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, reviewedRes] = await Promise.allSettled([
        getMyBookings(),
        fetchMyReviewedBookingIds(),
      ]);
      if (bookingsRes.status === "fulfilled") {
        setBookings(bookingsRes.value.data.bookings || []);
      } else {
        const msg = bookingsRes.reason?.response?.data?.message || "Failed to load bookings.";
        setError(msg);
        toast.error(msg);
      }
      if (reviewedRes.status === "fulfilled") {
        setReviewedIds(new Set(reviewedRes.value));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // User clicks "Accept" → run reCAPTCHA v3, then confirm the booking server-side.
  const handleAcceptClick = async (booking) => {
    setConfirming(booking._id);
    const toastId = toast.loading("Confirming your booking…");
    // TIMING INSTRUMENTATION (diagnostic) — measures the two client-side waits:
    // reCAPTCHA token generation, and the round-trip to the confirm endpoint.
    // Logging only; remove once the bottleneck is fixed.
    const tClickStart = performance.now();
    try {
      const tRecaptchaStart = performance.now();
      const recaptchaToken = await executeRecaptcha("confirm_booking");
      const recaptchaMs = Math.round(performance.now() - tRecaptchaStart);
      const tApiStart = performance.now();
      const res = await confirmBooking(booking._id, recaptchaToken);
      const apiMs = Math.round(performance.now() - tApiStart);
      console.log(
        `[TIMING] confirmBooking client: recaptcha_token_ms=${recaptchaMs} ` +
        `api_roundtrip_ms=${apiMs} total_ms=${Math.round(performance.now() - tClickStart)}`
      );
      setBookings((prev) =>
        prev.map((b) => (b._id === res.data.booking._id ? res.data.booking : b))
      );
      toast.success("Booking confirmed! A worker will be assigned soon. ✅", { id: toastId });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.message?.includes("reCAPTCHA")
          ? "Verification failed. Please try again."
          : "Failed to confirm booking. Please try again.");
      toast.error(msg, { id: toastId });
    } finally {
      setConfirming(null);
    }
  };

  // Reschedule success → update booking in list, close modal
  const handleRescheduleSuccess = (updatedBooking) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
    );
  };

  // Step 1+2 handled inside RejectQuoteModal; this fires on final submission.
  const handleRejectSubmit = async (booking, reason, comment) => {
    setRejectSubmitting(true);
    try {
      const res = await rejectBooking(booking._id, { reason, comment });
      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? res.data.booking : b))
      );
      setRejectModal(null);
      toast.success("Quotation rejected.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reject the quotation.");
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Post-rejection: ask the team for a revised quotation.
  const handleRequestRevision = async (booking) => {
    setRevisionLoading(booking._id);
    try {
      const res = await requestQuoteRevision(booking._id);
      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? res.data.booking : b))
      );
      toast.success("Revised quote requested — we'll notify you when it's ready. ✅");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to request a revised quote.");
    } finally {
      setRevisionLoading(null);
    }
  };

  // Post-rejection: permanently close the request (after confirmation modal).
  const handleCloseRequest = async (booking) => {
    setCloseSubmitting(true);
    try {
      const res = await closeBookingRequest(booking._id);
      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? res.data.booking : b))
      );
      setCloseModal(null);
      toast.success("Request closed.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to close the request.");
    } finally {
      setCloseSubmitting(false);
    }
  };

  // Cancellation success (modal already handled payment/reason steps).
  const handleBookingCancelled = (updatedBooking) => {
    setBookings((prev) =>
      prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
    );
    setCancelModal(null);
  };

  const handleReviewSuccess = (bookingId) => {
    setReviewedIds((prev) => new Set([...prev, bookingId]));
  };

  // Active = awaiting_user_confirmation + pending + confirmed, sorted by most recent
  const activeBookings = bookings
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Archive sections: completed, cancelled
  const archivedByStatus = ARCHIVE_SECTIONS.reduce((acc, { key }) => {
    acc[key] = bookings
      .filter((b) => b.status === key)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return acc;
  }, {});

  const counts = bookings.reduce(
    (acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {}
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-primary dark:bg-primary-dark text-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-blush text-xs font-semibold uppercase tracking-widest mb-2">Your account</p>
              <h1 className="landing-heading text-3xl md:text-4xl font-bold leading-tight">My Bookings</h1>
              {!loading && !error && bookings.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(counts).map(([status, count]) => (
                    <span
                      key={status}
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 text-white/80 px-3 py-1 rounded-full capitalize"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[status]?.dot || "bg-muted"}`} />
                      {count} {STATUS_CONFIG[status]?.label || status}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10
                hover:bg-white/20 text-white text-sm font-medium transition-all
                disabled:opacity-50 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8 md:py-12">
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400 rounded-2xl px-5 py-4 text-sm mb-6">
            {error} —{" "}
            <button
              onClick={fetchAll}
              className="underline font-medium hover:text-red-700 dark:hover:text-red-300"
            >
              retry
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && <EmptyState />}

        {!loading && !error && bookings.length > 0 && (
          <div className="space-y-6">

            {/* ── Section 1: Active Bookings — always visible, primary area ── */}
            <div>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  <h2 className="text-text font-bold text-lg">Active Bookings</h2>
                </div>
                {activeBookings.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-primary text-white text-xs font-bold">
                    {activeBookings.length}
                  </span>
                )}
              </div>

              {activeBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
                  <p className="text-muted text-sm">No active bookings right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {activeBookings.map((b) => (
                    <BookingCard
                      key={b._id}
                      booking={b}
                      isReviewed={reviewedIds.has(b._id)}
                      onLeaveReview={setActiveReview}
                      onAcceptClick={handleAcceptClick}
                      onReject={setRejectModal}
                      onRequestRevision={handleRequestRevision}
                      onCloseRequest={setCloseModal}
                      onReschedule={setRescheduleModal}
                      onCancelBooking={setCancelModal}
                      actionLoading={confirming}
                      workflowLoading={revisionLoading}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Sections 2 & 3: Archive accordions — Completed, Cancelled ── */}
            {ARCHIVE_SECTIONS.some(({ key }) => archivedByStatus[key]?.length > 0) && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-semibold text-muted uppercase tracking-widest px-1">History</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3">
                  {ARCHIVE_SECTIONS.map(({ key, label, dot, accent, emptyMessage }) => (
                    <BookingSectionAccordion
                      key={key}
                      title={label}
                      count={archivedByStatus[key]?.length ?? 0}
                      defaultOpen={false}
                      dotColor={dot}
                      accentColor={accent}
                      emptyMessage={emptyMessage}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {archivedByStatus[key].map((b) => (
                          <BookingCard
                            key={b._id}
                            booking={b}
                            isReviewed={reviewedIds.has(b._id)}
                            onLeaveReview={setActiveReview}
                            onAcceptClick={handleAcceptClick}
                            onReject={setRejectModal}
                            onRequestRevision={handleRequestRevision}
                            onCloseRequest={setCloseModal}
                            onReschedule={setRescheduleModal}
                            onCancelBooking={setCancelModal}
                            actionLoading={confirming}
                            workflowLoading={revisionLoading}
                          />
                        ))}
                      </div>
                    </BookingSectionAccordion>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Review modal */}
      {activeReview && (
        <ReviewModal
          booking={activeReview}
          onClose={() => setActiveReview(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Reschedule modal */}
      {rescheduleModal && (
        <RescheduleModal
          booking={rescheduleModal}
          onClose={() => setRescheduleModal(null)}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Reject quote modal (confirmation + reason) */}
      {rejectModal && (
        <RejectQuoteModal
          booking={rejectModal}
          onClose={() => setRejectModal(null)}
          onSubmit={handleRejectSubmit}
          loading={rejectSubmitting}
        />
      )}

      {/* Close request confirmation modal */}
      {closeModal && (
        <CloseRequestModal
          booking={closeModal}
          onClose={() => setCloseModal(null)}
          onConfirm={handleCloseRequest}
          loading={closeSubmitting}
        />
      )}

      {/* Cancel booking modal (window-aware: warnings / fee / payment) */}
      {cancelModal && (
        <CancelBookingModal
          booking={cancelModal}
          onClose={() => setCancelModal(null)}
          onCancelled={handleBookingCancelled}
        />
      )}
    </div>
  );
}