import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Pill, Search, Clipboard, History, Eye, CheckCircle2, AlertTriangle, Printer, ArrowLeft } from "lucide-react";
import { usePatients } from "../../features/patients";
import { useInventory } from "../../features/inventory";
import { usePrescriptions, useDispensePrescription } from "../../features/doctorDashboard";
import { useInvoices } from "../../features/invoices";
import toast from "react-hot-toast";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { InputField } from "../../components/ui/Field";

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
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  batchNo: string;
  quantity: string; // Keep as string for input handling (allow empty state during typing)
  price: number;
  availableStock: number;
  expiryDate: string;
  prescribedQty: number;
  warning?: string;
  isExpired?: boolean;
}

export function PharmacyMedicineDispensing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rxId = searchParams.get("prescriptionId") || "";

  const { data: inventoryData } = useInventory({ category: "medicines", limit: 100 });
  const { data: realPrescriptions, isLoading: isRxLoading } = usePrescriptions();
  const { data: invoiceData, isLoading: isInvoiceLoading } = useInvoices({ billingType: "PHARMACY", limit: 100 });
  const dispenseMutation = useDispensePrescription();

  // Selected prescription state
  const foundRx = realPrescriptions?.find((rx: any) => rx._id === rxId);

  // Dispensing items state
  const [itemsToDispense, setItemsToDispense] = useState<MedicineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(12); // default 12% GST
  const [isPartial, setIsPartial] = useState(false);

  // Available medicines mapped from live inventory
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
      batchNo: item.storageCondition || "B-" + item.sku.slice(-4),
    };
  });

  // Calculate default recommended quantities based on frequency & duration
  const parseRecommendedQty = (freq: string, dur: string): number => {
    let days = 5;
    const durMatch = dur.match(/(\d+)/);
    if (durMatch) {
      days = parseInt(durMatch[1]);
    }
    
    let multiplier = 2;
    const fUpper = freq.toUpperCase();
    if (fUpper.includes("TID") || (fUpper.includes("ONCE DAILY") === false && fUpper.includes("THREE")) || fUpper.includes("3X")) {
      multiplier = 3;
    } else if (fUpper.includes("QID") || fUpper.includes("FOUR") || fUpper.includes("4X")) {
      multiplier = 4;
    } else if (fUpper.includes("QD") || fUpper.includes("ONCE") || fUpper.includes("HS") || fUpper.includes("1X")) {
      multiplier = 1;
    }
    
    return days * multiplier;
  };

  // Populate form fields when prescription changes
  useEffect(() => {
    if (!foundRx) return;
    
    const mappedItems = (foundRx.medications || []).map((m: any) => {
      const matched = availableMeds.find((av: any) => av.name.toLowerCase() === m.name.toLowerCase());
      const prescribedQty = parseRecommendedQty(m.frequency || "", m.duration || "");
      
      let warning = "";
      let isExpired = false;
      
      if (!matched) {
        warning = "Not found in inventory!";
      } else if (matched.stockQty === 0) {
        warning = "Out of stock!";
      }
      
      if (matched && matched.expiryDate) {
        const expDate = new Date(matched.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          isExpired = true;
          warning = "Expired medicine!";
        }
      }

      // Default quantity to minimum of stock and prescribed
      const defaultQty = matched ? Math.min(matched.stockQty, prescribedQty) : 0;

      return {
        name: m.name,
        strength: m.strength || "N/A",
        dosage: m.dosage || "1 Tablet",
        frequency: m.frequency || "Twice Daily",
        duration: m.duration || "5 Days",
        batchNo: matched ? matched.batchNo : "N/A",
        quantity: String(defaultQty),
        price: matched ? matched.price : 0,
        availableStock: matched ? matched.stockQty : 0,
        expiryDate: matched ? matched.expiryDate : "N/A",
        prescribedQty,
        warning,
        isExpired
      };
    });

    setItemsToDispense(mappedItems);
  }, [foundRx, inventoryData]);

  // Handle quantity change per row
  const handleQuantityChange = (idx: number, valStr: string) => {
    const updated = [...itemsToDispense];
    updated[idx].quantity = valStr;
    setItemsToDispense(updated);
  };

  // Check validations for button state
  const isValidationPassing = () => {
    if (itemsToDispense.length === 0) return false;
    
    for (const item of itemsToDispense) {
      const qNum = Number(item.quantity);
      if (isNaN(qNum) || qNum <= 0) return false;
      if (qNum > item.availableStock) return false;
      if (qNum > item.prescribedQty) return false;
      if (item.isExpired) return false;
      if (!Number.isInteger(qNum)) return false;
    }
    return true;
  };

  // Handle submit to backend
  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundRx) return;

    if (!isValidationPassing()) {
      toast.error("Please resolve validation errors in the medicine table before completing.");
      return;
    }

    try {
      const payload = {
        items: itemsToDispense.map(it => ({
          name: it.name,
          quantity: Number(it.quantity),
          batchNo: it.batchNo,
          price: it.price
        })),
        discount,
        taxRate,
        isPartial,
        patientId: foundRx.patient?._id
      };

      const result = await dispenseMutation.mutateAsync({
        id: foundRx._id,
        payload
      });

      toast.success("Medicines Dispensed Successfully");
      toast.success("Invoice Generated Successfully");
      toast.success("Redirecting to Billing...");
      
      // Automatically redirect
      setTimeout(() => {
        navigate(`/pharmacy/billing?invoiceId=${result.invoice._id}`);
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Dispensing failed. Check stock levels or validations.";
      toast.error(msg);
    }
  };

  // Billing calculations
  const subtotal = itemsToDispense.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    return sum + (qty * item.price);
  }, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);

  // If viewing a specific prescription, show focused dispensing workspace
  if (rxId) {
    if (isRxLoading) {
      return (
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-slate-500 font-medium">Loading prescription details...</div>
        </div>
      );
    }

    if (!foundRx) {
      return (
        <Card className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Prescription Not Found</h2>
          <p className="text-sm text-slate-500">The requested prescription ID does not exist or belongs to another hospital.</p>
          <Link to="/pharmacy/prescriptions">
            <Button variant="secondary" className="mt-2">Back to Verification</Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Workspace Header */}
        <div className="flex items-center gap-3">
          <Link to="/pharmacy/prescriptions" className="text-slate-500 hover:text-slate-900 transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Medicine Dispensing Workspace</h1>
            <p className="text-sm text-slate-500">Dispense medicines, verify stock, and generate billing invoice.</p>
          </div>
        </div>

        {/* Patient Safety Details */}
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Patient Name</span>
              <span className="text-sm font-bold text-slate-800">{foundRx.patient?.name || "Unknown Patient"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">UHID Number</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">{foundRx.patient?.uhid || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Age / Gender</span>
              <span className="text-sm font-bold text-slate-800">{foundRx.patient?.age || "N/A"} Yrs / {foundRx.patient?.gender || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Doctor / Department</span>
              <span className="text-sm font-bold text-slate-800">{foundRx.doctor?.name || "N/A"} ({foundRx.department?.name || "N/A"})</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Prescription Number</span>
              <span className="text-sm font-bold text-slate-800 font-mono">{foundRx.prescriptionNumber || foundRx._id.slice(-6).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Prescription Date</span>
              <span className="text-sm font-bold text-slate-800">{new Date(foundRx.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>

        {/* Medicines List Form */}
        <form onSubmit={handleDispense} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-semibold text-slate-800">Medications List</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-2">Medicine Name</th>
                    <th className="py-2.5 px-2">Strength</th>
                    <th className="py-2.5 px-2">Dosage</th>
                    <th className="py-2.5 px-2">Frequency</th>
                    <th className="py-2.5 px-2">Duration</th>
                    <th className="py-2.5 px-2 text-center">Prescribed</th>
                    <th className="py-2.5 px-2 text-center">Available Stock</th>
                    <th className="py-2.5 px-2 text-center w-24">Dispensing Qty</th>
                    <th className="py-2.5 px-2 text-right">Unit Price</th>
                    <th className="py-2.5 px-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsToDispense.map((item, idx) => {
                    const qNum = Number(item.quantity) || 0;
                    const sub = qNum * item.price;
                    const hasStockWarning = qNum > item.availableStock;
                    const hasPrescribedWarning = qNum > item.prescribedQty;
                    const hasZeroWarning = qNum <= 0;
                    const hasDecimalWarning = !Number.isInteger(qNum);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/30">
                        <td className="py-3 px-2">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Batch: {item.batchNo}</div>
                          {item.warning && (
                            <span className="inline-block text-[9px] font-bold px-1 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 mt-1">
                              {item.warning}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-700 font-medium">{item.strength}</td>
                        <td className="py-3 px-2 text-slate-650">{item.dosage}</td>
                        <td className="py-3 px-2 text-slate-650">{item.frequency}</td>
                        <td className="py-3 px-2 text-slate-650">{item.duration}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">{item.prescribedQty}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">{item.availableStock}</td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            required
                            min={1}
                            max={Math.min(item.availableStock, item.prescribedQty)}
                            disabled={item.isExpired || item.availableStock === 0}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className={`w-16 rounded border p-1 text-center font-bold text-xs outline-none ${
                              hasStockWarning || hasPrescribedWarning || hasZeroWarning || hasDecimalWarning
                                ? "border-red-500 focus:border-red-500 text-red-600 bg-red-50/20"
                                : "border-slate-300 focus:border-emerald-500"
                            } disabled:bg-slate-100 disabled:text-slate-400`}
                          />
                          {hasStockWarning && (
                            <div className="text-[9px] text-red-600 font-semibold mt-0.5">Exceeds stock</div>
                          )}
                          {hasPrescribedWarning && (
                            <div className="text-[9px] text-red-600 font-semibold mt-0.5">Exceeds Rx</div>
                          )}
                          {hasDecimalWarning && qNum > 0 && (
                            <div className="text-[9px] text-red-600 font-semibold mt-0.5">Integers only</div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right text-slate-600">₹{item.price.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-bold text-slate-800">₹{sub.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pricing Summary & Dispatch Actions */}
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-semibold text-slate-800">Billing Summary</h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">GST / Tax (%):</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="w-12 text-center rounded border border-slate-300 p-0.5 outline-none font-bold focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax Amount:</span>
                  <span className="font-bold text-slate-800">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Discount (₹):</span>
                  <input
                    type="number"
                    min={0}
                    max={subtotal + taxAmount}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-20 text-right rounded border border-slate-300 p-0.5 outline-none font-bold focus:border-emerald-500"
                  />
                </div>
                <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between text-sm font-bold text-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Partial Dispensing Flag */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="partial-dispense-checkbox"
                    checked={isPartial}
                    onChange={(e) => setIsPartial(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-355 text-emerald-600 focus:ring-navy-500 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="partial-dispense-checkbox" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                      Is Partial Dispensing
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Enable if issuing smaller quantities due to stock shortages. Remaining balances stay pending for prescription.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isValidationPassing() || dispenseMutation.isPending}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                {dispenseMutation.isPending ? "Generating Invoice..." : "Dispense Medicines"}
              </Button>
            </Card>
          </div>
        </form>
      </div>
    );
  }

  // Fallback: Display history list of conformed pharmacy invoice records
  const rawInvoices = invoiceData?.data || [];
  const pharmacyInvoices = rawInvoices
    .filter((inv: any) => inv.billingType === "PHARMACY")
    .map((inv: any) => {
      const p = inv.patient as any;
      const itemsCount = (inv.items || []).reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
      return {
        _id: inv._id,
        patientName: p ? p.name : "Walk-in Patient",
        uhid: p ? p.uhid : "N/A",
        date: new Date(inv.issuedAt || inv.createdAt).toISOString().split("T")[0],
        total: inv.totals?.total || 0,
        status: inv.status,
        itemsCount
      };
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medicine Dispensing Logs</h1>
          <p className="text-sm text-slate-500">Record medicine issuance and retrieve prescription dispensing logs.</p>
        </div>
        <Link to="/pharmacy/prescriptions">
          <Button className="flex items-center gap-2">
            <Clipboard className="h-4 w-4" /> Go to Active Prescriptions
          </Button>
        </Link>
      </div>

      {/* Dispensed List */}
      <Card>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
            <History className="h-4 w-4 text-emerald-700" /> Pharmacy Invoices History
          </h3>
        </div>

        <DataTable
          rowKey={(r) => r._id}
          rows={pharmacyInvoices}
          emptyMessage="No dispensing invoice logs found."
          columns={[
            {
              header: "Invoice ID",
              render: (r) => <span className="font-bold text-emerald-700 font-mono">{r._id}</span>
            },
            {
              header: "Patient",
              render: (r) => (
                <div>
                  <div className="font-semibold text-slate-800">{r.patientName}</div>
                  <div className="text-xs text-slate-400 font-mono">UHID: {r.uhid}</div>
                </div>
              )
            },
            {
              header: "Date Issued",
              render: (r) => <span className="text-xs text-slate-650">{r.date}</span>
            },
            {
              header: "Items Count",
              render: (r) => (
                <span className="inline-flex rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  {r.itemsCount} units
                </span>
              )
            },
            {
              header: "Grand Total",
              render: (r) => <span className="font-bold text-slate-850">₹{r.total.toFixed(2)}</span>
            },
            {
              header: "Status",
              render: (r) => (
                <Badge tone={r.status === "paid" ? "success" : r.status === "partially_paid" ? "info" : "warning"}>
                  {r.status === "paid" ? "Paid" : r.status === "partially_paid" ? "Partially Paid" : "Unpaid"}
                </Badge>
              )
            },
            {
              header: "Actions",
              render: (r) => (
                <Link to={`/pharmacy/billing?invoiceId=${r._id}`}>
                  <Button variant="secondary" className="text-xs px-2.5 py-1 flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> Details
                  </Button>
                </Link>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
