// client/src/services/adminApi.js

import axios from "axios";

// ── Unauthenticated axios instance (no auth header, no 401 interceptor) ───────
// Used exclusively for public endpoints that must never trigger the /login
// redirect for unauthenticated visitors.
const publicApi = axios.create({
  headers: { "Content-Type": "application/json" },
});

// ── Services (public — no auth token needed) ──────────────────────────────────
export const getPublicServices = () =>
  publicApi.get("/api/services");

// ── Config: time slots (public — single source of truth from server) ──────────
export const getTimeSlots = () =>
  publicApi.get("/api/config/time-slots");

// ── Config: site/footer contact details (public — driven by server env vars) ──
export const getSiteConfig = () =>
  publicApi.get("/api/config/site");

// ── Config: reschedule lockout window (public — admin-configurable) ───────────
// Returns { minHoursBeforeReschedule: number }. Value of 0 means guard disabled.
export const getRescheduleHours = () =>
  publicApi.get("/api/config/reschedule-hours");