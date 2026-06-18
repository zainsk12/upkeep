// client/src/pages/auth/LoginPage.jsx
// Single-input login: accepts either phone number or email address.
// Detection logic: if the input contains "@" → treat as email, else → treat as phone.

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { loginApi } from "../../services/authApi";
import FormInput from "../../components/FormInput";
import { CheckCircle2, Star, Clock } from "lucide-react";

const PERKS = [
  { icon: CheckCircle2, text: "Verified professionals" },
  { icon: Star,         text: "4.9★ average rating"    },
  { icon: Clock,        text: "Same-day bookings"       },
];

// Determine what type of credential the user is typing
function getCredentialType(value) {
  if (!value) return null;
  return value.includes("@") ? "email" : "phone";
}

// Basic phone hint for placeholder
const PLACEHOLDER = "9876543210 or you@email.com";

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || "/";

  const [form, setForm]         = useState({ credential: "", password: "" });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const credentialType = getCredentialType(form.credential);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.id]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.id]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = {};
    if (!form.credential.trim()) errs.credential = "Enter your phone number or email.";
    if (!form.password)           errs.password   = "Password is required.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const toastId = toast.loading("Signing you in…");

    try {
      const res     = await loginApi({ credential: form.credential.trim(), password: form.password });
      const token   = res.data.token;
      const decoded = jwtDecode(token);

      // Admin accounts must use the dedicated admin panel, not this client app.
      // Storing the token here would be misleading, so we skip login() and
      // show a clear redirect message instead.
      if (decoded.role === "admin") {
        toast.error("Admin accounts must sign in via the admin panel.", { id: toastId });
        return;
      }

      login(token);
      toast.success("Welcome back!", { id: toastId });
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid credentials. Please try again.";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL — hero + branding (desktop only) ── */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="/hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(8,53,74,0.90) 0%, rgba(5,15,25,0.88) 100%)", backdropFilter: "blur(1px)" }}
        />
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-center">
          <img src="/upkeep_logo.png" alt="UpKeep by Austrum" className="w-24 h-24 rounded-full object-cover border-4 border-blush/35 shadow-2xl mb-8" />
          <h2 className="text-4xl font-bold text-white mb-3 auth-heading">Welcome Back</h2>
          <p className="text-white/55 text-base leading-relaxed max-w-xs mb-10">
            Sign in to manage your bookings and services.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {PERKS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-xl px-4 py-3">
                <Icon size={16} className="text-blush flex-shrink-0" strokeWidth={2} />
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center px-5 py-10 lg:px-10 lg:py-12 lg:bg-charcoal">

        {/* Mobile background */}
        <div className="absolute inset-0 lg:hidden">
          <img src="/hero.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(8,53,74,0.93) 0%, rgba(5,15,25,0.92) 100%)" }} />
        </div>

        {/* Form card */}
        <div className={[
          "relative z-10 w-full max-w-md",
          "lg:bg-transparent lg:backdrop-blur-none lg:border-transparent lg:shadow-none lg:p-0",
          "bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-7 shadow-2xl",
        ].join(" ")}>

          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-7">
            <img src="/upkeep_logo.png" alt="UpKeep by Austrum" className="w-16 h-16 rounded-full object-cover border-2 border-blush/50 shadow-lg shadow-primary/40 mx-auto mb-3" />
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">
              UpKeep — Nashik's Trusted Home Services
            </p>
          </div>

          <h2 className="text-white text-2xl mb-1 auth-heading">Sign in</h2>
          <p className="text-white/45 text-sm mb-7">Good to have you back</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Single credential field */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">
                Phone or Email
                {credentialType && (
                  <span className="ml-2 text-blush/70 text-[10px] font-semibold uppercase tracking-wide">
                    {credentialType === "email" ? "· Using email" : "· Using phone"}
                  </span>
                )}
              </label>
              <input
                id="credential"
                type="text"
                inputMode={credentialType === "email" ? "email" : "tel"}
                autoComplete="username"
                placeholder={PLACEHOLDER}
                value={form.credential}
                onChange={handleChange}
                className={[
                  "w-full bg-white/10 border rounded-xl px-4 py-3",
                  "text-white placeholder-white/30 text-sm outline-none",
                  "focus:bg-white/12 transition-colors",
                  errors.credential ? "border-red-400/60" : "border-white/15 focus:border-blush/60",
                ].join(" ")}
              />
              {errors.credential && <p className="text-red-400 text-xs mt-1">{errors.credential}</p>}
            </div>

            <FormInput
              label="Password"
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              rightElement={
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="text-white/40 hover:text-white/70 text-xs transition-colors">
                  {showPass ? "Hide" : "Show"}
                </button>
              }
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover
                text-white font-semibold text-sm transition-all duration-200
                shadow-lg shadow-primary/40 hover:-translate-y-0.5
                disabled:opacity-50 disabled:cursor-not-allowed
                border border-blush/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blush hover:underline font-medium">Create one</Link>
          </p>

          {/* Mobile perks */}
          <div className="lg:hidden mt-7 pt-6 border-t border-white/10 flex justify-center gap-5">
            {PERKS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                <Icon size={16} className="text-blush" strokeWidth={2} />
                <span className="text-white/50 text-[10px] leading-tight max-w-[72px]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}