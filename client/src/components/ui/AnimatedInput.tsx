import { useId, useState } from "react";

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
  const [isFocused, setIsFocused] = useState(false);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const reactId = useId();
  const inputId = id || `animated-input-${reactId.replace(/:/g, "")}`;

  const isFloating = Boolean(currentValue) || isFocused;

  const isOverLimit =
    maxLength !== undefined && currentValue.length > maxLength;

  const activeError =
    error || (isOverLimit ? `Maximum ${maxLength} characters allowed` : null);

  return (
    <div className="w-full">
      <div className={`relative flex items-center ${className}`}>
        {icon && (
          <div className="absolute left-3.5 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center">
            {icon}
          </div>
        )}

        <input
          aria-label={label}
          aria-invalid={Boolean(activeError)}
          aria-describedby={activeError ? `${inputId}-error` : undefined}
          className={`peer w-full rounded-xl border ${
            activeError
              ? "border-red-500 text-red-900 focus:border-red-500"
              : "border-slate-200 text-slate-900"
          } bg-white px-3.5 py-3 text-sm outline-none transition-all duration-200 focus:ring-4 focus:ring-blue-500/10 ${
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
            const newValue = e.target.value;

            if (!isControlled) {
              setInternalValue(newValue);
            }

            onChange?.(newValue);
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={isFocused ? placeholder : ""}
          value={currentValue}
        />

        <label
          htmlFor={inputId}
          className={`pointer-events-none absolute z-10 origin-left rounded-md bg-white px-1 font-medium transition-all duration-200 ${
            icon ? "left-10" : "left-3.5"
          } ${
            isFloating
              ? "-top-2 text-xs text-blue-600"
              : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
          } ${labelClassName}`}
        >
          {label}
        </label>

        {endIcon && (
          <div className="absolute right-3.5 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center">
            {endIcon}
          </div>
        )}
      </div>

      {activeError && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-xs font-medium text-red-600"
          role="alert"
        >
          {activeError}
        </p>
      )}
    </div>
  );
}

