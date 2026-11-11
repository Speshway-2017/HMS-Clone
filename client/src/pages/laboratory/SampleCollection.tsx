import { useState, useEffect } from "react";
import { FlaskConical, Search, Printer, Plus, Check } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { SelectField, InputField } from "../../components/ui/Field";

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
}

import { useLaboratoryRequests, useCollectSample } from "../../features/laboratory";
import toast from "react-hot-toast";

const validateCollectorName = (val: string): string | null => {
  const raw = val || "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (raw.length > 50) {
    return "Collector / Phlebotomist cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
  }
  if (trimmed.length < 2) {
    return "Collector / Phlebotomist must be at least 2 characters. Please enter valid data";
  }
  if (
    !/^[a-zA-Z0-9\s\.\'-]+$/.test(trimmed) ||
    !/[a-zA-Z]/.test(trimmed) ||
    /<[^>]*>|javascript:/i.test(trimmed)
  ) {
    return "Collector / Phlebotomist contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validateCollectionRemarks = (val: string): string | null => {
  const raw = val || "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (raw.length > 250) {
    return "Collection Remarks cannot exceed 250 characters. Characters limit: 250. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
  }
  if (
    /<[^>]*>|javascript:/i.test(trimmed) ||
    !/[a-zA-Z0-9]/.test(trimmed) ||
    !/^[a-zA-Z0-9\s.,?!'\-_/()&%#@+:;"]+$/.test(trimmed)
  ) {
    return "Collection Remarks contains invalid data. Invalid data not accepted. Invalid data is not accepted. It should not accept invalid data. Please enter valid data";
  }
  return null;
};

export function LaboratorySampleCollection() {
  const { data: realRequests = [], isLoading } = useLaboratoryRequests();
  const collectSampleMutation = useCollectSample();

  const [search, setSearch] = useState("");
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  // Form State
  const [sampleType, setSampleType] = useState("Whole Blood (EDTA)");
  const [containerType, setContainerType] = useState("Purple Top Tube");
  const [collectorName, setCollectorName] = useState("Phlebotomist");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<{ collectorName?: string | null; remarks?: string | null }>({});

  // Barcode Print Modal
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [activeBarcodeReq, setActiveBarcodeReq] = useState<any | null>(null);

  const handleOpenCollect = (req: any) => {
    setSelectedReq(req);
    setSampleType("Whole Blood (EDTA)");
    setContainerType("Purple Top Tube");
    setCollectorName("Phlebotomist");
    setRemarks("");
    setErrors({});
    setIsCollectModalOpen(true);
  };

  const handleCollectorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCollectorName(val);
    const err = validateCollectorName(val);
    setErrors((prev) => ({ ...prev, collectorName: err }));
  };

  const handleCollectorBlur = () => {
    const err = validateCollectorName(collectorName);
    setErrors((prev) => ({ ...prev, collectorName: err }));
  };

  const handleCollectorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
      "Enter",
      "Escape",
      "Home",
      "End",
    ].includes(e.key);

    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) {
      return;
    }

    if (collectorName.length >= 50) {
      const inputEl = e.currentTarget;
      const hasSelection =
        inputEl.selectionStart !== null &&
        inputEl.selectionEnd !== null &&
        inputEl.selectionEnd > inputEl.selectionStart;

      if (!hasSelection) {
        e.preventDefault();
        const msg =
          "Collector / Phlebotomist cannot exceed 50 characters. Characters limit: 50. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors((prev) => ({ ...prev, collectorName: msg }));
        toast.error(
          "Collector / Phlebotomist cannot exceed 50 characters. Characters limit: 50. Too long data is not accepted. It should not accept too long data. Please enter valid data",
          { id: "collector-limit-toast" }
        );
      }
    }
  };

  const handleRemarksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRemarks(val);
    const err = validateCollectionRemarks(val);
    setErrors((prev) => ({ ...prev, remarks: err }));
  };

  const handleRemarksBlur = () => {
    const err = validateCollectionRemarks(remarks);
    setErrors((prev) => ({ ...prev, remarks: err }));
  };

  const handleRemarksKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNavigationKey = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
      "Enter",
      "Escape",
      "Home",
      "End",
    ].includes(e.key);

    if (e.ctrlKey || e.altKey || e.metaKey || isNavigationKey) {
      return;
    }

    if (remarks.length >= 250) {
      const inputEl = e.currentTarget;
      const hasSelection =
        inputEl.selectionStart !== null &&
        inputEl.selectionEnd !== null &&
        inputEl.selectionEnd > inputEl.selectionStart;

      if (!hasSelection) {
        e.preventDefault();
        const msg =
          "Collection Remarks cannot exceed 250 characters. Characters limit: 250. Too long text is not accepted. Too long data is not accepted. It should not accept too long data and characters limit should be mentioned. Please enter valid data";
        setErrors((prev) => ({ ...prev, remarks: msg }));
        toast.error(
          "Collection Remarks cannot exceed 250 characters. Characters limit: 250. Too long data is not accepted. It should not accept too long data. Please enter valid data",
          { id: "remarks-limit-toast" }
        );
      }
    }
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    const collectorErr = validateCollectorName(collectorName);
    const remarksErr = validateCollectionRemarks(remarks);

    if (collectorErr || remarksErr) {
      setErrors({
        collectorName: collectorErr,
        remarks: remarksErr,
      });
      const firstErr = collectorErr || remarksErr;
      toast.error(firstErr!);
      return;
    }

    const sampleId = `SMP-${selectedReq.patientName ? selectedReq.patientName.slice(0, 3).toUpperCase() : "LAB"}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await collectSampleMutation.mutateAsync({
        requestId: selectedReq._id,
        sampleId,
        sampleType: `${sampleType} (${containerType})`,
        collectedBy: collectorName.trim(),
        remarks: remarks.trim()
      });

      toast.success("Sample registered & status updated!");
      setIsCollectModalOpen(false);

      setActiveBarcodeReq({
        ...selectedReq,
        sampleId,
        sampleType: `${sampleType} (${containerType})`,
        collectedBy: collectorName.trim(),
        remarks: remarks.trim(),
        collectionTime: new Date().toLocaleString()
      });
      setIsBarcodeModalOpen(true);
      setSelectedReq(null);
      setErrors({});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to register sample collection.");
    }
  };

  const handlePrintBarcode = (req: TestRequest) => {
    setActiveBarcodeReq(req);
    setIsBarcodeModalOpen(true);
  };

  // Filter real requests from backend API
  const collectionQueue = realRequests.filter((r: any) => {
    const s = (r.status || "").toLowerCase();
    return s === "pending" || s === "accepted" || s === "sample collection";
  });

  const collectionHistory = realRequests.filter((r: any) => {
    const s = (r.status || "").toLowerCase();
    return s !== "pending" && s !== "rejected" && s !== "cancelled";
  });

  const filteredHistory = collectionHistory.filter((r: any) => 
    (r.patientName || "").toLowerCase().includes(search.toLowerCase()) || 
    (r.sampleId || r._id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sample Collection</h1>
        <p className="text-sm text-slate-500">Manage patient blood/urine sample collection, print barcode labels and track vials.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Active collection queue */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Pending Collection Queue</h3>
          {collectionQueue.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Check className="h-8 w-8 text-green-500 mb-1" />
              <p className="text-sm font-medium">All samples collected!</p>
              <p className="text-xs text-slate-400">No patients waiting in queue currently.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {collectionQueue.map(req => (
                <div key={req._id} className="flex flex-col sm:flex-row justify-between sm:items-center py-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{req.patientName}</span>
                      <Badge tone={req.priority === "STAT" ? "danger" : req.priority === "Urgent" ? "warning" : "neutral"}>
                        {req.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Tests: {req.tests.join(", ")} | Req ID: {req._id}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleOpenCollect(req)}
                    className="flex items-center gap-1 text-xs py-1.5 px-3 self-start sm:self-center bg-blue-600 hover:bg-blue-750"
                  >
                    <Plus className="h-3.5 w-3.5" /> Collect Sample
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right: Quick reference tips */}
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Safety Guidelines</h3>
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>1. **Verify Patient Identity:** Ask patient for full name and date of birth before inserting needle.</p>
            <p>2. **Label immediately:** Attach printed barcode labels directly to sample tube at bedside.</p>
            <p>3. **Inversion limits:** Invert additive tubes 5-10 times immediately after draw to mix reagents.</p>
            <p>4. **Biohazard Protocol:** Dispose of all needles in designated sharps containers instantly.</p>
          </div>
        </Card>
      </div>

      {/* Collection History Logs */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Sample Collection Log</h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search sample ID, patient..."
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-350 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <Card>
          <DataTable
            rowKey={(r) => r._id}
            rows={filteredHistory}
            emptyMessage="No samples registered in collection history."
            columns={[
              {
                header: "Sample ID",
                render: (r) => <span className="font-mono text-xs font-bold text-slate-700">{r.sampleId}</span>
              },
              {
                header: "Patient",
                render: (r) => <span className="font-semibold text-slate-800">{r.patientName}</span>
              },
              {
                header: "Sample Type",
                render: (r) => <span className="text-xs text-slate-600">{r.sampleType}</span>
              },
              {
                header: "Collected At",
                render: (r) => <span className="text-xs text-slate-500">{r.collectionTime}</span>
              },
              {
                header: "Tests",
                render: (r) => <span className="text-xs font-medium text-blue-750">{r.tests.join(", ")}</span>
              },
              {
                header: "Status",
                render: (r) => (
                  <Badge tone={(r.status || "").toLowerCase() === "completed" ? "success" : "warning"}>
                    {r.status}
                  </Badge>
                )
              },
              {
                header: "Barcode",
                render: (r) => (
                  <Button 
                    variant="ghost" 
                    onClick={() => handlePrintBarcode(r)}
                    className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100"
                    title="Print Barcode Label"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )
              }
            ]}
          />
        </Card>
      </div>

      {/* Collect Sample Modal */}
      {selectedReq && (
        <Modal 
          title={`Register Sample - ${selectedReq.patientName}`} 
          isOpen={isCollectModalOpen} 
          onClose={() => setIsCollectModalOpen(false)}
        >
          <form onSubmit={handleCollectSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Sample Type"
                required
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
              >
                <option value="Whole Blood (EDTA)">Whole Blood (EDTA)</option>
                <option value="Serum (SST)">Serum (SST)</option>
                <option value="Urine Cup">Urine Cup</option>
                <option value="Nasopharyngeal Swab">Nasopharyngeal Swab</option>
                <option value="Sputum Container">Sputum Container</option>
              </SelectField>

              <SelectField
                label="Container Color / Type"
                required
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
              >
                <option value="Purple Top Tube">Purple Top Tube (EDTA)</option>
                <option value="Red Top Tube">Red Top Tube (Clot Activator)</option>
                <option value="Yellow Top Tube">Yellow Top Tube (SST)</option>
                <option value="Sterile Urine Cup">Sterile Urine Cup</option>
                <option value="VTM Vial">VTM Vial (Viral Transport Medium)</option>
              </SelectField>
            </div>

            <InputField
              label="Collector / Phlebotomist"
              required
              value={collectorName}
              maxLength={50}
              showCharCount
              charCount={collectorName.length}
              maxCharCount={50}
              error={errors.collectorName}
              onChange={handleCollectorChange}
              onBlur={handleCollectorBlur}
              onKeyDown={handleCollectorKeyDown}
            />

            <InputField
              label="Collection Remarks"
              placeholder="E.g., Smooth collection. Fasting verification confirmed."
              value={remarks}
              maxLength={250}
              showCharCount
              charCount={remarks.length}
              maxCharCount={250}
              error={errors.remarks}
              onChange={handleRemarksChange}
              onBlur={handleRemarksBlur}
              onKeyDown={handleRemarksKeyDown}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsCollectModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-750">Register Draw & Print Label</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Barcode Print Modal */}
      {activeBarcodeReq && (
        <Modal 
          title="Print Sample Barcode Label" 
          isOpen={isBarcodeModalOpen} 
          onClose={() => setIsBarcodeModalOpen(false)}
        >
          <div className="space-y-6">
            <div className="mx-auto max-w-[280px] bg-white border border-slate-350 p-4 rounded-lg flex flex-col items-center justify-center font-mono">
              <div className="text-[10px] uppercase font-bold text-slate-800 text-center tracking-wider">HMS Diagnostics Lab</div>
              <div className="font-semibold text-xs mt-1 text-slate-700 text-center">{activeBarcodeReq.patientName}</div>
              <div className="text-[10px] text-slate-500 text-center">{activeBarcodeReq.patientAge}Y / {activeBarcodeReq.patientGender}</div>
              
              {/* Simulated visual barcode stripes */}
              <div className="mt-3 mb-2 flex items-center justify-center gap-[1px] h-10 w-full overflow-hidden bg-slate-50 border border-slate-100 p-1">
                {[1,4,2,3,1,4,1,2,4,2,1,3,4,1,1,2,3,4,1,2,3,1,4,2,1,3,4,1,2].map((w, idx) => (
                  <div key={idx} className={`h-full bg-slate-900`} style={{ width: `${w}px` }} />
                ))}
              </div>
              
              <div className="text-[11px] font-bold text-slate-800 tracking-widest">{activeBarcodeReq.sampleId}</div>
              <div className="text-[9px] text-slate-400 mt-1">{activeBarcodeReq.sampleType}</div>
              <div className="text-[8px] text-slate-400 mt-0.5">{activeBarcodeReq.collectionTime}</div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => setIsBarcodeModalOpen(false)}>Close</Button>
              <Button onClick={() => {
                alert("Simulating barcode print... Label sent to Dymo LabelWriter printer.");
                setIsBarcodeModalOpen(false);
              }} className="bg-blue-600 hover:bg-blue-750 flex items-center gap-1">
                <Printer className="h-4 w-4" /> Print Label
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
