import { ReactNode } from "react";
import { Card } from "./Card";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, actions, children, className = "" }: ChartCardProps) {
  return (
    <Card className={className}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-850">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}
