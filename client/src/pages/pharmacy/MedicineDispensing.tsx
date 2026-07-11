import { useState, useEffect } from "react";
import { Pill, Search, Clipboard, History, Eye, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import { usePatients } from "../../features/patients";
import { useInventory } from "../../features/inventory";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";

interface DispensedRecord {
  _id: string;
  patientName: string;
  patientId: string;
  prescriptionId: string;
  medicines: { name: string; batchNo: string; quantity: number; price: number }[];
  date: string;
  pharmacistName: string;
  dispensedStatus: "Dispensed" | "Partially Dispensed";
}

interface MedicineItem {
  name: string;
  batchNo: string;
  quantity: number;
  price: number;
}

export function PharmacyMedicineDispensing() {
  const { data: patientData, isLoading: isPatientsLoading } = usePatients({});
  const { data: inventoryData } = useInventory({ category: "medicines" });
  const [dispensedList, setDispensedList] = useState<DispensedRecord[]>([]);
  const [search, setSearch] = useState("");
  const [searchHistory, setSearchHistory] = useState("");

  // Dispensing Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [itemsToDispense, setItemsToDispense] = useState<MedicineItem[]>([
    { name: "", batchNo: "", quantity: 1, price: 0 }
  ]);

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<DispensedRecord | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isAddDispensingOpen, setIsAddDispensingOpen] = useState(false);
  
  // Available medicines lookup mapped from live inventory
  const rawItems = inventoryData?.data || [];
  const availableMeds = rawItems.map((item: any) => {
    const parts = item.description ? item.description.split(" | ") : [];
    const subcategory = parts[0] || "Analgesic";
    const expiryDate = parts[1] || "";
    return {
      _id: item._id,
      name: item.name,
      category: subcategory,
      stockQty: item.stockQty,
      reorderLevel: item.reorderLevel,
      expiryDate: expiryDate,
      price: item.unitCost,
      batchNo: item.storageCondition || "",
    };
  });

  useEffect(() => {
    // Load local dispensing logs
    const saved = localStorage.getItem("hms_pharmacy_dispensing");
    if (saved) {
      setDispensedList(JSON.parse(saved));
    } else {
      localStorage.setItem("hms_pharmacy_dispensing", JSON.stringify([]));
      setDispensedList([]);
    }
  }, []);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    // Find name from patientData
    const patientObj = patientData?.data?.find((p: any) => p._id === patientId);
    setSelectedPatientName(patientObj ? patientObj.name : "Walk-in Patient");
  };

  const handleItemChange = (index: number, field: keyof MedicineItem, value: any) => {
    const updated = [...itemsToDispense];
    if (field === "name") {
      const medName = value;
      const matchedMed = availableMeds.find(m => m.name === medName);
      updated[index] = {
        ...updated[index],
        name: medName,
        batchNo: matchedMed ? matchedMed.batchNo : "",
        price: matchedMed ? matchedMed.price : 0
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }
    setItemsToDispense(updated);
  };

  const handleAddItem = () => {
    setItemsToDispense([...itemsToDispense, { name: "", batchNo: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (itemsToDispense.length === 1) return;
    const updated = [...itemsToDispense];
    updated.splice(index, 1);
    setItemsToDispense(updated);
  };

  const handleDispenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !itemsToDispense[0].name) return;

    // Create record
    const newRecord: DispensedRecord = {
      _id: `DSP-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: selectedPatientName || "Unknown Patient",
      patientId: selectedPatientId,
      prescriptionId: prescriptionId || "Walk-in",
      medicines: itemsToDispense.map(it => ({ ...it, quantity: Number(it.quantity) })),
      date: new Date().toISOString().split("T")[0],
      pharmacistName: "Dave Grohl",
      dispensedStatus: "Dispensed"
    };

    // Deduct inventory quantities
    const savedMeds = localStorage.getItem("hms_pharmacy_medicines");
    if (savedMeds) {
      const medsArray = JSON.parse(savedMeds);
      newRecord.medicines.forEach(dispItem => {
        const target = medsArray.find((m: any) => m.name === dispItem.name);
        if (target) {
          target.stockQty = Math.max(0, target.stockQty - dispItem.quantity);
        }
      });
      localStorage.setItem("hms_pharmacy_medicines", JSON.stringify(medsArray));
    }

    const updated = [newRecord, ...dispensedList];
    setDispensedList(updated);
    localStorage.setItem("hms_pharmacy_dispensing", JSON.stringify(updated));

    // Reset Form
    setSelectedPatientId("");
    setSelectedPatientName("");
    setPrescriptionId("");
    setItemsToDispense([{ name: "", batchNo: "", quantity: 1, price: 0 }]);
    setIsAddDispensingOpen(false);
    
    // Automatically trigger receipt display
    setSelectedRecord(newRecord);
    setIsReceiptOpen(true);
  };

  // Filter Dispensing History
  const filteredHistory = dispensedList.filter(rec => 
    rec.patientName.toLowerCase().includes(searchHistory.toLowerCase()) ||
    rec._id.toLowerCase().includes(searchHistory.toLowerCase()) ||
    rec.prescriptionId.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medicine Dispensing</h1>
          <p className="text-sm text-slate-500">Record medicine issuance and retrieve prescription dispensing logs.</p>
        </div>
        <Button onClick={() => setIsAddDispensingOpen(true)} className="flex items-center gap-2">
          <Pill className="h-4 w-4" /> New Dispensing Record
        </Button>
      </div>

      {/* Dispensed List / History */}
      <Card>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
            <History className="h-4 w-4 text-navy-700" /> Dispensing Logs
          </h3>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search history by log/patient..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-4 py-2 text-xs outline-none focus:border-navy-500 focus:bg-white"
            />
          </div>
        </div>

        <DataTable
          rowKey={(r) => r._id}
          rows={filteredHistory}
          emptyMessage="No dispensing logs found."
          columns={[
            {
              header: "Log ID",
              render: (r) => <span className="font-bold text-navy-700">{r._id}</span>
            },
            {
              header: "Patient",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800">{r.patientName}</div>
                  <div className="text-xs text-slate-400">{r.patientId}</div>
                </div>
              )
            },
            {
              header: "Prescription Ref",
              render: (r) => <span className="font-mono text-xs">{r.prescriptionId}</span>
            },
            {
              header: "Date Issued",
              render: (r) => <span className="text-xs text-slate-600">{r.date}</span>
            },
            {
              header: "Items Count",
              render: (r) => (
                <span className="inline-flex rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  {r.medicines.reduce((acc, curr) => acc + curr.quantity, 0)} units ({r.medicines.length} meds)
                </span>
              )
            },
            {
              header: "Status",
              render: (r) => <Badge tone="success">{r.dispensedStatus}</Badge>
            },
            {
              header: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedRecord(r);
                      setIsReceiptOpen(true);
                    }} 
                    className="p-1 hover:text-navy-700"
                    title="View Receipt"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* New Dispensing Modal */}
      <Modal 
        title="Patient Medicine Dispensing Form" 
        isOpen={isAddDispensingOpen} 
        onClose={() => setIsAddDispensingOpen(false)}
      >
        <form onSubmit={handleDispenseSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Select Patient"
              required
              value={selectedPatientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
            >
              <option value="">-- Choose Patient --</option>
              {isPatientsLoading ? (
                <option disabled>Loading patients...</option>
              ) : (
                patientData?.data?.map((p: any) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.phone})
                  </option>
                ))
              )}
              <option value="WALK-IN">Walk-In Patient</option>
            </SelectField>

            <InputField
              label="Prescription Ref ID (Optional)"
              placeholder="e.g. PR-301"
              value={prescriptionId}
              onChange={(e) => setPrescriptionId(e.target.value)}
            />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Medicines list</h4>
              <Button type="button" variant="ghost" onClick={handleAddItem} className="text-xs py-1 px-2 border border-slate-200">
                + Add Row
              </Button>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {itemsToDispense.map((item, index) => (
                <div key={index} className="flex gap-2 items-end bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Medicine</label>
                    <select
                      required
                      value={item.name}
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white p-1 text-xs text-slate-800 outline-none"
                    >
                      <option value="">Select Medicine</option>
                      {availableMeds.map((med) => (
                        <option key={med._id} value={med.name} disabled={med.stockQty === 0}>
                          {med.name} (Stock: {med.stockQty})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Qty</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white p-1 text-xs text-slate-850 outline-none"
                    />
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Price (₹)</label>
                    <input
                      type="text"
                      disabled
                      value={item.price}
                      className="w-full rounded border border-slate-300 bg-slate-100 p-1 text-xs text-slate-500"
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 px-2.5 text-xs py-1"
                    disabled={itemsToDispense.length === 1}
                  >
                    🗑
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddDispensingOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Complete Dispensing
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      {selectedRecord && (
        <Modal 
          title="Medicine Dispensing Receipt" 
          isOpen={isReceiptOpen} 
          onClose={() => setIsReceiptOpen(false)}
        >
          <div className="space-y-4">
            <div id="dispensing-receipt-print" className="border border-slate-200 p-6 rounded-xl bg-white space-y-4 font-sans">
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-900">HMS Pharmacy</h2>
                <p className="text-xs text-slate-500">Sunrise General Hospital Network</p>
                <div className="text-[10px] text-slate-400 mt-0.5">License: PH-2024-99882</div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4"></div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Receipt No:</span>
                  <span className="font-bold text-slate-800">{selectedRecord._id}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Date Issued:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.date}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Patient:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.patientName}</span>
                  <span className="text-[10px] text-slate-500 block">ID: {selectedRecord.patientId}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Prescription Ref:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.prescriptionId}</span>
                </div>
                <div>
                  <span className="font-semibold block text-slate-400 text-[10px] uppercase">Dispenser:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.pharmacistName}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 my-4"></div>

              <div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100">
                      <th className="pb-2">Medicine Details</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRecord.medicines.map((item, idx) => (
                      <tr key={idx} className="text-slate-850">
                        <td className="py-2.5">
                          <span className="font-semibold text-slate-800">{item.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">Batch: {item.batchNo}</span>
                        </td>
                        <td className="py-2.5 text-center">{item.quantity}</td>
                        <td className="py-2.5 text-right">₹{item.price.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-semibold">₹{(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4"></div>

              <div className="flex justify-between text-sm font-bold text-slate-850">
                <span>Grand Total:</span>
                <span>₹{selectedRecord.medicines.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0).toFixed(2)}</span>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-6">
                Thank you. Keep prescription slip for further details.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsReceiptOpen(false)}>Close</Button>
              <Button onClick={() => window.print()} className="flex items-center gap-1 bg-navy-700">
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
