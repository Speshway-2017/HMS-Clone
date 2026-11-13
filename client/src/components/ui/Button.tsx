import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline" | "accent";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-emerald-600 shadow-xs",
  accent: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:outline-rose-600 shadow-xs",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-slate-400 shadow-xs",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:outline-red-600 shadow-xs",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400",
  outline: "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2 py-1 text-[11px] rounded-md font-semibold",
  md: "px-3 py-1.5 text-xs rounded-md font-semibold",
  lg: "px-4 py-2 text-xs sm:text-sm rounded-lg font-semibold",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";
