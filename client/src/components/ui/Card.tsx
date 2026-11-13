import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const hasBg = /\bbg-/.test(className);
  const hasPadding = /\bp-/.test(className);
  return (
    <div
      className={`rounded-xl border border-slate-200/90 ${hasBg ? "" : "bg-white"} ${
        hasPadding ? "" : "p-4 sm:p-5"
      } shadow-xs ${className}`}
      {...props}
    />
  );
}
