import { ReactNode, ComponentType } from "react";
import { Card } from "./Card";

export type LucideIcon = ComponentType<any>;

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}

export function FormSection({ icon: Icon, title, children }: FormSectionProps) {
  return (
    <Card>
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
        <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-700 border border-emerald-100 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold text-slate-850">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </Card>
  );
}
