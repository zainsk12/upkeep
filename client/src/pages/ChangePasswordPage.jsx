// client/src/pages/ChangePasswordPage.jsx
// Authenticated "Change Password" flow (Settings → Account → Change Password).
//
// Reuses the EXACT same business logic as Forgot Password via usePasswordResetFlow
// (Firebase phone OTP → verify-reset-otp → reset-password) and the shared OtpBoxes
// component — no duplicated OTP/backend logic. Only the UX differs: it lives in the
// authenticated app shell with a Settings breadcrumb, a "Change Password" heading,
// and the user's verified phone pre-filled. No "Forgot Password" / "Back to Login".
//
// Steps:
//   1. Verify identity  — code sent to the account's verified phone (Firebase SMS)
//   2. Verify OTP
//   3. New password + confirm (strength meter)
//   4. Success → session is invalidated server-side, so sign out + go to login.

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";
import { firebaseAuthErrorMessage } from "../services/firebase";
import { scorePassword, passwordError } from "../utils/passwordStrength";
import { usePasswordResetFlow, describeAuthError } from "../hooks/usePasswordResetFlow";
import useResendTimer from "../hooks/useResendTimer";
import OtpBoxes from "../components/OtpBoxes";
import {
  ChevronRight, ShieldCheck, Phone, Lock, KeyRound, CheckCircle2,
  RotateCcw, ArrowRight,
} from "lucide-react";

const REDIRECT_DELAY = 4; // seconds on the success screen

// Step indicator (3 functional steps before success) — app theme.
function StepDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={[
            "h-1.5 rounded-full transition-all duration-300",
            n === step ? "w-7 bg-primary" : n < step ? "w-4 bg-primary/50" : "w-4 bg-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// Primary action button — app design system (matches Profile/Settings).
function PrimaryButton({ loading, loadingText, children, disabled, onClick, type = "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
        bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-all
        hover:-translate-y-0.5 shadow-md shadow-primary/25 disabled:opacity-60
        disabled:cursor-not-allowed disabled:translate-y-0
        focus:outline-none focus:ring-2 focus:ring-primary/30"
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

function Card({ title, subtitle, children }) {
  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div className="px-5 py-4 border-b border-border">
        <p className="text-text font-bold text-sm">{title}</p>
        {subtitle && <p className="text-muted text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // The account's verified phone is the identity proof — same Firebase phone OTP
  // methodology as signup / forgot password.
  const identifier = user?.phone || "";

  const flow = usePasswordResetFlow({ recaptchaContainerId: "recaptcha-container-change" });

  const [step, setStep] = useState(1);

  // Step-1
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
  // Step-4
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);

  const verifyingRef = useRef(false);
  const resettingRef = useRef(false);

  // ── Step 1: send the verification code to the account's phone ──────────────────
  const handleSendCode = async () => {
    if (loadingSend) return;
    if (!identifier) { toast.error("No phone number on this account."); return; }
    setLoadingSend(true);
    const toastId = toast.loading("Sending verification code…");
    try {
      await flow.requestCode(identifier);
      toast.success("Verification code sent to your phone.", { id: toastId });
      setOtp("");
      setOtpError("");
      setStep(2);
      startTimer();
    } catch (err) {
      console.error("[ChangePassword] send code failed:", err?.code, err?.message, err);
      flow.resetRecaptcha();
      toast.error(describeAuthError(err), { id: toastId });
    } finally {
      setLoadingSend(false);
    }
  };

  // ── Step 2: verify the OTP ─────────────────────────────────────────────────────
  const handleVerify = async (codeArg) => {
    if (verifyingRef.current) return;
    const code = (codeArg || otp).trim();
    if (code.length !== 6) { setOtpError("Enter the 6-digit code."); return; }

    verifyingRef.current = true;
    setLoadingVerify(true);
    setOtpError("");
    const toastId = toast.loading("Verifying code…");
    try {
      await flow.verifyCode({ identifier, code });
      toast.success("Verified! Set your new password.", { id: toastId });
      setStep(3);
    } catch (err) {
      console.error("[ChangePassword] verify failed:", err?.code, err?.message, err);
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
      await flow.resendCode(identifier);
      toast.success("A new code is on its way.", { id: toastId });
      setOtp("");
      setOtpError("");
      startTimer();
    } catch (err) {
      console.error("[ChangePassword] resend failed:", err?.code, err?.message, err);
      flow.resetRecaptcha();
      toast.error(describeAuthError(err), { id: toastId });
    }
  };

  // ── Step 3: set the new password ───────────────────────────────────────────────
  const strength = scorePassword(pw);

  const handleReset = async (e) => {
    e.preventDefault();
    if (resettingRef.current) return;

    const errs = {};
    const pwErr = passwordError(pw);
    if (pwErr) errs.pw = pwErr;
    if (pw2 !== pw) errs.pw2 = "Passwords do not match.";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    resettingRef.current = true;
    setLoadingReset(true);
    const toastId = toast.loading("Updating your password…");
    try {
      await flow.submitNewPassword({ identifier, newPassword: pw });
      toast.success("Password updated!", { id: toastId });
      setStep(4);
    } catch (err) {
      console.error("[ChangePassword] reset failed:", err?.code, err?.message, err);
      if (!err.response) {
        toast.error(
          "Network issue — we couldn't confirm the result. Your password may already be updated; please sign in again with your new password.",
          { id: toastId }
        );
      } else {
        const msg = err.response.data?.message || "Could not update password. Please try again.";
        // Expired/invalid reset session → restart verification.
        if (/expired|invalid|start again/i.test(msg)) {
          toast.error(msg, { id: toastId });
          flow.reset();
          setStep(1);
          setOtp(""); setOtpError("");
          setPw(""); setPw2(""); setPwErrors({});
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

  // ── Step 4: success — the change invalidated this session, so sign out ─────────
  useEffect(() => {
    if (step !== 4) return;
    setCountdown(REDIRECT_DELAY);
    const iv = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    const to = setTimeout(() => { logout(); navigate("/login", { replace: true }); }, REDIRECT_DELAY * 1000);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [step, logout, navigate]);

  const subheadingByStep = {
    1: "Verify your identity to continue",
    2: "Enter the 6-digit code we sent you",
    3: "Choose a strong new password",
    4: "All done",
  };

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Breadcrumb / back to the Account menu */}
        <button
          onClick={() => navigate("/settings/account")}
          className="flex items-center gap-1.5 text-primary/60 hover:text-primary text-sm font-medium transition-colors group w-fit"
        >
          <ChevronRight size={14} strokeWidth={2.2} className="rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          Back to Account
        </button>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-text leading-tight">Change Password</h1>
          <p className="text-muted text-sm mt-1">{subheadingByStep[step]}</p>
        </div>

        <StepDots step={step} />

        {/* STEP 1 — Verify identity */}
        {step === 1 && (
          <Card title="Verify your identity" subtitle="For your security, confirm it's really you before changing your password.">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
                <ShieldCheck size={26} className="text-primary" />
              </div>
              <p className="text-muted text-sm text-center">
                We'll send a one-time verification code to your registered mobile number.
              </p>

              {/* Prefilled, read-only identity */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3">
                <Phone size={16} className="text-primary/70 flex-shrink-0" strokeWidth={2.2} />
                <div className="min-w-0">
                  <p className="text-muted text-[11px] font-medium uppercase tracking-wide">Verification will be sent to</p>
                  <p className="text-text text-sm font-semibold">
                    {identifier ? `+91 ${identifier}` : "No phone on file"}
                  </p>
                </div>
              </div>

              <PrimaryButton type="button" onClick={handleSendCode} loading={loadingSend} loadingText="Sending code…" disabled={!identifier}>
                <ArrowRight size={15} /> Send Verification Code
              </PrimaryButton>
            </div>
          </Card>
        )}

        {/* STEP 2 — Verify OTP */}
        {step === 2 && (
          <Card title="Enter verification code" subtitle={flow.destination ? `Sent to ${flow.destination}` : "Sent to your phone"}>
            <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="flex flex-col gap-5">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
                <KeyRound size={26} className="text-primary" />
              </div>
              <OtpBoxes
                variant="app"
                value={otp}
                onChange={(v) => { setOtp(v); setOtpError(""); }}
                onComplete={(code) => handleVerify(code)}
                error={otpError}
                disabled={loadingVerify}
              />
              <PrimaryButton loading={loadingVerify} loadingText="Verifying…" disabled={otp.length !== 6}>
                <ShieldCheck size={15} /> Verify Code
              </PrimaryButton>

              <div className="text-center">
                {canResend ? (
                  <button type="button" onClick={handleResend}
                    className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover text-sm font-medium transition-colors">
                    <RotateCcw size={13} /> Resend Code
                  </button>
                ) : (
                  <p className="text-muted text-sm">
                    Resend code in <span className="text-text font-medium tabular-nums">{seconds}s</span>
                  </p>
                )}
              </div>
            </form>
          </Card>
        )}

        {/* STEP 3 — New password */}
        {step === 3 && (
          <Card title="Create a new password" subtitle="Choose a strong password you don't use elsewhere.">
            <form onSubmit={handleReset} className="flex flex-col gap-4" noValidate>
              {/* New password */}
              <div>
                <label htmlFor="new-pw" className="block text-text text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-primary/70" strokeWidth={2.2} /> New Password
                </label>
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
                    className={[
                      "w-full bg-card border rounded-xl px-4 py-3 pr-14 text-text text-sm",
                      "placeholder-muted/60 outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                      pwErrors.pw ? "border-red-500/70" : "border-border focus:border-primary/50",
                    ].join(" ")}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    aria-pressed={showPw}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text text-xs transition-colors">
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Strength meter */}
                {pw && (
                  <div className="mt-2">
                    <div className="flex gap-1.5" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                          style={{ background: i < strength.score ? strength.color : "var(--border, rgba(0,0,0,0.12))" }} />
                      ))}
                    </div>
                    <p aria-live="polite" className="text-[11px] mt-1.5 font-medium" style={{ color: strength.color }}>
                      Password strength: {strength.label}
                    </p>
                  </div>
                )}
                {pwErrors.pw && <p role="alert" className="text-red-500 text-xs mt-1.5">{pwErrors.pw}</p>}
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="confirm-pw" className="block text-text text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Lock size={13} className="text-primary/70" strokeWidth={2.2} /> Confirm Password
                </label>
                <input
                  id="confirm-pw"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={pw2}
                  onChange={(e) => { setPw2(e.target.value); setPwErrors((p) => ({ ...p, pw2: "" })); }}
                  aria-invalid={!!pwErrors.pw2}
                  className={[
                    "w-full bg-card border rounded-xl px-4 py-3 text-text text-sm",
                    "placeholder-muted/60 outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                    pwErrors.pw2 ? "border-red-500/70"
                      : pw2 && pw2 === pw ? "border-emerald-500/60"
                      : "border-border focus:border-primary/50",
                  ].join(" ")}
                />
                {pwErrors.pw2 && <p role="alert" className="text-red-500 text-xs mt-1.5">{pwErrors.pw2}</p>}
                {!pwErrors.pw2 && pw2 && pw2 === pw && (
                  <p className="text-emerald-500 text-xs mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Passwords match
                  </p>
                )}
              </div>

              <PrimaryButton
                loading={loadingReset}
                loadingText="Updating…"
                disabled={!pw || !pw2 || !strength.meetsMinimum || pw !== pw2}
              >
                <CheckCircle2 size={15} /> Update Password
              </PrimaryButton>
            </form>
          </Card>
        )}

        {/* STEP 4 — Success */}
        {step === 4 && (
          <Card title="Password updated" subtitle="Your password has been changed">
            <div className="text-center py-2">
              <div className="relative mx-auto mb-6 w-20 h-20">
                <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/40">
                  <CheckCircle2 size={40} className="text-emerald-500" strokeWidth={2} />
                </div>
              </div>
              <h2 className="text-text text-xl font-bold mb-2">Password Updated Successfully</h2>
              <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto mb-2">
                For your security you've been signed out everywhere. Please sign in again with your new password.
              </p>
              <p className="text-muted text-xs">
                Redirecting to login in <span className="text-text font-medium tabular-nums">{countdown}s</span>…
              </p>
            </div>
          </Card>
        )}

        {/* Firebase invisible reCAPTCHA mounts here (phone OTP). Bound via ref. */}
        <div ref={flow.recaptchaContainerRef} id="recaptcha-container-change" />
      </div>
    </div>
  );
}
