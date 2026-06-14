// admin-client/src/pages/WorkersPage.jsx

import { useEffect, useState, useCallback } from "react";
import { toast } from "../utils/toast";
import {
  RefreshCw, Plus, Pencil, UserCheck, UserX,
  Phone, Briefcase, Star, X, AlertCircle, Users,
} from "lucide-react";
import { getWorkers, createWorker, updateWorker, toggleWorker } from "../services/api";

/* ── Skill badge ── */
function SkillBadge({ skill }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
      bg-primary/10 text-primary border border-primary/20 capitalize">
      {skill}
    </span>
  );
}

/* ── Worker form modal (add / edit) ── */
function WorkerModal({ worker, onClose, onSave }) {
  const isEdit = !!worker?._id;
  const [fields, setFields] = useState({
    name:       worker?.name                  || "",
    phone:      worker?.phone                 || "",
    skills:     worker?.skills?.join(", ")    || "",
    experience: worker?.experience?.toString() || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setFields((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!fields.name.trim())  { toast.error("Name is required.");  return; }
    if (!fields.phone.trim()) { toast.error("Phone is required."); return; }

    setSaving(true);
    try {
      const payload = {
        name:       fields.name.trim(),
        phone:      fields.phone.trim(),
        skills:     fields.skills,
        experience: parseFloat(fields.experience) || 0,
      };

      const res = isEdit
        ? await updateWorker(worker._id, payload)
        : await createWorker(payload);

      toast.success(isEdit ? "Worker updated." : "Worker added.");
      onSave(res.data.worker);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-0.5 font-sans">
              {isEdit ? "Edit Worker" : "Add Worker"}
            </p>
            <h2 className="text-white font-bold text-lg font-sans">
              {isEdit ? worker.name : "New Team Member"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text uppercase tracking-wide font-sans">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Full name"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              className="input-base w-full font-sans"
              autoFocus
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text uppercase tracking-wide font-sans">
              Phone <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={fields.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="input-base w-full font-sans"
            />
          </div>

          {/* Skills */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text uppercase tracking-wide font-sans">
              Skills
            </label>
            <input
              type="text"
              placeholder="e.g. plumber, electrician, carpenter"
              value={fields.skills}
              onChange={(e) => set("skills", e.target.value)}
              className="input-base w-full font-sans"
            />
            <p className="text-muted text-xs font-sans">Separate multiple skills with commas</p>
            {fields.skills && (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {fields.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                  <SkillBadge key={s} skill={s} />
                ))}
              </div>
            )}
          </div>

          {/* Experience */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text uppercase tracking-wide font-sans">
              Experience (years)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="0"
              value={fields.experience}
              onChange={(e) => set("experience", e.target.value)}
              className="input-base w-full font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-card flex flex-col sm:flex-row gap-3">
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
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-primary hover:bg-primary-hover text-white text-sm font-bold
              transition-all shadow-md shadow-primary/25 disabled:opacity-60 font-sans"
          >
            {saving
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : isEdit ? "Save Changes" : "Add Worker"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Worker card ── */
function WorkerCard({ worker, onEdit, onToggle }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await toggleWorker(worker._id);
      toast.success(res.data.message);
      onToggle(res.data.worker);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Toggle failed.");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className={`admin-card p-4 sm:p-5 flex flex-col gap-4 transition-opacity ${!worker.active ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${worker.active ? "bg-primary/10" : "bg-gray-100"}`}>
            <UserCheck size={18} className={worker.active ? "text-primary" : "text-muted"} />
          </div>
          <div className="min-w-0">
            <p className="text-text font-bold text-sm font-sans truncate">{worker.name}</p>
            <p className="text-muted text-xs font-sans flex items-center gap-1 mt-0.5">
              <Phone size={10} />
              {worker.phone}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0
          ${worker.active
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-gray-50 text-gray-500 border-gray-200"
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${worker.active ? "bg-emerald-500" : "bg-gray-400"}`} />
          {worker.active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Skills */}
      {worker.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {worker.skills.map((s) => <SkillBadge key={s} skill={s} />)}
        </div>
      )}

      {/* Experience */}
      {worker.experience > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted font-sans">
          <Star size={11} className="text-amber-400" />
          {worker.experience} yr{worker.experience !== 1 ? "s" : ""} experience
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-border">
        <button
          onClick={() => onEdit(worker)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
            border border-border text-muted hover:bg-gray-50 text-xs font-semibold
            transition-all font-sans"
        >
          <Pencil size={12} />
          Edit
        </button>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
            text-xs font-semibold transition-all font-sans disabled:opacity-60
            ${worker.active
              ? "border border-red-200 text-red-600 hover:bg-red-50"
              : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }`}
        >
          {toggling
            ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            : worker.active
              ? <><UserX size={12} /> Deactivate</>
              : <><UserCheck size={12} /> Activate</>
          }
        </button>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [modal,   setModal]   = useState(null);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getWorkers();
      setWorkers(res.data.workers);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load workers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = (saved) => {
    setWorkers((prev) => {
      const idx = prev.findIndex((w) => w._id === saved._id);
      return idx >= 0
        ? prev.map((w) => (w._id === saved._id ? saved : w))
        : [saved, ...prev];
    });
    setModal(null);
  };

  const handleToggle = (updated) => {
    setWorkers((prev) => prev.map((w) => (w._id === updated._id ? updated : w)));
  };

  const visible = workers.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      w.name.toLowerCase().includes(q) ||
      w.phone.includes(q) ||
      w.skills?.some((s) => s.toLowerCase().includes(q));
    const matchFilter =
      filter === "all" ||
      (filter === "active"   && w.active) ||
      (filter === "inactive" && !w.active);
    return matchSearch && matchFilter;
  });

  const activeCount   = workers.filter((w) => w.active).length;
  const inactiveCount = workers.length - activeCount;

  return (
    <>
      {modal !== null && (
        <WorkerModal
          worker={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl overflow-x-hidden">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-sans font-bold text-text text-xl sm:text-2xl">Workers</h1>
            {!loading && (
              <p className="text-muted text-sm mt-1 font-sans">
                {activeCount} active · {inactiveCount} inactive
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={load} disabled={loading} className="btn-ghost w-full sm:w-auto">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button onClick={() => setModal("add")} className="btn-primary w-full sm:w-auto gap-2 justify-center">
              <Plus size={14} />
              Add Worker
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name, phone, skill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 w-full"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-base w-full sm:w-auto cursor-pointer"
          >
            <option value="all">All Workers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200
            rounded-xl text-red-700 text-sm font-sans">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && visible.length === 0 && (
          <div className="text-center py-20 text-muted">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-sans">
              {workers.length === 0
                ? "No workers yet. Add your first team member."
                : "No workers match your search."
              }
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((w) => (
              <WorkerCard
                key={w._id}
                worker={w}
                onEdit={(w) => setModal(w)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}