import React from "react";
import { ArrowRight } from "lucide-react";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  text?: string;
  className?: string;
  disabled?: boolean;
}

export const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className = "", disabled = false, children, ...props }, ref) => {
  const content = children || text;

  return (
    <button
      ref={ref}
      disabled={disabled}
      type={props.type || "button"}
      className={`group relative min-w-48 cursor-pointer overflow-hidden rounded-full border border-blue-600 bg-white px-6 py-3 text-center text-xs font-extrabold tracking-wide text-blue-600 transition-all duration-300 ${
        disabled
          ? "opacity-50 cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 shadow-none pointer-events-none"
          : "hover:bg-blue-600 hover:text-white shadow-md hover:shadow-blue-500/25 active:scale-95"
      } ${className}`}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 w-2 rounded-full transition-all duration-500 ${disabled ? "bg-slate-400" : "bg-blue-600 group-hover:scale-[80.0] group-hover:bg-blue-600"}`} />
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {content}
        </span>
      </div>
      <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
        <span>{content}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export default InteractiveHoverButton;
