import axios from "axios";
import { getToken, clearToken } from "../utils/tokenStorage";

// No baseURL — axios will use relative URLs, so Vite's proxy (/api → localhost:5000) handles routing.
// This eliminates CORS entirely in development.
const api = axios.create({
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