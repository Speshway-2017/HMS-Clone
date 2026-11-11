import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  forwardRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { MAX_LENGTHS, isValidEmail, isValidPhone } from "../../lib/validation";

const fieldClasses =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors disabled:bg-slate-100 disabled:text-slate-400";

interface WrapperProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  charCount?: number;
  maxLength?: number;
  minCharCount?: number;
  rightElement?: ReactNode;
  children: ReactNode;
}

export function FieldWrapper({
  label,
  required,
  hint,
  error,
  charCount,
  maxLength,
  minCharCount,
  rightElement,
  children,
}: WrapperProps) {
  const cleanLabel = (label || "").replace(/[\s\*\^]+$/, "").trim();
  const isOverLimit = maxLength !== undefined && charCount !== undefined && charCount > maxLength;
  const isNearLimit = maxLength !== undefined && charCount !== undefined && charCount >= maxLength * 0.9;
  const isUnderMin = minCharCount !== undefined && charCount !== undefined && charCount > 0 && charCount < minCharCount;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {cleanLabel}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <div className="flex items-center gap-2">
          {maxLength !== undefined && (
            <span
              className={`text-[11px] font-mono transition-colors ${
                isOverLimit
                  ? "text-red-600 font-bold"
                  : isNearLimit
                  ? "text-amber-600 font-medium"
                  : isUnderMin
                  ? "text-amber-600 font-medium"
                  : "text-slate-400"
              }`}
              title={
                isOverLimit
                  ? "Exceeds maximum character limit"
                  : minCharCount
                  ? `Min: ${minCharCount}, Max: ${maxLength}`
                  : undefined
              }
            >
              <span>{charCount ?? 0}/{maxLength}</span>
              {minCharCount !== undefined && (
                <span className="ml-1 text-[10px] text-slate-400 font-sans font-medium">
                  (Min: {minCharCount})
                </span>
              )}
            </span>
          )}
          {rightElement}
        </div>
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-450">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  rightElement?: ReactNode;
  inputRightElement?: ReactNode;
  showCharCount?: boolean;
  charCount?: number;
  maxCharCount?: number;
  minCharCount?: number;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      hint,
      error: propError,
      required,
      rightElement,
      inputRightElement,
      className = "",
      maxLength,
      onKeyDown,
      onChange,
      onBlur,
      value,
      defaultValue,
      showCharCount,
      charCount: propCharCount,
      maxCharCount,
      minCharCount,
      ...props
    },
    ref
  ) => {
    const isPhoneField =
      props.type === "tel" ||
      /phone|mobile|contact number|telephone/i.test(label || "") ||
      /phone|mobile/i.test(props.name || "");

    const isEmailField =
      props.type === "email" || /email/i.test(label || "") || /email/i.test(props.name || "");

    const effectiveMaxLength =
      maxCharCount !== undefined
        ? maxCharCount
        : maxLength !== undefined
        ? maxLength
        : isPhoneField
        ? MAX_LENGTHS.PHONE
        : isEmailField
        ? MAX_LENGTHS.EMAIL
        : undefined;

    const effectiveMinLength =
      minCharCount !== undefined
        ? minCharCount
        : props.minLength !== undefined
        ? props.minLength
        : undefined;

    const [touched, setTouched] = useState(false);
    const [keyLimitError, setKeyLimitError] = useState<string | null>(null);
    const [internalValue, setInternalValue] = useState(
      value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ""
    );

    const currentVal = value !== undefined ? String(value) : internalValue;
    const charCount = currentVal ? currentVal.length : (propCharCount ?? 0);

    const cleanLabel = (label || "").replace(/[\s\*\^]+$/, "").trim();

    let autoError: string | null = null;
    if (effectiveMaxLength && charCount > effectiveMaxLength) {
      autoError = isPhoneField
        ? `${cleanLabel} cannot exceed ${effectiveMaxLength} digits. Too long text is not accepted. Please enter valid data`
        : `${cleanLabel} cannot exceed ${effectiveMaxLength} characters. Characters limit: ${effectiveMaxLength}. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data`;
    } else if (touched) {
      if (required && !currentVal.trim()) {
        autoError = `${cleanLabel} is required. Field is required. Please fill out this field`;
      } else if (effectiveMinLength && currentVal.trim() && currentVal.trim().length < effectiveMinLength) {
        autoError = `${cleanLabel} must be at least ${effectiveMinLength} characters. Value must be at least ${effectiveMinLength} characters. Too short text is not accepted. Minimum characters required: ${effectiveMinLength}. Please enter valid data`;
      } else if (isEmailField && currentVal.trim() && !isValidEmail(currentVal)) {
        autoError = "Please enter a valid email address. Invalid data is not accepted. Please enter valid data";
      } else if (isPhoneField && currentVal.trim() && !isValidPhone(currentVal)) {
        autoError = "Please enter a valid 10-digit phone number. Invalid data is not accepted. Please enter valid data";
      }
    }

    const activeError = propError || keyLimitError || autoError;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const allowedNavKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];

      if (isPhoneField) {
        if (!allowedNavKeys.includes(e.key) && !e.ctrlKey && !e.metaKey && !/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          const digitOnlyMsg = "Invalid phone number. Phone Number should accept 10 digits only. Invalid data is not accepted. Please enter valid data";
          setKeyLimitError(digitOnlyMsg);
          toast.error(digitOnlyMsg, { id: `${cleanLabel}-digit-only` });
          if (onKeyDown) onKeyDown(e);
          return;
        }
      }

      if (effectiveMaxLength && !allowedNavKeys.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const input = e.currentTarget;
        const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
        if (!hasSelection && currentVal.length >= effectiveMaxLength) {
          e.preventDefault();
          const limitMsg = isPhoneField
            ? `${cleanLabel} cannot exceed ${effectiveMaxLength} digits. Too long text is not accepted. Please enter valid data`
            : `${cleanLabel} cannot exceed ${effectiveMaxLength} characters. Characters limit: ${effectiveMaxLength}. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data`;
          setKeyLimitError(limitMsg);
          toast.error(limitMsg, { id: `${cleanLabel}-limit-exceeded` });
          if (onKeyDown) onKeyDown(e);
          return;
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (isPhoneField) {
        const cleanValue = val.replace(/\D/g, "");
        if (val !== cleanValue) {
          val = cleanValue;
          e.target.value = cleanValue;
        }
      }
      if (effectiveMaxLength && val.length <= effectiveMaxLength) {
        setKeyLimitError(null);
      }
      if (value === undefined) {
        setInternalValue(val);
      }
      if (onChange) onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      if (onBlur) onBlur(e);
    };

    const borderStyle = activeError
      ? "border-red-500 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 text-slate-700 focus:border-navy-500 focus:ring-1 focus:ring-navy-500";

    return (
      <FieldWrapper
        label={label}
        required={required}
        hint={hint}
        error={activeError}
        charCount={charCount}
        minCharCount={effectiveMinLength}
        maxLength={
          showCharCount !== false && effectiveMaxLength && props.type !== "number"
            ? effectiveMaxLength
            : undefined
        }
        rightElement={rightElement}
      >
        <div className="relative flex items-center">
          <input
            ref={ref}
            minLength={effectiveMinLength}
            maxLength={props.type !== "number" ? effectiveMaxLength : undefined}
            className={`${fieldClasses} ${borderStyle} ${inputRightElement ? "pr-8" : ""} ${className}`}
            required={required}
            value={value}
            defaultValue={defaultValue}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props}
          />
          {inputRightElement && (
            <div className="absolute right-1.5 flex items-center z-10">
              {inputRightElement}
            </div>
          )}
        </div>
      </FieldWrapper>
    );
  }
);
InputField.displayName = "InputField";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string | null;
  rightElement?: ReactNode;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, hint, error, required, rightElement, className = "", children, ...props }, ref) => {
    const borderStyle = error
      ? "border-red-500 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 text-slate-700 focus:border-navy-500 focus:ring-1 focus:ring-navy-500";

    return (
      <FieldWrapper label={label} required={required} hint={hint} error={error} rightElement={rightElement}>
        <select
          ref={ref}
          className={`${fieldClasses} bg-white ${borderStyle} ${className}`}
          required={required}
          {...props}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  }
);
SelectField.displayName = "SelectField";

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string | null;
  rightElement?: ReactNode;
  showCharCount?: boolean;
  charCount?: number;
  maxCharCount?: number;
  minCharCount?: number;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      hint,
      error: propError,
      required,
      rightElement,
      className = "",
      maxLength = MAX_LENGTHS.LONG_TEXT,
      onKeyDown,
      onChange,
      onBlur,
      value,
      defaultValue,
      showCharCount,
      charCount: propCharCount,
      maxCharCount,
      minCharCount,
      ...props
    },
    ref
  ) => {
    const effectiveMaxLength = maxCharCount !== undefined ? maxCharCount : maxLength;
    const effectiveMinLength =
      minCharCount !== undefined
        ? minCharCount
        : props.minLength !== undefined
        ? props.minLength
        : undefined;
    const [touched, setTouched] = useState(false);
    const [keyLimitError, setKeyLimitError] = useState<string | null>(null);
    const [internalValue, setInternalValue] = useState(
      value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ""
    );

    const currentVal = value !== undefined ? String(value) : internalValue;
    const charCount = currentVal ? currentVal.length : (propCharCount ?? 0);
    const cleanLabel = (label || "").replace(/[\s\*\^]+$/, "").trim();

    let autoError: string | null = null;
    if (effectiveMaxLength && charCount > effectiveMaxLength) {
      autoError = `${cleanLabel} cannot exceed ${effectiveMaxLength} characters. Characters limit: ${effectiveMaxLength}. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data`;
    } else if (touched) {
      if (required && !currentVal.trim()) {
        autoError = `${cleanLabel} is required. Field is required. Please fill out this field`;
      } else if (effectiveMinLength && currentVal.trim() && currentVal.trim().length < effectiveMinLength) {
        autoError = `${cleanLabel} must be at least ${effectiveMinLength} characters. Value must be at least ${effectiveMinLength} characters. Too short text is not accepted. Minimum characters required: ${effectiveMinLength}. Please enter valid data`;
      }
    }

    const activeError = propError || keyLimitError || autoError;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const allowedNavKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];

      if (maxLength && !allowedNavKeys.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const input = e.currentTarget;
        const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
        if (!hasSelection && currentVal.length >= maxLength) {
          e.preventDefault();
          const limitMsg = `${cleanLabel} cannot exceed ${maxLength} characters. Characters limit: ${maxLength}. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data`;
          setKeyLimitError(limitMsg);
          toast.error(limitMsg, { id: `${cleanLabel}-limit-exceeded` });
          if (onKeyDown) onKeyDown(e);
          return;
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let val = e.target.value;
      if (maxLength && val.length <= maxLength) {
        setKeyLimitError(null);
      }
      if (value === undefined) {
        setInternalValue(val);
      }
      if (onChange) onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setTouched(true);
      if (onBlur) onBlur(e);
    };

    const borderStyle = activeError
      ? "border-red-500 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-slate-300 text-slate-700 focus:border-navy-500 focus:ring-1 focus:ring-navy-500";

    return (
      <FieldWrapper
        label={label}
        required={required}
        hint={hint}
        error={activeError}
        charCount={charCount}
        minCharCount={effectiveMinLength}
        maxLength={showCharCount !== false ? effectiveMaxLength : undefined}
        rightElement={rightElement}
      >
        <textarea
          ref={ref}
          minLength={effectiveMinLength}
          maxLength={effectiveMaxLength}
          className={`${fieldClasses} ${borderStyle} ${className}`}
          required={required}
          value={value}
          defaultValue={defaultValue}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
TextareaField.displayName = "TextareaField";
