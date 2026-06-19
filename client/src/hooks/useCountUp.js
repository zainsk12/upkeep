// client/src/hooks/useCountUp.js
//
// requestAnimationFrame-based count-up. Animates from 0 → target once, when
// `start` becomes true, using easeOutCubic. Honors prefers-reduced-motion by
// jumping straight to the final value. No dependencies.

import { useEffect, useRef, useState } from "react";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function useCountUp(target, { duration = 1500, start = false } = {}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!start || doneRef.current) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setValue(target);
      doneRef.current = true;
      return;
    }

    const t0 = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - t0) / duration);
      setValue(target * easeOutCubic(progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        doneRef.current = true;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, target, duration]);

  return value;
}
