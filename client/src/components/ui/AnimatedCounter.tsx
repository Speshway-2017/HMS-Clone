import { useEffect, useRef, useState } from "react";
import { formatINR, formatCount } from "../../lib/currency";

export interface AnimatedCounterProps {
  value: number | null | undefined;
  duration?: number;
  type?: "currency" | "count";
  formatter?: (val: number) => string;
  className?: string;
  title?: string;
}

/**
 * AnimatedCounter
 * Smoothly animates from 0 to the target value once using requestAnimationFrame with cubic ease-out.
 * Strictly stops at the database value without continuous ticking, repeat intervals, or drift.
 */
export function AnimatedCounter({
  value,
  duration = 900,
  type = "currency",
  formatter,
  className = "",
  title,
}: AnimatedCounterProps) {
  const targetVal = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [displayVal, setDisplayVal] = useState<number>(0);
  const currentValRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const hasAnimatedRef = useRef<boolean>(false);
  const prevTargetRef = useRef<number>(targetVal);

  useEffect(() => {
    // Cancel any previous active animation frame
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const startVal = hasAnimatedRef.current ? currentValRef.current : 0;
    const endVal = targetVal;
    prevTargetRef.current = targetVal;

    // If target value hasn't changed and has completed initial animation, remain stable
    if (startVal === endVal && hasAnimatedRef.current) {
      setDisplayVal(endVal);
      currentValRef.current = endVal;
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth cubic ease-out curve: decelerates gracefully as it nears completion
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;

      if (progress < 1) {
        setDisplayVal(current);
        currentValRef.current = current;
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        // EXACT STOP: clamp display directly to database target value
        setDisplayVal(endVal);
        currentValRef.current = endVal;
        hasAnimatedRef.current = true;
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [targetVal, duration]);

  let text: string;
  if (formatter) {
    text = formatter(displayVal);
  } else if (type === "currency") {
    text = formatINR(displayVal);
  } else {
    text = formatCount(Math.round(displayVal));
  }

  return (
    <span className={className} title={title}>
      {text}
    </span>
  );
}

