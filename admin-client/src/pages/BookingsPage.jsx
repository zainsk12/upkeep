// admin-client/src/pages/BookingsPage.jsx

import { useEffect, useState, useCallback } from "react";
import { toast } from "../utils/toast";
import {
  RefreshCw, AlertCircle, UserCheck, FileText,
  CheckCircle2, Search, ChevronDown, ChevronUp, CalendarDays, X,
  IndianRupee, Phone, Trash2, XCircle, FileEdit, History,
} from "lucide-react";
import { getAllBookings, updateBooking, getWorkers, deleteBooking } from "../services/api";
import { useAdminAuth } from "../context/AdminAuthContext";

/* ─── Status config ── */
const STATUS_CFG = {
  pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    heading: "🕐 Pending — Create Quotation",
  },
  awaiting_user_confirmation: {
    label: "Awaiting User",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    heading: "⏳ Awaiting User Confirmation",
  },
  revision_requested: {
    label: "Revision Requested",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
    heading: "📝 Revision Requested — Send Revised Quotation",
  },
  quote_rejected: {
    label: "Quote Rejected",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    heading: "🚫 Quote Rejected — Awaiting Customer Decision",
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    heading: "✅ Confirmed — Assign Worker",
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    heading: "🎉 Completed",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    heading: "❌ Cancelled",
  },
  closed: {
    label: "Closed",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    heading: "📁 Closed by Customer",
  },
};

const SECTION_ORDER = [
  "pending", "revision_requested", "awaiting_user_confirmation",
  "quote_rejected", "confirmed", "completed", "cancelled", "closed",
];

// Statuses that start collapsed in the admin view (archive sections)
const COLLAPSED_BY_DEFAULT = new Set(["completed", "cancelled", "closed"]);

/* ─── Quotation line items ── */
const QUOTE_LINES = [
  { key: "labour",          label: "Labour",          required: true  },
  { key: "materials",       label: "Materials",       required: false },
  { key: "travel",          label: "Travel",          required: false },
  { key: "inspection",      label: "Inspection",      required: false },
  { key: "convenience_fee", label: "Convenience Fee", required: false },
  { key: "tax",             label: "Tax / GST",       required: false },
];

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtAmount(n) {
  return Number(n).toLocaleString("en-IN");
}

/* ─── Service → skill mapping ── */
const SERVICE_TO_SKILL_MAP = {
  plumbing:           "plumber",
  electrical:         "electrician",
  cleaning:           "cleaner",
  painting:           "painter",
  carpentry:          "carpenter",
  "pest control":     "pest control",
  "ac repair":        "ac technician",
  "ac service":       "ac technician",
  "air conditioning": "ac technician",
  "appliance repair": "appliance repair",
  welding:            "welder",
  masonry:            "mason",
};

function resolveRequiredSkill(service) {
  if (!service) return null;
  const normalized = service.toLowerCase().trim();

  if (SERVICE_TO_SKILL_MAP[normalized]) return SERVICE_TO_SKILL_MAP[normalized];

  for (const [key, skill] of Object.entries(SERVICE_TO_SKILL_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return skill;
  }

  if (normalized.includes("plumb"))                               return "plumber";
  if (normalized.includes("electric"))                            return "electrician";
  if (normalized.includes("carpent"))                             return "carpenter";
  if (normalized.includes("paint"))                               return "painter";
  if (normalized.includes("clean"))                               return "cleaner";
  if (normalized.includes("pest"))                                return "pest control";
  if (normalized.includes("ac") || normalized.includes("air condition")) return "ac technician";
  if (normalized.includes("applianc"))                            return "appliance repair";
  if (normalized.includes("weld"))                                return "welder";
  if (normalized.includes("mason"))                               return "mason";

  return normalized;
}

/* ─── Status badge ── */
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ─── Skill badge ── */
function SkillBadge({ skill }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium
      bg-primary/10 text-primary border border-primary/20 capitalize">
      {skill}
    </span>
  );
}

/* ─── Quotation breakdown (read-only) ── */
function QuotationBreakdown({ quotation }) {
  const active = QUOTE_LINES.filter(({ key }) => (quotation[key] ?? 0) > 0);
  return (
    <div className="rounded-xl overflow-hidden border border-primary/20">
      <div className="px-4 py-2.5 bg-primary/10 flex items-center gap-2">
        <FileText size={13} className="text-primary" />
        <span className="text-primary text-xs font-semibold uppercase tracking-wide font-sans">
          Quotation Breakdown
        </span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-1.5 bg-primary/5">
        {active.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-muted font-sans">{label}</span>
            <span className="text-text font-medium font-sans">₹{fmtAmount(quotation[key])}</span>
          </div>
        ))}
        <div className="mt-1 pt-2 border-t border-primary/20 flex items-center justify-between">
          <span className="text-text font-semibold text-sm font-sans">Total</span>
          <span className="text-primary font-bold text-base font-sans">₹{fmtAmount(quotation.total)}</span>
        </div>
        {quotation.notes && (
          <p className="text-muted text-xs italic mt-0.5 font-sans">{quotation.notes}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Rejection details (shown after a customer rejects a quote) ── */
function RejectionPanel({ rejection }) {
  if (!rejection?.reason) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-rose-200">
      <div className="px-4 py-2.5 bg-rose-50 flex items-center gap-2">
        <XCircle size={13} className="text-rose-500" />
        <span className="text-rose-600 text-xs font-semibold uppercase tracking-wide font-sans">
          Customer Rejected the Quote
        </span>
        {rejection.rejectedAt && (
          <span className="ml-auto text-rose-400 text-xs font-sans">
            {fmt(rejection.rejectedAt)}
          </span>
        )}
      </div>
      <div className="px-4 py-3 bg-rose-50/40 flex flex-col gap-1">
        <p className="text-text text-sm font-semibold font-sans">{rejection.reason}</p>
        {rejection.comment && (
          <p className="text-muted text-xs italic font-sans leading-relaxed">
            “{rejection.comment}”
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Previous quotations (revision history — append-only) ── */
function QuotationHistoryPanel({ history }) {
  const [open, setOpen] = useState(false);
  if (!history?.length) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-2.5 bg-gray-50 flex items-center gap-2 hover:bg-gray-100 transition-colors"
      >
        <FileText size={13} className="text-muted" />
        <span className="text-muted text-xs font-semibold uppercase tracking-wide font-sans">
          Previous Quotations ({history.length})
        </span>
        <ChevronDown
          size={14}
          className={`ml-auto text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="divide-y divide-border">
          {history.map((q) => (
            <div key={q.revision} className="px-4 py-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wide font-sans">
                  Revision {q.revision}
                </span>
                <span className="text-text font-bold text-sm font-sans line-through decoration-rose-400/60">
                  ₹{fmtAmount(q.total)}
                </span>
              </div>
              {q.rejectionReason && (
                <p className="text-rose-500 text-xs font-sans">
                  Rejected{q.rejectedAt ? ` on ${fmt(q.rejectedAt)}` : ""}: {q.rejectionReason}
                  {q.rejectionComment ? ` — “${q.rejectionComment}”` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Activity timeline (mirrors the customer-side request timeline) ── */
const TIMELINE_NEGATIVE = new Set(["quote_rejected", "cancelled", "closed"]);

function TimelinePanel({ history }) {
  const [open, setOpen] = useState(false);
  if (!history?.length) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-2.5 bg-gray-50 flex items-center gap-2 hover:bg-gray-100 transition-colors"
      >
        <History size={13} className="text-muted" />
        <span className="text-muted text-xs font-semibold uppercase tracking-wide font-sans">
          Activity Timeline
        </span>
        <ChevronDown
          size={14}
          className={`ml-auto text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ol className="px-4 py-3">
          {history.map((ev, i) => {
            const negative = TIMELINE_NEGATIVE.has(ev.event);
            const isLast   = i === history.length - 1;
            return (
              <li key={`${ev.event}-${i}`} className="relative pl-6 pb-3.5 last:pb-0">
                {!isLast && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />}
                <span
                  className={`absolute left-0 top-0.5 w-[15px] h-[15px] rounded-full flex items-center justify-center
                    ${negative ? "bg-rose-100" : "bg-emerald-100"}`}
                >
                  {negative
                    ? <X size={9} strokeWidth={3} className="text-rose-500" />
                    : <CheckCircle2 size={11} className="text-emerald-500" />}
                </span>
                <p className={`text-xs font-semibold font-sans leading-tight ${isLast ? "text-text" : "text-muted"}`}>
                  {ev.label || ev.event}
                </p>
                <p className="text-[11px] text-muted font-sans mt-0.5">
                  {ev.at && new Date(ev.at).toLocaleString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                  {ev.by ? ` · by ${ev.by}` : ""}
                </p>
                {ev.meta?.reason && (
                  <p className="text-[11px] text-rose-500 font-sans mt-0.5">Reason: {ev.meta.reason}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ─── Confirm Complete Modal ── */
function ConfirmCompleteModal({ booking, onClose, onConfirm, saving }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="flex flex-col items-center pt-7 pb-4 px-6">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-4">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
          <h2 className="text-text font-bold text-lg font-sans text-center leading-tight">
            Mark as Completed?
          </h2>
          <p className="text-muted text-sm font-sans text-center mt-2 leading-relaxed">
            This will mark the booking for{" "}
            <span className="font-semibold text-text">{booking.userId?.name || "the user"}</span>{" "}
            ({booking.service}) as completed. This action cannot be undone.
          </p>
        </div>
        <div className="border-t border-border mx-6" />
        <div className="flex flex-col sm:flex-row gap-3 p-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-border text-muted hover:bg-gray-50
              text-sm font-semibold transition-all disabled:opacity-50 font-sans"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold
              transition-all shadow-md shadow-emerald-600/25 disabled:opacity-60 font-sans"
          >
            {saving
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><CheckCircle2 size={15} /> Confirm</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Booking Confirmation Modal ── */
function ConfirmDeleteModal({ booking, onClose, onConfirm, deleting }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Icon + title */}
        <div className="flex flex-col items-center pt-7 pb-4 px-6">
          <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-4">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h2 className="text-text font-bold text-lg font-sans text-center leading-tight">
            Delete Booking
          </h2>
          <p className="text-muted text-sm font-sans text-center mt-2 leading-relaxed">
            Are you sure you want to permanently delete the booking for{" "}
            <span className="font-semibold text-text">
              {booking.userId?.name || "this user"}
            </span>{" "}
            ({booking.service})?
          </p>
          <p className="text-red-500 text-xs font-semibold font-sans mt-2 text-center">
            This action cannot be undone.
          </p>
        </div>

        <div className="border-t border-border mx-6" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 p-5">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-border text-muted hover:bg-gray-50
              text-sm font-semibold transition-all disabled:opacity-50 font-sans"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-red-600 hover:bg-red-700 text-white text-sm font-bold
              transition-all shadow-md shadow-red-600/25 disabled:opacity-60 font-sans"
          >
            {deleting
              ? <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting…
                </>
              : <><Trash2 size={14} /> Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Quotation modal ── */
function QuotationModal({ booking, onClose, onSubmit, saving, isRevision = false }) {
  const [fields, setFields] = useState({
    labour: "", materials: "", travel: "",
    inspection: "", convenience_fee: "", tax: "", notes: "",
  });

  const set = (key, val) => setFields(p => ({ ...p, [key]: val }));

  const total = QUOTE_LINES.reduce(
    (sum, { key }) => sum + (parseFloat(fields[key]) || 0), 0
  );

  const handleSubmit = () => {
    const labour = parseFloat(fields.labour) || 0;
    if (labour <= 0) { toast.error("Labour charge is required."); return; }
    onSubmit({
      labour,
      materials:       parseFloat(fields.materials)       || 0,
      travel:          parseFloat(fields.travel)           || 0,
      inspection:      parseFloat(fields.inspection)       || 0,
      convenience_fee: parseFloat(fields.convenience_fee)  || 0,
      tax:             parseFloat(fields.tax)              || 0,
      notes:           fields.notes.trim(),
    });
  };

  const activeLines = QUOTE_LINES.filter(({ key }) => (parseFloat(fields[key]) || 0) > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-primary px-5 sm:px-6 py-5 flex items-start justify-between flex-shrink-0">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-0.5 font-sans">
              Booking #{booking._id.slice(-6).toUpperCase()}
            </p>
            <h2 className="text-white font-bold text-lg font-sans leading-tight">
              {isRevision ? "Create Revised Quotation" : "Create Quotation"}
            </h2>
            <p className="text-white/70 text-xs mt-1 font-sans">{booking.service}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 flex flex-col gap-5">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3 font-sans">Charges</p>
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-semibold text-text uppercase tracking-wide font-sans flex items-center gap-1">
                Labour <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-sans select-none">₹</span>
                <input
                  type="number" min="0" step="any" placeholder="0"
                  value={fields.labour}
                  onChange={e => set("labour", e.target.value)}
                  className="input-base pl-8 w-full font-sans"
                  autoFocus
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUOTE_LINES.filter(l => !l.required).map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted uppercase tracking-wide font-sans">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-sans select-none">₹</span>
                    <input
                      type="number" min="0" step="any" placeholder="0"
                      value={fields[key]}
                      onChange={e => set(key, e.target.value)}
                      className="input-base pl-8 w-full font-sans"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2 font-sans">
              Notes <span className="normal-case tracking-normal font-normal">(optional)</span>
            </p>
            <textarea
              rows={3}
              placeholder="Any remarks about this quotation…"
              value={fields.notes}
              onChange={e => set("notes", e.target.value)}
              className="input-base resize-none w-full font-sans"
            />
          </div>
          {activeLines.length > 0 && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 overflow-hidden">
              <div className="px-4 py-2.5 bg-primary/10 flex items-center gap-2">
                <IndianRupee size={12} className="text-primary" />
                <span className="text-primary text-xs font-bold uppercase tracking-wide font-sans">Summary</span>
              </div>
              <div className="px-4 py-3 flex flex-col gap-1.5">
                {activeLines.map(({ key, label }) => (
                  <div key={key} className="flex justify-between text-xs text-muted font-sans">
                    <span>{label}</span>
                    <span>₹{fmtAmount(parseFloat(fields[key]) || 0)}</span>
                  </div>
                ))}
                <div className="mt-1.5 pt-2 border-t border-primary/20 flex justify-between">
                  <span className="text-sm font-bold text-text font-sans">Total</span>
                  <span className="text-primary font-bold text-base font-sans">₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border px-5 sm:px-6 py-4 bg-card">
          {total > 0 && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted text-xs font-sans uppercase tracking-wide">Estimated Total</p>
              <p className="text-text text-xl font-bold font-sans">₹{total.toLocaleString("en-IN")}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-border text-muted hover:bg-gray-50
                text-sm font-semibold transition-all disabled:opacity-50 font-sans"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || total === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-primary hover:bg-primary-hover text-white text-sm font-bold
                transition-all shadow-md shadow-primary/25 disabled:opacity-60 font-sans"
            >
              {saving
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : (isRevision ? "Send Revised Quotation" : "Send Quotation")
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Smart Worker Assignment Panel ── */
function WorkerAssignPanel({ booking, workers, adminPhone, onAssign, saving }) {
  const [workerInput,    setWorkerInput]    = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useAdminPhone,  setUseAdminPhone]  = useState(false);
  const [overridePhone,  setOverridePhone]  = useState(adminPhone || "");

  const normalizedService = booking.service?.toLowerCase().trim() ?? "";

  const filteredWorkers = workers.filter((w) => {
    if (!w.active) return false;

    const skillSources = [
      w.skill,
      ...(w.skills ?? []),
    ].filter(Boolean);

    return skillSources.some((rawSkill) => {
      const skill = rawSkill.toLowerCase().trim();
      return (
        normalizedService.includes(skill) ||
        skill.includes(normalizedService) ||
        normalizedService.includes(skill.replace(/e?r$/, "")) ||
        skill.includes(normalizedService.replace(/ing$/, ""))
      );
    });
  });

  const isExactMatch  = filteredWorkers.length > 0;
  const workerPool    = isExactMatch ? filteredWorkers : workers.filter((w) => w.active);
  const requiredSkill = resolveRequiredSkill(booking.service) ?? normalizedService;

  const suggestions = workerPool.filter((w) =>
    w.name.toLowerCase().includes(workerInput.toLowerCase())
  );

  const handleSelect = (worker) => {
    setSelectedWorker(worker);
    setWorkerInput(worker.name);
    setShowSuggestions(false);
  };

  const handleInputChange = (e) => {
    setWorkerInput(e.target.value);
    setSelectedWorker(null);
    setShowSuggestions(true);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length === 1) {
        handleSelect(suggestions[0]);
      } else if (workerInput.trim()) {
        setShowSuggestions(false);
      }
    }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  const handleAssign = () => {
    if (useAdminPhone && !overridePhone.trim()) {
      toast.error("Enter an admin contact number or uncheck the override.");
      return;
    }

    if (selectedWorker) {
      onAssign({
        workerId:      selectedWorker._id,
        contactSource: useAdminPhone ? "admin" : "worker",
        adminPhone:    useAdminPhone ? overridePhone.trim() : undefined,
      });
    } else if (workerInput.trim()) {
      onAssign({
        workerName:    workerInput.trim(),
        contactSource: useAdminPhone ? "admin" : "worker",
        adminPhone:    useAdminPhone ? overridePhone.trim() : undefined,
      });
    } else {
      toast.error("Type a worker name or select one from the list.");
    }
  };

  const canAssign = !!selectedWorker || !!workerInput.trim();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide font-sans flex items-center gap-1.5">
          <UserCheck size={12} />
          Assign Worker
        </p>
        <span className="text-xs font-medium font-sans px-2 py-0.5 rounded-full border
          bg-blue-50 border-blue-200 text-blue-500 capitalize self-start sm:self-auto">
          {requiredSkill ?? "any skill"}
        </span>
      </div>

      {/* Availability hint */}
      {!isExactMatch && workers.filter((w) => w.active).length > 0 && (
        <p className="text-amber-600 text-xs font-sans bg-amber-50 border border-amber-200
          rounded-lg px-3 py-2">
          ⚠️ No workers matched <strong>{requiredSkill}</strong> — showing all active workers.
          You can also type a name manually.
        </p>
      )}
      {workers.filter((w) => w.active).length === 0 && (
        <p className="text-muted text-xs font-sans italic">
          No active workers available. Type a name below to assign manually.
        </p>
      )}

      {/* Smart search input — full width */}
      <div className="relative w-full">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder={
            workerPool.length > 0
              ? `Search worker… (${workerPool.length} available)`
              : "Type worker name to assign manually…"
          }
          value={workerInput}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleInputKeyDown}
          className="input-base w-full font-sans pl-9 pr-9"
          autoComplete="off"
        />
        {workerInput && (
          <button
            onClick={() => { setWorkerInput(""); setSelectedWorker(null); setShowSuggestions(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
          >
            <X size={13} />
          </button>
        )}

        {/* Suggestions dropdown — full width */}
        {showSuggestions && workerInput && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl
            shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {suggestions.map((w) => (
              <li
                key={w._id}
                onMouseDown={() => handleSelect(w)}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 cursor-pointer
                  transition-colors border-b border-border/50 last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck size={12} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text text-xs font-semibold font-sans truncate">{w.name}</p>
                  <p className="text-muted text-xs font-sans flex items-center gap-1">
                    <Phone size={9} />{w.phone}
                    {w.experience > 0 && <span>· {w.experience}yr exp</span>}
                  </p>
                </div>
                <div className="hidden sm:flex flex-wrap gap-1 justify-end">
                  {w.skills?.slice(0, 2).map((s) => <SkillBadge key={s} skill={s} />)}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* No match hint */}
        {showSuggestions && workerInput && suggestions.length === 0 && (
          <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl
            shadow-lg px-3 py-2.5 text-xs text-muted font-sans">
            No matching workers — press <kbd className="px-1 py-0.5 rounded bg-gray-100 border
              border-gray-300 text-gray-600 font-mono text-xs">Enter</kbd> to assign manually.
          </div>
        )}
      </div>

      {/* Selected worker preview */}
      {selectedWorker && (
        <div className="flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-lg bg-white border border-blue-200">
          <UserCheck size={12} className="text-blue-500 flex-shrink-0" />
          <span className="text-text text-xs font-semibold font-sans">{selectedWorker.name}</span>
          <span className="text-muted text-xs font-sans flex items-center gap-1">
            <Phone size={10} />{selectedWorker.phone}
          </span>
          {selectedWorker.skills?.map((s) => <SkillBadge key={s} skill={s} />)}
        </div>
      )}

      {/* Manual entry confirmation tag */}
      {!selectedWorker && workerInput.trim() && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
          <p className="text-amber-700 text-xs font-sans">
            Manual entry: <strong>"{workerInput.trim()}"</strong> will be assigned by name.
          </p>
        </div>
      )}

      {/* Admin contact override */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={useAdminPhone}
          onChange={(e) => setUseAdminPhone(e.target.checked)}
          className="w-4 h-4 rounded accent-primary cursor-pointer"
        />
        <span className="text-xs text-text font-sans">Use admin contact instead of worker phone</span>
      </label>

      {useAdminPhone && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted font-sans uppercase tracking-wide">Admin Contact Number</label>
          <div className="relative">
            <Phone size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="tel"
              placeholder="Admin phone…"
              value={overridePhone}
              onChange={(e) => setOverridePhone(e.target.value)}
              className="input-base pl-8 w-full font-sans"
            />
          </div>
          <p className="text-muted text-xs font-sans italic">
            Client will see this number, not the worker's.
          </p>
        </div>
      )}

      <button
        onClick={handleAssign}
        disabled={saving || !canAssign}
        className="btn-primary w-full justify-center gap-2 disabled:opacity-60"
      >
        {saving
          ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <><UserCheck size={14} /> Assign Worker</>
        }
      </button>
    </div>
  );
}

/* ─── Booking card ── */
function BookingCard({ booking, workers, onUpdate, onDelete }) {
  const { admin } = useAdminAuth();
  const [showQuoteModal,    setShowQuoteModal]    = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteModal,   setShowDeleteModal]   = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [deleting,          setDeleting]          = useState(false);
  const [expanded,          setExpanded]          = useState(false);

  const doUpdate = async (data, msg) => {
    setSaving(true);
    try {
      const res = await updateBooking(booking._id, data);
      onUpdate(res.data.booking);
      toast.success(msg);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitQuotation = (quotationData) => {
    const total = Object.entries(quotationData)
      .filter(([k, v]) => k !== "notes" && typeof v === "number")
      .reduce((s, [, v]) => s + v, 0);
    const isRevision = booking.status === "revision_requested";
    doUpdate(
      { quotation: quotationData },
      `${isRevision ? "Revised quotation" : "Quotation"} ₹${fmtAmount(total)} sent — awaiting user confirmation`
    );
    setShowQuoteModal(false);
  };

  const handleAssignWorker = ({ workerId, workerName, contactSource, adminPhone }) => {
    const payload = workerId
      ? { workerId, contactSource, adminPhone }
      : { workerName, contactSource, adminPhone };
    doUpdate(payload, "Worker assigned successfully");
  };

  const handleMarkComplete = () => {
    doUpdate({ status: "completed" }, "Booking marked as completed");
    setShowCompleteModal(false);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteBooking(booking._id);
      onDelete(booking._id);
      toast.success("Booking deleted successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete booking.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const u = booking.userId;
  const displayTotal = booking.quotation?.total ?? booking.price;
  const assigned = booking.assignedWorker;

  return (
    <>
      {showQuoteModal && (
        <QuotationModal
          booking={booking}
          onClose={() => setShowQuoteModal(false)}
          onSubmit={handleSubmitQuotation}
          saving={saving}
          isRevision={booking.status === "revision_requested"}
        />
      )}
      {showCompleteModal && (
        <ConfirmCompleteModal
          booking={booking}
          onClose={() => setShowCompleteModal(false)}
          onConfirm={handleMarkComplete}
          saving={saving}
        />
      )}
      {showDeleteModal && (
        <ConfirmDeleteModal
          booking={booking}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />
      )}

      <div className="admin-card overflow-hidden">
        {/* Card header */}
        <div
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={booking.status} />
              <span className="text-muted text-xs font-mono">#{booking._id.slice(-6).toUpperCase()}</span>
            </div>
            <p className="text-text font-semibold text-sm mt-2 truncate font-sans">{booking.service}</p>
            <p className="text-muted text-xs mt-0.5 font-sans">
              {u?.name || "Unknown"} · {u?.email || ""}
            </p>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
            <span className="text-muted text-xs font-sans">{fmt(booking.date)}, {booking.time}</span>
            <div className="flex items-center gap-2">
              {displayTotal != null && (
                <span className="text-primary font-bold text-sm font-sans">₹{fmtAmount(displayTotal)}</span>
              )}
              {/* Delete button — always visible, stops propagation so card doesn't toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                disabled={deleting}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50
                  border border-transparent hover:border-red-200 transition-all disabled:opacity-50"
                title="Delete booking"
                aria-label="Delete booking"
              >
                <Trash2 size={14} />
              </button>
              {expanded
                ? <ChevronUp size={16} className="text-muted" />
                : <ChevronDown size={16} className="text-muted" />}
            </div>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 pt-4 flex flex-col gap-4 bg-gray-50/30">

            {/* Booking metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted text-xs mb-0.5 font-sans uppercase tracking-wide">Phone</p>
                <p className="text-text font-sans">{booking.phone || u?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-muted text-xs mb-0.5 font-sans uppercase tracking-wide">Address</p>
                <p className="text-text font-sans break-words">{booking.address || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted text-xs mb-0.5 font-sans uppercase tracking-wide">Issue</p>
                <p className="text-text font-sans">{booking.serviceIssue || "—"}</p>
              </div>
              {booking.notes && (
                <div className="sm:col-span-2">
                  <p className="text-muted text-xs mb-0.5 font-sans uppercase tracking-wide">Notes</p>
                  <p className="text-text font-sans">{booking.notes}</p>
                </div>
              )}
            </div>

            {/* Assigned worker — read-only when already assigned */}
            {assigned?.name ? (
              <div className="flex flex-col gap-1.5 px-3 py-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-blue-500 text-xs font-bold uppercase tracking-wide font-sans">Assigned Worker</p>
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-blue-600 flex-shrink-0" />
                  <p className="text-blue-700 font-semibold text-sm font-sans">{assigned.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Phone size={12} className="text-blue-500 flex-shrink-0" />
                  <p className="text-blue-600 text-xs font-sans">{assigned.phone}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                    ${booking.contactSource === "admin"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-600"
                    }`}>
                    {booking.contactSource === "admin" ? "Admin contact" : "Worker contact"}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Rejection details — why the customer rejected the quote */}
            {booking.rejection && (
              <RejectionPanel rejection={booking.rejection} />
            )}

            {/* Quotation breakdown */}
            {booking.quotation && (
              <QuotationBreakdown quotation={booking.quotation} />
            )}

            {/* Superseded quotations (revision history) */}
            {booking.quotationHistory?.length > 0 && (
              <QuotationHistoryPanel history={booking.quotationHistory} />
            )}

            {/* Activity timeline */}
            {booking.history?.length > 0 && (
              <TimelinePanel history={booking.history} />
            )}

            {/* Pending: quotation */}
            {booking.status === "pending" && (
              <button
                onClick={() => setShowQuoteModal(true)}
                disabled={saving}
                className="btn-primary w-full justify-center gap-2"
              >
                <FileText size={14} />
                Create Quotation
              </button>
            )}

            {/* Revision requested: send a revised quotation */}
            {booking.status === "revision_requested" && (
              <button
                onClick={() => setShowQuoteModal(true)}
                disabled={saving}
                className="btn-primary w-full justify-center gap-2"
              >
                <FileEdit size={14} />
                Create Revised Quotation
              </button>
            )}

            {/* Confirmed: assign worker + mark complete */}
            {booking.status === "confirmed" && (
              <div className="flex flex-col gap-3">
                {!assigned?.name && (
                  <WorkerAssignPanel
                    booking={booking}
                    workers={workers}
                    adminPhone={admin?.phone || ""}
                    onAssign={handleAssignWorker}
                    saving={saving}
                  />
                )}
                <button
                  onClick={() => setShowCompleteModal(true)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                    bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200
                    text-sm font-semibold transition-all disabled:opacity-60 font-sans"
                >
                  <CheckCircle2 size={15} />
                  Mark as Completed
                </button>
              </div>
            )}

            {/* Delete button — also available inside expanded view for clarity */}
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                bg-red-50 hover:bg-red-100 text-red-600 border border-red-200
                text-sm font-semibold transition-all disabled:opacity-60 font-sans"
            >
              {deleting
                ? <span className="inline-block w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                : <><Trash2 size={14} /> Delete Booking</>
              }
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Collapsible section group (mirrors client BookingSectionAccordion) ── */
function AdminSectionGroup({ status, cfg, items, collapsible, workers, onUpdate, onDelete }) {
  const [isOpen, setIsOpen] = useState(!collapsible);

  return (
    <section>
      {collapsible ? (
        /* Collapsible accordion header for completed/cancelled */
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          aria-expanded={isOpen}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border
            bg-card hover:bg-gray-50/60 transition-colors duration-150 mb-3
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className="flex-1 text-left section-label">{cfg.heading}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/8 text-primary font-sans">
            {items.length}
          </span>
          <span className="w-px h-4 bg-border flex-shrink-0" />
          <ChevronDown
            size={15}
            strokeWidth={2.5}
            className={`text-muted flex-shrink-0 transition-transform duration-300 ease-in-out
              ${isOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>
      ) : (
        /* Always-visible heading for active sections */
        <h2 className="section-label mb-3">{cfg.heading} ({items.length})</h2>
      )}

      {/* CSS grid collapse animation — same technique as client BookingSectionAccordion */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={collapsible ? "pt-1" : ""}>
            <div className="flex flex-col gap-3 pb-1">
              {items.map(b => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  workers={workers}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ── */
export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [workers,  setWorkers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingsRes, workersRes] = await Promise.allSettled([
        getAllBookings(),
        getWorkers(),
      ]);
      if (bookingsRes.status === "fulfilled") {
        setBookings(bookingsRes.value.data.bookings);
      } else {
        setError("Failed to load bookings.");
      }
      if (workersRes.status === "fulfilled") {
        setWorkers(workersRes.value.data.workers ?? []);
      } else {
        console.error("Workers failed to load:", workersRes.reason);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = (updated) => {
    setBookings(prev => prev.map(b => b._id === updated._id ? updated : b));
  };

  // Remove deleted booking from local state immediately — no refetch needed
  const handleDelete = (id) => {
    setBookings(prev => prev.filter(b => b._id !== id));
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.service.toLowerCase().includes(q) ||
      b.userId?.name?.toLowerCase().includes(q) ||
      b.userId?.email?.toLowerCase().includes(q) ||
      b._id.toLowerCase().includes(q);
    const matchFilter = filter === "all" || b.status === filter;
    return matchSearch && matchFilter;
  });

  const grouped = SECTION_ORDER.reduce((acc, s) => {
    acc[s] = filtered.filter(b => b.status === s);
    return acc;
  }, {});

  const totalPending = bookings.filter(
    b => b.status === "pending" || b.status === "revision_requested"
  ).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-sans font-bold text-text text-xl sm:text-2xl">Bookings</h1>
          {totalPending > 0 && (
            <p className="text-amber-600 text-sm mt-1 font-sans">
              {totalPending} pending booking{totalPending > 1 ? "s" : ""} need{totalPending === 1 ? "s" : ""} a quotation
            </p>
          )}
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost w-full sm:w-auto">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name, service, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="input-base w-full sm:w-auto cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {SECTION_ORDER.map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200
          rounded-xl text-red-700 text-sm font-sans">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-sans">No bookings found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {SECTION_ORDER.map(status => {
            const items = grouped[status];
            if (!items?.length) return null;
            const cfg = STATUS_CFG[status];
            const collapsible = COLLAPSED_BY_DEFAULT.has(status);
            return (
              <AdminSectionGroup
                key={status}
                status={status}
                cfg={cfg}
                items={items}
                collapsible={collapsible}
                workers={workers}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}