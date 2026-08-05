import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef } from "react";

const fieldClasses =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 disabled:bg-slate-100 disabled:text-slate-400";

interface WrapperProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, required, hint, children }: WrapperProps) {
  const cleanLabel = (label || "").replace(/[\s\*\^]+$/, "").trim();
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {cleanLabel}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-450">{hint}</p>}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, hint, required, className = "", ...props }, ref) => {
    return (
      <FieldWrapper label={label} required={required} hint={hint}>
        <input ref={ref} className={`${fieldClasses} ${className}`} required={required} {...props} />
      </FieldWrapper>
    );
  }
);
InputField.displayName = "InputField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, hint, required, className = "", children, ...props }, ref) => {
    return (
      <FieldWrapper label={label} required={required} hint={hint}>
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
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, hint, required, className = "", ...props }, ref) => {
    return (
      <FieldWrapper label={label} required={required} hint={hint}>
        <textarea ref={ref} className={`${fieldClasses} ${className}`} required={required} {...props} />
      </FieldWrapper>
    );
  }
);
TextareaField.displayName = "TextareaField";

