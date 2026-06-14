// admin-client/src/services/axios.js

import axios from "axios";

const api = axios.create({
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