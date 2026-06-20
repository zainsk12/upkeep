// client/src/hooks/useResendTimer.js
// Shared resend countdown used by the OTP screens (Forgot Password / Change
// Password). Returns the remaining seconds, a `start()` to (re)arm the cooldown,
// and `canResend` once it reaches zero.

import { useState, useRef, useEffect, useCallback } from "react";

export const RESEND_COOLDOWN = 60; // seconds

export default function useResendTimer(cooldown = RESEND_COOLDOWN) {
  const [seconds, setSeconds] = useState(cooldown);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    setSeconds(cooldown);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((s) => { if (s <= 1) { clearInterval(timerRef.current); return 0; } return s - 1; });
    }, 1000);
  }, [cooldown]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { seconds, start, canResend: seconds === 0 };
}
