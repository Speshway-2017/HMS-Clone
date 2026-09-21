import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
  full: "max-w-[95vw]",
};

export function Modal({ title, isOpen, onClose, children, size = "md", className = "" }: ModalProps) {
  if (!isOpen) return null;

  const widthClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:inset-auto print:block">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-transparent transition-opacity print:hidden"
        onClick={onClose}
      />

      <div className={`relative z-10 w-full ${widthClass} rounded-xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] sm:max-h-[85vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none ${className}`}>
        <div className="mb-4 flex items-center justify-between shrink-0 print:hidden">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate pr-2">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pr-1 print:overflow-visible print:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
