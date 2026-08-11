import React from "react";

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
  text = "Secure Sign In",
  className = "",
  type = "submit",
  disabled = false,
  onClick,
}: AnimatedSubmitButtonProps) {
  const isActive = isSubmitting || isSuccess;

  return (
    <div className="flex justify-center w-full my-2">
      <style>{`
        @keyframes spinBtn {
          0% {
            transform: rotate(0deg);
          }
          80% {
            border: 4px solid transparent;
            border-left: 4px solid #2563eb;
          }
          100% {
            transform: rotate(1080deg);
            border: 4px solid #2563eb;
          }
        }

        @keyframes checkBtn {
          0% {
            fill: transparent;
            opacity: 0;
            transform: scale(0.4);
          }
          70% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            fill: #17b978;
            opacity: 1;
            transform: scale(1);
          }
        }

        .animated-btn-spin {
          outline: none !important;
          width: 50px !important;
          border: 2px solid #2563eb !important;
          border-left: 4px solid #2563eb !important;
          border-bottom: 4px solid #2563eb !important;
          animation: spinBtn 1.6s ease-in-out forwards !important;
          background: white !important;
        }

        .animated-btn-spin span {
          color: transparent !important;
          opacity: 0 !important;
        }

        .animated-btn-success svg {
          animation: checkBtn 500ms ease-out forwards !important;
          fill: #17b978 !important;
          opacity: 1 !important;
        }
      `}</style>
      <button
        type={type}
        disabled={disabled || isActive}
        onClick={onClick}
        className={`animated-submit-btn select-none relative flex items-center justify-center h-[50px] w-full rounded-[50px] border-4 border-blue-600 bg-blue-600 transition-all duration-300 outline-none ${
          !isActive ? "hover:bg-blue-700 hover:border-blue-700 active:scale-95 cursor-pointer shadow-md shadow-blue-500/20" : "cursor-wait"
        } ${isActive ? "animated-btn-spin" : ""} ${isSuccess ? "animated-btn-success" : ""} ${className}`}
      >
        <span className="absolute text-white font-bold uppercase tracking-[2px] text-xs transition-opacity duration-200 pointer-events-none">
          {text}
        </span>
        <svg
          className="absolute pointer-events-none fill-transparent transition-all duration-300"
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
        >
          <path d="M0 11c2.761.575 6.312 1.688 9 3.438 3.157-4.23 8.828-8.187 15-11.438-5.861 5.775-10.711 12.328-14 18.917-2.651-3.766-5.547-7.271-10-10.917z" />
        </svg>
      </button>
    </div>
  );
}
