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
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-lg bg-navy-50 p-2 text-navy-700">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}
