import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: { direction: "up" | "down"; text: string };
  emphasis?: boolean;
  to?: string;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
  expandable?: boolean;
}

export function KpiCard({
  label,
  value,
  icon,
  trend,
  emphasis = false,
  to,
  onClick,
  className = "",
  size = "md",
  expandable = true,
}: KpiCardProps) {
  const isSm = size === "sm";
  const [isExpanded, setIsExpanded] = useState(false);

  const valueString = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const isLong = valueString.length > 15;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (expandable && isLong) {
      setIsExpanded((prev) => !prev);
    }
  };

  const cardContent = (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      className={`h-full min-w-0 overflow-hidden transition-all duration-300 cursor-pointer ${
        isSm ? "p-4" : "p-5 sm:p-6"
      } ${
        emphasis
          ? "bg-navy-700 text-white hover:bg-navy-800"
          : "hover:bg-slate-50 hover:border-slate-350 focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
      } ${className}`}
      title={valueString ? `${label}: ${valueString} (Click to show complete amount)` : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide truncate ${
            emphasis ? "text-navy-100" : "text-slate-500"
          }`}
        >
          {label}
        </span>
        {icon && (
          <span
            className={`rounded-lg flex-shrink-0 ${isSm ? "p-1.5" : "p-2"} ${
              emphasis ? "bg-white/15" : "bg-navy-50 text-navy-700"
            }`}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        className={`font-semibold tracking-tight transition-all ${
          isExpanded
            ? "mt-3 text-lg sm:text-xl break-all whitespace-normal"
            : `mt-3 ${isSm ? "text-xl sm:text-2xl" : "text-2xl xl:text-3xl"} ${isLong ? "text-xl sm:text-2xl" : ""} truncate`
        }`}
      >
        {value}
      </div>

      {isLong && expandable && !onClick && (
        <p className={`text-[10px] mt-1 font-medium ${emphasis ? "text-navy-200" : "text-slate-400"}`}>
          {isExpanded ? "Click to collapse" : "Click to show complete amount"}
        </p>
      )}

      {trend && (
        <div
          className={`font-medium ${isSm ? "mt-1.5 text-xs" : "mt-2 text-sm"} ${
            trend.direction === "up" ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {trend.direction === "up" ? "↗" : "↘"} {trend.text}
        </div>
      )}
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="no-underline text-inherit block h-full min-w-0 focus:outline-none">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
