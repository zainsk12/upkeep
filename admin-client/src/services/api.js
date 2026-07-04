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

// ── Notification Management (MODULE 4) ──────────────────────────────────────────
export const getNotificationAnalytics = ()      => api.get("/api/admin/notifications/analytics");
export const getNotificationUsers      = (search) =>
  api.get(`/api/admin/notifications/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);
export const getAudienceCount          = (audience) =>
  api.post("/api/admin/notifications/audience-count", { audience });
export const getNotificationCampaigns  = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/api/admin/notifications${qs ? `?${qs}` : ""}`);
};
export const getNotificationCampaign   = (id)    => api.get(`/api/admin/notifications/${id}`);
export const createNotificationCampaign = (data) => api.post("/api/admin/notifications", data);
export const resendNotificationCampaign = (id)   => api.post(`/api/admin/notifications/${id}/resend`);
export const cancelNotificationCampaign = (id)   => api.patch(`/api/admin/notifications/${id}/cancel`);
export const deleteNotificationCampaign = (id)   => api.delete(`/api/admin/notifications/${id}`);

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