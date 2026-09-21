import React from "react";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className = "",
  size = 140,
  duration = 8,
  borderWidth = 2,
  colorFrom = "#2563eb", // Royal Blue
  colorTo = "#60a5fa",   // Light Blue
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden ${className}`}
    >
      <div
        className="border-beam-wrapper rounded-[inherit]"
        style={{
          padding: `${borderWidth}px`,
        }}
      >
        <div
          className="border-beam-beam"
          style={{
            width: `${size}px`,
            background: `linear-gradient(to right, ${colorFrom}, ${colorTo}, transparent)`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
      </div>
    </div>
  );
}

export default BorderBeam;
