"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface AnimatedListItemProps {
  id?: string;
  title: string;
  description: string;
  icon: React.ReactNode | string;
  color: string;
  badge?: string;
}

interface AnimatedListProps {
  items: AnimatedListItemProps[];
  className?: string;
}

export const TrustNotificationCard: React.FC<AnimatedListItemProps & { className?: string }> = ({
  title,
  description,
  icon,
  color,
  badge,
  className,
}) => {
  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 cursor-pointer group",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: color,
          }}
        >
          {typeof icon === "string" ? (
            <span className="text-xl">{icon}</span>
          ) : (
            <div className="text-white">{icon}</div>
          )}
        </div>

        {badge && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50/90 px-2.5 py-1 rounded-full border border-navy-100 shadow-2xs">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2 flex-1 flex flex-col justify-start">
        <h3 className="text-base font-bold text-slate-900 transition-colors duration-200 group-hover:text-slate-900">
          {title}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </div>
  );
};

export function AnimatedList({ items, className }: AnimatedListProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch w-full", className)}>
      <AnimatePresence mode="popLayout">
        {items.map((item, idx) => (
          <motion.div
            key={item.id || `trust-card-${idx}`}
            initial={{ scale: 0.88, opacity: 0, y: 25 }}
            whileInView={{ scale: 1, opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 24,
              delay: idx * 0.12,
            }}
            className="h-full flex flex-col"
          >
            <TrustNotificationCard {...item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
