// admin-client/src/pages/Dashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, Clock, CheckCircle2,
  Wrench, TrendingUp, AlertCircle, RefreshCw,
} from "lucide-react";
import { getAllBookings, getServices } from "../services/api";

/* ─── Status config ── */
const STATUS_LABELS = {
  pending:                    { label: "Pending",       color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200"  },
  awaiting_user_confirmation: { label: "Awaiting User", color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
  confirmed:                  { label: "Confirmed",     color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200"   },
  completed:                  { label: "Completed",     color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200"},
  cancelled:                  { label: "Cancelled",     color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200"    },
};

/* Stat card */
function StatCard({ icon: Icon, label, value, iconBg, iconColor, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`admin-card p-4 sm:p-5 flex items-center gap-4
        ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" : ""}`}
    >
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div>
        <p className="text-muted text-xs font-medium font-sans">{label}</p>
        <p className="text-text text-xl sm:text-2xl font-bold font-sans mt-0.5">{value}</p>
      </div>
    </div>
  );
}

/* Status badge */
function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || STATUS_LABELS.pending;
  return (
    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, sRes] = await Promise.all([getAllBookings(), getServices()]);
      setBookings(bRes.data.bookings);
      setServices(sRes.data.services);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  const recent = [...bookings]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl overflow-x-hidden">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="font-sans font-bold text-text text-xl sm:text-2xl">Dashboard</h1>
          <p className="text-muted text-sm mt-1 font-sans">Overview of your platform</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost w-full sm:w-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200
          rounded-xl text-red-700 text-sm font-sans">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
              icon={Clock} label="Pending"
              value={counts.pending || 0}
              iconBg="bg-amber-50" iconColor="text-amber-600"
              onClick={() => navigate("/bookings")}
            />
            <StatCard
              icon={TrendingUp} label="Awaiting User"
              value={counts.awaiting_user_confirmation || 0}
              iconBg="bg-violet-50" iconColor="text-violet-600"
              onClick={() => navigate("/bookings")}
            />
            <StatCard
              icon={CalendarDays} label="Confirmed"
              value={counts.confirmed || 0}
              iconBg="bg-blue-50" iconColor="text-blue-600"
              onClick={() => navigate("/bookings")}
            />
            <StatCard
              icon={CheckCircle2} label="Completed"
              value={counts.completed || 0}
              iconBg="bg-emerald-50" iconColor="text-emerald-600"
              onClick={() => navigate("/bookings")}
            />
            <StatCard
              icon={Wrench} label="Services"
              value={services.length}
              iconBg="bg-primary/8" iconColor="text-primary"
              onClick={() => navigate("/services")}
            />
          </div>

          {/* Two-column panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

            {/* Recent bookings */}
            <div className="admin-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h2 className="font-sans font-semibold text-text text-sm">Recent Bookings</h2>
                <button
                  onClick={() => navigate("/bookings")}
                  className="text-primary text-xs font-medium hover:text-primary-hover transition-colors font-sans"
                >
                  View all →
                </button>
              </div>
              {recent.length === 0 ? (
                <p className="text-muted text-sm text-center py-8 font-sans">No bookings yet</p>
              ) : (
                <div className="flex flex-col">
                  {recent.map((b) => (
                    <div
                      key={b._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="overflow-hidden">
                        <p className="text-text text-sm font-semibold font-sans truncate">
                          {b.userId?.name || "Unknown"}
                        </p>
                        <p className="text-muted text-xs truncate mt-0.5 font-sans">{b.service}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Services overview */}
            <div className="admin-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h2 className="font-sans font-semibold text-text text-sm">Services</h2>
                <button
                  onClick={() => navigate("/services")}
                  className="text-primary text-xs font-medium hover:text-primary-hover transition-colors font-sans"
                >
                  Manage →
                </button>
              </div>
              {services.length === 0 ? (
                <p className="text-muted text-sm text-center py-8 font-sans">No services yet</p>
              ) : (
                <div className="flex flex-col">
                  {services.map((s) => (
                    <div
                      key={s._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="overflow-hidden">
                        <p className="text-text text-sm font-semibold font-sans truncate">{s.name}</p>
                        {s.description && (
                          <p className="text-muted text-xs truncate mt-0.5 font-sans">{s.description}</p>
                        )}
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border
                        ${s.isEnabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                        {s.isEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}