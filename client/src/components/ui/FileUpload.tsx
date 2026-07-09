import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";

type UploadFolder = "hospital-logos" | "hospital-licenses" | "admin-avatars";

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

      {value ? (
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-6 text-sm text-slate-500 hover:border-navy-400 hover:text-navy-700 disabled:opacity-60"
        >
          <UploadCloud className="h-4 w-4" />
          {isUploading ? "Uploading..." : "Click to upload"}
        </button>
      )}

      <input ref={inputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
