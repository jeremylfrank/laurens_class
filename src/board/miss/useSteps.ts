"use client";
import { useEffect, useState } from "react";

/** Steps 0..count-1 on a timer. Reduced motion jumps straight to the last step. */
export function useSteps(count: number, stepMs: number): number {
  const [step, setStep] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? count - 1
      : 0,
  );
  useEffect(() => {
    if (step >= count - 1) return;
    const t = setTimeout(() => setStep((s) => s + 1), stepMs);
    return () => clearTimeout(t);
  }, [step, count, stepMs]);
  return step;
}
