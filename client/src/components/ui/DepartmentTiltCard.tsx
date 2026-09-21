import React from "react";
import { motion } from "motion/react";

export interface DepartmentTiltCardProps {
  title: string;
  category?: string;
  specialization?: string;
  description?: string;
  headName?: string;
  location?: string;
  fee?: number | string;
  isEmergency?: boolean;
}

export function DepartmentTiltCard({
  title,
  category = "General",
  specialization = "General Medicine",
  description = "Our department provides comprehensive clinical checks and consulting services under experienced medical supervisors.",
  headName,
  location = "Main Building",
  fee = 300,
  isEmergency = false,
}: DepartmentTiltCardProps) {
  return (
    <div className="w-full h-full">
      <motion.div
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-400 ease-out hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-500/25 hover:-translate-y-1 flex flex-col justify-between min-h-[320px] h-full"
      >
        {/* Smooth Radial Clipped Circle Blue Background Fill */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 transition-all duration-500 ease-out [clip-path:circle(0%_at_100%_0%)] group-hover:[clip-path:circle(160%_at_100%_0%)] z-0"
        />

        {/* Card Header & Body Content */}
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold text-blue-600 uppercase tracking-wider border border-blue-100/80 transition-colors duration-400 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30">
              {category}
            </span>
            {isEmergency && (
              <span className="rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[9px] font-extrabold text-rose-600 uppercase tracking-wider transition-colors duration-400 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-400">
                EMERGENCY
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight transition-colors duration-400 group-hover:text-white">
              {title}
            </h3>
            <span className="block text-xs font-bold text-blue-600 transition-colors duration-400 group-hover:text-blue-100 mt-1">
              {specialization}
            </span>
          </div>

          <p className="text-xs font-medium text-slate-600 leading-relaxed transition-colors duration-400 group-hover:text-blue-50 line-clamp-3">
            {description}
          </p>

          <div className="space-y-2 pt-3 border-t border-slate-100 transition-colors duration-400 group-hover:border-white/20">
            {headName && (
              <div className="flex justify-between text-xs text-slate-500 transition-colors duration-400 group-hover:text-blue-100">
                <span>Department Head:</span>
                <span className="font-bold text-slate-800 transition-colors duration-400 group-hover:text-white">{headName}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-500 transition-colors duration-400 group-hover:text-blue-100">
              <span>Building Location:</span>
              <span className="font-bold text-slate-800 transition-colors duration-400 group-hover:text-white">{location}</span>
            </div>
          </div>
        </div>

        {/* Footer OPD Consultation Fee Badge Pill */}
        <div className="relative z-10 pt-4 border-t border-slate-100 transition-colors duration-400 group-hover:border-white/20 mt-6 flex justify-between items-center text-xs font-bold">
          <span className="text-slate-500 transition-colors duration-400 group-hover:text-blue-100">Consultation Fee:</span>
          <div className="inline-flex h-fit items-center text-xs shrink-0 shadow-sm rounded-full overflow-hidden">
            <span className="bg-slate-100 group-hover:bg-white/20 text-slate-700 group-hover:text-white py-1 px-3 font-extrabold transition-colors duration-400">
              OPD
            </span>
            <span className="bg-blue-600 group-hover:bg-white text-white group-hover:text-blue-700 py-1 px-3.5 font-extrabold transition-colors duration-400">
              ₹{fee}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
