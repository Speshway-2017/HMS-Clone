import React from "react";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "accent" | "care";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border border-amber-200",
  danger: "bg-red-50 text-red-800 border border-red-200",
  info: "bg-sky-50 text-sky-800 border border-sky-200",
  neutral: "bg-slate-100 text-slate-700 border border-slate-200",
  accent: "bg-rose-50 text-rose-800 border border-rose-200",
  care: "bg-pink-50 text-pink-800 border border-pink-200",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap shadow-xs ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
