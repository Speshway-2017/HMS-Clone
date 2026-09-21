type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 border border-amber-250/70",
  danger: "bg-red-50 text-red-700 border border-red-200/80",
  info: "bg-navy-50 text-navy-700 border border-navy-200/80",
  neutral: "bg-slate-50 text-slate-600 border border-slate-200",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap min-w-[100px] ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </span>
  );
}
