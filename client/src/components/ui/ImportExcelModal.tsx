import { useState, useRef } from "react";
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { parseExcelOrCSV, exportToExcel } from "../../lib/excelUtils";

export interface ImportExcelModalProps {
  isOpen: boolean;
  title?: string;
  sampleFilename?: string;
  sampleHeaders?: string[];
  sampleRows?: (string | number)[][];
  onClose: () => void;
  onImport: (records: Record<string, string>[]) => void | Promise<void>;
}

export function ImportExcelModal({
  isOpen,
  title = "Import Excel Data",
  sampleFilename = "Import_Template.csv",
  sampleHeaders = ["Name", "Category", "Quantity", "Price", "BatchNo"],
  sampleRows = [
    ["Paracetamol 500mg", "Analgesic", 100, 15.5, "B2026-001"],
    ["Amoxicillin 250mg", "Antibiotic", 50, 42.0, "B2026-002"],
  ],
  onClose,
  onImport,
}: ImportExcelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);

    try {
      const result = await parseExcelOrCSV(file);
      setParsedHeaders(result.headers);
      setParsedData(result.data);
      toast.success(`Loaded ${result.data.length} records from ${file.name}`);
    } catch (err: any) {
      console.error("Parse Error:", err);
      toast.error(err?.message || "Failed to parse file.");
      setParsedData([]);
      setParsedHeaders([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadSample = () => {
    exportToExcel(sampleFilename, sampleHeaders, sampleRows);
  };

  const handleExecuteImport = async () => {
    if (parsedData.length === 0) {
      toast.error("No valid records to import. Please select a valid CSV/Excel file.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onImport(parsedData);
      toast.success(`Successfully imported ${parsedData.length} records!`);
      handleReset();
      onClose();
    } catch (err: any) {
      console.error("Import execution failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedHeaders([]);
    setParsedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          handleReset();
          onClose();
        }
      }}
      title={title}
    >
      <div className="space-y-4 text-xs">
        {/* Sample Template Bar */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-950 text-xs">Need a sample file?</p>
              <p className="text-[11px] text-emerald-700 font-medium">
                Download pre-formatted Excel template with sample records.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadSample}
            className="bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold px-3 py-1.5 shrink-0 flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> Sample Template
          </Button>
        </div>

        {/* Upload File Box */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls, text/csv"
            onChange={handleFileChange}
            className="hidden"
            id="excel-file-upload-input"
          />
          <label htmlFor="excel-file-upload-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-xs hover:underline">
                Click to browse file
              </span>{" "}
              <span className="text-slate-500 font-normal">or drop .CSV / .XLSX here</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Supports CSV, XLS, XLSX formats
            </p>
          </label>
        </div>

        {/* Parsing Loader */}
        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-4 text-slate-500 font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Parsing spreadsheet records...
          </div>
        )}

        {/* Data Preview Section */}
        {selectedFile && !isParsing && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-slate-800">{selectedFile.name}</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {parsedData.length} Records Found
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-400 hover:text-rose-600 text-xs font-semibold"
              >
                Clear
              </button>
            </div>

            {parsedData.length > 0 ? (
              <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      {parsedHeaders.map((h, idx) => (
                        <th key={idx} className="py-2 px-3 text-[11px] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedData.slice(0, 10).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {parsedHeaders.map((h, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 font-medium">
                    Showing first 10 preview rows of {parsedData.length} records.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>No valid data rows detected in this file. Please verify column headers.</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExecuteImport}
            disabled={isSubmitting || parsedData.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Import {parsedData.length > 0 ? `${parsedData.length} Records` : "Data"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
