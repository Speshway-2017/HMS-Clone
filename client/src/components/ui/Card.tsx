import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const hasBg = /\bbg-/.test(className);
  return <div className={`rounded-xl border border-slate-200 ${hasBg ? "" : "bg-white"} p-6 shadow-card ${className}`} {...props} />;
}
