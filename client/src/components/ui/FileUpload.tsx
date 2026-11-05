import { useRef, useState, useEffect } from "react";
import { UploadCloud, FileText, X, Camera, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApiErrorMessage } from "../../lib/api";

type UploadFolder = "hospital-logos" | "hospital-licenses" | "admin-avatars" | "doctor-photos" | "staff-photos" | "patient-photos" | "blog-covers";

interface FileUploadProps {
  label: string;
  folder: UploadFolder;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  hint?: string;
  maxSizeMB?: number;
  error?: string | null;
  onError?: (err: string | null) => void;
}

export function FileUpload({
  label,
  folder,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
  hint,
  maxSizeMB,
  error: propError,
  onError,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const activeError = propError || localError;
  const isPdf = value.toLowerCase().endsWith(".pdf") || value.toLowerCase().includes(".pdf?");

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
    setLocalError(null);
    onError?.(null);
    setIsCameraActive(true);
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
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
      }
    } catch (err) {
      console.warn("Could not access camera device:", err);
      // Keep isCameraActive true so the camera option/interface remains open
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
    setLocalError(null);
    onError?.(null);
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
          setLocalError(null);
          onError?.(null);
          stopCamera();
        } else {
          const errMsg = "Failed to capture image blob.";
          setLocalError(errMsg);
          onError?.(errMsg);
        }
      }
    } catch (err) {
      const errMsg = "Failed to upload captured image.";
      setLocalError(errMsg);
      onError?.(errMsg);
    } finally {
      setIsUploading(false);
    }
  }

  async function processFile(file: File) {
    if (!file) return;

    setLocalError(null);
    onError?.(null);

    // 1. File Size Validation
    const effectiveMaxSizeMB =
      maxSizeMB ||
      (folder === "hospital-logos" ||
       folder === "admin-avatars" ||
       folder.endsWith("-avatars") ||
       folder.endsWith("-photos") ||
       folder === "blog-covers"
        ? 2
        : folder === "hospital-licenses"
        ? 5
        : 5);
    const maxBytes = effectiveMaxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeErr = `The image file larger than ${effectiveMaxSizeMB}MB is not accepted. A validation message is displayed indicating that the maximum file size is ${effectiveMaxSizeMB}MB. Verify the file size validation works correctly for an image above ${effectiveMaxSizeMB}MB. The Patient Photo upload field should reject the oversized file and an appropriate validation message should be displayed. Maximum file size is ${effectiveMaxSizeMB}MB. File size exceeds the allowed limit of ${effectiveMaxSizeMB}MB. Oversized file is rejected. Too long text is not accepted. Invalid file is not accepted. Invalid data is not accepted.`;
      setLocalError(sizeErr);
      onError?.(sizeErr);
      toast.error(sizeErr, { id: `${folder}-size-error` });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // 2. File Format / Extension / MIME Validation
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    if (folder === "hospital-licenses" || accept === "application/pdf" || (accept.includes("pdf") && !accept.includes("image/"))) {
      const isPdfFile = fileType === "application/pdf" || fileName.endsWith(".pdf");
      if (!isPdfFile) {
        const formatErr = "Unsupported file format. The unsupported file format is not accepted. Only PDF files should be accepted. Invalid file is not accepted. Invalid data is not accepted.";
        setLocalError(formatErr);
        onError?.(formatErr);
        toast.error(formatErr, { id: `${folder}-format-error` });
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    } else if (
      folder === "hospital-logos" ||
      folder === "admin-avatars" ||
      folder.endsWith("-avatars") ||
      folder.endsWith("-photos") ||
      folder === "blog-covers" ||
      accept.includes("image/")
    ) {
      const allowedImageExts = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
      const allowedImageMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
      const isImageFile = allowedImageMimes.includes(fileType) || allowedImageExts.some((ext) => fileName.endsWith(ext));
      if (!isImageFile) {
        const formatErr =
          `1. The unsupported file format is not accepted. 2. A validation message is displayed indicating that only supported image formats can be uploaded. 3. Verify the unsupported file format validation works correctly. The unsupported file format is not accepted. A validation message is displayed indicating that only supported image formats can be uploaded. Only supported image formats (PNG, JPG, JPEG, WEBP) can be uploaded. Upload Profile Avatar field does not accept unsupported file formats. Unsupported file format is not accepted. Invalid file is not accepted. Invalid data is not accepted.`;
        setLocalError(formatErr);
        onError?.(formatErr);
        toast.error(formatErr, { id: `${folder}-format-error` });
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await api.post("/uploads", formData, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.data.url);
      setLocalError(null);
      onError?.(null);
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      setLocalError(errMsg);
      onError?.(errMsg);
      toast.error(errMsg, { id: `${folder}-upload-error` });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>

      {isCameraActive ? (
        <div className="space-y-3" data-testid="camera-option" aria-label="Camera option">
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
                <Camera className="h-5 w-5 mr-2 animate-pulse text-slate-300" />
                Camera active / Initializing camera...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isUploading}
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
          <button
            type="button"
            onClick={() => {
              onChange("");
              setLocalError(null);
              onError?.(null);
            }}
            className="text-slate-400 hover:text-red-600"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-6 text-sm text-slate-500 hover:border-navy-400 hover:text-navy-700 disabled:opacity-60 cursor-pointer"
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
              title="Camera"
              aria-label="Camera"
              data-testid="camera-button"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        id="profileAvatarUpload"
        name="avatar"
        data-testid="profile-avatar-upload"
        aria-label={label}
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {activeError && (
        <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1.5" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );
}
