import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

export interface SpringScaleInProps {
  children: string;
  className?: string;
  delay?: number;
  stagger?: number;
  triggerOnView?: boolean;
}

const DURATION_S = 0.75;
const MS = 1000;
const EASE = [0.16, 1, 0.3, 1] as const;

export default function SpringScaleIn({
  children,
  className = "",
  delay = 0,
  stagger = 95,
  triggerOnView = false,
}: SpringScaleInProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();
  const play = (!triggerOnView || inView) && !shouldReduceMotion;
  const words = (children || "").split(" ");

  return (
    <span aria-label={children} className={className} ref={ref}>
      {words.map((word, index) => (
        <span key={index}>
          <motion.span
            animate={play ? { opacity: 1, scale: 1 } : undefined}
            aria-hidden="true"
            initial={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.7 }
            }
            style={{ display: "inline-block", whiteSpace: "pre" }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    delay: delay / MS + (index * stagger) / MS,
                    duration: DURATION_S,
                    ease: EASE,
                  }
            }
          >
            {word}
          </motion.span>
          {index < words.length - 1 && (
            <span
              aria-hidden="true"
              style={{ display: "inline-block", whiteSpace: "pre" }}
            >
              {" "}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
