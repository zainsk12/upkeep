// admin-client/src/components/Sidebar.jsx

import { NavLink, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  HardHat,
  Star,
  Bell,
  LogOut,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard",     icon: LayoutDashboard, label: "Dashboard"     },
  { to: "/bookings",      icon: CalendarDays,    label: "Bookings"      },
  { to: "/services",      icon: Wrench,          label: "Services"      },
  { to: "/workers",       icon: HardHat,         label: "Workers"       },
  { to: "/reviews",       icon: Star,            label: "Reviews"       }, // MODULE 6
  { to: "/notifications", icon: Bell,            label: "Notifications" }, // MODULE 4
];

function getInitials(name = "") {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length === 1) return (parts[0][0] || "A").toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Sidebar({ isOpen, onClose }) {
  const { admin, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate("/login", { replace: true });
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-screen bg-primary-deeper",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:inset-auto lg:z-auto lg:shrink-0 lg:self-start",
        ].join(" ")}
        style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Logo / Brand */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20
              flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src="/logo.jpg"
                alt="Austrum"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
              <span className="hidden items-center justify-center w-full h-full
                font-display font-bold text-white text-sm">A</span>
            </div>
            <div>
              <p className="font-sans font-bold text-white text-sm leading-tight tracking-tight">
                Austrum
              </p>
              <p className="text-white/40 text-xs leading-tight font-sans">Admin Console</p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-full bg-white/10 hover:bg-white/20
              flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 sidebar-scroll overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans transition-all duration-150",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/8",
                ].join(" ")
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                border border-white/20 select-none font-sans font-bold text-xs text-white bg-white/15"
            >
              {getInitials(admin?.name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-semibold font-sans truncate leading-tight">
                {admin?.name || "Admin"}
              </p>
              <p className="text-white/40 text-xs truncate leading-tight font-sans">
                {admin?.email || ""}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium
              font-sans text-white/50 hover:text-white hover:bg-red-500/15 transition-all duration-150"
          >
            <LogOut size={16} strokeWidth={2} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}