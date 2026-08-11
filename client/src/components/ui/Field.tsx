import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef } from "react";

const fieldClasses =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 disabled:bg-slate-100 disabled:text-slate-400";

interface WrapperProps {
  label: string;
  required?: boolean;
  hint?: string;
  rightElement?: ReactNode;
  children: ReactNode;
}

export function FieldWrapper({ label, required, hint, rightElement, children }: WrapperProps) {
  const cleanLabel = (label || "").replace(/[\s\*\^]+$/, "").trim();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {cleanLabel}
          {required && <span className="text-red-500"> *</span>}
        </label>
        {rightElement}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-450">{hint}</p>}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  rightElement?: ReactNode;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, hint, required, rightElement, className = "", onKeyDown, onChange, onInput, ...props }, ref) => {
    const isPhoneField =
      props.type === "tel" ||
      /phone|mobile|contact number|telephone/i.test(label || "") ||
      /phone|mobile/i.test(props.name || "");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isPhoneField) {
        // Allow navigation keys, backspace, tab, enter, +, and digits 0-9
        const allowedKeys = [
          "Backspace", "Delete", "Tab", "Escape", "Enter",
          "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "+"
        ];
        if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey && !/^[0-9]$/.test(e.key)) {
          e.preventDefault();
        }
      }
      if (onKeyDown) onKeyDown(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isPhoneField) {
        // Strip out non-numeric characters (allow leading +)
        const cleanValue = e.target.value.replace(/(?!^\+)[^\d]/g, "");
        if (e.target.value !== cleanValue) {
          e.target.value = cleanValue;
        }
      }
      if (onChange) onChange(e);
    };

    return (
      <FieldWrapper label={label} required={required} hint={hint} rightElement={rightElement}>
        <input
          ref={ref}
          className={`${fieldClasses} ${className}`}
          required={required}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
InputField.displayName = "InputField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  rightElement?: ReactNode;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, hint, required, rightElement, className = "", children, ...props }, ref) => {
    return (
      <FieldWrapper label={label} required={required} hint={hint} rightElement={rightElement}>
        <select ref={ref} className={`${fieldClasses} bg-white ${className}`} required={required} {...props}>
          {children}
        </select>
      </FieldWrapper>
    );
  }
);
SelectField.displayName = "SelectField";

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  rightElement?: ReactNode;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, hint, required, rightElement, className = "", ...props }, ref) => {
    return (
      <FieldWrapper label={label} required={required} hint={hint} rightElement={rightElement}>
        <textarea ref={ref} className={`${fieldClasses} ${className}`} required={required} {...props} />
      </FieldWrapper>
    );
  }
);
TextareaField.displayName = "TextareaField";

