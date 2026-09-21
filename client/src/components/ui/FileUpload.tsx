import { useRef, useState, useEffect } from "react";
import { UploadCloud, FileText, X, Camera, Loader2 } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";

type UploadFolder = "hospital-logos" | "hospital-licenses" | "admin-avatars" | "doctor-photos" | "staff-photos" | "patient-photos" | "blog-covers";

interface FileUploadProps {
  label: string;
  folder: UploadFolder;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  hint?: string;
}

export function FileUpload({ label, folder, value, onChange, accept = "image/png,image/jpeg,image/webp", hint }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPdf = value.toLowerCase().endsWith(".pdf");

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  async function startCamera() {
    setError(null);
    setIsCameraActive(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
      });
      setStream(mediaStream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch((err) => {
            console.error("Video play failed:", err);
          });
        }
      }, 100);
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }

  async function capturePhoto() {
    if (!videoRef.current || !stream) return;
    setIsUploading(true);
    setError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror horizontally to match preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
        );
        
        if (blob) {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);
          const res = await api.post("/uploads", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          onChange(res.data.data.url);
          stopCamera();
        } else {
          setError("Failed to capture image blob.");
        }
      }
    } catch (err) {
      setError("Failed to upload captured image.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await api.post("/uploads", formData, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.data.url);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>

      {isCameraActive ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black aspect-video flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white text-xs font-semibold">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Initializing camera...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!stream || isUploading}
              className="flex-1 bg-navy-700 hover:bg-navy-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-55"
            >
              <Camera className="h-4 w-4" />
              Capture & Save
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-650 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-300 p-3">
          {isPdf ? (
            <FileText className="h-8 w-8 text-navy-700" />
          ) : (
            <img src={value} alt={label} className="h-12 w-12 rounded-md object-cover" />
          )}
          <a href={value} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm text-navy-700 hover:underline">
            {value}
          </a>
          <button type="button" onClick={() => onChange("")} className="text-slate-400 hover:text-red-600" aria-label="Remove file">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-6 text-sm text-slate-500 hover:border-navy-400 hover:text-navy-700 disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Click to upload"}
          </button>

          {accept.includes("image/") && (
            <button
              type="button"
              onClick={startCamera}
              disabled={isUploading}
              className="flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 hover:text-navy-700 disabled:opacity-60 transition-all cursor-pointer"
              title="Capture from camera"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
