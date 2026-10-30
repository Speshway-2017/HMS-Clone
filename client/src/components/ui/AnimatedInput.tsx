import { motion, useReducedMotion } from "motion/react";
import React, { useId, useRef, useState } from "react";

const EASE_IN_OUT_CUBIC_X1 = 0.4;
const EASE_IN_OUT_CUBIC_Y1 = 0;
const EASE_IN_OUT_CUBIC_X2 = 0.2;
const EASE_IN_OUT_CUBIC_Y2 = 1;

const LABEL_TRANSITION = {
  duration: 0.28,
  ease: [
    EASE_IN_OUT_CUBIC_X1,
    EASE_IN_OUT_CUBIC_Y1,
    EASE_IN_OUT_CUBIC_X2,
    EASE_IN_OUT_CUBIC_Y2,
  ] as [number, number, number, number], // cubic-bezier tuple
};

export interface AnimatedInputProps {
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  inputClassName?: string;
  label: string;
  labelClassName?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  id?: string;
  maxLength?: number;
  error?: string | null;
}

export default function AnimatedInput({
  value,
  defaultValue = "",
  onChange,
  label,
  placeholder = "",
  disabled = false,
  className = "",
  inputClassName = "",
  labelClassName = "",
  icon,
  endIcon,
  type = "text",
  required = false,
  autoComplete,
  id,
  maxLength,
  error,
}: AnimatedInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const val = isControlled ? value : internalValue;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = !!val || isFocused;
  const shouldReduceMotion = useReducedMotion();
  const reactId = useId();
  const inputId = id || `animated-input-${reactId.replace(/:/g, "")}`;

  const getLabelAnimation = () => {
    if (shouldReduceMotion) {
      return {};
    }
    if (isFloating) {
      return {
        borderColor: "transparent",
        color: "#2563eb", // Blue color
        scale: 0.85,
        y: -22,
        x: icon ? -24 : 0,
      };
    }
    return { color: "#6b7280", scale: 1, y: "-50%", x: 0 };
  };

  const getLabelStyle = () => {
    if (!shouldReduceMotion) {
      return {};
    }
    if (isFloating) {
      return {
        borderColor: "transparent",
        color: "#2563eb", // Blue color
        transform: `translateY(-22px) scale(0.85) ${icon ? "translateX(-24px)" : ""}`,
      };
    }
    return {
      color: "#6b7280",
      transform: "translateY(-50%) scale(1)",
    };
  };

  const isOverLimit = maxLength !== undefined && val !== undefined && val.length > maxLength;
  const activeError = error || (isOverLimit ? `Maximum ${maxLength} characters allowed` : null);
  return (
    <div className="w-full">
      <div className={`relative flex items-center ${className}`}>
      <style>{`
        @keyframes drawPath {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        .svg-button {
          background-color: transparent;
          border: none;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.3s, color 0.3s;
        }

        .svg-button:hover {
          background-color: #f0f0f0;
        }

        .svg-button path,
        .svg-button circle,
        .svg-button line,
        .svg-button polyline,
        .svg-button polygon {
          transition: stroke-width 0.3s;
          stroke-dasharray: 100;
          stroke-dashoffset: 0;
        }

        .svg-button:hover path,
        .svg-button:hover circle,
        .svg-button:hover line,
        .svg-button:hover polyline,
        .svg-button:hover polygon {
          stroke-width: 2.2px;
          animation: drawPath 500ms ease-in forwards;
        }
      `}</style>
      {icon ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 z-10 pointer-events-none flex h-4 w-4 items-center justify-center transition-colors duration-200 peer-focus:text-blue-600"
        >
          {icon}
        </span>
      ) : null}
      <input
        aria-label={label}
        className={`peer w-full rounded-xl border ${activeError ? "border-red-500 text-red-900 focus:border-red-500" : "border-slate-200 text-slate-900"} bg-white px-3.5 py-3 text-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-blue-500/10 ${
          icon ? "pl-10" : ""
        } ${endIcon ? "pr-10" : ""} ${inputClassName}`}
        disabled={disabled}
        id={inputId}
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => {
          const valStr = e.target.value;
          if (!isControlled) {
            setInternalValue(valStr);
          }
          onChange?.(valStr);
        }}
        onFocus={() => setIsFocused(true)}
        placeholder={isFloating ? placeholder : ""}
        ref={inputRef}
        value={val}
      />
      {endIcon ? (
        <div className="absolute top-1/2 right-3.5 -translate-y-1/2 z-10 flex h-4 items-center justify-center">
          {endIcon}
        </div>
      ) : null}
      <motion.label
        animate={getLabelAnimation()}
        className={`pointer-events-none absolute top-1/2 origin-left rounded-md bg-white px-1 text-sm font-medium leading-none flex items-center transition-all ${
          icon ? "left-10" : "left-3.5"
        } ${labelClassName}`}
        htmlFor={inputId}
        style={{
          zIndex: 2,
          ...getLabelStyle(),
        }}
        transition={shouldReduceMotion ? { duration: 0 } : LABEL_TRANSITION}
      >
        {label}
      </motion.label>
      </div>
      {activeError && (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {activeError}
        </p>
      )}
    </div>
  );
}
