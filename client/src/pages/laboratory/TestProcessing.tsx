import { useState, useEffect } from "react";
import { Activity, Plus, Trash, Check, AlertTriangle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";

interface TestResultRow {
  parameter: string;
  value: string;
  refRange: string;
  status: "normal" | "low" | "high" | "critical";
}

interface TestRequest {
  _id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  orderedBy: string;
  tests: string[];
  priority: string;
  date: string;
  status: string;
  sampleId?: string;
  sampleType?: string;
  collectionTime?: string;
  results?: TestResultRow[];
}

export function LaboratoryTestProcessing() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<TestRequest | null>(null);

  // Form State
  const [testResultRows, setTestResultRows] = useState<TestResultRow[]>([
    { parameter: "Hemoglobin", value: "", refRange: "12.0 - 16.0 g/dL", status: "normal" }
  ]);
  const [comments, setComments] = useState("");
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hms_laboratory_requests");
    if (saved) {
      setRequests(JSON.parse(saved));
    }
  }, []);

  const saveRequests = (updated: TestRequest[]) => {
    setRequests(updated);
    localStorage.setItem("hms_laboratory_requests", JSON.stringify(updated));
  };

  const handleOpenProcess = (req: TestRequest) => {
    setSelectedReq(req);
    // Initialize results parameter list based on tests ordered
    const initialRows: TestResultRow[] = [];
    req.tests.forEach(testName => {
      if (testName.includes("CBC")) {
        initialRows.push(
          { parameter: "Hemoglobin (Hb)", value: "13.5", refRange: "12.0 - 16.0 g/dL", status: "normal" },
          { parameter: "WBC Count", value: "7.2", refRange: "4.0 - 11.0 x10^9/L", status: "normal" },
          { parameter: "Platelet Count", value: "250", refRange: "150 - 450 x10^9/L", status: "normal" }
        );
      } else if (testName.includes("Lipid")) {
        initialRows.push(
          { parameter: "Total Cholesterol", value: "195", refRange: "< 200 mg/dL", status: "normal" },
          { parameter: "Triglycerides", value: "142", refRange: "< 150 mg/dL", status: "normal" },
          { parameter: "HDL Cholesterol", value: "48", refRange: "> 40 mg/dL", status: "normal" },
          { parameter: "LDL Cholesterol", value: "115", refRange: "< 100 mg/dL", status: "high" }
        );
      } else if (testName.includes("HbA1c")) {
        initialRows.push(
          { parameter: "HbA1c (Glycated Hb)", value: "6.2", refRange: "< 5.7% (Normal), 5.7-6.4% (Prediabetic)", status: "high" }
        );
      } else {
        initialRows.push(
          { parameter: testName, value: "", refRange: "Refer to manual", status: "normal" }
        );
      }
    });

    setTestResultRows(initialRows);
    setComments("");
    setIsCritical(false);
    setIsProcessModalOpen(true);
  };

  const handleAddResultRow = () => {
    setTestResultRows([...testResultRows, { parameter: "", value: "", refRange: "", status: "normal" }]);
  };

  const handleRemoveResultRow = (index: number) => {
    const updated = [...testResultRows];
    updated.splice(index, 1);
    setTestResultRows(updated);
  };

  const handleRowChange = (index: number, field: keyof TestResultRow, value: any) => {
    const updated = [...testResultRows];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setTestResultRows(updated);
  };

  const handleSubmitResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    // Check if any results are critical
    const hasCritical = testResultRows.some(r => r.status === "critical" || r.status === "high");

    const updated = requests.map(r => 
      r._id === selectedReq._id 
        ? { 
            ...r, 
            status: "Awaiting Verification", 
            results: testResultRows,
            comments,
            isCritical: hasCritical
          } 
        : r
    );

    saveRequests(updated);
    setIsProcessModalOpen(false);
    setSelectedReq(null);
  };

  // Filter requests that are In Progress (awaiting results input)
  const processingQueue = requests.filter(r => r.status === "In Progress");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Laboratory Test Processing</h1>
        <p className="text-sm text-slate-500">Record diagnostic assay readings, compare with reference levels, and enter results.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Pending processing list */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Samples Awaiting Processing</h3>
          {processingQueue.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Check className="h-8 w-8 text-green-500 mb-1" />
              <p className="text-sm font-medium">All samples processed!</p>
              <p className="text-xs text-slate-400">No diagnostic runs are pending currently.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {processingQueue.map(req => (
                <div key={req._id} className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{req.patientName}</span>
                      <Badge tone="info">{req.sampleId}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Assays: {req.tests.join(", ")} | Collected At: {req.collectionTime}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleOpenProcess(req)}
                    className="flex items-center gap-1 text-xs py-1.5 px-3 self-start sm:self-center bg-blue-600 hover:bg-blue-750"
                  >
                    <Activity className="h-3.5 w-3.5" /> Enter Results
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Analyzer specs */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Analyzer Calibration Status</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Sysmex XN-1000 (CBC):</span>
              <span className="font-semibold text-green-600">Calibrated (Today)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Cobas c311 (Biochem):</span>
              <span className="font-semibold text-green-600">Calibrated (Today)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Mini VIDAS (Immunology):</span>
              <span className="font-semibold text-amber-600">Calibration due in 2d</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Enter results modal */}
      {selectedReq && (
        <Modal 
          title={`Enter Test Results - ${selectedReq.patientName}`} 
          isOpen={isProcessModalOpen} 
          onClose={() => setIsProcessModalOpen(false)}
        >
          <form onSubmit={handleSubmitResults} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="block text-slate-400">Patient:</span>
                <span className="font-semibold text-slate-800">{selectedReq.patientName}</span>
              </div>
              <div>
                <span className="block text-slate-400">Sample ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedReq.sampleId}</span>
              </div>
              <div>
                <span className="block text-slate-400">Draw Type:</span>
                <span className="font-semibold text-slate-800">{selectedReq.sampleType}</span>
              </div>
              <div>
                <span className="block text-slate-400">Assays Ordered:</span>
                <span className="font-semibold text-blue-700">{selectedReq.tests.join(", ")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-750">Analyte Parameters</span>
                <Button type="button" variant="ghost" onClick={handleAddResultRow} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  <Plus className="h-3.5 w-3.5" /> Add Row
                </Button>
              </div>

              <div className="space-y-3">
                {testResultRows.map((row, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 border-b border-slate-100 pb-3 sm:pb-0 sm:border-0 items-start sm:items-center">
                    <div className="flex-1 w-full">
                      <InputField
                        label={idx === 0 ? "Parameter Name" : ""}
                        required
                        placeholder="e.g. Hemoglobin"
                        value={row.parameter}
                        onChange={(e) => handleRowChange(idx, "parameter", e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <InputField
                        label={idx === 0 ? "Value" : ""}
                        required
                        placeholder="e.g. 13.5"
                        value={row.value}
                        onChange={(e) => handleRowChange(idx, "value", e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <InputField
                        label={idx === 0 ? "Ref Range" : ""}
                        required
                        placeholder="e.g. 12.0 - 16.0 g/dL"
                        value={row.refRange}
                        onChange={(e) => handleRowChange(idx, "refRange", e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <SelectField
                        label={idx === 0 ? "Flag Status" : ""}
                        value={row.status}
                        onChange={(e) => handleRowChange(idx, "status", e.target.value as any)}
                      >
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </SelectField>
                    </div>
                    {testResultRows.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => handleRemoveResultRow(idx)}
                        className={`p-1 text-slate-400 hover:text-red-600 ${idx === 0 ? "mt-5" : ""}`}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <InputField
              label="Assay Comments / Technical remarks"
              placeholder="e.g. Calibrations valid. Sample showed mild lipemia."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsProcessModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-750">Save & Submit for QC Verification</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
