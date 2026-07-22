// admin-client/src/services/axios.js

import axios from "axios";

// ── API base URL resolution ───────────────────────────────────────────────────
// Priority:
//   1. VITE_API_URL — set per-environment (Vercel dashboard / .env).
//   2. Production build with no VITE_API_URL → fall back to the deployed Railway
//      backend. The admin Vercel project was missing this env var at build time,
//      so baseURL became "" and /api/admin/login resolved to the Vercel host → 404.
//      This fallback makes the admin panel work regardless of the dashboard var.
//   3. Development → "" → relative /api/* paths via the Vite proxy (vite.config.js).
// Trailing slash / accidental "/api" suffix are stripped to avoid double-/api bugs.
const PROD_API_FALLBACK = "https://upkeep-0hq4.onrender.com";
const rawBase = (import.meta.env.VITE_API_URL || "").trim();
const baseURL = (rawBase || (import.meta.env.PROD ? PROD_API_FALLBACK : ""))
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Attach adminToken (NOT the user "token") to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → clear adminToken and redirect to admin login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("adminToken");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;