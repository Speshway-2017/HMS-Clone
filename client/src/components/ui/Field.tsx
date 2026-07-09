import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const fieldClasses =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 disabled:bg-slate-100 disabled:text-slate-400";

interface WrapperProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, required, hint, children }: WrapperProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function InputField({ label, hint, required, className = "", ...props }: InputFieldProps) {
  return (
    <FieldWrapper label={label} required={required} hint={hint}>
      <input className={`${fieldClasses} ${className}`} required={required} {...props} />
    </FieldWrapper>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function SelectField({ label, hint, required, className = "", children, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} required={required} hint={hint}>
      <select className={`${fieldClasses} bg-white ${className}`} required={required} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextareaField({ label, hint, required, className = "", ...props }: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} required={required} hint={hint}>
      <textarea className={`${fieldClasses} ${className}`} required={required} {...props} />
    </FieldWrapper>
  );
}
