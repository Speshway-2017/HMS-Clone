import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: { direction: "up" | "down"; text: string };
  emphasis?: boolean;
  to?: string;
  className?: string;
  size?: "sm" | "md";
}

export function KpiCard({ label, value, icon, trend, emphasis = false, to, className = "", size = "md" }: KpiCardProps) {
  const isSm = size === "sm";

  const cardContent = (
    <Card
      role={to ? "button" : undefined}
      tabIndex={to ? 0 : undefined}
      className={`h-full transition-all duration-300 ${isSm ? "p-4" : "p-6"} ${
        emphasis
          ? "bg-navy-700 text-white hover:bg-navy-800"
          : "hover:bg-slate-50 hover:border-slate-350 focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
      } ${to ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${emphasis ? "text-navy-100" : "text-slate-500"}`}>
          {label}
        </span>
        {icon && (
          <span className={`rounded-lg ${isSm ? "p-1.5" : "p-2"} ${emphasis ? "bg-white/15" : "bg-navy-50 text-navy-700"}`}>{icon}</span>
        )}
      </div>
      <div className={`font-semibold ${isSm ? "mt-2 text-xl sm:text-2xl" : "mt-3 text-3xl"}`}>{value}</div>
      {trend && (
        <div className={`font-medium ${isSm ? "mt-1.5 text-xs" : "mt-2 text-sm"} ${trend.direction === "up" ? "text-emerald-500" : "text-red-500"}`}>
          {trend.direction === "up" ? "↗" : "↘"} {trend.text}
        </div>
      )}
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="no-underline text-inherit block h-full focus:outline-none">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
