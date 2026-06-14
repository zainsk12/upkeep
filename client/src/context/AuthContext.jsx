import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { getToken, setToken, clearToken } from "../utils/tokenStorage";

const AuthContext = createContext(null);

/**
 * Returns true only when `t` is a non-null JWT whose `exp` claim
 * is in the future. Treats missing/malformed/expired tokens as invalid.
 */
function isTokenValid(t) {
  if (!t) return false;
  try {
    const { exp } = jwtDecode(t);
    if (!exp) return false;                    // no expiry claim — treat as invalid
    return Date.now() < exp * 1000;            // exp is seconds; Date.now() is ms
  } catch {
    return false;
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => {
    const stored = getToken();
    // Discard an already-expired token on cold start — no point keeping it
    if (!isTokenValid(stored)) {
      clearToken();
      return null;
    }
    return stored;
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch {
        setTokenState(null);
        setUser(null);
        clearToken();
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  // Checks both presence AND expiry — expired tokens are treated as logged-out
  const isAuthenticated = isTokenValid(token);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};