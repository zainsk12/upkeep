// admin-client/src/services/api.js

import api from "./axios";

// ── Auth ───────────────────────────────────────────────────────────────────────
// Routed through the shared `api` instance so it inherits the production
// baseURL (VITE_API_URL). The request interceptor only attaches a token when
// one exists, so this remains effectively tokenless for the login call.
export const adminLogin = (credentials) =>
  api.post("/api/admin/login", credentials);

// ── Bookings ───────────────────────────────────────────────────────────────────
export const getAllBookings = ()          => api.get("/api/admin/bookings");
export const updateBooking  = (id, data) => api.patch(`/api/admin/bookings/${id}`, data);
export const deleteBooking = (id) => api.delete(`/api/admin/bookings/${id}`);

// ── Services ───────────────────────────────────────────────────────────────────
export const getServices     = ()          => api.get("/api/admin/services");
export const createService   = (data)      => api.post("/api/admin/services", data);
export const updateService   = (id, data)  => api.patch(`/api/admin/services/${id}`, data);
export const deleteService   = (id)        => api.delete(`/api/admin/services/${id}`);

// ── Workers ────────────────────────────────────────────────────────────────────
export const getWorkers      = ()          => api.get("/api/admin/workers");
export const createWorker    = (data)      => api.post("/api/admin/workers", data);
export const updateWorker    = (id, data)  => api.put(`/api/admin/workers/${id}`, data);
export const toggleWorker    = (id)        => api.patch(`/api/admin/workers/${id}/toggle`);

// ── Reviews (MODULE 6) ─────────────────────────────────────────────────────────
export const getAdminReviews       = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/api/admin/reviews${qs ? `?${qs}` : ""}`);
};
export const toggleFeatureReview   = (id, isFeatured) =>
  api.patch(`/api/admin/reviews/${id}/feature`, { isFeatured });
export const deleteAdminReview     = (id)             =>
  api.delete(`/api/admin/reviews/${id}`);
export const getReviewSettings     = ()               =>
  api.get("/api/admin/reviews/settings");
export const updateReviewSettings  = (threshold)      =>
  api.patch("/api/admin/reviews/settings", { threshold });