import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
  Receipt, Plus, Check, FlaskConical, ArrowLeft,
  User, X, IndianRupee, BadgeCheck, Printer
} from "lucide-react";
import { usePatients } from "../../features/patients";
import { useInvoices, useCreateInvoice } from "../../features/invoices";
import { useMyHospital } from "../../features/hospitals";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import toast from "react-hot-toast";

interface LabBillItem {
  testName: string;
  price: number;
}

interface ReceiptInfo {
  invoiceId: string;
  patientName: string;
  patientUhid?: string;
  items: LabBillItem[];
  subtotal: number;
  tax: number;
  total: number;
  patientBalance: number;
  status: string;
  issuedAt: string;
}

export function findMatchingTestPrice(testName: string, prices: Record<string, number>): number {
  if (!testName || !prices) return 0;
  
  // 1. Direct exact match
  if (prices[testName] !== undefined) return prices[testName];

  const clean = (str: string) => {
    return str
      .toLowerCase()
      .replace(/\s+/g, "") // remove all whitespace
      .replace(/\([^)]*\)/g, "") // remove parentheses content
      .replace(/[^a-z0-9]/g, ""); // remove special characters
  };

  const nameClean = clean(testName);
  if (!nameClean) return 0;

  // 2. Exact match after cleaning
  for (const [key, value] of Object.entries(prices)) {
    if (clean(key) === nameClean) {
      return value;
    }
  }

  // 3. Substring match (e.g., "Ultrasound" matches "Ultrasound Abdomen & Pelvis", or "MRI" matches "MRI Lumbar Spine")
  for (const [key, value] of Object.entries(prices)) {
    const keyClean = clean(key);
    if (keyClean.includes(nameClean) || nameClean.includes(keyClean)) {
      return value;
    }
  }

  // 4. Common Medical Abbreviation Mapping
  const ABBREVIATIONS: Record<string, string> = {
    cbc: "completebloodcount",
    lft: "liverfunction",
    kft: "kidneyfunction",
    rft: "kidneyfunction",
    renal: "kidneyfunction",
    fbs: "fastingbloodsugar",
    tsh: "thyroid",
    hba1c: "hba1c",
    ecg: "ecg",
    mri: "mri",
    ct: "ctbrain",
  };

  for (const [abbr, fullNamePart] of Object.entries(ABBREVIATIONS)) {
    if (nameClean.includes(abbr)) {
      for (const [key, value] of Object.entries(prices)) {
        if (clean(key).includes(fullNamePart)) {
          return value;
        }
      }
    }
  }

  return 0;
}

export function NewLabBillPage() {
  const { data: patientData } = usePatients({});
  const { data: hospitalData } = useMyHospital();
  const { data: invoiceData } = useInvoices({ billingType: "LAB" });
  const createInvoiceMutation = useCreateInvoice();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // Form state
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [selectedPatientUhid, setSelectedPatientUhid] = useState("");
  const [billItems, setBillItems] = useState<LabBillItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [payNow, setPayNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Card">("Cash");
  const [payingAmount, setPayingAmount] = useState<string>("");
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Receipt modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptInfo, setReceiptInfo] = useState<ReceiptInfo | null>(null);

  // Hospital test catalog
  const availableTests: string[] = useMemo(() => {
    const savedLab = localStorage.getItem("hms_available_lab_tests");
    const savedRadio = localStorage.getItem("hms_available_radiology_tests");
    let lab = savedLab ? JSON.parse(savedLab) : (hospitalData as any)?.availableLabTests;
    let radio = savedRadio ? JSON.parse(savedRadio) : (hospitalData as any)?.availableRadiologyTests;
    
    if (!lab || lab.length === 0) lab = [
      "Complete Blood Count (CBC)",
      "Lipid Profile",
      "Liver Function Test (LFT)",
      "Kidney Function Test (KFT)",
      "Thyroid Profile (T3, T4, TSH)",
      "Fasting Blood Sugar (FBS)",
      "HbA1c",
      "Urine Routine & Microscopy",
    ];
    if (!radio || radio.length === 0) radio = [
      "Chest X-Ray PA View",
      "Ultrasound Abdomen & Pelvis",
      "CT Brain Non-Contrast",
      "MRI Lumbar Spine",
      "ECG 12 Lead",
    ];
    return [...lab, ...radio];
  }, [hospitalData]);

  const prices: Record<string, number> = useMemo(() => {
    const savedPrices = localStorage.getItem("hms_investigation_prices");
    let pr = savedPrices ? JSON.parse(savedPrices) : (hospitalData as any)?.investigationPrices;
    if (!pr || Object.keys(pr).length === 0) pr = {
      "Complete Blood Count (CBC)": 350,
      "Lipid Profile": 650,
      "Liver Function Test (LFT)": 550,
      "Kidney Function Test (KFT)": 500,
      "Thyroid Profile (T3, T4, TSH)": 750,
      "Fasting Blood Sugar (FBS)": 150,
      "HbA1c": 450,
      "Urine Routine & Microscopy": 200,
      "Chest X-Ray PA View": 400,
      "Ultrasound Abdomen & Pelvis": 1200,
      "CT Brain Non-Contrast": 2500,
      "MRI Lumbar Spine": 4500,
      "ECG 12 Lead": 300,
    };
    return pr;
  }, [hospitalData]);

  const allPatients: any[] = patientData?.data || [];
  const filteredPatients = patientSearch.trim() && !selectedPatientId
    ? allPatients.filter((p: any) =>
        p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.uhid?.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.phone?.includes(patientSearch)
      ).slice(0, 6)
    : [];

  // Existing invoices for the selected patient
  const rawInvoices: any[] = invoiceData?.data || [];
  const invoices = rawInvoices.map((inv: any) => ({
    _id: inv._id,
    patientName: inv.patient?.name || "—",
    patientUhid: inv.patient?.uhid,
    items: (inv.items || []).map((it: any) => ({ testName: it.description, price: it.amount })),
    subtotal: inv.totals?.subtotal || 0,
    taxAmount: inv.totals?.taxAmount || 0,
    total: inv.totals?.total || 0,
    status: inv.status,
    issuedAt: inv.issuedAt || inv.createdAt,
  }));

  // Auto-prefill from accepted request navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromRequest && !prefillApplied && allPatients.length > 0 && hospitalData) {
      const patient = allPatients.find((p: any) => p._id === state.patientId);
      if (patient) {
        setSelectedPatientId(patient._id);
        setSelectedPatientName(patient.name);
        setSelectedPatientUhid(patient.uhid || "");
        setPatientSearch(patient.name);
      } else {
        setSelectedPatientId(state.patientId);
        setSelectedPatientName(state.patientName);
        setSelectedPatientUhid(state.patientUhid || "");
        setPatientSearch(state.patientName);
      }

      if (state.tests && state.tests.length > 0) {
        const items: LabBillItem[] = (state.tests as string[]).map(t => ({
          testName: t,
          price: findMatchingTestPrice(t, prices),
        }));
        setBillItems(items);
      }

      setPrefillApplied(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, allPatients, prefillApplied, prices, hospitalData]);

  const subtotal = billItems.reduce((sum, it) => sum + it.price, 0);
  const taxAmt = Math.round((subtotal * taxRate) / 100);
  const total = subtotal + taxAmt;

  const addTest = (testName: string) => {
    if (billItems.find((it) => it.testName === testName)) {
      toast.error("Test already added.");
      return;
    }
    const price = findMatchingTestPrice(testName, prices);
    setBillItems((prev) => [...prev, { testName, price }]);
  };

  const removeTest = (idx: number) => {
    setBillItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePrice = (idx: number, val: string) => {
    const n = parseFloat(val) || 0;
    setBillItems((prev) => prev.map((it, i) => (i === idx ? { ...it, price: n } : it)));
  };

  const handleCreateBill = async () => {
    if (!selectedPatientId) { toast.error("Please select a patient."); return; }
    if (billItems.length === 0) { toast.error("Add at least one test."); return; }

    const amountToCollect = payNow ? (parseFloat(payingAmount) === 0 ? 0 : parseFloat(payingAmount) || total) : 0;
    if (payNow) {
      if (amountToCollect <= 0) {
        toast.error("Please enter a valid paying amount greater than 0.");
        return;
      }
      if (amountToCollect > total) {
        toast.error("Paying amount cannot exceed the total bill amount.");
        return;
      }
    }

    const items = billItems.map((it) => ({
      description: it.testName,
      category: "laboratory",
      quantity: 1,
      amount: it.price,
    }));

    let status: "paid" | "partially_paid" | "pending" = "pending";
    if (payNow) {
      status = amountToCollect === total ? "paid" : "partially_paid";
    }

    try {
      const newInvoice = await createInvoiceMutation.mutateAsync({
        patient: selectedPatientId,
        billingType: "LAB" as any,
        items,
        taxRate,
        serviceFee: 0,
        insuranceCoveragePercent: 0,
        status,
        totals: {
          subtotal,
          taxAmount: taxAmt,
          serviceFee: 0,
          discount: 0,
          insuranceCovered: 0,
          total,
          patientBalance: total - amountToCollect,
        } as any,
      } as any);

      if (payNow && amountToCollect > 0) {
        try {
          await api.post("/reception/billing/pay", {
            invoiceId: newInvoice._id,
            amount: amountToCollect,
            paymentMethod,
          });
        } catch {
          // payment optional—invoice is still saved
        }
      }

      // Transition request status to accepted upon successful bill creation
      const state = location.state as any;
      if (state?.fromRequest && state?.requestId) {
        try {
          await api.post(`/laboratory/${state.requestId}/accept`);
        } catch (acceptErr) {
          console.error("Failed to transition request to accepted status:", acceptErr);
        }
      }

      toast.success("Laboratory bill created successfully!");

      setReceiptInfo({
        invoiceId: newInvoice._id,
        patientName: selectedPatientName,
        patientUhid: selectedPatientUhid,
        items: billItems,
        subtotal,
        tax: taxAmt,
        total,
        patientBalance: total - amountToCollect,
        status: status,
        issuedAt: new Date().toISOString(),
      });
      setIsReceiptOpen(true);

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create bill.");
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(`
      <html><head><title>Lab Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-bottom: 16px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .total-row td { font-weight: bold; background: #f0f8ff; }
        .status-paid { color: green; font-weight: bold; }
        .footer { margin-top: 24px; text-align: center; color: #999; font-size: 11px; }
      </style>
      </head><body>${printContents}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  // Patient details + payment history
  const selectedPatient = allPatients.find((p: any) => p._id === selectedPatientId);
  const patientInvoices = selectedPatientId
    ? invoices.filter(inv =>
        inv.patientName === selectedPatientName ||
        (selectedPatientUhid && inv.patientUhid === selectedPatientUhid)
      )
    : [];
  const pendingInvs = patientInvoices.filter(inv => inv.status !== "paid");
  const paidInvs = patientInvoices.filter(inv => inv.status === "paid");
  const totalPending = pendingInvs.reduce((s, inv) => s + inv.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/laboratory/billing")}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-blue-600" />
            Create New Laboratory Bill
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Search patient, select tests, and complete billing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Patient + History ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Patient Search */}
          <Card className="p-5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Search Patient</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Name, UHID or phone..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setSelectedPatientId("");
                  setSelectedPatientName("");
                }}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
              />
            </div>
            {filteredPatients.length > 0 && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {filteredPatients.map((p: any) => (
                  <button
                    key={p._id}
                    onClick={() => {
                      setSelectedPatientId(p._id);
                      setSelectedPatientName(p.name);
                      setSelectedPatientUhid(p.uhid || "");
                      setPatientSearch(p.name);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.uhid} · {p.phone}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Patient Details Card */}
          {selectedPatientId && (
            <Card className="p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 border-b border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shadow">
                    {selectedPatientName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{selectedPatientName}</span>
                      <BadgeCheck className="h-4 w-4 text-green-500" />
                    </div>
                    {selectedPatientUhid && (
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-1">{selectedPatientUhid}</span>
                    )}
                    {selectedPatient && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
                        {selectedPatient.age && (
                          <div>
                            <span className="text-slate-400 font-semibold uppercase text-[9px] block">Age</span>
                            <span className="text-slate-700 font-medium">{selectedPatient.age} Yrs</span>
                          </div>
                        )}
                        {selectedPatient.gender && (
                          <div>
                            <span className="text-slate-400 font-semibold uppercase text-[9px] block">Gender</span>
                            <span className="text-slate-700 font-medium">{selectedPatient.gender}</span>
                          </div>
                        )}
                        {selectedPatient.phone && (
                          <div>
                            <span className="text-slate-400 font-semibold uppercase text-[9px] block">Contact</span>
                            <span className="text-slate-700 font-medium">{selectedPatient.phone}</span>
                          </div>
                        )}
                        {selectedPatient.bloodGroup && (
                          <div>
                            <span className="text-slate-400 font-semibold uppercase text-[9px] block">Blood Group</span>
                            <span className="text-slate-700 font-medium">{selectedPatient.bloodGroup}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-slate-400" /> Payment History
                  </span>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full">{paidInvs.length} Paid</span>
                    {pendingInvs.length > 0 && (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                        {pendingInvs.length} Pending · ₹{totalPending.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                {patientInvoices.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {patientInvoices.map(inv => (
                      <div key={inv._id} className="px-3 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1 mb-0.5">
                            {inv.items.map((it: LabBillItem, i: number) => (
                              <span key={i} className="bg-slate-100 text-slate-600 text-[9px] font-semibold px-1.5 py-0.5 rounded">{it.testName}</span>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(inv.issuedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className="font-bold text-slate-800 flex items-center gap-0.5">
                            <IndianRupee className="h-2.5 w-2.5" />{inv.total.toLocaleString()}
                          </span>
                          <Badge tone={inv.status === "paid" ? "success" : "warning"} className="text-[9px]">
                            {inv.status === "paid" ? "PAID" : "PENDING"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No previous billing history for this patient.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right Column: Tests + Bill ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Test Selection */}
          <Card className="p-5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Select Tests</label>
            {availableTests.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No tests configured. Please add tests in Laboratory Settings.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTests.map((t) => {
                  const added = billItems.some(it => it.testName === t);
                  return (
                    <button
                      key={t}
                      onClick={() => addTest(t)}
                      disabled={added}
                      className={`px-4 py-2 text-xs rounded-full border font-semibold transition-all ${
                        added
                          ? "bg-blue-600 border-blue-600 text-white opacity-70 cursor-not-allowed"
                          : "bg-white border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 hover:shadow-sm"
                      }`}
                    >
                      {added ? <Check className="h-3 w-3 inline mr-1" /> : <Plus className="h-3 w-3 inline mr-1" />}
                      {t} {prices[t] ? `— ₹${prices[t]}` : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Bill Items Table */}
          {billItems.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Bill Items ({billItems.length})</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Test Name</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">Amount (₹)</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((it, idx) => (
                    <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{it.testName}</td>
                      <td className="px-5 py-3 text-right">
                        <input
                          type="number"
                          value={it.price}
                          onChange={(e) => updatePrice(idx, e.target.value)}
                          className="w-28 text-right border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => removeTest(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Totals + Payment */}
          {billItems.length > 0 && (
            <Card className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left: Tax & Payment */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      value={taxRate}
                      min={0}
                      max={100}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pay-now" checked={payNow} onChange={e => setPayNow(e.target.checked)} className="h-4 w-4 accent-blue-600" />
                    <label htmlFor="pay-now" className="text-sm font-medium text-slate-700">Collect payment now</label>
                  </div>
                  {payNow && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Paying Amount (₹)</label>
                        <input
                          type="number"
                          placeholder={`Enter amount (default: ₹${total})`}
                          value={payingAmount}
                          min={1}
                          max={total}
                          onChange={(e) => setPayingAmount(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Summary */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Bill Summary</div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span><span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                  </div>
                  {taxAmt > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Tax ({taxRate}%)</span><span>₹{taxAmt.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3 mt-2">
                    <span>Total</span><span className="text-blue-700">₹{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => navigate("/laboratory/billing")}>Cancel</Button>
                <Button
                  onClick={handleCreateBill}
                  disabled={createInvoiceMutation.isPending || !selectedPatientId || billItems.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2.5"
                >
                  {createInvoiceMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Receipt className="h-4 w-4" />
                  )}
                  {payNow ? "Create & Collect Payment" : "Create Bill"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {receiptInfo && (
        <Modal title="Laboratory Invoice / Receipt" isOpen={isReceiptOpen} onClose={() => { setIsReceiptOpen(false); navigate("/laboratory/billing"); }}>
          <div className="space-y-4">
            <div ref={printRef} className="space-y-4 text-sm">
              <h1 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 4 }}>Laboratory Invoice</h1>
              <h2 style={{ color: "#555", marginBottom: 12 }}>Invoice #{receiptInfo.invoiceId.slice(-8).toUpperCase()}</h2>

              <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Patient</div>
                  <div className="font-bold">{receiptInfo.patientName}</div>
                  {receiptInfo.patientUhid && <div className="text-xs text-slate-500 font-mono">{receiptInfo.patientUhid}</div>}
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Date</div>
                  <div className="font-bold">{new Date(receiptInfo.issuedAt).toLocaleString()}</div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "left", background: "#f5f5f5", fontWeight: 600 }}>Test</th>
                    <th style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right", background: "#f5f5f5", fontWeight: 600 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptInfo.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px" }}>{it.testName}</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right" }}>₹{it.price.toLocaleString()}</td>
                    </tr>
                  ))}
                  {receiptInfo.tax > 0 && (
                    <tr>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px", color: "#666" }}>Tax</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right", color: "#666" }}>₹{receiptInfo.tax.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="total-row" style={{ background: "#e8f4ff", fontWeight: "bold" }}>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px", fontSize: 15 }}>TOTAL</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right", fontSize: 15 }}>₹{receiptInfo.total.toLocaleString()}</td>
                  </tr>
                  <tr style={{ fontWeight: "bold", color: "#16a34a" }}>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px" }}>Amount Paid</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right" }}>₹{(receiptInfo.total - receiptInfo.patientBalance).toLocaleString()}</td>
                  </tr>
                  {receiptInfo.patientBalance > 0 && (
                    <tr style={{ fontWeight: "bold", color: "#dc2626" }}>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px" }}>Remaining Balance</td>
                      <td style={{ border: "1px solid #ddd", padding: "8px 10px", textAlign: "right" }}>₹{receiptInfo.patientBalance.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p style={{ textAlign: "center", color: "#999", fontSize: 11 }}>
                Thank you for choosing our laboratory services.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => { setIsReceiptOpen(false); navigate("/laboratory/billing"); }}>Close</Button>
              <Button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
