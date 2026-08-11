import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";

export interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onAutoRestart?: () => void;
  onError?: (errorMessage: string) => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const defaultLang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
  const {
    lang = defaultLang,
    continuous = true,
    interimResults = true,
    onResult,
    onAutoRestart,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);
  const restartTimerRef = useRef<any>(null);
  const onAutoRestartRef = useRef(onAutoRestart);
  onAutoRestartRef.current = onAutoRestart;

  const SpeechRecognitionAPI =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const isSupported = Boolean(SpeechRecognitionAPI);

  const cleanupRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    cleanupRecognition();
    setIsListening(false);
  }, [cleanupRecognition]);

  const initAndStart = useCallback(() => {
    if (!SpeechRecognitionAPI || !shouldListenRef.current) return;

    cleanupRecognition();

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = lang || defaultLang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        if (shouldListenRef.current) {
          setIsListening(true);
          setError(null);
        }
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript || "";
          if (piece) {
            const cleanPiece = piece.trim();
            if (cleanPiece) {
              if (fullTranscript) {
                fullTranscript += " " + cleanPiece;
              } else {
                fullTranscript = cleanPiece;
              }
            }
          }
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }

        setTranscript(fullTranscript);
        if (onResult && fullTranscript) {
          onResult(fullTranscript, isFinal);
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event.error;
        console.warn("Speech recognition event error:", errType);

        if (errType === "no-speech" || errType === "aborted") {
          return;
        }

        let message = "Speech recognition error occurred.";
        let isFatal = false;

        switch (errType) {
          case "not-allowed":
          case "permission-denied":
            message = "Microphone access denied. Please allow microphone permission in your browser.";
            isFatal = true;
            break;
          case "audio-capture":
            message = "No microphone found. Please connect a microphone.";
            isFatal = true;
            break;
          case "network":
            message = "Speech service network issue. Please check internet connection.";
            break;
          default:
            message = `Speech recognition error: ${errType}`;
        }

        setError(message);
        toast.error(message);
        if (onError) onError(message);

        if (isFatal) {
          shouldListenRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          if (onAutoRestartRef.current) {
            onAutoRestartRef.current();
          }
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              initAndStart();
            }
          }, 300);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start Speech Recognition:", err);
      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) {
            initAndStart();
          }
        }, 500);
      }
    }
  }, [SpeechRecognitionAPI, lang, defaultLang, continuous, interimResults, onResult, onError, cleanupRecognition]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const errMsg = "Speech recognition is not supported in this browser.";
      setError(errMsg);
      toast.error(errMsg);
      if (onError) onError(errMsg);
      return;
    }

    shouldListenRef.current = true;
    setError(null);
    setTranscript("");
    initAndStart();
  }, [isSupported, initAndStart, onError]);

  const toggleListening = useCallback(() => {
    if (isListening || shouldListenRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}

