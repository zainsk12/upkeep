// client/src/pages/auth/ForgotPasswordPage.jsx
// Forgot Password — 4-step flow, two channels:
//   Step 1  Identify account   — enter email OR phone
//   Step 2  Verify OTP         — email: backend OTP | phone: Firebase SMS OTP
//   Step 3  Create new password— strength meter + confirm
//   Step 4  Success            — auto-redirect to login
//
// The OTP/Firebase/reset business logic lives in usePasswordResetFlow (shared
// with the authenticated ChangePasswordPage). This page owns only the recovery
// UX: wizard persistence, the carried-from-login identifier, and rendering.

import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "../../utils/toast";
import { firebaseAuthErrorMessage } from "../../services/firebase";
import { isValidIndianPhone } from "../../utils/phone";
import { scorePassword, passwordError } from "../../utils/passwordStrength";
import { usePasswordResetFlow, describeAuthError } from "../../hooks/usePasswordResetFlow";
import useResendTimer from "../../hooks/useResendTimer";
import OtpBoxes from "../../components/OtpBoxes";
import {
  ShieldCheck, Mail, Phone, ArrowLeft, RotateCcw, CheckCircle2,
  Lock, KeyRound, ArrowRight,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────────
const isEmail      = (s) => s.includes("@");
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isValidPhone = (s) => isValidIndianPhone(s);

const REDIRECT_DELAY = 4; // seconds on the success screen

// ── Shared layout shell (module scope — keeps reCAPTCHA node stable) ──────────────
function LayoutShell({ children, recaptchaRef }) {
  return (
    <div className="min-h-screen flex">
      {/* LEFT — desktop hero */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="/hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(8,53,74,0.90) 0%, rgba(5,15,25,0.88) 100%)", backdropFilter: "blur(1px)" }} />
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-center">
          <img src="/upkeep_logo.png" alt="UpKeep by Austrum" className="w-24 h-24 rounded-full object-cover border-4 border-blush/35 shadow-2xl mb-8" />
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blush/15 border border-blush/25 mb-6">
            <ShieldCheck size={26} className="text-blush" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-3 auth-heading">Reset your password</h2>
          <p className="text-white/55 text-base leading-relaxed max-w-xs">
            Verify it's really you and choose a new password in just a few steps.
          </p>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center px-5 py-10 lg:px-10 lg:py-12 lg:bg-charcoal">
        <div className="absolute inset-0 lg:hidden">
          <img src="/hero.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(8,53,74,0.93) 0%, rgba(5,15,25,0.92) 100%)" }} />
        </div>
        <div className={[
          "relative z-10 w-full max-w-md",
          "lg:bg-transparent lg:backdrop-blur-none lg:border-transparent lg:shadow-none lg:p-0 lg:rounded-none",
          "bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-7 shadow-2xl",
        ].join(" ")}>
          <div className="lg:hidden text-center mb-7">
            <img src="/upkeep_logo.png" alt="UpKeep by Austrum" className="w-16 h-16 rounded-full object-cover border-2 border-blush/50 shadow-lg shadow-primary/40 mx-auto mb-3" />
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">UpKeep — Nashik's Trusted Home Services</p>
          </div>
          {children}
          {/* Firebase invisible reCAPTCHA mounts here (phone OTP). Bound via ref. */}
          <div ref={recaptchaRef} id="recaptcha-container-reset" />
        </div>
      </div>
    </div>
  );
}

// Primary action button — matches the auth design system.
function PrimaryButton({ loading, loadingText, children, disabled }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="mt-2 w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover
        text-white font-semibold text-sm transition-all duration-200
        shadow-lg shadow-primary/40 hover:-translate-y-0.5
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        border border-blush/20 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingText}
        </>
      ) : children}
    </button>
  );
}

// Small progress indicator (3 functional steps before success).
function StepDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={[
            "h-1.5 rounded-full transition-all duration-300",
            n === step ? "w-7 bg-blush" : n < step ? "w-4 bg-blush/50" : "w-4 bg-white/15",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ── Wizard state persistence (survives refresh / accidental navigation) ──────────
// Stored in sessionStorage (cleared when the tab closes). We persist ONLY the
// non-sensitive progress markers — never the password, OTP, or reset token.
// Restoration is capped at step ≤ 2: step 3 needs the reset token (never
// persisted), so a refresh there resumes at "verify" to re-issue one.
const WIZARD_KEY = "upkeep_fp_wizard";

// Identifier carried over from the Login page after a failed sign-in. This is the
// SINGLE source of truth for prefilling the field — read fresh from sessionStorage,
// never from stale component state or localStorage.
const FORGOT_ID_KEY = "forgotPasswordIdentifier";

function clearForgotIdentifier() {
  try { sessionStorage.removeItem(FORGOT_ID_KEY); } catch { /* noop */ }
}

function loadWizardState() {
  try {
    const raw = sessionStorage.getItem(WIZARD_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || (s.step !== 1 && s.step !== 2)) return null;
    return s;
  } catch { return null; }
}
function saveWizardState(s) {
  try { sessionStorage.setItem(WIZARD_KEY, JSON.stringify(s)); } catch { /* quota/private mode */ }
}
function clearWizardState() {
  try { sessionStorage.removeItem(WIZARD_KEY); } catch { /* noop */ }
}

// ── Component ─────────────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Read any persisted progress ONCE on mount (never restores sensitive data).
  const restored = useMemo(() => loadWizardState(), []);

  // Identifier carried from a failed login attempt. Read ONCE from sessionStorage
  // on mount (the only source of truth) so a refresh/revisit can't resurrect a
  // stale value. Takes precedence over any wizard-restored identifier so the most
  // recent login attempt always wins; falls back to "" when nothing was carried.
  const carriedIdentifier = useMemo(() => {
    try { return sessionStorage.getItem(FORGOT_ID_KEY) || ""; }
    catch { return ""; }
  }, []);

  // Shared business logic (Firebase reCAPTCHA + backend calls + channel state).
  const flow = usePasswordResetFlow({
    recaptchaContainerId: "recaptcha-container-reset",
    initialChannel:       restored?.channel ?? null,
    initialDestination:   restored?.destination ?? "",
  });
  const { channel, destination } = flow;

  const [step, setStep] = useState(restored?.step ?? 1);              // 1..4
  const [identifier, setIdentifier]   = useState(carriedIdentifier || restored?.identifier || ""); // raw input
  // Info banner shown only when the field was prefilled from Login; cleared the
  // moment the user edits the value.
  const [showCarriedInfo, setShowCarriedInfo] = useState(!!carriedIdentifier);

  // Step-1
  const [idError, setIdError] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);

  // Step-2
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loadingVerify, setLoadingVerify] = useState(false);
  const { seconds, start: startTimer, canResend } = useResendTimer();

  // Step-3
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwErrors, setPwErrors] = useState({});
  const [loadingReset, setLoadingReset] = useState(false);
  // Set when a reset request fails with NO server response (network drop): the
  // change may actually have succeeded server-side, so the UI must not imply a
  // definite failure.
  const [networkAmbiguous, setNetworkAmbiguous] = useState(false);

  // Step-4
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);

  // Synchronous in-flight guards. Unlike the loading* state (which updates
  // asynchronously), these flip immediately, so an OTP auto-submit firing in the
  // same tick as a Verify-button click (or a double reset submit) can't launch a
  // second request.
  const verifyingRef = useRef(false);
  const resettingRef = useRef(false);

  // Persist non-sensitive progress so a refresh / accidental navigation resumes.
  // Steps ≥ 3 (and the success screen) carry the reset token, which we never
  // store — clear instead so a refunded refresh restarts safely at verify/step 1.
  useEffect(() => {
    if (step === 2 || (step === 1 && (identifier || channel))) {
      saveWizardState({ step, channel, destination, identifier });
    } else {
      clearWizardState();
    }
  }, [step, channel, destination, identifier]);

  // If we restored straight into the verify step, the resend countdown was never
  // started — kick it off so the Resend control behaves (and phone users, whose
  // in-memory Firebase confirmation is gone after a refresh, can request a fresh
  // code). Runs once on mount only.
  useEffect(() => {
    if (restored?.step === 2) startTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 1: identify account ──────────────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    const id = identifier.trim();

    if (!id) { setIdError("Enter your email or phone number."); return; }
    if (isEmail(id) ? !isValidEmail(id) : !isValidPhone(id)) {
      setIdError("Enter a valid email address or 10-digit mobile number.");
      return;
    }

    setLoadingSend(true);
    const toastId = toast.loading("Sending verification code…");
    try {
      const { channel: ch } = await flow.requestCode(id);
      toast.success(
        ch === "email" ? "Code sent to your email." : "Code sent to your phone.",
        { id: toastId }
      );
      setOtp("");
      setOtpError("");
      setStep(2);
      startTimer();
    } catch (err) {
      console.error("[ForgotPassword] handleSendCode failed:", err?.code, err?.message, err);
      flow.resetRecaptcha();
      toast.error(describeAuthError(err), { id: toastId });
    } finally {
      setLoadingSend(false);
    }
  };

  // ── Step 2: verify code ───────────────────────────────────────────────────────
  const handleVerify = async (codeArg) => {
    if (verifyingRef.current) return;

    const code = (codeArg || otp).trim();
    if (code.length !== 6) { setOtpError("Enter the 6-digit code."); return; }

    verifyingRef.current = true;
    setLoadingVerify(true);
    setOtpError("");
    const toastId = toast.loading("Verifying code…");
    try {
      await flow.verifyCode({ identifier: identifier.trim(), code });
      toast.success("Verified! Set your new password.", { id: toastId });
      setStep(3);
    } catch (err) {
      console.error("[ForgotPassword] handleVerify failed:", err?.code, err?.message, err);
      // Firebase wrong/expired code → inline; backend 4xx → inline; else toast.
      const fbCode = err?.code === "auth/invalid-verification-code" || err?.code === "auth/code-expired";
      if (fbCode) {
        setOtpError(firebaseAuthErrorMessage(err));
        toast.dismiss(toastId);
      } else if (err.response && err.response.status >= 400 && err.response.status < 500) {
        setOtpError(err.response.data?.message || "Verification failed. Please try again.");
        toast.dismiss(toastId);
      } else {
        toast.error(describeAuthError(err), { id: toastId });
      }
    } finally {
      verifyingRef.current = false;
      setLoadingVerify(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || loadingVerify) return;
    const toastId = toast.loading("Resending code…");
    try {
      await flow.resendCode(identifier.trim());
      toast.success("A new code is on its way.", { id: toastId });
      setOtp("");
      setOtpError("");
      startTimer();
    } catch (err) {
      console.error("[ForgotPassword] handleResend failed:", err?.code, err?.message, err);
      if (channel === "phone") flow.resetRecaptcha();
      toast.error(describeAuthError(err), { id: toastId });
    }
  };

  // ── Step 3: reset password ────────────────────────────────────────────────────
  const strength = scorePassword(pw);

  const handleReset = async (e) => {
    e.preventDefault();
    // Synchronous guard against a double submit (Enter + button click).
    if (resettingRef.current) return;

    const errs = {};
    const pwErr = passwordError(pw);
    if (pwErr) errs.pw = pwErr;
    if (pw2 !== pw) errs.pw2 = "Passwords do not match.";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    resettingRef.current = true;
    setNetworkAmbiguous(false);
    setLoadingReset(true);
    const toastId = toast.loading("Updating your password…");
    try {
      await flow.submitNewPassword({ identifier: identifier.trim(), newPassword: pw });
      toast.success("Password updated!", { id: toastId });
      // Reset complete — drop the carried identifier so it can never resurface.
      clearForgotIdentifier();
      setStep(4);
    } catch (err) {
      console.error("[ForgotPassword] handleReset failed:", err?.code, err?.message, err);
      if (!err.response) {
        // No server response (network drop / timeout): the request may have
        // SUCCEEDED server-side. Never imply a definite failure — guide the user
        // to try logging in with the new password before retrying.
        setNetworkAmbiguous(true);
        toast.error(
          "Network issue — we couldn't confirm the result. Your password may already be updated; try logging in with your new password.",
          { id: toastId }
        );
      } else {
        const msg = err.response.data?.message || "Could not update password. Please try again.";
        // An expired/invalid reset session means we must restart the flow.
        if (/expired|invalid|start again/i.test(msg)) {
          toast.error(msg, { id: toastId });
          resetFlow();
        } else {
          setPwErrors({ pw: msg });
          toast.dismiss(toastId);
        }
      }
    } finally {
      resettingRef.current = false;
      setLoadingReset(false);
    }
  };

  const resetFlow = () => {
    clearWizardState();
    setStep(1);
    setOtp(""); setOtpError("");
    setPw(""); setPw2(""); setPwErrors({});
    setNetworkAmbiguous(false);
    flow.reset();
  };

  // ── Step 4: success auto-redirect ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== 4) return;
    setCountdown(REDIRECT_DELAY);
    const iv = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const to = setTimeout(() => navigate("/login", { replace: true }), REDIRECT_DELAY * 1000);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [step, navigate]);

  // ── Render ────────────────────────────────────────────────────────────────────

  // STEP 1 — Identify account
  if (step === 1) return (
    <LayoutShell recaptchaRef={flow.recaptchaContainerRef}>
      <Link to="/login" className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to login
      </Link>
      <StepDots step={1} />
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blush/15 border border-blush/25 mx-auto mb-5">
        <KeyRound size={26} className="text-blush" />
      </div>
      <h2 className="text-white text-2xl text-center mb-1.5 auth-heading">Forgot Password</h2>
      <p className="text-white/45 text-sm text-center mb-7 leading-relaxed">
        Enter your registered email address or phone number to receive a verification code.
      </p>

      <form onSubmit={handleSendCode} className="flex flex-col gap-4" noValidate>
        {/* Shown only when the identifier was carried over from a failed login. */}
        {showCarriedInfo && (
          <div
            role="status"
            aria-live="polite"
            className="animate-in rounded-xl border border-blush/30 bg-blush/10 px-4 py-3"
          >
            <p className="text-white/75 text-xs leading-relaxed">
              If this account exists, we'll send a verification code or reset link to the
              phone number or email you entered.
            </p>
          </div>
        )}
        <div>
          <label htmlFor="identifier" className="block text-white/60 text-xs font-medium mb-1.5">
            Email or Phone Number
            {identifier.trim() && (
              <span className="ml-2 text-blush/70 text-[10px] font-semibold uppercase tracking-wide">
                {isEmail(identifier) ? "· Using email" : "· Using phone"}
              </span>
            )}
          </label>
          <input
            id="identifier"
            type="text"
            inputMode={isEmail(identifier) ? "email" : "text"}
            autoComplete="username"
            autoFocus
            placeholder="you@email.com or 9876543210"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setIdError(""); setShowCarriedInfo(false); }}
            aria-invalid={!!idError}
            aria-describedby={idError ? "identifier-error" : undefined}
            className={[
              "w-full bg-white/10 border rounded-xl px-4 py-3",
              "text-white placeholder-white/30 text-sm outline-none focus:bg-white/12 transition-colors",
              idError ? "border-red-400/60" : "border-white/15 focus:border-blush/60",
            ].join(" ")}
          />
          {idError && <p id="identifier-error" role="alert" className="text-red-400 text-xs mt-1">{idError}</p>}
        </div>

        <PrimaryButton loading={loadingSend} loadingText="Sending code…">
          <ArrowRight size={15} /> Send Verification Code
        </PrimaryButton>
      </form>

      <p className="text-center text-white/40 text-sm mt-6">
        Remembered it?{" "}
        <Link to="/login" className="text-blush hover:underline font-medium">Sign in</Link>
      </p>
    </LayoutShell>
  );

  // STEP 2 — Verify OTP
  if (step === 2) return (
    <LayoutShell recaptchaRef={flow.recaptchaContainerRef}>
      <button type="button" onClick={resetFlow}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>
      <StepDots step={2} />
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blush/15 border border-blush/25 mx-auto mb-5">
        {channel === "email" ? <Mail size={26} className="text-blush" /> : <Phone size={26} className="text-blush" />}
      </div>
      <h2 className="text-white text-2xl text-center mb-1.5 auth-heading">Verify OTP</h2>
      <p className="text-white/45 text-sm text-center mb-1">
        We sent a 6-digit code to your {channel === "email" ? "email" : "phone"}
      </p>
      <p className="text-blush text-sm font-semibold text-center mb-7 break-all">{destination}</p>

      <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="flex flex-col gap-5">
        <OtpBoxes
          value={otp}
          onChange={(v) => { setOtp(v); setOtpError(""); }}
          onComplete={(code) => handleVerify(code)}
          error={otpError}
          disabled={loadingVerify}
        />
        <PrimaryButton loading={loadingVerify} loadingText="Verifying…" disabled={otp.length !== 6}>
          <ShieldCheck size={15} /> Verify Code
        </PrimaryButton>
      </form>

      <div className="mt-5 text-center">
        {canResend ? (
          <button type="button" onClick={handleResend}
            className="inline-flex items-center gap-1.5 text-blush hover:text-blush/80 text-sm font-medium transition-colors">
            <RotateCcw size={13} /> Resend Code
          </button>
        ) : (
          <p className="text-white/35 text-sm">
            Resend code in <span className="text-white/60 font-medium tabular-nums">{seconds}s</span>
          </p>
        )}
      </div>
    </LayoutShell>
  );

  // STEP 3 — Create new password
  if (step === 3) return (
    <LayoutShell recaptchaRef={flow.recaptchaContainerRef}>
      <StepDots step={3} />
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blush/15 border border-blush/25 mx-auto mb-5">
        <Lock size={26} className="text-blush" />
      </div>
      <h2 className="text-white text-2xl text-center mb-1.5 auth-heading">Create New Password</h2>
      <p className="text-white/45 text-sm text-center mb-7">Choose a strong password you don't use elsewhere.</p>

      <form onSubmit={handleReset} className="flex flex-col gap-4" noValidate>
        {/* New password */}
        <div>
          <label htmlFor="new-pw" className="block text-white/60 text-xs font-medium mb-1.5">New Password</label>
          <div className="relative">
            <input
              id="new-pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              placeholder="Min. 8 characters"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwErrors((p) => ({ ...p, pw: "" })); }}
              aria-invalid={!!pwErrors.pw}
              aria-describedby={[
                pw ? "pw-strength" : null,
                pwErrors.pw ? "new-pw-error" : null,
              ].filter(Boolean).join(" ") || undefined}
              className={[
                "w-full bg-white/10 border rounded-xl px-4 py-3 pr-14",
                "text-white placeholder-white/30 text-sm outline-none focus:bg-white/12 transition-colors",
                pwErrors.pw ? "border-red-400/60" : "border-white/15 focus:border-blush/60",
              ].join(" ")}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              aria-pressed={showPw}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs transition-colors">
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {/* Strength meter */}
          {pw && (
            <div className="mt-2">
              <div className="flex gap-1.5" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                    style={{ background: i < strength.score ? strength.color : "rgba(255,255,255,0.12)" }} />
                ))}
              </div>
              <p id="pw-strength" aria-live="polite" className="text-[11px] mt-1.5 font-medium" style={{ color: strength.color }}>
                Password strength: {strength.label}
              </p>
            </div>
          )}
          {pwErrors.pw && <p id="new-pw-error" role="alert" className="text-red-400 text-xs mt-1.5">{pwErrors.pw}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirm-pw" className="block text-white/60 text-xs font-medium mb-1.5">Confirm Password</label>
          <input
            id="confirm-pw"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={pw2}
            onChange={(e) => { setPw2(e.target.value); setPwErrors((p) => ({ ...p, pw2: "" })); }}
            aria-invalid={!!pwErrors.pw2}
            aria-describedby={pwErrors.pw2 ? "confirm-pw-error" : undefined}
            className={[
              "w-full bg-white/10 border rounded-xl px-4 py-3",
              "text-white placeholder-white/30 text-sm outline-none focus:bg-white/12 transition-colors",
              pwErrors.pw2 ? "border-red-400/60"
                : pw2 && pw2 === pw ? "border-emerald-400/50"
                : "border-white/15 focus:border-blush/60",
            ].join(" ")}
          />
          {pwErrors.pw2 && <p id="confirm-pw-error" role="alert" className="text-red-400 text-xs mt-1.5">{pwErrors.pw2}</p>}
          {!pwErrors.pw2 && pw2 && pw2 === pw && (
            <p className="text-emerald-400 text-xs mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={12} /> Passwords match
            </p>
          )}
        </div>

        {/* Ambiguous network outcome — the reset may have succeeded server-side. */}
        {networkAmbiguous && (
          <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
            <p className="text-amber-200 text-xs leading-relaxed">
              We couldn't confirm the result because of a network problem. Your password
              <span className="font-semibold"> may already be updated</span> — try{" "}
              <Link to="/login" className="underline font-medium hover:text-amber-100">logging in</Link>{" "}
              with your new password. If that doesn't work, you can submit again.
            </p>
          </div>
        )}

        <PrimaryButton
          loading={loadingReset}
          loadingText="Updating…"
          disabled={!pw || !pw2 || !strength.meetsMinimum || pw !== pw2}
        >
          <CheckCircle2 size={15} /> Reset Password
        </PrimaryButton>
      </form>
    </LayoutShell>
  );

  // STEP 4 — Success
  return (
    <LayoutShell recaptchaRef={flow.recaptchaContainerRef}>
      <div className="text-center py-2">
        <div className="relative mx-auto mb-6 w-20 h-20">
          <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-400/40">
            <CheckCircle2 size={40} className="text-emerald-400" strokeWidth={2} />
          </div>
        </div>
        <h2 className="text-white text-2xl mb-2 auth-heading">Password Updated Successfully</h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto mb-8">
          Your password has been changed successfully. You can now login using your new password.
        </p>
        <Link to="/login"
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl
            bg-primary hover:bg-primary-hover text-white font-semibold text-sm
            transition-all duration-200 shadow-lg shadow-primary/40 hover:-translate-y-0.5 border border-blush/20">
          <ArrowLeft size={15} /> Back to Login
        </Link>
        <p className="text-white/35 text-xs mt-4">
          Redirecting in <span className="text-white/60 font-medium tabular-nums">{countdown}s</span>…
        </p>
      </div>
    </LayoutShell>
  );
}
