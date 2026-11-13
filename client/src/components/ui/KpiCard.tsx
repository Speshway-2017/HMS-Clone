import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  subtitle?: ReactNode;
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
  subtitle,
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
      className={`h-full min-w-0 overflow-hidden transition-all duration-150 cursor-pointer ${
        isSm ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4"
      } ${
        emphasis
          ? "bg-emerald-700 text-white hover:bg-emerald-800 border-emerald-800 shadow-xs"
          : "bg-white hover:bg-emerald-50/20 hover:border-emerald-300 border-slate-200 shadow-xs"
      } ${className}`}
      title={valueString ? `${label}: ${valueString} (Click to show complete amount)` : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider truncate ${
            emphasis ? "text-emerald-100" : "text-slate-500"
          }`}
        >
          {label}
        </span>
        {icon && (
          <span
            className={`rounded-lg flex-shrink-0 flex items-center justify-center ${
              isSm ? "h-7 w-7" : "h-8 w-8"
            } ${
              emphasis
                ? "bg-white/15 text-white"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        className={`font-bold tracking-tight transition-all text-slate-900 ${
          emphasis ? "text-white" : "text-slate-900"
        } ${
          isExpanded
            ? "mt-2 text-base sm:text-lg break-all whitespace-normal"
            : `mt-2 ${isSm ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} ${isLong ? "text-lg" : ""} truncate`
        }`}
      >
        {value}
      </div>

      {isLong && expandable && !onClick && (
        <p className={`text-[10px] mt-0.5 font-medium ${emphasis ? "text-emerald-200" : "text-slate-400"}`}>
          {isExpanded ? "Click to collapse" : "Click to view full"}
        </p>
      )}

      {subtitle ? (
        <div className={`text-xs ${isSm ? "mt-1" : "mt-1.5"} ${emphasis ? "text-emerald-100" : "text-slate-500 font-normal"}`}>
          {subtitle}
        </div>
      ) : trend ? (
        <div
          className={`font-semibold flex items-center gap-1 ${
            isSm ? "mt-1 text-[11px]" : "mt-1.5 text-xs"
          } ${
            trend.direction === "up"
              ? emphasis ? "text-emerald-200" : "text-emerald-600"
              : emphasis ? "text-rose-200" : "text-rose-600"
          }`}
        >
          <span>{trend.direction === "up" ? "↗" : "↘"}</span>
          <span>{trend.text}</span>
        </div>
      ) : null}
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
