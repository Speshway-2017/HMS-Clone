import { ReactNode } from "react";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: { direction: "up" | "down"; text: string };
  emphasis?: boolean;
}

export function KpiCard({ label, value, icon, trend, emphasis = false }: KpiCardProps) {
  return (
    <Card className={emphasis ? "bg-navy-700 text-white" : ""}>
      <div className="flex items-start justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${emphasis ? "text-navy-100" : "text-slate-500"}`}>
          {label}
        </span>
        {icon && (
          <span className={`rounded-lg p-2 ${emphasis ? "bg-white/15" : "bg-navy-50 text-navy-700"}`}>{icon}</span>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      {trend && (
        <div className={`mt-2 text-sm font-medium ${trend.direction === "up" ? "text-emerald-500" : "text-red-500"}`}>
          {trend.direction === "up" ? "↗" : "↘"} {trend.text}
        </div>
      )}
    </Card>
  );
}
