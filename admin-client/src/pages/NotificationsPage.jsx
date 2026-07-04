// admin-client/src/pages/NotificationsPage.jsx
//
// Admin Notification Management (Module 4). Compose/schedule broadcasts, review
// delivery analytics, and manage the send history. Delivery, real-time push and
// analytics all reuse the existing backend infrastructure (Modules 2/3).

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Bell, Send, CalendarClock, Trash2, RefreshCw, AlertCircle, Search,
  SlidersHorizontal, Plus, X, Copy, Ban, Eye, Users, Send as SendIcon,
  CheckCheck, MailCheck, Percent, Activity,
} from "lucide-react";
import { toast } from "../utils/toast";
import {
  getNotificationAnalytics, getNotificationCampaigns, createNotificationCampaign,
  resendNotificationCampaign, cancelNotificationCampaign, deleteNotificationCampaign,
  getNotificationUsers, getAudienceCount, getServices,
} from "../services/api";
import {
  TYPE_META, TYPE_OPTIONS, TYPE_DEFAULT_CATEGORY, CATEGORY_OPTIONS,
  PRIORITY_META, PRIORITY_OPTIONS, STATUS_META, ICON_OPTIONS, resolveIcon,
} from "../constants/notifications";

/* ─── helpers ─────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtShort = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const AUDIENCE_MODES = [
  { value: "all",     label: "All Users" },
  { value: "users",   label: "Selected Users" },
  { value: "city",    label: "By City" },
  { value: "service", label: "By Service" },
];

const EMPTY_FORM = {
  title: "", message: "", type: "special_offer", category: "offers",
  priority: "normal", icon: "Bell", link: "", expiresAt: "",
  schedule: false, scheduledAt: "",
  audience: { mode: "all", userIds: [], city: "", service: "" },
};

/* ─── Analytics stat card ─────────────────────────────── */
function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="admin-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-muted text-xs font-medium truncate">{label}</p>
        <p className="text-text text-lg font-bold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

/* ─── Notification preview card (how the user will see it) ─── */
function PreviewCard({ form }) {
  const meta = TYPE_META[form.type] || {};
  const Icon = resolveIcon(form.icon, form.type);
  const prio = PRIORITY_META[form.priority] || PRIORITY_META.normal;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-start gap-3">
      <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg || "bg-primary/8"}`}>
        <Icon size={18} className={meta.color || "text-primary"} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-text font-semibold text-sm truncate">{form.title || "Notification title"}</h4>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${prio.color}`}>{prio.label}</span>
        </div>
        <p className="text-muted text-xs mt-0.5 line-clamp-2">{form.message || "Your message will appear here."}</p>
        <p className="text-gray-400 text-[11px] mt-1.5 capitalize">{form.category} · Just now</p>
      </div>
    </div>
  );
}

/* ─── Audience picker ─────────────────────────────────── */
function AudiencePicker({ audience, onChange, services }) {
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // full objects for chips

  // Debounced user search (only in "users" mode)
  useEffect(() => {
    if (audience.mode !== "users") return undefined;
    const t = setTimeout(async () => {
      try {
        const res = await getNotificationUsers(userQuery.trim());
        setUserResults(res.data.users || []);
      } catch { /* non-critical */ }
    }, 350);
    return () => clearTimeout(t);
  }, [userQuery, audience.mode]);

  const toggleUser = (u) => {
    const has = audience.userIds.includes(u._id);
    const nextIds = has ? audience.userIds.filter((id) => id !== u._id) : [...audience.userIds, u._id];
    setSelectedUsers((prev) => has ? prev.filter((x) => x._id !== u._id) : [...prev, u]);
    onChange({ ...audience, userIds: nextIds });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {AUDIENCE_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange({ mode: m.value, userIds: [], city: "", service: "" })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              audience.mode === m.value
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-primary/40"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {audience.mode === "users" && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search users by name, phone or email…"
              className="input-base pl-9 py-2"
            />
          </div>
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <span key={u._id} className="inline-flex items-center gap-1 bg-primary/8 text-primary text-xs font-medium px-2 py-1 rounded-lg">
                  {u.name}
                  <button type="button" onClick={() => toggleUser(u)}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
            {userResults.length === 0 ? (
              <p className="text-muted text-xs text-center py-4">No users found.</p>
            ) : userResults.map((u) => {
              const sel = audience.userIds.includes(u._id);
              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${sel ? "bg-primary/5" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="text-text font-medium block truncate">{u.name}</span>
                    <span className="text-muted text-xs block truncate">{u.phone}{u.email ? ` · ${u.email}` : ""}</span>
                  </span>
                  {sel && <CheckCheck size={14} className="text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {audience.mode === "city" && (
        <input
          value={audience.city}
          onChange={(e) => onChange({ ...audience, city: e.target.value })}
          placeholder="Enter city name (matches saved & booking addresses)"
          className="input-base py-2"
        />
      )}

      {audience.mode === "service" && (
        <select
          value={audience.service}
          onChange={(e) => onChange({ ...audience, service: e.target.value })}
          className="input-base py-2 cursor-pointer"
        >
          <option value="">Select a service…</option>
          {services.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
        </select>
      )}
    </div>
  );
}

/* ─── Compose modal ───────────────────────────────────── */
function ComposeModal({ initial, services, onClose, onSent }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reach, setReach] = useState(null); // recipient count
  const [reachLoading, setReachLoading] = useState(false);
  const reachReq = useRef(0);
  const panelRef = useRef(null);

  // Close on Escape (keyboard accessibility for the modal).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // On open: move focus into the dialog (keyboard/SR users land inside it) and
  // lock background scroll so the admin page behind the overlay can't scroll.
  useEffect(() => {
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-fill category when type changes.
  const onTypeChange = (type) =>
    setForm((f) => ({ ...f, type, category: TYPE_DEFAULT_CATEGORY[type] || f.category }));

  // Debounced recipient-count preview whenever the audience changes.
  useEffect(() => {
    const a = form.audience;
    const ready =
      a.mode === "all" ||
      (a.mode === "users" && a.userIds.length > 0) ||
      (a.mode === "city" && a.city.trim()) ||
      (a.mode === "service" && a.service.trim());
    if (!ready) { setReach(null); return undefined; }
    const my = ++reachReq.current;
    setReachLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await getAudienceCount(a);
        if (my === reachReq.current) setReach(res.data.count);
      } catch {
        if (my === reachReq.current) setReach(null);
      } finally {
        if (my === reachReq.current) setReachLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.audience]);

  const validate = () => {
    if (!form.title.trim()) return "Title is required.";
    if (!form.message.trim()) return "Message is required.";
    const a = form.audience;
    if (a.mode === "users" && a.userIds.length === 0) return "Select at least one user.";
    if (a.mode === "city" && !a.city.trim()) return "Enter a city.";
    if (a.mode === "service" && !a.service.trim()) return "Select a service.";
    if (form.schedule) {
      if (!form.scheduledAt) return "Pick a schedule time.";
      if (new Date(form.scheduledAt).getTime() <= Date.now()) return "Schedule time must be in the future.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      // "users" mode covers a single selection too; the server accepts it.
      const payload = {
        title: form.title, message: form.message, type: form.type,
        category: form.category, priority: form.priority, icon: form.icon,
        link: form.link || "", expiresAt: form.expiresAt || null,
        audience: form.audience,
        scheduledAt: form.schedule ? new Date(form.scheduledAt).toISOString() : null,
      };
      const res = await createNotificationCampaign(payload);
      toast.success(res.data.message || "Notification created.");
      onSent();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create notification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Bounded flex column: header + footer are flex-shrink-0 siblings and the
          body is the ONLY scroll area, so they can never overlap and the panel
          never exceeds the viewport. */}
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="compose-modal-title"
        className="bg-card w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col
          max-h-[100dvh] sm:max-h-[calc(100dvh-4rem)] overflow-hidden focus:outline-none">
        {/* header (fixed) */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-card">
          <h2 id="compose-modal-title" className="text-text font-bold text-base flex items-center gap-2">
            <Bell size={17} className="text-primary" /> Compose Notification
          </h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30">
            <X size={16} />
          </button>
        </div>

        {/* body (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4">
          {/* Title + message */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} maxLength={120}
              placeholder="e.g. Monsoon Special — 20% Off" className="input-base py-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
            <textarea value={form.message} onChange={(e) => setField("message", e.target.value)} maxLength={500} rows={3}
              placeholder="Short message shown to users…" className="input-base py-2 resize-none" />
          </div>

          {/* Type / Category / Priority / Icon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => onTypeChange(e.target.value)} className="input-base py-2 cursor-pointer">
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => setField("category", e.target.value)} className="input-base py-2 cursor-pointer">
                {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setField("priority", e.target.value)} className="input-base py-2 cursor-pointer">
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Icon</label>
              <select value={form.icon} onChange={(e) => setField("icon", e.target.value)} className="input-base py-2 cursor-pointer">
                {ICON_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Link + expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Redirect Link (optional)</label>
              <input value={form.link} onChange={(e) => setField("link", e.target.value)} placeholder="/services" className="input-base py-2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Expiry Date (optional)</label>
              <input type="datetime-local" value={form.expiresAt} onChange={(e) => setField("expiresAt", e.target.value)} className="input-base py-2" />
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Audience</label>
            <AudiencePicker audience={form.audience} onChange={(a) => setField("audience", a)} services={services} />
            <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
              <Users size={12} />
              {reachLoading ? "Calculating reach…" : reach != null ? `This will reach ${reach} user${reach !== 1 ? "s" : ""}.` : "Select an audience to preview reach."}
            </p>
          </div>

          {/* Scheduling */}
          <div className="rounded-xl border border-gray-100 p-3 space-y-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="radio" checked={!form.schedule} onChange={() => setField("schedule", false)} className="accent-primary" />
                Send immediately
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="radio" checked={form.schedule} onChange={() => setField("schedule", true)} className="accent-primary" />
                Schedule for later
              </label>
            </div>
            {form.schedule && (
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setField("scheduledAt", e.target.value)} className="input-base py-2" />
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Preview</label>
            <PreviewCard form={form} />
          </div>
        </div>

        {/* footer (fixed) */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-card">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : form.schedule ? <CalendarClock size={14} /> : <Send size={14} />}
            {form.schedule ? "Schedule" : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── View modal ──────────────────────────────────────── */
function ViewModal({ campaign, onClose }) {
  const a = campaign.analytics || {};
  const panelRef = useRef(null);
  // Close on Escape (keyboard accessibility for the modal).
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // On open: focus the dialog and lock background scroll.
  useEffect(() => {
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Same bounded flex-column pattern as ComposeModal: fixed header, the body
          is the only scroll area, panel never exceeds the viewport. */}
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="view-modal-title"
        className="bg-card w-full max-w-lg rounded-2xl shadow-2xl flex flex-col
          max-h-[calc(100dvh-2rem)] overflow-hidden focus:outline-none">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-card">
          <h2 id="view-modal-title" className="text-text font-bold text-base">Notification Details</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"><X size={16} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-4">
          <PreviewCard form={{ ...campaign, schedule: false }} />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Recipient" value={campaign.audienceLabel || "—"} />
            <Detail label="Status" value={(STATUS_META[campaign.status] || {}).label || campaign.status} />
            <Detail label="Created" value={fmtDate(campaign.createdAt)} />
            <Detail label="Scheduled" value={campaign.scheduledAt ? fmtDate(campaign.scheduledAt) : "—"} />
            <Detail label="Sent" value={campaign.sentAt ? fmtDate(campaign.sentAt) : "—"} />
            <Detail label="Expires" value={campaign.expiresAt ? fmtDate(campaign.expiresAt) : "—"} />
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100">
            <MiniStat label="Delivered" value={a.delivered ?? 0} />
            <MiniStat label="Read" value={a.read ?? 0} />
            <MiniStat label="Unread" value={a.unread ?? 0} />
            <MiniStat label="Read %" value={`${a.readPercentage ?? 0}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}
const Detail = ({ label, value }) => (
  <div><p className="text-gray-400 text-xs">{label}</p><p className="text-text font-medium mt-0.5 break-words">{value}</p></div>
);
const MiniStat = ({ label, value }) => (
  <div className="text-center"><p className="text-text font-bold text-lg">{value}</p><p className="text-gray-400 text-xs">{label}</p></div>
);

/* ─── Status badge ────────────────────────────────────── */
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.sent;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${m.color}`}>{m.label}</span>;
}

/* ─── History row ─────────────────────────────────────── */
function CampaignRow({ c, onView, onResend, onCancel, onDelete, onDuplicate, busy }) {
  const [confirm, setConfirm] = useState(false);
  const a = c.analytics || {};
  const Icon = resolveIcon(c.icon, c.type);
  const meta = TYPE_META[c.type] || {};

  return (
    <div className="admin-card p-3.5 sm:p-4">
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${meta.bg || "bg-primary/8"}`}>
          <Icon size={16} className={meta.color || "text-primary"} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-text font-semibold text-sm truncate">{c.title}</p>
            <StatusBadge status={c.status} />
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${(PRIORITY_META[c.priority] || PRIORITY_META.normal).color}`}>
              {(PRIORITY_META[c.priority] || PRIORITY_META.normal).label}
            </span>
          </div>
          <p className="text-muted text-xs mt-0.5 truncate">{c.message}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-400">
            <span className="capitalize">{c.category}</span>
            <span>· {c.audienceLabel || "—"}</span>
            <span>· Created {fmtShort(c.createdAt)}</span>
            {c.scheduledAt && <span>· Scheduled {fmtShort(c.scheduledAt)}</span>}
            {c.sentAt && <span>· Sent {fmtShort(c.sentAt)}</span>}
          </div>
          {/* analytics inline */}
          <div className="flex flex-wrap gap-2 mt-2">
            <Chip icon={SendIcon} label={`${a.delivered ?? 0} sent`} />
            <Chip icon={MailCheck} label={`${a.read ?? 0} read`} />
            <Chip icon={Bell} label={`${a.unread ?? 0} unread`} />
            <Chip icon={Percent} label={`${a.readPercentage ?? 0}% read`} />
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
        <ActBtn icon={Eye} label="View" onClick={() => onView(c)} />
        {c.status === "scheduled" && (
          <ActBtn icon={Ban} label="Cancel" onClick={() => onCancel(c)} disabled={busy} amber />
        )}
        {(c.status === "sent" || c.status === "failed") && (
          <ActBtn icon={RefreshCw} label="Resend" onClick={() => onResend(c)} disabled={busy} />
        )}
        <ActBtn icon={Copy} label="Duplicate" onClick={() => onDuplicate(c)} />
        {confirm ? (
          <span className="flex items-center gap-1.5">
            <ActBtn icon={Trash2} label="Confirm" onClick={() => onDelete(c)} disabled={busy} danger solid />
            <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
          </span>
        ) : (
          <ActBtn icon={Trash2} label="Delete" onClick={() => setConfirm(true)} danger />
        )}
      </div>
    </div>
  );
}
const Chip = ({ icon: Icon, label }) => (
  <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 text-gray-600 text-[11px] font-medium px-2 py-0.5 rounded-full">
    <Icon size={11} /> {label}
  </span>
);
function ActBtn({ icon: Icon, label, onClick, disabled, danger, amber, solid }) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const style = solid
    ? "bg-red-500 border-red-500 text-white"
    : danger
    ? "bg-white border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
    : amber
    ? "bg-white border-gray-200 text-amber-600 hover:bg-amber-50 hover:border-amber-200"
    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-primary hover:border-primary/30";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${style}`}><Icon size={12} /> {label}</button>;
}

/* ─── Main page ───────────────────────────────────────── */
export default function NotificationsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [busyId, setBusyId]       = useState(null);

  // filters
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort]       = useState("newest");
  const [page, setPage]       = useState(1);

  // modals
  const [composeInit, setComposeInit] = useState(null); // object → open compose
  const [viewing, setViewing] = useState(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 15, sort };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (search.trim()) params.search = search.trim();
      const res = await getNotificationCampaigns(params);
      setCampaigns(res.data.campaigns || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [page, sort, status, priority, search]);

  const loadAnalytics = useCallback(async () => {
    try { setAnalytics((await getNotificationAnalytics()).data); } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadAnalytics(); getServices().then((r) => setServices((r.data.services || []).filter((s) => s.isEnabled))).catch(() => {}); }, [loadAnalytics]);

  const refreshAll = () => { loadCampaigns(); loadAnalytics(); };

  const handleResend = async (c) => {
    setBusyId(c._id);
    try { const r = await resendNotificationCampaign(c._id); toast.success(r.data.message || "Resent."); refreshAll(); }
    catch (e) { toast.error(e.response?.data?.message || "Resend failed."); }
    finally { setBusyId(null); }
  };
  const handleCancel = async (c) => {
    setBusyId(c._id);
    try { await cancelNotificationCampaign(c._id); toast.success("Scheduled notification cancelled."); refreshAll(); }
    catch (e) { toast.error(e.response?.data?.message || "Cancel failed."); }
    finally { setBusyId(null); }
  };
  const handleDelete = async (c) => {
    setBusyId(c._id);
    try { await deleteNotificationCampaign(c._id); toast.success("Notification deleted."); setCampaigns((p) => p.filter((x) => x._id !== c._id)); loadAnalytics(); }
    catch (e) { toast.error(e.response?.data?.message || "Delete failed."); }
    finally { setBusyId(null); }
  };
  const handleDuplicate = (c) => {
    // Prefill the compose form from an existing campaign (no send yet).
    setComposeInit({
      title: c.title, message: c.message, type: c.type, category: c.category,
      priority: c.priority, icon: c.icon || "Bell", link: c.link || "", expiresAt: "",
      schedule: false, scheduledAt: "",
      audience: {
        mode: c.audience?.mode || "all",
        userIds: (c.audience?.userIds || []).map(String),
        city: c.audience?.city || "", service: c.audience?.service || "",
      },
    });
  };

  const A = analytics || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl overflow-x-hidden space-y-6">
      {/* header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Bell size={20} className="text-primary" /> Notifications</h1>
          <p className="text-gray-400 text-sm mt-0.5">Send, schedule and track notifications to your users.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} className="btn-ghost"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => setComposeInit(EMPTY_FORM)} className="btn-primary"><Plus size={15} /> Compose</button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard icon={Send}        label="Total Sent"  value={A.totalSent ?? 0}   iconBg="bg-primary/8"   iconColor="text-primary" />
        <StatCard icon={MailCheck}   label="Delivered"   value={A.delivered ?? 0}   iconBg="bg-blue-50"     iconColor="text-blue-600" />
        <StatCard icon={CheckCheck}  label="Read"        value={A.read ?? 0}        iconBg="bg-emerald-50"  iconColor="text-emerald-600" />
        <StatCard icon={Bell}        label="Unread"      value={A.unread ?? 0}      iconBg="bg-amber-50"    iconColor="text-amber-600" />
        <StatCard icon={Percent}     label="Read Rate"   value={`${A.readPercentage ?? 0}%`} iconBg="bg-violet-50" iconColor="text-violet-600" />
        <StatCard icon={Users}       label="Recipients"  value={A.recipients ?? 0}  iconBg="bg-sky-50"      iconColor="text-sky-600" />
        <StatCard icon={Activity}    label="Last Activity" value={A.lastActivity ? fmtShort(A.lastActivity) : "—"} iconBg="bg-gray-100" iconColor="text-gray-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search notifications…" className="input-base pl-9 py-2" />
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm"><SlidersHorizontal size={14} /></div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* History */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="admin-card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3.5 bg-gray-100 rounded w-40" /><div className="h-3 bg-gray-100 rounded w-2/3" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="admin-card flex flex-col items-center justify-center py-16 text-center">
          <Bell size={34} className="text-gray-200 mb-3" strokeWidth={1.5} />
          <p className="text-gray-500 font-semibold">No notifications yet</p>
          <p className="text-gray-400 text-sm mt-1">Compose your first notification to get started.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {campaigns.map((c) => (
              <CampaignRow key={c._id} c={c} busy={busyId === c._id}
                onView={setViewing} onResend={handleResend} onCancel={handleCancel}
                onDelete={handleDelete} onDuplicate={handleDuplicate} />
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-ghost py-1.5 px-3 disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === pagination.totalPages} className="btn-ghost py-1.5 px-3 disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}

      {composeInit && (
        <ComposeModal initial={composeInit} services={services} onClose={() => setComposeInit(null)} onSent={refreshAll} />
      )}
      {viewing && <ViewModal campaign={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
