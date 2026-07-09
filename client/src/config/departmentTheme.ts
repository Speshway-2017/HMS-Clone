import { HeartPulse, Microscope, Baby, Brain, Radiation, Siren, Building2, type LucideIcon } from "lucide-react";

interface DepartmentTheme {
  icon: LucideIcon;
  className: string;
}

export const DEPARTMENT_THEMES: Record<string, DepartmentTheme> = {
  cardiology: { icon: HeartPulse, className: "bg-navy-50 text-navy-700" },
  oncology: { icon: Microscope, className: "bg-navy-700 text-white" },
  pediatrics: { icon: Baby, className: "bg-emerald-600 text-white" },
  neurology: { icon: Brain, className: "bg-slate-700 text-white" },
  radiology: { icon: Radiation, className: "bg-navy-50 text-navy-700" },
  emergency: { icon: Siren, className: "bg-red-600 text-white" },
  general: { icon: Building2, className: "bg-slate-200 text-slate-700" },
};

export const DEPARTMENT_CATEGORIES = Object.keys(DEPARTMENT_THEMES);

export function getDepartmentTheme(category: string): DepartmentTheme {
  return DEPARTMENT_THEMES[category] ?? DEPARTMENT_THEMES.general;
}
