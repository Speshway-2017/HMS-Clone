import { useState, useRef, useId } from "react";

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
}: AnimatedInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const val = isControlled ? value : internalValue;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const reactId = useId();
  const inputId = id || `animated-input-${reactId.replace(/:/g, "")}`;
  const isVisible = !!val || isFocused;

  return (
    <div className={`w-full flex flex-col ${className}`}>
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

      <div className="h-5 overflow-hidden mb-1">
        <label
          htmlFor={inputId}
          className={`block text-xs font-bold uppercase tracking-wider transition-all duration-500 ease-in-out ${
            isFocused ? "text-blue-600" : "text-slate-500"
          } ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          } ${labelClassName}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      <div className="relative flex items-center w-full">
        {icon ? (
          <span
            aria-hidden="true"
            className={`absolute top-1/2 left-3.5 -translate-y-1/2 z-10 pointer-events-none flex h-4 w-4 items-center justify-center transition-colors duration-200 ${
              isFocused ? "text-blue-600" : "text-slate-400"
            }`}
          >
            {icon}
          </span>
        ) : null}
        <input
          className={`peer w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition-all duration-300 text-slate-900 ${
            isFocused
              ? "border-blue-600 ring-4 ring-blue-500/10 shadow-sm"
              : "border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
          } ${icon ? "pl-10" : ""} ${endIcon ? "pr-10" : ""} ${inputClassName}`}
          disabled={disabled}
          id={inputId}
          type={type}
          required={required}
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
          placeholder={isFocused ? "" : (placeholder || label)}
          ref={inputRef}
          value={val}
        />
        {endIcon ? (
          <div className="absolute top-1/2 right-3.5 -translate-y-1/2 z-10 flex h-4 items-center justify-center">
            {endIcon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
