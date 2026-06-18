// admin-client/src/services/axios.js

import axios from "axios";

// baseURL is empty in development → axios uses relative /api/* paths, which the
// Vite dev-server proxy (/api → localhost:5000) forwards to the local backend.
// In production, set VITE_API_URL to the deployed backend origin (no trailing
// slash, no /api suffix) so requests go cross-origin to Railway.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
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