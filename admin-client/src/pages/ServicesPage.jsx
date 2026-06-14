// admin-client/src/pages/ServicesPage.jsx

import { useEffect, useState, useCallback } from "react";
import { toast } from "../utils/toast";
import {
  Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw,
  AlertCircle, Wrench, Pencil, Check, X,
} from "lucide-react";
import { getServices, createService, updateService, deleteService } from "../services/api";

/* ─── Confirm Delete Modal ── */
function ConfirmDeleteModal({ serviceName, onClose, onConfirm, deleting }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="flex flex-col items-center pt-7 pb-4 px-6">
          <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-4">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h2 className="text-text font-bold text-lg font-sans text-center leading-tight">
            Delete Service
          </h2>
          <p className="text-muted text-sm font-sans text-center mt-2 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-text">"{serviceName}"</span>?
          </p>
          <p className="text-red-500 text-xs font-semibold font-sans mt-2 text-center">
            This action cannot be undone.
          </p>
        </div>
        <div className="border-t border-border mx-6" />
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
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Trash2 size={14} /> Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service, onUpdate, onDelete }) {
  const [editing, setEditing]       = useState(false);
  const [nameVal, setNameVal]       = useState(service.name);
  const [descVal, setDescVal]       = useState(service.description || "");
  const [reasonVal, setReasonVal]   = useState(service.disabledReason || "");
  const [showReason, setShowReason] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const doUpdate = async (data) => {
    setSaving(true);
    try {
      const res = await updateService(service._id, data);
      onUpdate(res.data.service);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!nameVal.trim()) { toast.error("Name cannot be empty."); return; }
    const ok = await doUpdate({ name: nameVal.trim(), description: descVal.trim() });
    if (ok) { setEditing(false); toast.success("Service updated."); }
  };

  const handleToggle = async () => {
    if (service.isEnabled) {
      setShowReason(true);
    } else {
      const ok = await doUpdate({ isEnabled: true });
      if (ok) toast.success("Service enabled.");
    }
  };

  const handleDisableWithReason = async () => {
    const ok = await doUpdate({ isEnabled: false, disabledReason: reasonVal.trim() });
    if (ok) { setShowReason(false); setReasonVal(""); toast.success("Service disabled."); }
  };

  const handleDelete = async () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteService(service._id);
      onDelete(service._id);
      toast.success(`"${service.name}" deleted.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      {showDeleteModal && (
        <ConfirmDeleteModal
          serviceName={service.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />
      )}
      <div className={`admin-card overflow-hidden transition-all
        ${!service.isEnabled ? "border-red-200 bg-red-50/20" : ""}`}>

      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between p-4 sm:p-5">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                className="input-base w-full"
                placeholder="Service name"
              />
              <textarea
                value={descVal}
                onChange={e => setDescVal(e.target.value)}
                rows={2}
                className="input-base resize-none w-full"
                placeholder="Description (optional)"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-text font-semibold text-sm font-sans">{service.name}</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                  ${service.isEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${service.isEnabled ? "bg-emerald-500" : "bg-red-500"}`} />
                  {service.isEnabled ? "Active" : "Disabled"}
                </span>
              </div>
              {service.description && (
                <p className="text-muted text-xs mt-1 font-sans">{service.description}</p>
              )}
              {!service.isEnabled && service.disabledReason && (
                <p className="text-red-600 text-xs mt-1 font-sans">
                  Reason: {service.disabledReason}
                </p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {editing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100
                  border border-emerald-200 transition-all disabled:opacity-60"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => { setEditing(false); setNameVal(service.name); setDescVal(service.description || ""); }}
                className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:text-text
                  border border-gray-200 transition-all"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-text
                  border border-gray-200 hover:border-gray-300 transition-all"
                title="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleToggle}
                disabled={saving}
                className={`p-2 rounded-lg border transition-all disabled:opacity-60
                  ${service.isEnabled
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                    : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  }`}
                title={service.isEnabled ? "Disable service" : "Enable service"}
              >
                {service.isEnabled
                  ? <ToggleRight size={14} />
                  : <ToggleLeft size={14} />
                }
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-red-600
                  border border-gray-200 hover:border-red-200 transition-all disabled:opacity-60"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Disable reason prompt */}
      {showReason && (
        <div className="mx-4 sm:mx-5 mb-4 sm:mb-5 pt-4 border-t border-gray-100 flex flex-col gap-2">
          <label className="text-muted text-xs font-medium font-sans">
            Reason for disabling (shown to users):
          </label>
          <input
            value={reasonVal}
            onChange={e => setReasonVal(e.target.value)}
            placeholder="e.g. Temporarily unavailable for maintenance"
            className="input-base w-full"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleDisableWithReason}
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200
                text-sm font-medium hover:bg-red-100 transition-all disabled:opacity-60 font-sans"
            >
              {saving ? "Disabling…" : "Disable Service"}
            </button>
            <button
              onClick={() => setShowReason(false)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gray-50 text-gray-500 border border-gray-200
                text-sm hover:text-text transition-all font-sans"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [newDesc, setNewDesc]   = useState("");
  const [adding, setAdding]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getServices();
      setServices(res.data.services);
    } catch {
      setError("Failed to load services.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Service name is required."); return; }
    setAdding(true);
    try {
      const res = await createService({ name: newName.trim(), description: newDesc.trim() });
      setServices(prev => [...prev, res.data.service]);
      setNewName("");
      setNewDesc("");
      setShowAdd(false);
      toast.success(`"${res.data.service.name}" created.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed.");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = (updated) => {
    setServices(prev => prev.map(s => s._id === updated._id ? updated : s));
  };

  const handleDelete = (id) => {
    setServices(prev => prev.filter(s => s._id !== id));
  };

  const active   = services.filter(s => s.isEnabled);
  const disabled = services.filter(s => !s.isEnabled);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl overflow-x-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-sans font-bold text-text text-xl sm:text-2xl">Services</h1>
          <p className="text-muted text-sm mt-1 font-sans">
            {services.length} total · {active.length} active · {disabled.length} disabled
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={load} disabled={loading} className="btn-ghost w-full sm:w-auto">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => setShowAdd(v => !v)} className="btn-primary w-full sm:w-auto justify-center">
            <Plus size={14} />
            Add Service
          </button>
        </div>
      </div>

      {/* Add service form */}
      {showAdd && (
        <div className="mb-6 bg-card border border-primary/20 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-text font-semibold text-sm mb-4 font-sans">New Service</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-muted text-xs font-medium block mb-1.5 font-sans">Service Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Plumbing"
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="text-muted text-xs font-medium block mb-1.5 font-sans">Description</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                placeholder="Short description shown to users…"
                className="input-base resize-none w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button onClick={handleCreate} disabled={adding} className="btn-primary w-full sm:w-auto justify-center disabled:opacity-60">
                {adding ? "Creating…" : "Create Service"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewName(""); setNewDesc(""); }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-50 text-gray-500 border border-gray-200
                  text-sm hover:text-text transition-all font-sans"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
      ) : services.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <Wrench size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-3 font-sans">No services yet</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-primary text-sm hover:text-primary-hover transition-colors font-sans"
          >
            Add your first service →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Active */}
          {active.length > 0 && (
            <section>
              <h2 className="section-label mb-3">
                ✅ Active Services ({active.length})
              </h2>
              <div className="flex flex-col gap-3">
                {active.map(s => (
                  <ServiceCard key={s._id} service={s} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}

          {/* Disabled */}
          {disabled.length > 0 && (
            <section>
              <h2 className="section-label mb-3">
                ❌ Disabled Services ({disabled.length})
              </h2>
              <div className="flex flex-col gap-3">
                {disabled.map(s => (
                  <ServiceCard key={s._id} service={s} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}