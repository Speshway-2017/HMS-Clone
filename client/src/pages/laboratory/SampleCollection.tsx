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

export function LaboratorySampleCollection() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [search, setSearch] = useState("");
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<TestRequest | null>(null);

  // Form State
  const [sampleType, setSampleType] = useState("Whole Blood (EDTA)");
  const [containerType, setContainerType] = useState("Purple Top Tube");
  const [collectorName, setCollectorName] = useState("Sarah Jenkins (Phlebotomist)");
  const [remarks, setRemarks] = useState("");

  // Barcode Print Modal
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [activeBarcodeReq, setActiveBarcodeReq] = useState<TestRequest | null>(null);

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

  const handleOpenCollect = (req: TestRequest) => {
    setSelectedReq(req);
    setSampleType("Whole Blood (EDTA)");
    setContainerType("Purple Top Tube");
    setRemarks("");
    setIsCollectModalOpen(true);
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    const sampleId = `SMP-${selectedReq.patientName.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const collectionTime = new Date().toLocaleString();

    const updated = requests.map(r => 
      r._id === selectedReq._id 
        ? { 
            ...r, 
            status: "In Progress", 
            sampleId, 
            sampleType: `${sampleType} (${containerType})`,
            collectionTime
          } 
        : r
    );

    saveRequests(updated);
    setIsCollectModalOpen(false);
    
    // Auto-open print barcode modal for convenience
    const updatedReq = updated.find(r => r._id === selectedReq._id);
    if (updatedReq) {
      setActiveBarcodeReq(updatedReq);
      setIsBarcodeModalOpen(true);
    }
    setSelectedReq(null);
  };

  const handlePrintBarcode = (req: TestRequest) => {
    setActiveBarcodeReq(req);
    setIsBarcodeModalOpen(true);
  };

  // Filter requests that are Accepted/Sample Collected or In Progress (since they have sample info)
  const collectionQueue = requests.filter(r => r.status === "Sample Collected");
  const collectionHistory = requests.filter(r => r.status !== "Pending Request" && r.status !== "Sample Collected" && r.status !== "Rejected" && r._id);

  const filteredHistory = collectionHistory.filter(r => 
    r.patientName.toLowerCase().includes(search.toLowerCase()) || 
    r.sampleId?.toLowerCase().includes(search.toLowerCase())
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
                  <Badge tone={r.status === "Completed" ? "success" : "warning"}>
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
              onChange={(e) => setCollectorName(e.target.value)}
            />

            <InputField
              label="Collection Remarks"
              placeholder="E.g., Smooth collection. Fasting verification confirmed."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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
