import axios from "axios";
import { getToken, clearToken } from "../utils/tokenStorage";
import env from "../utils/env";

// baseURL is empty in development → axios uses relative /api/* paths, which the
// Vite dev-server proxy (/api → localhost:5000) forwards to the local backend,
// eliminating CORS in dev. In production, VITE_API_URL points at the deployed
// backend origin so requests go cross-origin to Railway.
const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;