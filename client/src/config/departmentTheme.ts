import { HeartPulse, Microscope, Baby, Brain, Radiation, Siren, Building2 } from "lucide-react";
import type { ComponentType } from "react";
export type LucideIcon = ComponentType<any>;

interface DepartmentTheme {
  icon: LucideIcon;
  className: string;
}

export const DEPARTMENT_THEMES: Record<string, DepartmentTheme> = {
  cardiology: { icon: HeartPulse, className: "bg-rose-50 text-rose-700 border border-rose-200" },
  oncology: { icon: Microscope, className: "bg-emerald-700 text-white" },
  pediatrics: { icon: Baby, className: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
  neurology: { icon: Brain, className: "bg-slate-800 text-white" },
  radiology: { icon: Radiation, className: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
  emergency: { icon: Siren, className: "bg-rose-600 text-white" },
  general: { icon: Building2, className: "bg-slate-100 text-slate-700 border border-slate-200" },
};

export const DEPARTMENT_CATEGORIES = Object.keys(DEPARTMENT_THEMES);

export function getDepartmentTheme(category: string): DepartmentTheme {
  return DEPARTMENT_THEMES[category] ?? DEPARTMENT_THEMES.general;
}
