// admin-client/src/context/AdminAuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const AdminAuthContext = createContext(null);

/**
 * Returns true only when `t` is a non-null JWT whose `exp` claim
 * is in the future AND whose role is "admin".
 * Treats missing/malformed/expired tokens as invalid.
 */
function isTokenValid(t) {
  if (!t) return false;
  try {
    const { exp, role } = jwtDecode(t);
    if (role !== "admin") return false;
    if (!exp) return false;                  // no expiry claim — treat as invalid
    return Date.now() < exp * 1000;          // exp is seconds; Date.now() is ms
  } catch {
    return false;
  }
}

export const AdminAuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => {
    const stored = localStorage.getItem("adminToken");
    // Discard an already-expired or invalid token on cold start
    if (!isTokenValid(stored)) {
      localStorage.removeItem("adminToken");
      return null;
    }
    return stored;
  });
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (adminToken) {
      try {
        const decoded = jwtDecode(adminToken);
        // Guard: token must belong to an admin and not be expired
        if (decoded.role !== "admin" || !isTokenValid(adminToken)) {
          localStorage.removeItem("adminToken");
          setAdminToken(null);
          setAdmin(null);
          return;
        }
        setAdmin(decoded);
      } catch {
        localStorage.removeItem("adminToken");
        setAdminToken(null);
        setAdmin(null);
      }
    } else {
      setAdmin(null);
    }
  }, [adminToken]);

  const loginAdmin = (token) => {
    localStorage.setItem("adminToken", token);
    setAdminToken(token);
  };

  const logoutAdmin = () => {
    localStorage.removeItem("adminToken");
    setAdminToken(null);
    setAdmin(null);
  };

  // Checks both presence, role AND expiry — expired tokens are treated as logged-out
  const isAuthenticated = isTokenValid(adminToken) && admin?.role === "admin";

  return (
    <AdminAuthContext.Provider value={{ adminToken, admin, loginAdmin, logoutAdmin, isAuthenticated }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};