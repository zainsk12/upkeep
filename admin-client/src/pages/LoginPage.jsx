// admin-client/src/pages/LoginPage.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { adminLogin } from "../services/api";

export default function LoginPage() {
  const { loginAdmin, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  // ← FIX: moved navigate() into useEffect — never call navigate() during render
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Both fields are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await adminLogin({ email: form.email.trim().toLowerCase(), password: form.password });
      loginAdmin(res.data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Render nothing while redirect is in flight
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-card border border-gray-200 rounded-2xl shadow-lg p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
              bg-primary/10 border border-primary/20 mb-4">
              <ShieldCheck size={26} className="text-primary" />
            </div>
            <h1 className="text-text font-semibold text-xl font-sans">Admin Portal</h1>
            <p className="text-gray-400 text-sm mt-1.5 font-sans">Austrum Management Console</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl
              text-red-700 text-sm flex items-center gap-2 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1.5 font-sans" htmlFor="email">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@austrum.com"
                  value={form.email}
                  onChange={handleChange}
                  className="input-base pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1.5 font-sans" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Admin password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-base pl-10 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl bg-primary hover:bg-primary-hover
                text-white font-semibold text-sm transition-all duration-200
                shadow-md hover:-translate-y-0.5
                disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0
                focus:outline-none focus:ring-2 focus:ring-primary/30 font-sans"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                "Access Dashboard"
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-400 text-xs font-sans">
            This portal is restricted to authorized administrators only.
          </p>
        </div>
      </div>
    </div>
  );
}