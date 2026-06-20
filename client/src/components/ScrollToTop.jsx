// client/src/components/ScrollToTop.jsx
//
// Global scroll-restoration guard. React Router (v6) does NOT reset the window
// scroll position on navigation — the new page renders at whatever offset the
// previous page was scrolled to. This component watches the active pathname and
// snaps the window back to the top whenever the route changes, so every page
// always opens at (0, 0).
//
// Scope notes:
//   • Keyed on `pathname` only — query-string (`?tab=…`) and same-page state
//     updates do NOT trigger a reset.
//   • In-page anchor links (`/path#section`) are left alone so the browser can
//     jump to the target element instead of being yanked to the top.
//   • Only the main window scroll is touched — modals, dropdowns, and any inner
//     overflow containers manage their own scroll and are unaffected.
//   • `behavior: "instant"` is required because the app sets a global
//     `scroll-behavior: smooth` (index.css); without it every navigation would
//     animate a scroll up instead of starting cleanly at the top.
//
// Uses useLayoutEffect so the reset happens before the browser paints the new
// page — this prevents a visible flash of the new page at the old offset.

import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    // Respect in-page anchor navigation — let the browser resolve `#section`.
    if (hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
