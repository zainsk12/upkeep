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
    // A 401 only means "session expired → bounce to login" for an AUTHENTICATED
    // request, i.e. one that actually carried a bearer token. Redirecting on ALL
    // 401s also hijacked the login form's own 401 (invalid credentials): the
    // forced full-page reload remounted the SPA and wiped the error toast +
    // "Forgot Password" reveal before LoginPage could react. We detect an
    // authenticated request by the presence of the Authorization header the
    // request interceptor attaches (login/forgot/reset requests carry none), so
    // their 401s now propagate to the calling component as intended.
    const cfg = err.config || {};
    const wasAuthenticated = Boolean(
      cfg.headers?.Authorization || cfg.headers?.authorization
    );
    if (err.response?.status === 401 && wasAuthenticated) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;