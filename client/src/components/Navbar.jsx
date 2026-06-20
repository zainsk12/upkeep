// client/src/components/Navbar.jsx

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Menu, X, CalendarDays, Wrench,
  User, LogOut, ChevronDown, Home, Settings,
} from "lucide-react";

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AvatarDropdown({ user, onLogout, open, onOpenChange }) {
  const ref      = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      // Only the VISIBLE instance reacts. The other breakpoint's instance is
      // display:none (offsetParent === null), so it must NOT treat an in-dropdown
      // click on the active breakpoint as an "outside" click and close it.
      if (ref.current && ref.current.offsetParent !== null && !ref.current.contains(e.target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOpenChange]);

  const initials = getInitials(user?.name || user?.email || "U");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-1.5 focus:outline-none group"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div
          className="w-9 h-9 rounded-full bg-blush text-primary font-bold text-sm
            flex items-center justify-center border-2 border-blush/60
            group-hover:border-white/80 group-hover:scale-105 transition-all duration-200
            shadow-md shadow-primary/30 select-none"
        >
          {initials}
        </div>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] w-52 bg-card rounded-2xl
            shadow-2xl border border-border overflow-hidden z-[100]"
          style={{ boxShadow: "0 8px 40px rgba(8,53,74,0.15), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <div className="px-4 py-3.5 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs
                flex items-center justify-center flex-shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-text font-semibold text-sm truncate leading-tight">
                  {user?.name || "User"}
                </p>
                <p className="text-muted text-xs truncate leading-tight mt-0.5">
                  {user?.email || ""}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5 flex flex-col gap-0.5">
            <button
              onClick={() => { onOpenChange(false); navigate("/settings/account"); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
                text-text hover:bg-primary/6 hover:text-primary
                text-sm font-medium transition-all duration-150 group"
            >
              <User size={15} strokeWidth={2} className="text-muted group-hover:text-primary transition-colors" />
              Account
            </button>
            <button
              onClick={() => { onOpenChange(false); navigate("/settings"); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
                text-text hover:bg-primary/6 hover:text-primary
                text-sm font-medium transition-all duration-150 group"
            >
              <Settings size={15} strokeWidth={2} className="text-muted group-hover:text-primary transition-colors" />
              Settings
            </button>
            <button
              onClick={() => { onOpenChange(false); onLogout(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
                text-muted hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500
                text-sm font-medium transition-all duration-150 group"
            >
              <LogOut size={15} strokeWidth={2} className="text-muted group-hover:text-red-500 transition-colors" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen]             = useState(false); // mobile hamburger menu
  const [avatarOpen, setAvatarOpen] = useState(false); // avatar dropdown

  // Close both overlays on navigation.
  useEffect(() => { setOpen(false); setAvatarOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate("/"); setOpen(false); setAvatarOpen(false); };
  const close = () => setOpen(false);

  // Mutually exclusive overlays — opening one closes the other (only one mobile
  // overlay can be open at a time).
  const toggleMobileMenu      = () => { setOpen((prev) => !prev); setAvatarOpen(false); };
  const handleAvatarOpenChange = (next) => { setAvatarOpen(next); if (next) setOpen(false); };

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const navCls = (path) => [
    "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm transition-all duration-150 nav-link",
    isActive(path)
      ? "bg-white/[0.18] text-white font-semibold shadow-sm shadow-black/10"
      : "text-white/65 hover:text-white hover:bg-white/10",
  ].join(" ");

  const mobileNavCls = (path) => [
    "flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm nav-link transition-all duration-150",
    isActive(path)
      ? "bg-white/15 text-white font-semibold"
      : "text-white/70 hover:text-white hover:bg-white/10",
  ].join(" ");

  // Mobile-only hamburger button. Rendered on the far left when logged in
  // (avatar balances the far right) and on the far right when logged out
  // (branding takes the left). `edgeCls` sets the edge-hugging negative margin.
  const hamburgerButton = (edgeCls) => (
    <button
      className={`md:hidden p-2 ${edgeCls} rounded-lg text-white/80 hover:text-white hover:bg-white/10
        transition-all focus:outline-none focus:ring-2 focus:ring-white/30`}
      onClick={toggleMobileMenu}
      aria-label={open ? "Close menu" : "Open menu"}
    >
      {open ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
    </button>
  );

  return (
    <nav
      className="bg-primary dark:bg-primary-dark sticky top-0 z-50"
      style={{ boxShadow: "0 2px 24px rgba(8,53,74,0.45)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[68px]">

          {/* LEFT — mobile hamburger (logged-in) / mobile branding (logged-out)
              + desktop logo lockup */}
          <div className="flex items-center min-w-0">
            {/* Hamburger — mobile only, far left when logged in */}
            {isAuthenticated && hamburgerButton("-ml-1")}

            {/* Mobile branding — logged-out only. Restores the logo + wordmark on
                the left so the navbar stays balanced without an avatar on the
                right. Mirrors the desktop lockup; mobile-only (md:hidden). */}
            {!isAuthenticated && (
              <Link to="/" className="flex md:hidden items-center gap-2.5 group min-w-0" onClick={close}>
                <img
                  src="/upkeep_logo.png"
                  alt="UpKeep by Austrum"
                  className="h-8 w-8 rounded-full object-cover border-2 border-white/20
                    group-hover:border-white/50 shadow-sm transition-all duration-200 flex-shrink-0"
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-white text-lg leading-tight nav-brand truncate">UpKeep</span>
                  <span className="text-white/35 text-[9px] font-medium leading-none tracking-[0.12em] uppercase truncate">
                    by Austrum
                  </span>
                </div>
              </Link>
            )}

            {/* Logo lockup — desktop only (hidden on mobile to avoid duplicate
                branding with the Hero section) */}
            <Link to="/" className="hidden md:flex items-center gap-2.5 group flex-shrink-0" onClick={close}>
            {/* TODO: temporary full-badge logo; replace with icon-only transparent
                "Variant B" mark once available (see LOGO_INTEGRATION_PLAN.md §3) */}
            <img
              src="/upkeep_logo.png"
              alt="UpKeep by Austrum"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border-2 border-white/20
                group-hover:border-white/50 shadow-sm transition-all duration-200"
            />
            <div className="hidden sm:flex flex-col justify-center">
              <span className="text-white text-lg sm:text-xl leading-tight nav-brand">UpKeep</span>
              <span className="text-white/35 text-[9px] font-medium leading-none tracking-[0.12em] uppercase">
                by Austrum
              </span>
            </div>
            </Link>
          </div>

          {/* RIGHT — desktop nav + mobile avatar (far right) */}
          <div className="flex items-center">
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
            <Link to="/" className={navCls("/")}>
              <Home size={14} strokeWidth={2.5} />
              Home
            </Link>
            <Link to="/services" className={navCls("/services")}>
              <Wrench size={14} strokeWidth={2.5} />
              Services
            </Link>

            {!isAuthenticated && (
              <>
                <Link to="/login" className={navCls("/login")}>Login</Link>
                <Link
                  to="/signup"
                  className="ml-2 px-5 py-2 rounded-full bg-blush hover:bg-blush/80
                    text-primary text-sm font-bold transition-all hover:-translate-y-0.5
                    shadow-md shadow-blush/30 hover:shadow-lg nav-link"
                >
                  Sign Up
                </Link>
              </>
            )}

            {isAuthenticated && (
              <>
                <Link to="/my-bookings" className={navCls("/my-bookings")}>
                  <CalendarDays size={14} strokeWidth={2.5} />
                  My Bookings
                </Link>
                <div className="ml-2">
                  <AvatarDropdown user={user} onLogout={handleLogout} open={avatarOpen} onOpenChange={handleAvatarOpenChange} />
                </div>
              </>
            )}
          </div>

            {/* Mobile avatar — far right (logged in) */}
            {isAuthenticated && (
              <div className="md:hidden">
                <AvatarDropdown user={user} onLogout={handleLogout} open={avatarOpen} onOpenChange={handleAvatarOpenChange} />
              </div>
            )}

            {/* Mobile hamburger — far right (logged out), balances the branding
                now shown on the left */}
            {!isAuthenticated && hamburgerButton("-mr-1")}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-primary-dark border-t border-white/10 px-4 pt-3 pb-5 flex flex-col gap-1">
          <Link to="/" className={mobileNavCls("/")} onClick={close}>
            <Home size={16} strokeWidth={2} /> Home
          </Link>
          <Link to="/services" className={mobileNavCls("/services")} onClick={close}>
            <Wrench size={16} strokeWidth={2} /> Services
          </Link>

          {!isAuthenticated && (
            <>
              <Link to="/login" className={mobileNavCls("/login")} onClick={close}>Login</Link>
              <Link
                to="/signup"
                className="mt-1 bg-blush text-primary text-sm font-bold px-4 py-3
                  rounded-xl text-center nav-link hover:bg-blush/80 transition-colors"
                onClick={close}
              >
                Sign Up Free
              </Link>
            </>
          )}

          {isAuthenticated && (
            <>
              <Link to="/my-bookings" className={mobileNavCls("/my-bookings")} onClick={close}>
                <CalendarDays size={16} strokeWidth={2} /> My Bookings
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}