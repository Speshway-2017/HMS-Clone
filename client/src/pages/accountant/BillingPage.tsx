import { useState, useEffect } from "react";
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
  X,
  User,
  CreditCard,
  Calendar,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useInvoices } from "../../features/invoices";
import { usePatients } from "../../features/patients";
import { useMyHospital } from "../../features/hospitals";
import { 
  useIPAdmissions, 
  useIPBillingDetails, 
  useAddIPCharge, 
  useDeleteIPCharge, 
  usePostIPAdvance, 
  useGenerateIPInvoice 
} from "../../features/ipBilling";
import { socket } from "../../lib/socket";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { formatINR } from "../../lib/currency";

const STATUS_TONE = { 
  pending: "warning", 
  partially_paid: "info", 
  paid: "success", 
  overdue: "danger" 
} as const;

interface BillingItem {
  description: string;
  category: string;
  quantity: number;
  amount: number;
}

const CATEGORIES = [
  "Admission Charges",
  "Accommodation Charges",
  "Doctor Charges",
  "Nursing Charges",
  "Laboratory Charges",
  "Radiology Charges",
  "Pharmacy Charges",
  "Procedure Charges",
  "Operation Theatre Charges",
  "Equipment Charges",
  "Diet Charges",
  "Miscellaneous"
];

interface AccordionGroup {
  id: string;
  name: string;
  categories: string[];
  subtotal: number;
  itemCount: number;
  items: any[];
}

const groupIPCharges = (charges: any[]) => {
  const groups: AccordionGroup[] = [
    { id: "accommodation", name: "Accommodation Charges", categories: ["Accommodation Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "doctor", name: "Doctor Charges", categories: ["Doctor Charges", "Doctor Visit Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "clinical", name: "Clinical Services", categories: ["Laboratory Charges", "Radiology Charges", "Procedure Charges", "Operation Theatre Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "pharmacy", name: "Pharmacy", categories: ["Pharmacy Charges"], subtotal: 0, itemCount: 0, items: [] },
    { id: "nursing", name: "Nursing & Support", categories: ["Nursing Charges", "Equipment Charges", "Miscellaneous"], subtotal: 0, itemCount: 0, items: [] },
    { id: "other", name: "Other Charges", categories: ["Admission Charges", "Diet Charges"], subtotal: 0, itemCount: 0, items: [] }
  ];

  charges.forEach(c => {
    const group = groups.find(g => g.categories.includes(c.category));
    if (group) {
      group.items.push(c);
      group.subtotal += c.total || 0;
      group.itemCount += 1;
    } else {
      const other = groups.find(g => g.id === "other")!;
      other.items.push(c);
      other.subtotal += c.total || 0;
      other.itemCount += 1;
    }
  });

  return groups.filter(g => g.items.length > 0);
};

export function AccountantBillingPage() {
  const [activeTab, setActiveTab] = useState<"all" | "op" | "ip" | "pharmacy" | "laboratory" | "statement">("all");
  const [ipSubTab, setIpSubTab] = useState<"workspace" | "history">("workspace");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ── Patient Consolidated Statement States ──
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedVisitKey, setSelectedVisitKey] = useState<string>("all");
  const [isStatementPrintModalOpen, setIsStatementPrintModalOpen] = useState(false);

  const tabToBillingType: Record<string, string | undefined> = {
    all: undefined,
    op: "OP",
    ip: "IP",
    pharmacy: "PHARMACY",
    laboratory: "LAB",
    statement: undefined
  };

  // Invoices & Patients Queries
  const { data: invoicesData, refetch } = useInvoices({ page, billingType: tabToBillingType[activeTab] });
  const { data: hospitalData } = useMyHospital();
  const { data: searchedPatientsData, isLoading: searchingPatients } = usePatients({ search: patientSearchQuery });
  const { data: patientInvoicesData, isLoading: loadingPatientInvoices } = useInvoices({ 
    patient: selectedPatient?._id, 
    limit: 1000 
  });

  // Extract recent patients with billing history from main invoices list
  const recentPatientsMap = new Map<string, any>();
  (invoicesData?.data || []).forEach((inv: any) => {
    if (inv.patient && typeof inv.patient === "object" && inv.patient._id) {
      recentPatientsMap.set(inv.patient._id, inv.patient);
    }
  });
  const recentPatients = Array.from(recentPatientsMap.values());

  const patientInvoices = (patientInvoicesData?.data || []).filter((inv: any) => {
    if (!selectedPatient) return false;
    const pId = inv.patient && typeof inv.patient === "object" ? inv.patient._id : inv.patient;
    return pId === selectedPatient._id;
  });

  // Group patient invoices by Visit Date Session
  const groupInvoicesByVisit = (invoices: any[]) => {
    const map = new Map<string, any[]>();

    invoices.forEach(inv => {
      const rawDate = inv.issuedAt || inv.createdAt;
      const d = new Date(rawDate);
      const dateKey = isNaN(d.getTime()) ? "Unknown Date" : d.toISOString().split("T")[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(inv);
    });

    const visitGroups: Array<{
      dateKey: string;
      displayDate: string;
      invoices: any[];
      billingTypes: string[];
      totalGross: number;
      totalDiscount: number;
      totalInsurance: number;
      totalPaid: number;
      balanceDue: number;
      totalNet: number;
    }> = [];

    map.forEach((invs, dateKey) => {
      const displayDate = dateKey === "Unknown Date" ? "Unknown Date" : new Date(dateKey + "T00:00:00").toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const billingTypes = Array.from(new Set(invs.map((i: any) => i.billingType || "OP")));
      const totalGross = invs.reduce((sum: number, i: any) => sum + (i.totals?.subtotal || i.totals?.total || 0), 0);
      const totalDiscount = invs.reduce((sum: number, i: any) => sum + (i.totals?.discount || 0), 0);
      const totalInsurance = invs.reduce((sum: number, i: any) => sum + (i.totals?.insuranceCovered || 0), 0);
      const totalNet = invs.reduce((sum: number, i: any) => sum + (i.totals?.total || 0), 0);
      const balanceDue = invs.reduce((sum: number, i: any) => sum + (i.totals?.patientBalance || 0), 0);
      const totalPaid = Math.max(0, totalNet - totalInsurance - balanceDue);

      visitGroups.push({
        dateKey,
        displayDate,
        invoices: invs,
        billingTypes,
        totalGross,
        totalDiscount,
        totalInsurance,
        totalPaid,
        balanceDue,
        totalNet
      });
    });

    visitGroups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return visitGroups;
  };

  const visitGroups = groupInvoicesByVisit(patientInvoices);

  // Active visit selection filter
  const activeVisitGroup = selectedVisitKey === "all" ? null : visitGroups.find(v => v.dateKey === selectedVisitKey);
  const displayedPatientInvoices = selectedVisitKey === "all" 
    ? patientInvoices 
    : (activeVisitGroup ? activeVisitGroup.invoices : []);

  // Financial tallies for displayed selection
  const patientGross = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.subtotal || inv.totals?.total || 0), 0);
  const patientTax = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.taxAmount || 0), 0);
  const patientDiscount = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.discount || 0), 0);
  const patientInsurance = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.insuranceCovered || 0), 0);
  const patientTotalNet = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.total || 0), 0);
  const patientBalanceDue = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.patientBalance || 0), 0);
  const patientTotalPaid = Math.max(0, patientTotalNet - patientInsurance - patientBalanceDue);

  // Modals state
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // ── IP Billing States ──
  const [admissionSearch, setAdmissionSearch] = useState("");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);

  // Accordion UI state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  // Custom Charge form state
  const [customCategory, setCustomCategory] = useState("Admission Charges");
  const [customServiceName, setCustomServiceName] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);
  const [customTax, setCustomTax] = useState(0);
  const [customRemarks, setCustomRemarks] = useState("");

  // Payment / Advance form state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceMethod, setAdvanceMethod] = useState("UPI");
  const [advanceTxId, setAdvanceTxId] = useState("");
  const [advanceType, setAdvanceType] = useState<"advance" | "refund">("advance");

  // Discount & Insurance splits state
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [hospitalDiscount, setHospitalDiscount] = useState(0);
  const [doctorDiscount, setDoctorDiscount] = useState(0);
  const [managementDiscount, setManagementDiscount] = useState(0);
  
  const [taxRateVal, setTaxRateVal] = useState(5); // Default GST 5%
  
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [claimAmount, setClaimAmount] = useState(0);
  const [patientShare, setPatientShare] = useState(0);

  // IP Queries & Mutations
  const { data: activeAdmissions, refetch: refetchAdmissions } = useIPAdmissions(admissionSearch);
  const { data: ipDetails, refetch: refetchIPDetails, isLoading: detailsLoading } = useIPBillingDetails(selectedAdmissionId || undefined);

  const addChargeMutation = useAddIPCharge(selectedAdmissionId || undefined);
  const deleteChargeMutation = useDeleteIPCharge(selectedAdmissionId || undefined);
  const postPaymentMutation = usePostIPAdvance(selectedAdmissionId || undefined);
  const generateInvoiceMutation = useGenerateIPInvoice(selectedAdmissionId || undefined);

  // Socket sync bindings
  useEffect(() => {
    const handleIPUpdate = (data: any) => {
      console.log("IP Billing real-time update:", data);
      if (selectedAdmissionId && (data.admissionId === selectedAdmissionId || data.type === "IP_DISCHARGE_BILL")) {
        refetchIPDetails();
      }
      refetchAdmissions();
    };

    socket.on("ip_billing_update", handleIPUpdate);
    socket.on("ip_bill_update", handleIPUpdate);
    socket.on("dashboard_update", handleIPUpdate);

    return () => {
      socket.off("ip_billing_update", handleIPUpdate);
      socket.off("ip_bill_update", handleIPUpdate);
      socket.off("dashboard_update", handleIPUpdate);
    };
  }, [selectedAdmissionId, refetchIPDetails, refetchAdmissions]);

  useEffect(() => {
    if (ipDetails?.charges) {
      const activeGroups = groupIPCharges(ipDetails.charges);
      const initial: Record<string, boolean> = {};
      activeGroups.forEach(g => {
        initial[g.id] = true;
      });
      setExpandedGroups(initial);
    }
  }, [ipDetails?.charges]);

  // Running Bill Totals
  const gross = ipDetails?.charges?.reduce((sum: number, c: any) => sum + c.total, 0) || 0;
  const grossTax = gross * (taxRateVal / 100);
  const totalDiscount = discountType === "percentage" 
    ? gross * ((hospitalDiscount + doctorDiscount + managementDiscount) / 100) 
    : (hospitalDiscount + doctorDiscount + managementDiscount);
  
  const insCovered = paymentMode !== "Cash" ? approvedAmount : 0;
  const advancePaid = ipDetails?.totals?.advancePaid || 0;
  
  const netPayable = Math.max(0, gross + grossTax - totalDiscount - insCovered);
  const outstanding = Math.max(0, netPayable - advancePaid);

  // Blockages
  const clinicalBlockages = (ipDetails as any)?.blockages || [];
  const billingBlockages = outstanding > 1 
    ? [`Patient has outstanding balance of ₹${outstanding.toFixed(2)}. Settlement required before discharge.`] 
    : [];
  const allBlockages = [...clinicalBlockages, ...billingBlockages];



  const handleAddCustomCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName || customPrice <= 0) return;
    try {
      await addChargeMutation.mutateAsync({
        category: customCategory,
        serviceName: customServiceName,
        quantity: customQty,
        unitPrice: customPrice,
        discount: customDiscount,
        tax: customTax,
        remarks: customRemarks
      });
      setCustomServiceName("");
      setCustomQty(1);
      setCustomPrice(0);
      setCustomDiscount(0);
      setCustomTax(0);
      setCustomRemarks("");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to add charge");
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    if (!window.confirm("Are you sure you want to remove this charge item?")) return;
    try {
      await deleteChargeMutation.mutateAsync(chargeId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to remove charge");
    }
  };

  const handlePostAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (advanceAmount <= 0) return;
    try {
      await postPaymentMutation.mutateAsync({
        amount: advanceAmount,
        paymentMethod: advanceMethod,
        transactionId: advanceTxId || `TXN-${Date.now().toString().slice(-6)}`,
        type: advanceType
      });
      setShowAdvanceModal(false);
      setAdvanceAmount(0);
      setAdvanceTxId("");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to post payment");
    }
  };

  const handleGenerateFinalBill = async () => {
    if (allBlockages.length > 0) {
      alert("Cannot generate final invoice. Please resolve all blocking requirements.");
      return;
    }
    if (!window.confirm("Confirm generating Final IP Invoice? This will discharge the patient.")) return;
    try {
      const res = await generateInvoiceMutation.mutateAsync({
        discountType,
        hospitalDiscount,
        doctorDiscount,
        managementDiscount,
        insuranceCovered: insCovered,
        approvedAmount,
        claimAmount,
        patientShare,
        paymentMode,
        taxRate: taxRateVal
      });
      if (res.success) {
        alert("Final Inpatient Invoice generated successfully. Patient discharged.");
        setSelectedInvoice(res.data.invoice);
        setIsInvoiceDetailsOpen(true);
        setSelectedAdmissionId(null);
        setIpSubTab("history");
        refetch();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to generate final invoice");
    }
  };

  // Filter invoices client-side
  const filteredInvoices = (invoicesData?.data ?? []).filter((inv) => {
    const pName = inv.patient && typeof inv.patient === "object" ? inv.patient.name : "";
    return pName.toLowerCase().includes(search.toLowerCase()) || 
           inv._id.toLowerCase().includes(search.toLowerCase());
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Billing & Invoices</h1>
          <p className="text-sm text-slate-500">Manage OPD, IPD, laboratory diagnostics, and pharmacy bills.</p>
        </div>

      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {(["all", "op", "ip", "pharmacy", "laboratory", "statement"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "ip") {
                setIpSubTab("workspace");
              }
            }}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-all whitespace-nowrap ${
              activeTab === tab 
                ? "border-navy-700 text-navy-700 font-bold" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "all" 
              ? `All Bills (${invoicesData?.counts?.all ?? 0})` 
              : tab === "op" || tab === "ip" 
                ? `${tab.toUpperCase()} Billing (${invoicesData?.counts?.[tab] ?? 0})` 
                : tab === "statement"
                  ? "Patient Consolidated Statement"
                  : `${tab.charAt(0).toUpperCase()}${tab.slice(1)} Billing (${invoicesData?.counts?.[tab] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Inpatient (IP) Sub-tab Navigation */}
      {activeTab === "ip" && (
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-xs border border-slate-200 shadow-inner">
          <button
            onClick={() => setIpSubTab("workspace")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
              ipSubTab === "workspace"
                ? "bg-white text-navy-700 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            IP Billing Workspace
          </button>
          <button
            onClick={() => setIpSubTab("history")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
              ipSubTab === "history"
                ? "bg-white text-navy-700 shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Generated IP Invoices
          </button>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === "statement" ? (
        // ── PATIENT CONSOLIDATED STATEMENT TAB ──
        <div className="space-y-6">
          {/* Patient Selection & Search Card */}
          <Card className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Select Patient for Consolidated Statement</h2>
                <p className="text-xs text-slate-500">Search patient by name, UHID, or mobile to view full visit billing history & print statement.</p>
              </div>
              {selectedPatient && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setSelectedPatient(null)} className="text-xs py-1.5">
                    Select Different Patient
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setIsStatementPrintModalOpen(true)}
                    className="text-xs py-1.5 flex items-center gap-1 bg-navy-700 hover:bg-navy-800 text-white font-bold"
                  >
                    <Printer className="h-4 w-4" /> Print Consolidated Statement
                  </Button>
                </div>
              )}
            </div>

            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search patient by name, UHID, or mobile number..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              />
            </div>

            {/* Searched Patient Suggestions */}
            {patientSearchQuery.trim() && (
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block px-2">Search Results:</span>
                {searchingPatients ? (
                  <div className="text-xs text-slate-400 px-2 py-1">Searching patients...</div>
                ) : !searchedPatientsData?.data || searchedPatientsData.data.length === 0 ? (
                  <div className="text-xs text-slate-400 px-2 py-1">No matching patients found.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {searchedPatientsData.data.map((p: any) => (
                      <button
                        key={p._id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearchQuery("");
                        }}
                        className={`text-left p-2.5 rounded-lg border transition-all ${
                          selectedPatient?._id === p._id
                            ? "bg-navy-50 border-navy-300 text-navy-800 font-bold"
                            : "bg-white border-slate-200 hover:border-navy-400 text-slate-700"
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.uhid} • {p.phone}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{p.gender}, {p.age} yrs</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick-Select Recent Patients with Bills */}
            {!selectedPatient && recentPatients.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600">Quick Select Patient with Recent Billing:</span>
                <div className="flex flex-wrap gap-2">
                  {recentPatients.map((p: any) => (
                    <button
                      key={p._id}
                      onClick={() => setSelectedPatient(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-navy-50 hover:border-navy-300 text-xs font-medium text-slate-700 transition shadow-sm"
                    >
                      <User className="h-3.5 w-3.5 text-navy-600" />
                      <span>{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({p.uhid})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Selected Patient Consolidated View */}
          {selectedPatient ? (
            <div className="space-y-6">
              {/* Patient Banner */}
              <div className="bg-navy-700 text-white rounded-xl p-4 shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-white">
                    {selectedPatient.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {selectedPatient.name}
                      <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded text-white capitalize font-mono">
                        {selectedPatient.uhid}
                      </span>
                    </h3>
                    <p className="text-xs text-navy-200">
                      Mobile: {selectedPatient.phone || "N/A"} • Age/Gender: {selectedPatient.age} Yrs / <span className="capitalize">{selectedPatient.gender}</span> • Status: <span className="capitalize">{selectedPatient.status || "OPD"}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="primary"
                    onClick={() => setIsStatementPrintModalOpen(true)}
                    className="bg-white text-navy-800 hover:bg-navy-50 font-bold text-xs py-2 px-4 shadow"
                  >
                    <Printer className="h-4 w-4" /> {selectedVisitKey === "all" ? "Print Consolidated Statement" : `Print ${activeVisitGroup?.displayDate} Visit Bill`}
                  </Button>
                </div>
              </div>

              {/* Visit Sessions Grouping Bar */}
              {visitGroups.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-navy-700" /> Patient Visit & Consultation Sessions ({visitGroups.length} Visits)
                      </h4>
                      <p className="text-[11px] text-slate-400">Click a specific visit date session below to view or print that particular visit's grouped bills (OP, Pharmacy, Lab, IP).</p>
                    </div>
                    {selectedVisitKey !== "all" && (
                      <button
                        onClick={() => setSelectedVisitKey("all")}
                        className="text-xs font-bold text-navy-700 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 px-3 py-1 rounded-md border border-navy-200 transition"
                      >
                        View All Visits (Full History)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* All Visits Card */}
                    <button
                      onClick={() => setSelectedVisitKey("all")}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedVisitKey === "all"
                          ? "bg-navy-50 border-navy-400 shadow-sm ring-1 ring-navy-400"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-slate-800">All Visits History</span>
                        <span className="bg-navy-100 text-navy-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {patientInvoices.length} Bills
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">Consolidated Multi-Visit Summary</div>
                      <div className="text-xs font-bold text-navy-700 mt-2 font-mono">{formatINR(patientInvoices.reduce((sum: number, i: any) => sum + (i.totals?.total || 0), 0))}</div>
                    </button>

                    {/* Individual Visit Cards */}
                    {visitGroups.map((v) => {
                      const isSelected = selectedVisitKey === v.dateKey;
                      return (
                        <div
                          key={v.dateKey}
                          onClick={() => setSelectedVisitKey(v.dateKey)}
                          className={`cursor-pointer p-3 rounded-lg border transition-all flex flex-col justify-between ${
                            isSelected
                              ? "bg-emerald-50/70 border-emerald-400 shadow-sm ring-1 ring-emerald-400"
                              : "bg-white border-slate-200 hover:border-navy-300 hover:shadow-sm"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-800">{v.displayDate}</span>
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {v.invoices.length} {v.invoices.length === 1 ? "Bill" : "Bills"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 my-1.5">
                              {v.billingTypes.map((t) => (
                                <span key={t} className="bg-navy-50 text-navy-700 border border-navy-150 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-100/80 pt-2 mt-2">
                            <span className="text-xs font-bold text-slate-800 font-mono">{formatINR(v.totalNet)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVisitKey(v.dateKey);
                                setIsStatementPrintModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-navy-700 hover:bg-navy-800 px-2 py-1 rounded shadow-sm"
                            >
                              <Printer className="h-3 w-3" /> Print Visit Bill
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Financial KPI Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {selectedVisitKey === "all" ? "Gross Invoiced" : "Visit Gross Charges"}
                  </span>
                  <span className="text-base font-bold text-slate-800 font-mono">{formatINR(patientGross)}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {selectedVisitKey === "all" ? "Total Discounts" : "Visit Discounts"}
                  </span>
                  <span className="text-base font-bold text-red-500 font-mono">-{formatINR(patientDiscount)}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Insurance / TPA</span>
                  <span className="text-base font-bold text-blue-600 font-mono">-{formatINR(patientInsurance)}</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Amount Paid</span>
                  <span className="text-base font-bold text-emerald-600 font-mono">{formatINR(patientTotalPaid)}</span>
                </div>
                <div className="col-span-2 md:col-span-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Outstanding Balance</span>
                  <span className={`text-base font-black font-mono ${patientBalanceDue > 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {formatINR(patientBalanceDue)}
                  </span>
                </div>
              </div>

              {/* Consolidated Bills List */}
              <Card className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4.5 w-4.5 text-navy-700" /> 
                    {selectedVisitKey === "all" 
                      ? `Complete Patient Billing Ledger (${patientInvoices.length} Bills)` 
                      : `Visit Ledger: ${activeVisitGroup?.displayDate} (${displayedPatientInvoices.length} Bills)`}
                  </span>
                  <span className="text-xs font-normal text-slate-500">Includes OP, IP, Pharmacy, Lab & Diagnostic charges</span>
                </h3>

                {loadingPatientInvoices ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading patient billing statement...</div>
                ) : displayedPatientInvoices.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No invoices recorded for this visit selection yet.</div>
                ) : (
                  <div className="space-y-4">
                    {displayedPatientInvoices.map((inv: any) => (
                      <div key={inv._id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        {/* Bill Sub-Header */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700 uppercase">
                              INV: {inv._id.slice(-8).toUpperCase()}
                            </span>
                            <span className="rounded bg-navy-100 text-navy-700 font-bold px-2 py-0.5 text-[10px] uppercase border border-navy-200">
                              {inv.billingType || "OP"}
                            </span>
                            <span className="text-slate-400">• {new Date(inv.issuedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge tone={STATUS_TONE[inv.status as keyof typeof STATUS_TONE] || "info"} className="w-28">
                              {inv.status.replace("_", " ")}
                            </Badge>
                            <span className="font-bold text-slate-800 font-mono text-sm">
                              {formatINR(inv.totals?.total || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="p-3">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                              <tr className="text-[10px] font-bold uppercase text-slate-400 border-b pb-1">
                                <th className="py-1">Line Item Particulars</th>
                                <th className="py-1 text-center">Category</th>
                                <th className="py-1 text-center">Qty</th>
                                <th className="py-1 text-right">Unit Price</th>
                                <th className="py-1 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-650">
                              {inv.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="py-2 font-medium text-slate-800">{item.description}</td>
                                  <td className="py-2 text-center uppercase text-[10px] text-slate-400">{item.category || inv.billingType}</td>
                                  <td className="py-2 text-center">{item.quantity}</td>
                                  <td className="py-2 text-right font-mono">{formatINR(item.amount)}</td>
                                  <td className="py-2 text-right font-bold text-slate-800 font-mono">
                                    {formatINR(item.quantity * item.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
                            <div>
                              <span>Mode: {inv.paymentMode || "Cash"}</span>
                              {inv.totals?.insuranceCovered > 0 && <span className="ml-3 text-blue-600 font-medium">Insurance Split: {formatINR(inv.totals.insuranceCovered)}</span>}
                            </div>
                            <div>
                              <span>Patient Balance Due: </span>
                              <span className={`font-bold font-mono ${inv.totals?.patientBalance > 0 ? "text-red-600" : "text-emerald-700"}`}>
                                {formatINR(inv.totals?.patientBalance || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <User className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No Patient Selected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Search for a patient by Name, UHID, or Mobile number above, or click on a quick-select patient to load their full consolidated billing statement.
              </p>
            </div>
          )}
        </div>
      ) : activeTab === "ip" && ipSubTab === "workspace" ? (
        // ── IP BILLING WORKSPACE ──
        <div className="space-y-6">
          {!selectedAdmissionId ? (
            // Workspace selector - Admissions search list
            <Card className="space-y-4">
              <h2 className="text-base font-bold text-slate-800">Select Admitted Inpatient</h2>
              <div className="relative max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search active admission by UHID, IP Number, Patient Name, bed..."
                  value={admissionSearch}
                  onChange={(e) => setAdmissionSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left text-sm min-w-[700px]">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Admission Number</th>
                      <th className="px-4 py-3">Patient Details</th>
                      <th className="px-4 py-3">Ward / Bed</th>
                      <th className="px-4 py-3">Attending Doctor</th>
                      <th className="px-4 py-3">Admitted Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!activeAdmissions || activeAdmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No active inpatient admissions found.
                        </td>
                      </tr>
                    ) : (
                      activeAdmissions.map((adm) => (
                        <tr key={adm._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-slate-700">
                            {adm.admissionNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{adm.patient?.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{adm.patient?.uhid} — {adm.patient?.phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-150">
                              {adm.ward} / Bed: {adm.bed?.bedNumber || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-650">
                            Dr. {adm.admittingDoctor?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {new Date(adm.admissionDate).toLocaleDateString()} {adm.admissionTime}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedAdmissionId(adm._id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 rounded-md px-3 py-1.5 transition shadow-sm"
                            >
                              Open Billing <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            // Patient running bill workspace
            <div className="space-y-6">
              {/* Active Workspace Banner */}
              <div className="flex items-center justify-between bg-navy-50 border border-navy-150 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6 text-navy-700 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-navy-800">
                      IP Running Bill Workspace
                    </h3>
                    <p className="text-xs text-navy-600">
                      Active: <span className="font-semibold">{ipDetails?.admission?.patient?.name}</span> ({ipDetails?.admission?.patient?.uhid})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAdmissionId(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm"
                >
                  <X className="h-4 w-4" /> Close Workspace
                </button>
              </div>

              {detailsLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-8 w-8 text-navy-600 animate-spin" />
                  <span className="text-sm font-semibold text-slate-500">Loading running bill charges...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Left Column: Details, Running Bill and Add Charge */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Patient Admission Details */}
                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <User className="h-4.5 w-4.5 text-navy-600" /> Patient Admission Card
                      </h3>
                      {ipDetails?.admission && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Patient Name</span>
                            <span className="font-bold text-slate-700">{ipDetails.admission.patient?.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">UHID</span>
                            <span className="font-bold text-slate-750 font-mono">{ipDetails.admission.patient?.uhid}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">IP Number</span>
                            <span className="font-bold text-slate-750 font-mono">{ipDetails.admission.admissionNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Age / Gender</span>
                            <span className="font-bold text-slate-700">{ipDetails.admission.patient?.age} Yrs / <span className="capitalize">{ipDetails.admission.patient?.gender}</span></span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Mobile</span>
                            <span className="font-bold text-slate-700 font-mono">{ipDetails.admission.patient?.phone}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Blood Group</span>
                            <span className="font-bold text-slate-700">{ipDetails.admission.patient?.bloodGroup || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Admission Date & Time</span>
                            <span className="font-bold text-slate-700">
                              {new Date(ipDetails.admission.admissionDate).toLocaleDateString()} {ipDetails.admission.admissionTime}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Ward / Room / Bed</span>
                            <span className="font-bold text-slate-750">
                              {ipDetails.admission.ward} / Room: {ipDetails.admission.room?.roomNumber} / Bed: {ipDetails.admission.bed?.bedNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Consultant Doctor / Department</span>
                            <span className="font-bold text-slate-700">
                              Dr. {ipDetails.admission.admittingDoctor?.name} ({ipDetails.admission.department?.name || "N/A"})
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block font-semibold mb-0.5">Admission Diagnosis & Note</span>
                            <span className="font-medium text-slate-650">{ipDetails.admission.primaryDiagnosis || ipDetails.admission.admissionReason || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold mb-0.5">Insurance Coverage Mode</span>
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 capitalize border border-blue-200">
                              {ipDetails.admission.insuranceProvider ? `Insurance: ${ipDetails.admission.insuranceProvider}` : "Cash / Self-Pay"}
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Running Bill categories */}
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="h-5 w-5 text-navy-700" /> Itemized Charges Breakdown
                      </h3>
                      {groupIPCharges(ipDetails?.charges || []).map((group) => {
                        const isExpanded = !!expandedGroups[group.id];

                        return (
                          <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                            {/* Accordion Header */}
                            <div 
                              onClick={() => toggleGroup(group.id)}
                              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none border-b border-slate-200/50 transition"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.name}</h4>
                                <span className="bg-navy-50 text-navy-700 text-[10px] font-bold px-2 py-0.5 rounded border border-navy-150 ml-2">
                                  {group.itemCount} {group.itemCount === 1 ? "Item" : "Items"}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-navy-700 bg-navy-50 px-2 py-0.5 rounded border border-navy-150">
                                Subtotal: {formatINR(group.subtotal)}
                              </span>
                            </div>

                            {/* Accordion Body */}
                            {isExpanded && (
                              <div className="p-4 bg-white">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                  <thead>
                                    <tr className="text-[10px] font-bold uppercase text-slate-400">
                                      <th className="py-2">Category</th>
                                      <th className="py-2">Description / Item</th>
                                      <th className="py-2 text-center">Qty</th>
                                      <th className="py-2 text-right">Price</th>
                                      <th className="py-2 text-right">Discount</th>
                                      <th className="py-2 text-right">Tax</th>
                                      <th className="py-2 text-right">Total</th>
                                      <th className="py-2 text-right">Type / Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-650">
                                    {group.items.map((c: any) => (
                                      <tr key={c._id} className="hover:bg-slate-50/50">
                                        <td className="py-2 text-[10px] font-bold text-slate-400 uppercase">
                                          {c.category}
                                        </td>
                                        <td className="py-2 font-medium text-slate-850">
                                          {c.serviceName}
                                          {c.remarks && <span className="block text-[9px] text-slate-400 font-normal leading-tight">{c.remarks}</span>}
                                        </td>
                                        <td className="py-2 text-center">{c.quantity}</td>
                                        <td className="py-2 text-right font-mono">{formatINR(c.unitPrice)}</td>
                                        <td className="py-2 text-right font-medium text-red-500 font-mono">-{formatINR(c.discount || 0)}</td>
                                        <td className="py-2 text-right font-medium text-slate-500 font-mono">+{formatINR(c.tax || 0)}</td>
                                        <td className="py-2 text-right font-bold text-slate-850 font-mono">{formatINR(c.total)}</td>
                                        <td className="py-2 text-right">
                                          {c.isSystemGenerated ? (
                                            <span className="inline-flex rounded bg-emerald-50 border border-emerald-200 text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider text-emerald-700 shadow-sm animate-pulse">
                                              Auto
                                            </span>
                                          ) : (
                                            <button
                                              onClick={() => handleDeleteCharge(c._id)}
                                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                              title="Remove charge"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Charge Form */}
                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Plus className="h-4.5 w-4.5 text-navy-600" /> Post New Billable Charge
                      </h3>
                      <form onSubmit={handleAddCustomCharge} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SelectField
                            label="Category"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            required
                          >
                            {CATEGORIES.map((c: string) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </SelectField>

                          <InputField
                            label="Service / Item Name"
                            value={customServiceName}
                            onChange={(e) => setCustomServiceName(e.target.value)}
                            placeholder="e.g. Daily Specialist Consultation, Dialysis Procedure..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <InputField
                            label="Quantity"
                            type="number"
                            value={customQty}
                            onChange={(e) => setCustomQty(Number(e.target.value))}
                            min="1"
                            required
                          />
                          <InputField
                            label="Unit Price (₹)"
                            type="number"
                            value={customPrice || ""}
                            onChange={(e) => setCustomPrice(Number(e.target.value))}
                            min="0"
                            required
                          />
                          <InputField
                            label="Discount (₹)"
                            type="number"
                            value={customDiscount || ""}
                            onChange={(e) => setCustomDiscount(Number(e.target.value))}
                            min="0"
                          />
                          <InputField
                            label="Tax Amount (₹)"
                            type="number"
                            value={customTax || ""}
                            onChange={(e) => setCustomTax(Number(e.target.value))}
                            min="0"
                          />
                          <div className="col-span-2 md:col-span-1">
                            <span className="block text-xs font-semibold text-slate-500 mb-1">Calculated Total</span>
                            <div className="h-9 flex items-center font-bold text-slate-800 text-sm bg-slate-50 px-3 border rounded-lg">
                              {formatINR((customQty * customPrice) - customDiscount + customTax)}
                            </div>
                          </div>
                        </div>

                        <InputField
                          label="Remarks / Notes"
                          value={customRemarks}
                          onChange={(e) => setCustomRemarks(e.target.value)}
                          placeholder="Optional clinical notes or department approvals reference..."
                        />

                        <div className="flex justify-end pt-1.5">
                          <Button variant="primary" type="submit" disabled={addChargeMutation.isPending}>
                            {addChargeMutation.isPending ? "Posting..." : "Confirm Post Charge"}
                          </Button>
                        </div>
                      </form>
                    </Card>
                  </div>

                  {/* Right Column: Actions, Payments, Discounts, Insurance, Running Total */}
                  <div className="space-y-6">
                    {/* Running Total summary */}
                    <Card className="space-y-4 border-t-4 border-t-navy-700 bg-navy-50/50 shadow-md">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <CreditCard className="h-4.5 w-4.5 text-navy-600" /> Running Invoice Summary
                      </h3>
                      <div className="space-y-2 text-xs border-b border-slate-100 pb-3">
                        <div className="flex justify-between text-slate-550">
                          <span>Gross Inpatient Charges:</span>
                          <span className="font-semibold text-slate-800">{formatINR(gross)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-550 gap-2">
                          <div className="flex items-center gap-1">
                            <span>GST Tax Rate (%):</span>
                            <input
                              type="number"
                              value={taxRateVal}
                              onChange={(e) => setTaxRateVal(Number(e.target.value))}
                              className="w-12 rounded border text-center p-0.5 text-[10px]"
                              min="0"
                              max="100"
                            />
                          </div>
                          <span className="font-semibold text-slate-800">+{formatINR(grossTax)}</span>
                        </div>
                        <div className="flex justify-between text-red-650">
                          <span>Total Discounts Applied:</span>
                          <span className="font-bold">-{formatINR(totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>Insurance/TPA Coverage Split:</span>
                          <span>-{formatINR(insCovered)}</span>
                        </div>
                        <div className="flex justify-between text-slate-800 border-t border-slate-200/50 pt-2 font-bold text-sm">
                          <span>Net Inpatient Bill:</span>
                          <span className="text-slate-900">{formatINR(netPayable)}</span>
                        </div>
                        <div className="flex justify-between text-blue-700 font-medium pt-1">
                          <span>Admission Advance Paid:</span>
                          <span>{formatINR(advancePaid)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Outstanding Balance</span>
                          <span className={`text-lg font-black font-mono ${outstanding > 1 ? "text-red-600" : "text-emerald-700"}`}>
                            {formatINR(outstanding)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <Button
                            onClick={() => { setAdvanceType("advance"); setShowAdvanceModal(true); }}
                            className="w-full text-[10px] py-1 font-bold bg-navy-600 hover:bg-navy-700 text-white"
                          >
                            Receive Payment
                          </Button>
                          <Button
                            onClick={() => { setAdvanceType("refund"); setShowAdvanceModal(true); }}
                            className="w-full text-[10px] py-1 font-semibold text-slate-700 bg-white border hover:bg-slate-50"
                          >
                            Issue Refund
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Discounts panel */}
                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Discounts & Benefits
                      </h3>
                      <div className="space-y-3">
                        <SelectField
                          label="Discount Type"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as any)}
                        >
                          <option value="fixed">Fixed INR Amount (₹)</option>
                          <option value="percentage">Percentage (%)</option>
                        </SelectField>
                        <div className="grid grid-cols-3 gap-2">
                          <InputField
                            label="Hospital"
                            type="number"
                            value={hospitalDiscount || ""}
                            onChange={(e) => setHospitalDiscount(Number(e.target.value))}
                            min="0"
                          />
                          <InputField
                            label="Doctor"
                            type="number"
                            value={doctorDiscount || ""}
                            onChange={(e) => setDoctorDiscount(Number(e.target.value))}
                            min="0"
                          />
                          <InputField
                            label="Management"
                            type="number"
                            value={managementDiscount || ""}
                            onChange={(e) => setManagementDiscount(Number(e.target.value))}
                            min="0"
                          />
                        </div>
                      </div>
                    </Card>

                    {/* Insurance Split Panel */}
                    <Card className="space-y-4">
                      <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Insurance & TPA Claims
                      </h3>
                      <div className="space-y-3">
                        <SelectField
                          label="Payment Split Mode"
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                        >
                          <option value="Cash">Cash / Self-Pay</option>
                          <option value="Insurance">Insurance Policy</option>
                          <option value="Corporate">Corporate Sponsorship</option>
                          <option value="TPA">Third Party Administrator (TPA)</option>
                        </SelectField>

                        {paymentMode !== "Cash" && (
                          <div className="space-y-2 border-t pt-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <InputField
                                label="Claim Amount (₹)"
                                type="number"
                                value={claimAmount || ""}
                                onChange={(e) => setClaimAmount(Number(e.target.value))}
                                min="0"
                              />
                              <InputField
                                label="Approved Amount (₹)"
                                type="number"
                                value={approvedAmount || ""}
                                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                                min="0"
                              />
                            </div>
                            <InputField
                              label="Co-Pay / Patient Share (₹)"
                              type="number"
                              value={patientShare || ""}
                              onChange={(e) => setPatientShare(Number(e.target.value))}
                              min="0"
                            />
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Discharge Block validation warnings */}
                    {allBlockages.length > 0 ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-red-800">
                          <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
                          <span>Discharge Blocked ({allBlockages.length})</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-red-700">
                          {allBlockages.map((block, idx) => (
                            <li key={idx}>{block}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-xs flex items-start gap-2 text-green-700">
                        <CheckCircle className="h-4.5 w-4.5 shrink-0 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-bold text-green-800">Discharge Cleared</p>
                          <p className="mt-0.5 leading-snug">Patient has settled all dues, and all clinical results/dispensaries have cleared.</p>
                        </div>
                      </div>
                    )}

                    {/* Generate Final Bill button */}
                    <div>
                      <Button
                        onClick={handleGenerateFinalBill}
                        className="w-full py-2.5 font-black text-sm uppercase bg-navy-700 hover:bg-navy-800 text-white rounded-lg transition-all shadow"
                        disabled={allBlockages.length > 0 || generateInvoiceMutation.isPending}
                      >
                        {generateInvoiceMutation.isPending ? "Generating Invoice..." : "Generate Final Invoice & Discharge"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // ── OLD INVOICES LIST TABLE (Default fallback for OP, Lab, Pharmacy, and IP History) ──
        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search by Patient name or Invoice ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[750px]">
              <thead className="bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Department/Type</th>
                  <th className="px-4 py-3">Date Issued</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No invoices found for this criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {inv._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {inv.patient && typeof inv.patient === "object" ? inv.patient.name : "Walk-in"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="capitalize">{(inv as any).billingType || inv.items[0]?.category.toUpperCase() || "OP"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(inv.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        ₹{(inv.totals?.total ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[inv.status as keyof typeof STATUS_TONE] || "info"} className="w-36">{inv.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsInvoiceDetailsOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-navy-700 hover:bg-navy-50"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Add Inpatient Advance Payment/Refund */}
      <Modal
        title={advanceType === "advance" ? "Receive Advance Payment" : "Process Refund Entry"}
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
      >
        <form onSubmit={handlePostAdvance} className="space-y-4">
          <InputField
            label="Transaction Amount (₹)"
            type="number"
            value={advanceAmount || ""}
            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            min="1"
            required
          />

          <SelectField
            label="Payment Mode"
            value={advanceMethod}
            onChange={(e) => setAdvanceMethod(e.target.value)}
          >
            <option value="UPI">UPI / QR Scan</option>
            <option value="Cash">Cash Handover</option>
            <option value="Card">Credit/Debit Card Terminal</option>
            <option value="Net Banking">Net Banking</option>
            <option value="Cheque">Physical Cheque</option>
          </SelectField>

          <InputField
            label="Transaction ID / Reference Number"
            value={advanceTxId}
            onChange={(e) => setAdvanceTxId(e.target.value)}
            placeholder="e.g. Bank reference, bank trace number..."
          />

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowAdvanceModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={postPaymentMutation.isPending}>
              {postPaymentMutation.isPending ? "Processing..." : "Submit Transaction"}
            </Button>
          </div>
        </form>
      </Modal>



      {/* Modal: Invoice Print/Preview Details */}
      <Modal
        title="Invoice Details"
        isOpen={isInvoiceDetailsOpen}
        onClose={() => setIsInvoiceDetailsOpen(false)}
      >
        {selectedInvoice && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div id="invoice-print-area" className="space-y-4">
              <div className="flex justify-between border-b pb-4 items-center">
                <div className="flex items-center gap-3">
                  {hospitalData?.logoUrl ? (
                    <img src={hospitalData.logoUrl} alt={hospitalData.name} className="h-12 w-12 object-contain rounded bg-slate-50 p-0.5 border" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-navy-100 text-navy-700 font-bold text-lg">
                      {hospitalData?.name ? hospitalData.name.charAt(0).toUpperCase() : "H"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-navy-700">{hospitalData?.name || "HMS Enterprise"}</h3>
                    <p className="text-xs text-slate-500">Global Hospital Group Network</p>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-bold text-slate-800">GST INVOICE</h4>
                  <p className="text-xs font-mono text-slate-500">
                    ID: {selectedInvoice._id.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Date: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Patient / Insurance Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Billed To:</h5>
                  <p className="font-semibold text-slate-850">
                    {selectedInvoice.patient && typeof selectedInvoice.patient === "object" ? selectedInvoice.patient.name : "Walk-in"}
                  </p>
                  <p className="text-slate-500">
                    Phone: {selectedInvoice.patient && typeof selectedInvoice.patient === "object" ? selectedInvoice.patient.phone : "N/A"}
                  </p>
                  <p className="text-slate-500">
                    Status: <span className="capitalize">{selectedInvoice.patient && typeof selectedInvoice.patient === "object" ? selectedInvoice.patient.status : "OPD"}</span>
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Insurance / Coverage / Advance:</h5>
                  <p className="text-slate-700">
                    Mode: {selectedInvoice.paymentMode || "Cash"}
                  </p>
                  <p className="text-slate-700">
                    Coverage: {selectedInvoice.insuranceCoveragePercent ? `${(selectedInvoice.insuranceCoveragePercent ?? 0).toFixed(1)}%` : "0%"} Covered
                  </p>
                  <p className="text-slate-700">
                    Advance Settled: {selectedInvoice.advancePaid ? `₹${(selectedInvoice.advancePaid ?? 0).toFixed(2)}` : "None"}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="font-semibold text-slate-500 uppercase whitespace-nowrap">
                    <th className="py-2 px-1">Description</th>
                    <th className="py-2 px-1 text-center">Category</th>
                    <th className="py-2 px-1 text-center">Qty</th>
                    <th className="py-2 px-1 text-right">Price</th>
                    <th className="py-2 px-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items.map((item: any, i: number) => (
                    <tr key={i} className="text-slate-700">
                      <td className="py-2 px-1">{item.description}</td>
                      <td className="py-2 px-1 text-center uppercase text-[10px] text-slate-400">{item.category}</td>
                      <td className="py-2 px-1 text-center">{item.quantity}</td>
                      <td className="py-2 px-1 text-right">₹{(item.amount ?? 0).toFixed(2)}</td>
                      <td className="py-2 px-1 text-right font-medium">₹{((item.quantity ?? 0) * (item.amount ?? 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="border-t pt-4 flex flex-col items-end text-xs space-y-1.5">
                <div className="flex w-64 justify-between">
                  <span className="text-slate-500">Subtotal (Gross):</span>
                  <span className="font-semibold text-slate-800">₹{(selectedInvoice.totals?.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between">
                  <span className="text-slate-500">GST Tax ({selectedInvoice.taxRate || 0}%):</span>
                  <span className="font-semibold text-slate-800">₹{(selectedInvoice.totals?.taxAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex w-64 justify-between text-red-650 font-medium">
                  <span>Discounts Applied:</span>
                  <span>-₹{(selectedInvoice.totals?.discount ?? 0).toFixed(2)}</span>
                </div>
                {selectedInvoice.totals?.insuranceCovered > 0 && (
                  <div className="flex w-64 justify-between text-emerald-600 font-medium">
                    <span>Insurance Split Covered:</span>
                    <span>-₹{(selectedInvoice.totals?.insuranceCovered ?? 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedInvoice.advancePaid > 0 && (
                  <div className="flex w-64 justify-between text-blue-700 font-medium">
                    <span>Advance Payment Applied:</span>
                    <span>-₹{(selectedInvoice.advancePaid ?? 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex w-64 justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                  <span className="text-slate-800">Grand Total Net Payable:</span>
                  <span className="text-navy-700">₹{(selectedInvoice.totals?.patientBalance ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {/* QR Code and Authorized Signature */}
              <div className="border-t pt-4 flex justify-between items-center">
                <div className="flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
                      `HMS|INV|${selectedInvoice._id}|₹${selectedInvoice.totals.total}`
                    )}`}
                    alt="Verify Receipt QR Code"
                    className="h-16 w-16 object-contain"
                  />
                  <span className="text-[8px] text-slate-400 font-semibold mt-1">Scan to verify payment</span>
                </div>
                <div className="text-center w-40">
                  <div className="border-b border-slate-300 h-10"></div>
                  <span className="text-[10px] text-slate-450 block mt-1 font-semibold">Authorized Signature</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Authorized Invoice
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handlePrint}>
                  <Printer className="h-4 w-4" /> Print Bill
                </Button>
                <Button variant="primary" onClick={() => alert("Invoice downloaded as PDF successfully.")}>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Consolidated Patient Statement Printable View */}
      <Modal
        title={selectedVisitKey === "all" ? `Consolidated Billing Statement — ${selectedPatient?.name || "Patient"}` : `Visit Billing Statement (${activeVisitGroup?.displayDate}) — ${selectedPatient?.name || "Patient"}`}
        isOpen={isStatementPrintModalOpen}
        onClose={() => setIsStatementPrintModalOpen(false)}
      >
        {selectedPatient && (
          <div className="space-y-6">
            <div id="consolidated-patient-statement-print" className="space-y-4 p-2 bg-white">
              {/* Header */}
              <div className="flex justify-between border-b pb-4 items-center">
                <div className="flex items-center gap-3">
                  {hospitalData?.logoUrl ? (
                    <img src={hospitalData.logoUrl} alt={hospitalData.name} className="h-12 w-12 object-contain rounded bg-slate-50 p-0.5 border" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-navy-100 text-navy-700 font-bold text-lg">
                      {hospitalData?.name ? hospitalData.name.charAt(0).toUpperCase() : "H"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-navy-700">{hospitalData?.name || "HMS Enterprise"}</h3>
                    <p className="text-xs text-slate-500">
                      {selectedVisitKey === "all" ? "Consolidated Patient Billing Statement & Tax Receipt" : `Visit Billing Statement & Tax Receipt (${activeVisitGroup?.displayDate})`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h4 className="text-sm font-bold text-slate-800">
                    {selectedVisitKey === "all" ? "CONSOLIDATED STATEMENT" : "VISIT STATEMENT"}
                  </h4>
                  <p className="text-xs font-mono text-slate-500">
                    Date: {selectedVisitKey === "all" ? new Date().toLocaleDateString() : activeVisitGroup?.displayDate}
                  </p>
                </div>
              </div>

              {/* Patient Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Patient Information:</h5>
                  <p className="font-bold text-slate-800 text-sm">{selectedPatient.name}</p>
                  <p className="text-slate-600 font-mono font-semibold">UHID: {selectedPatient.uhid}</p>
                  <p className="text-slate-500">Mobile: {selectedPatient.phone || "N/A"}</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Demographics & Status:</h5>
                  <p className="text-slate-700">Age / Gender: {selectedPatient.age} Yrs / <span className="capitalize">{selectedPatient.gender}</span></p>
                  <p className="text-slate-700">Blood Group: {selectedPatient.bloodGroup || "N/A"}</p>
                  <p className="text-slate-700">Visit Session: <span className="capitalize font-semibold">{selectedVisitKey === "all" ? "All Visits (Full History)" : activeVisitGroup?.displayDate}</span></p>
                </div>
              </div>

              {/* Aggregated Line Items */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1">Detailed Particulars Ledger</h5>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-650 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2">Ref ID</th>
                      <th className="py-2 px-2">Dept / Type</th>
                      <th className="py-2 px-2">Line Particulars</th>
                      <th className="py-2 px-1 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Rate</th>
                      <th className="py-2 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedPatientInvoices.flatMap((inv: any) =>
                      inv.items.map((item: any, i: number) => (
                        <tr key={`${inv._id}-${i}`} className="text-slate-700">
                          <td className="py-2 px-2 text-[10px] text-slate-500">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                          <td className="py-2 px-2 font-mono text-[10px] text-slate-500">{inv._id.slice(-6).toUpperCase()}</td>
                          <td className="py-2 px-2 font-bold uppercase text-[9px] text-slate-600">{inv.billingType || "OP"}</td>
                          <td className="py-2 px-2 font-medium text-slate-800">{item.description}</td>
                          <td className="py-2 px-1 text-center">{item.quantity}</td>
                          <td className="py-2 px-2 text-right font-mono">{formatINR(item.amount)}</td>
                          <td className="py-2 px-2 text-right font-bold font-mono">{formatINR(item.quantity * item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Tally Box */}
              <div className="border-t pt-3 flex flex-col items-end text-xs space-y-1">
                <div className="flex w-64 justify-between text-slate-600">
                  <span>Gross Invoiced Charges:</span>
                  <span className="font-semibold">{formatINR(patientGross)}</span>
                </div>
                {patientTax > 0 && (
                  <div className="flex w-64 justify-between text-slate-600">
                    <span>GST & Service Taxes:</span>
                    <span className="font-semibold">+{formatINR(patientTax)}</span>
                  </div>
                )}
                {patientDiscount > 0 && (
                  <div className="flex w-64 justify-between text-red-600 font-medium">
                    <span>Total Discounts:</span>
                    <span>-{formatINR(patientDiscount)}</span>
                  </div>
                )}
                {patientInsurance > 0 && (
                  <div className="flex w-64 justify-between text-blue-600 font-medium">
                    <span>Insurance / TPA Split:</span>
                    <span>-{formatINR(patientInsurance)}</span>
                  </div>
                )}
                <div className="flex w-64 justify-between text-emerald-700 font-medium">
                  <span>Total Amount Settled:</span>
                  <span>{formatINR(patientTotalPaid)}</span>
                </div>
                <div className="flex w-64 justify-between text-sm font-bold border-t border-slate-300 pt-1.5 mt-1">
                  <span className="text-slate-800">Net Outstanding Balance:</span>
                  <span className={patientBalanceDue > 0 ? "text-red-600" : "text-emerald-700"}>
                    {formatINR(patientBalanceDue)}
                  </span>
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="border-t pt-6 flex justify-between items-center">
                <div className="flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
                      `HMS|STATEMENT|${selectedPatient.uhid}|₹${patientTotalNet}`
                    )}`}
                    alt="Verify Statement QR"
                    className="h-16 w-16 object-contain"
                  />
                  <span className="text-[8px] text-slate-400 font-semibold mt-1">Scan to verify statement</span>
                </div>
                <div className="text-center w-48">
                  <div className="border-b border-slate-400 h-10"></div>
                  <span className="text-[10px] text-slate-500 block mt-1 font-bold">Authorized Accountant Signature</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Official Hospital Statement
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsStatementPrintModalOpen(false)}>
                  Close
                </Button>
                <Button variant="primary" onClick={handlePrint} className="bg-navy-700 hover:bg-navy-800 text-white font-bold">
                  <Printer className="h-4 w-4" /> Print {selectedVisitKey === "all" ? "Consolidated Statement" : "Visit Bill"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
