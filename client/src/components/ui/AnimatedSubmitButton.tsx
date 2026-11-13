import React from "react";
import { Loader2, Lock } from "lucide-react";

interface AnimatedSubmitButtonProps {
  isSubmitting?: boolean;
  isSuccess?: boolean;
  text?: string;
  className?: string;
  type?: "submit" | "button" | "reset";
  disabled?: boolean;
  onClick?: () => void;
}

export default function AnimatedSubmitButton({
  isSubmitting = false,
  isSuccess = false,
  text = "Sign In to Account",
  className = "",
  type = "submit",
  disabled = false,
  onClick,
}: AnimatedSubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isSubmitting}
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${className}`}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-white" />
          <span>Verifying Credentials...</span>
        </>
      ) : isSuccess ? (
        <span>Success! Redirecting...</span>
      ) : (
        <>
          <Lock className="h-4 w-4 text-emerald-200" />
          <span>{text}</span>
        </>
      )}
    </button>
  );
}
