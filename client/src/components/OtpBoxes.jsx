// client/src/components/OtpBoxes.jsx
// Shared 6-box OTP input, used by BOTH the password reset (Forgot Password) and
// the authenticated Change Password flows. Declared as its own module so it isn't
// remounted on every parent render (which would steal focus mid-typing).
//
// `variant` themes it for the context it renders in:
//   • "auth" — white-on-dark, over the auth hero background (default).
//   • "app"  — app theme tokens, for authenticated in-app cards.

import { useRef } from "react";

const VARIANTS = {
  auth: {
    box:       "bg-white/10 text-white focus:bg-white/15 disabled:opacity-50",
    normal:    "border-white/15 focus:border-blush/60",
    error:     "border-red-400/60",
    errorText: "text-red-400",
  },
  app: {
    box:       "bg-card text-text focus:bg-bg disabled:opacity-50",
    normal:    "border-border focus:border-primary/60",
    error:     "border-red-500/70",
    errorText: "text-red-500",
  },
};

export default function OtpBoxes({ value, onChange, onComplete, error, disabled, variant = "auth" }) {
  const refs = useRef([]);
  const v = VARIANTS[variant] || VARIANTS.auth;
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const setAt = (i, d) => {
    const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, 6);
    onChange(next);
    return next;
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) { setAt(i, ""); return; }
    // Take the last entered digit (handles overwrite), advance focus.
    const next = setAt(i, raw[raw.length - 1]);
    if (i < 5) refs.current[i + 1]?.focus();
    if (next.length === 6 && !next.includes("")) onComplete?.(next);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      setAt(i - 1, "");
    }
    if (e.key === "ArrowLeft"  && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
    if (pasted.length === 6) onComplete?.(pasted);
  };

  return (
    <div>
      <div
        className="flex justify-between gap-2"
        onPaste={handlePaste}
        role="group"
        aria-label="6-digit verification code"
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of 6`}
            aria-invalid={!!error}
            aria-describedby={error ? "otp-error" : undefined}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={[
              "w-full aspect-square min-w-0 text-center rounded-xl border",
              "text-xl font-semibold font-mono outline-none transition-colors",
              v.box,
              error ? v.error : v.normal,
            ].join(" ")}
          />
        ))}
      </div>
      {error && (
        <p id="otp-error" role="alert" className={`text-xs mt-2 text-center ${v.errorText}`}>{error}</p>
      )}
    </div>
  );
}
