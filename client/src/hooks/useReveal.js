// client/src/hooks/useReveal.js
//
// Lightweight scroll-reveal trigger built on the native IntersectionObserver —
// no animation library. Returns a ref to attach to the element you want to
// observe and a boolean that flips to true (once) when it scrolls into view.
//
// Degrades gracefully: if IntersectionObserver is unavailable or the user
// prefers reduced motion, it reports visible immediately so nothing stays
// hidden and no motion plays.

import { useEffect, useRef, useState } from "react";

export default function useReveal({
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
} = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // trigger once
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}
