// client/src/pages/auth/SignupPage.jsx
// Multi-step signup:
//   Step 1 — Fill in details (name, phone, optional email, password)
//   Step 2 — Verify OTP sent to phone
//   Done   — Account created, user logged in

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "../../utils/toast";
import { signupApi } from "../../services/authApi";
import {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  firebaseAuthErrorMessage,
} from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { normalizePhone, isValidIndianPhone } from "../../utils/phone";
import FormInput from "../../components/FormInput";
import { CheckCircle2, Star, Clock, Shield, Phone, ArrowLeft, RotateCcw } from "lucide-react";

const PERKS = [
  { icon: Shield,       text: "Verified professionals only"    },
  { icon: CheckCircle2, text: "100% satisfaction guarantee"    },
  { icon: Clock,        text: "Same-day bookings available"    },
  { icon: Star,         text: "Rated 4.9 by 10,000+ customers" },
];

// ── Step 1 validation ─────────────────────────────────────────────────────────
function validateForm({ name, phone, email, password }) {
  const e = {};
  if (!name.trim())                                   e.name     = "Full name is required.";
  if (!phone.trim())                                  e.phone    = "Phone number is required.";
  else if (!isValidIndianPhone(phone))                e.phone    = "Enter a valid Indian mobile number (10 digits, starts with 6–9).";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address.";
  if (password.length < 8)                            e.password = "Minimum 8 characters.";
  return e;
}

// ── OTP Resend Timer ──────────────────────────────────────────────────────────
const RESEND_COOLDOWN = 60; // seconds

function useResendTimer() {
  const [seconds, setSeconds] = useState(RESEND_COOLDOWN);
  const timerRef = useRef(null);

  const start = () => {
    setSeconds(RESEND_COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { seconds, start, canResend: seconds === 0 };
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────
// ⚠️  MUST live outside SignupPage. If declared inside the component body,
//     React treats it as a brand-new component type on every render,
//     unmounts the old tree, and mounts a fresh one — destroying input focus.
function LayoutShell({ children, recaptchaRef }) {
  return (
    <div className="min-h-screen flex">
      {/* LEFT — desktop hero */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="/hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(8,53,74,0.90) 0%, rgba(5,15,25,0.88) 100%)", backdropFilter: "blur(1px)" }} />
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-center">
          <img src="/upkeep_logo.png" alt="UpKeep by Austrum" className="w-24 h-24 rounded-full object-cover border-4 border-blush/35 shadow-2xl mb-8" />
          <h2 className="text-4xl font-bold text-white mb-1 auth-heading">UpKeep</h2>
          <p className="text-blush/70 text-xs font-semibold uppercase tracking-widest mb-3">
            by Austrum
          </p>
          <p className="text-white/55 text-base leading-relaxed max-w-xs mb-10">
            Premium home services, delivered with care and professionalism.
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

      {/* RIGHT — form */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center px-5 py-10 lg:px-10 lg:py-12 lg:bg-charcoal">
        {/* Mobile bg */}
        <div className="absolute inset-0 lg:hidden">
          <img src="/hero.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(8,53,74,0.93) 0%, rgba(5,15,25,0.92) 100%)" }} />
        </div>

        {/* Card */}
        <div className={[
          "relative z-10 w-full max-w-md",
          "lg:bg-transparent lg:backdrop-blur-none lg:border-transparent lg:shadow-none lg:p-0 lg:rounded-none",
          "bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-7 shadow-2xl",
        ].join(" ")}>
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-7">
            <img src="/upkeep_logo.png" alt="UpKeep by Austrum" className="w-16 h-16 rounded-full object-cover border-2 border-blush/50 shadow-lg shadow-primary/40 mx-auto mb-3" />
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">UpKeep — Nashik's Trusted Home Services</p>
          </div>
          {children}
          {/* Firebase invisible reCAPTCHA mounts here (signup phone verification).
              Bound via ref (not getElementById) so the verifier attaches to this
              exact node — avoids StrictMode duplicate-id render collisions. */}
          <div ref={recaptchaRef} id="recaptcha-container" />
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  // Step 1 form
  const [form, setForm]         = useState({ name: "", phone: "", email: "", password: "" });
  const [errors, setErrors]     = useState({});
  const [showPass, setShowPass] = useState(false);

  // OTP step
  const [step, setStep]               = useState(1); // 1 = form, 2 = OTP
  const [otp, setOtp]                 = useState("");
  const [otpError, setOtpError]       = useState("");

  // Loading
  const [loadingSend, setLoadingSend]     = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  // Firebase phone-auth refs
  const recaptchaVerifierRef  = useRef(null); // Firebase invisible reCAPTCHA
  const recaptchaContainerRef = useRef(null); // stable DOM node the verifier renders into
  const confirmationRef       = useRef(null); // confirmationResult from signInWithPhoneNumber

  const { seconds, start: startTimer, canResend } = useResendTimer();

  // Lazily create (or reuse) the invisible reCAPTCHA verifier bound to #recaptcha-container.
  const getRecaptchaVerifier = () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        // Pass the live DOM node (falling back to the id) so the widget binds to
        // this exact element rather than whatever getElementById resolves first.
        recaptchaContainerRef.current || "recaptcha-container",
        { size: "invisible" }
      );
    }
    return recaptchaVerifierRef.current;
  };

  const resetRecaptcha = () => {
    try { recaptchaVerifierRef.current?.clear(); } catch { /* noop */ }
    recaptchaVerifierRef.current = null;
    // If clear() didn't fully tear down the widget, empty the node so the next
    // verifier doesn't hit "reCAPTCHA has already been rendered in this element".
    if (recaptchaContainerRef.current) recaptchaContainerRef.current.innerHTML = "";
  };

  // Tear down the verifier on unmount to avoid leaking the reCAPTCHA widget.
  useEffect(() => () => resetRecaptcha(), []);

  // Send (or resend) the Firebase SMS OTP to the entered phone number.
  const requestFirebaseOtp = async () => {
    const phoneE164 = `+91${normalizePhone(form.phone)}`;
    const confirmation = await signInWithPhoneNumber(auth, phoneE164, getRecaptchaVerifier());
    confirmationRef.current = confirmation;
  };

  // ── Handlers: Step 1 ─────────────────────────────────────────────────────
  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.id]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.id]: "" }));
  };

  const handleBlur = (e) => {
    const errs = validateForm(form);
    if (errs[e.target.id]) setErrors(p => ({ ...p, [e.target.id]: errs[e.target.id] }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoadingSend(true);
    const toastId = toast.loading("Sending OTP…");

    try {
      await requestFirebaseOtp();
      toast.success(`OTP sent to +91 ${normalizePhone(form.phone)}`, { id: toastId });
      setStep(2);
      startTimer();
    } catch (err) {
      // Reset the verifier so the next attempt starts clean.
      resetRecaptcha();
      console.error("RAW FIREBASE OTP ERROR", err);
      toast.error(firebaseAuthErrorMessage(err), { id: toastId });
    } finally {
      setLoadingSend(false);
    }
  };

  // ── Handlers: Step 2 ─────────────────────────────────────────────────────
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    const trimmedOtp = otp.trim();

    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    if (!confirmationRef.current) {
      setOtpError("Please request an OTP first.");
      return;
    }

    setLoadingVerify(true);
    const toastId = toast.loading("Verifying OTP…");

    try {
      // Step A: confirm the Firebase SMS code → get the verified ID token
      const credential      = await confirmationRef.current.confirm(trimmedOtp);
      const firebaseIdToken = await credential.user.getIdToken();

      toast.loading("Creating your account…", { id: toastId });

      // Step B: register with the Firebase ID token (server verifies it)
      const registerRes = await signupApi({
        name:            form.name.trim(),
        phone:           normalizePhone(form.phone),
        email:           form.email.trim() || undefined,
        password:        form.password,
        firebaseIdToken,
      });

      login(registerRes.data.token);
      toast.success("Welcome to UpKeep! 🎉", { id: toastId });
      navigate("/", { replace: true });
    } catch (err) {
      // Wrong/expired code (Firebase) or backend validation (4xx) → show inline.
      const isFirebaseCodeError =
        err?.code === "auth/invalid-verification-code" || err?.code === "auth/code-expired";
      const isBackend4xx = err.response?.status === 400 || err.response?.status === 409;

      if (isFirebaseCodeError) {
        setOtpError(firebaseAuthErrorMessage(err));
        toast.dismiss(toastId);
      } else if (isBackend4xx) {
        setOtpError(err.response.data?.message || "Verification failed. Please try again.");
        toast.dismiss(toastId);
      } else {
        toast.error(
          err.response?.data?.message || firebaseAuthErrorMessage(err),
          { id: toastId }
        );
      }
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    const toastId = toast.loading("Resending OTP…");
    try {
      // Recreate the verifier — the previous one is consumed after a send.
      resetRecaptcha();
      await requestFirebaseOtp();
      toast.success("New OTP sent!", { id: toastId });
      startTimer();
      setOtp("");
      setOtpError("");
    } catch (err) {
      resetRecaptcha();
      toast.error(firebaseAuthErrorMessage(err), { id: toastId });
    }
  };

  // ── Step 1: Details form ──────────────────────────────────────────────────
  if (step === 1) return (
    <LayoutShell recaptchaRef={recaptchaContainerRef}>
      <h2 className="text-white text-2xl mb-1 auth-heading">Create account</h2>
      <p className="text-white/45 text-sm mb-7">Join thousands of happy customers</p>

      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
        <FormInput
          label="Full Name"
          id="name"
          placeholder="e.g. Zain Shaikh"
          value={form.name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.name}
        />

        {/* Phone with +91 badge */}
        <div>
          <label className="block text-white/60 text-xs font-medium mb-1.5">
            Phone Number <span className="text-blush">*</span>
          </label>
          <div className="flex">
            <span className="flex items-center px-3.5 bg-white/10 border border-white/15 border-r-0 rounded-l-xl text-white/60 text-sm font-medium select-none">
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              value={form.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              className={[
                "flex-1 bg-white/10 border border-white/15 rounded-r-xl px-4 py-3",
                "text-white placeholder-white/30 text-sm outline-none",
                "focus:border-blush/60 focus:bg-white/12 transition-colors",
                errors.phone ? "border-red-400/60" : "",
              ].join(" ")}
            />
          </div>
          {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
        </div>

        <FormInput
          label={<>Email Address <span className="text-white/35 text-xs font-normal">(optional)</span></>}
          id="email"
          type="email"
          placeholder="you@email.com"
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
        />

        <FormInput
          label="Password"
          id="password"
          type={showPass ? "text" : "password"}
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={handleChange}
          onBlur={handleBlur}
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
          disabled={loadingSend}
          className="mt-2 w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover
            text-white font-semibold text-sm transition-all duration-200
            shadow-lg shadow-primary/40 hover:-translate-y-0.5
            disabled:opacity-50 disabled:cursor-not-allowed
            border border-blush/20 flex items-center justify-center gap-2"
        >
          {loadingSend ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending OTP…
            </>
          ) : (
            <>
              <Phone size={15} />
              Send OTP to Verify
            </>
          )}
        </button>
      </form>

      <p className="text-center text-white/40 text-sm mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-blush hover:underline font-medium">Sign in</Link>
      </p>

      {/* Mobile perks */}
      <div className="lg:hidden mt-7 pt-6 border-t border-white/10 grid grid-cols-2 gap-3">
        {PERKS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5">
            <Icon size={14} className="text-blush flex-shrink-0" strokeWidth={2} />
            <span className="text-white/60 text-[11px] leading-tight">{text}</span>
          </div>
        ))}
      </div>
    </LayoutShell>
  );

  // ── Step 2: OTP verification ──────────────────────────────────────────────
  return (
    <LayoutShell recaptchaRef={recaptchaContainerRef}>
      <button
        type="button"
        onClick={() => { setStep(1); setOtp(""); setOtpError(""); }}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blush/15 border border-blush/25 mx-auto mb-5">
        <Phone size={26} className="text-blush" />
      </div>

      <h2 className="text-white text-2xl text-center mb-1 auth-heading">Verify your phone</h2>
      <p className="text-white/45 text-sm text-center mb-1">
        We sent a 6-digit OTP to
      </p>
      <p className="text-blush text-sm font-semibold text-center mb-8">
        +91 {normalizePhone(form.phone)}
      </p>

      <form onSubmit={handleVerifyAndRegister} className="flex flex-col gap-4">
        {/* OTP input */}
        <div>
          <label className="block text-white/60 text-xs font-medium mb-1.5">Enter OTP</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="• • • • • •"
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
            className={[
              "w-full bg-white/10 border rounded-xl px-4 py-3.5",
              "text-white placeholder-white/25 text-center text-2xl tracking-[0.5em] outline-none",
              "focus:bg-white/12 transition-colors font-mono",
              otpError ? "border-red-400/60" : "border-white/15 focus:border-blush/60",
            ].join(" ")}
            autoFocus
          />
          {otpError && <p className="text-red-400 text-xs mt-1.5 text-center">{otpError}</p>}
        </div>

        <button
          type="submit"
          disabled={loadingVerify || otp.length !== 6}
          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover
            text-white font-semibold text-sm transition-all duration-200
            shadow-lg shadow-primary/40 hover:-translate-y-0.5
            disabled:opacity-50 disabled:cursor-not-allowed
            border border-blush/20 flex items-center justify-center gap-2"
        >
          {loadingVerify ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              <CheckCircle2 size={15} />
              Verify &amp; Create Account
            </>
          )}
        </button>
      </form>

      {/* Resend OTP */}
      <div className="mt-5 text-center">
        {canResend ? (
          <button
            type="button"
            onClick={handleResendOtp}
            className="flex items-center gap-1.5 text-blush hover:text-blush/80 text-sm font-medium mx-auto transition-colors"
          >
            <RotateCcw size={13} />
            Resend OTP
          </button>
        ) : (
          <p className="text-white/35 text-sm">
            Resend in <span className="text-white/60 font-medium tabular-nums">{seconds}s</span>
          </p>
        )}
      </div>

      <p className="text-white/30 text-xs text-center mt-5 leading-relaxed">
        Didn't receive it? Check if the number <span className="text-white/50">+91 {normalizePhone(form.phone)}</span> is correct,
        or go back and re-enter it.
      </p>
    </LayoutShell>
  );
}