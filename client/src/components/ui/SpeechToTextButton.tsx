import { useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "../../hooks/useSpeechToText";

export interface SpeechToTextButtonProps {
  value: string;
  onChange: (newValue: string) => void;
  lang?: string;
  disabled?: boolean;
  className?: string;
}

export function SpeechToTextButton({
  value,
  onChange,
  lang = "en-US",
  disabled = false,
  className = "",
}: SpeechToTextButtonProps) {
  const baseValueRef = useRef<string>("");
  const currentValueRef = useRef<string>(value || "");
  currentValueRef.current = value || "";

  const appendTranscript = (existing: string, newText: string) => {
    const cleanExisting = (existing || "").trim();
    const cleanNew = (newText || "").trim();
    if (!cleanNew) return existing;
    if (!cleanExisting) return cleanNew;
    const needsPeriod = !/[.!?]$/.test(cleanExisting);
    return `${cleanExisting}${needsPeriod ? "." : ""} ${cleanNew}`;
  };

  const { isListening, isSupported, startListening, stopListening } = useSpeechToText({
    lang,
    continuous: true,
    interimResults: true,
    onResult: (sessionTranscript) => {
      if (sessionTranscript) {
        const updated = appendTranscript(baseValueRef.current, sessionTranscript);
        onChange(updated);
        currentValueRef.current = updated;
      }
    },
    onAutoRestart: () => {
      baseValueRef.current = currentValueRef.current;
    },
  });

  const handleToggle = () => {
    if (disabled) return;
    if (isListening) {
      stopListening();
    } else {
      baseValueRef.current = value || "";
      currentValueRef.current = value || "";
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <span
        title="Speech recognition is not supported in this browser"
        className="inline-flex items-center text-slate-300 cursor-not-allowed text-xs p-1"
      >
        <Mic className="h-3.5 w-3.5 opacity-50" />
      </span>
    );
  }

  if (isListening) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title="Click to stop speech recognition"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all shadow-xs cursor-pointer ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
        <MicOff className="h-3.5 w-3.5 text-red-600" />
        <span>Listening...</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      title="Click to start Speech-to-Text"
      className={`inline-flex items-center gap-1 p-1 rounded-md text-slate-500 hover:text-navy-700 hover:bg-slate-100 transition-colors text-xs font-medium cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <Mic className="h-3.5 w-3.5" />
      <span className="hidden sm:inline text-[11px]">Dictate</span>
    </button>
  );
}
