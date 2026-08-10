import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Receipt, 
  AlertCircle, 
  TrendingUp, 
  Printer, 
  FileText, 
  CheckCircle, 
  Search, 
  User, 
  Calendar 
} from "lucide-react";
import { useInvoices } from "../../features/invoices";
import { usePatients } from "../../features/patients";
import { useMyHospital } from "../../features/hospitals";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Invoice } from "../../types/domain";
import { formatINR } from "../../lib/currency";
import { PendingOverduePage } from "./PendingOverduePage";

const STATUS_TONE = { pending: "warning", partially_paid: "info", paid: "success", overdue: "danger" } as const;

interface VisitGroup {
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
}

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "pending" | "statement">("overview");

  // Invoices & Overview state
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, isLoading } = useInvoices({ page, status: status || undefined });
  const { data: hospitalData } = useMyHospital();

  // Patient Consolidated Statement state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedVisitKey, setSelectedVisitKey] = useState<string>("all");
  const [isStatementPrintModalOpen, setIsStatementPrintModalOpen] = useState(false);

  const { data: searchedPatientsData, isLoading: searchingPatients } = usePatients({ search: patientSearchQuery });
  const { data: patientInvoicesData, isLoading: loadingPatientInvoices } = useInvoices({ 
    patient: selectedPatient?._id, 
    limit: 1000 
  });

  // Quick-select recent patients with billing history from overview invoices list
  const recentPatientsMap = new Map<string, any>();
  (data?.data || []).forEach((inv: any) => {
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
  const groupInvoicesByVisit = (invoices: any[]): VisitGroup[] => {
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

    const visitGroups: VisitGroup[] = [];

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

  function getInvoiceReason(inv: any): string {
    if (inv.reason && typeof inv.reason === "string" && inv.reason.trim()) {
      return inv.reason;
    }
    if (inv.notes && typeof inv.notes === "string" && inv.notes.trim()) {
      return inv.notes;
    }
    if (inv.description && typeof inv.description === "string" && inv.description.trim()) {
      return inv.description;
    }
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      const descs = inv.items.map((i: any) => i.description || i.name).filter(Boolean);
      if (descs.length > 0) return descs.join(", ");
    }
    const type = inv.billingType || inv.type || "OP";
    switch (String(type).toUpperCase()) {
      case "OP":
      case "OPD":
      case "CONSULTATION":
        return "OPD Consultation Fee";
      case "LAB":
      case "LABORATORY":
        return "Laboratory Diagnostics";
      case "RADIOLOGY":
      case "SCAN":
        return "Radiology & Imaging Scan";
      case "PHARMACY":
      case "MEDICINE":
        return "Pharmacy Medicines";
      case "IP":
      case "IPD":
        return "IPD Hospitalization";
      default:
        return `${type} Service`;
    }
  }

  // Standard columns for All Invoices view
  const columns: Column<Invoice>[] = [
    { header: "Invoice", render: (inv) => <span className="font-mono text-xs text-slate-500">#{inv._id.slice(-8).toUpperCase()}</span> },
    { header: "Patient", render: (inv) => <span className="font-medium text-slate-700">{inv.patient && typeof inv.patient === "object" ? inv.patient.name : "Walk-in Patient"}</span> },
    {
      header: "Reason",
      render: (inv) => (
        <span className="text-xs font-semibold text-slate-700 max-w-[200px] truncate block" title={getInvoiceReason(inv)}>
          {getInvoiceReason(inv)}
        </span>
      ),
    },
    { header: "Date Issued", render: (inv) => <span className="text-slate-600">{new Date(inv.issuedAt).toLocaleDateString()}</span> },
    { header: "Amount", render: (inv) => <span className="font-semibold text-slate-800">₹{(inv.totals?.total ?? 0).toFixed(2)}</span> },
    { header: "Status", render: (inv) => <Badge tone={STATUS_TONE[inv.status]}>{inv.status.replace("_", " ")}</Badge> },
    {
      header: "Actions",
      render: (inv) => (
        <Link to={`/admin/finance/invoices/${inv._id}`} className="text-sm font-medium text-navy-700 hover:underline">
          View
        </Link>
      ),
    },
  ];

  // Pending-specific columns: show UHID, Billing Reason, Total, Paid, Remaining (red), Due Date, Status
  const pendingColumns: Column<Invoice>[] = [
    { header: "Invoice No", render: (inv) => <span className="font-mono text-xs font-bold text-slate-700">#{inv._id.slice(-8).toUpperCase()}</span> },
    {
      header: "Patient",
      render: (inv) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{inv.patient && typeof inv.patient === "object" ? (inv.patient as any).name : "Walk-in"}</p>
          <p className="text-[10px] font-mono text-slate-400">{inv.patient && typeof inv.patient === "object" ? (inv.patient as any).uhid : ""}</p>
        </div>
      ),
    },
    {
      header: "Billing Reason",
      render: (inv) => (
        <span className="text-xs text-slate-600 max-w-[180px] truncate block" title={getInvoiceReason(inv)}>
          {getInvoiceReason(inv)}
        </span>
      ),
    },
    { header: "Total Bill", render: (inv) => <span className="font-semibold text-slate-800 font-mono text-xs">₹{(inv.totals?.total ?? 0).toFixed(2)}</span> },
    { header: "Amount Paid", render: (inv) => <span className="font-semibold text-emerald-600 font-mono text-xs">₹{((inv as any).amountPaid ?? 0).toFixed(2)}</span> },
    {
      header: "Remaining",
      render: (inv) => (
        <span className="font-black text-red-600 font-mono text-xs bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
          ₹{(inv.totals?.patientBalance ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Due Date",
      render: (inv) => (
        <span className="text-xs text-slate-500">
          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
        </span>
      ),
    },
    { header: "Status", render: (inv) => <Badge tone={STATUS_TONE[inv.status]}>{inv.status.replace("_", " ")}</Badge> },
    {
      header: "View",
      render: (inv) => (
        <Link to={`/admin/finance/invoices/${inv._id}`} className="inline-flex items-center gap-1 text-xs font-bold text-navy-700 hover:underline">
          View Invoice
        </Link>
      ),
    },
  ];


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs Navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revenue Analytics</h1>
          <p className="text-sm text-slate-500">Real revenue, billing overview, and consolidated patient statements.</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-navy-700 text-navy-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          All Invoices Overview
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "pending"
              ? "border-amber-500 text-amber-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <AlertCircle className="h-4 w-4" /> Pending &amp; Overdue
          {data?.counts?.pendingCount != null && data.counts.pendingCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {data.counts.pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("statement")}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition-all whitespace-nowrap ${
            activeTab === "statement"
              ? "border-navy-700 text-navy-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Patient Consolidated Statement
        </button>
      </div>

      {/* Tab 1: All Invoices Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Total Billing" value={`₹${(data?.counts.totalBilling ?? 0).toFixed(2)}`} icon={<Receipt className="h-5 w-5" />} emphasis />
            <KpiCard label="Net Revenue (Paid)" value={`₹${(data?.counts.netRevenue ?? 0).toFixed(2)}`} icon={<TrendingUp className="h-5 w-5" />} />
            <KpiCard label="Pending / Overdue" value={data?.counts.pendingCount ?? 0} icon={<AlertCircle className="h-5 w-5" />} />
          </div>

          <Card>
            {/* Status filter tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {(["", "pending", "partially_paid", "paid", "overdue"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    status === s
                      ? s === "pending"
                        ? "bg-amber-50 text-amber-700 font-bold border border-amber-300"
                        : "bg-navy-50 text-navy-700 font-bold"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {s === "" ? "All Invoices"
                    : s === "pending" ? "Pending (All Unpaid)"
                    : s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Pending info banner */}
            {status === "pending" && (
              <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                <span>
                  <strong>Pending (All Unpaid)</strong> — shows every invoice where the patient still has an outstanding balance,
                  including <strong>Pending</strong>, <strong>Partially Paid</strong>, and <strong>Overdue</strong> invoices.
                  Sorted by remaining balance.
                </span>
              </div>
            )}

            <DataTable
              columns={status === "pending" ? pendingColumns : columns}
              rows={data?.data ?? []}
              rowKey={(inv) => inv._id}
              emptyMessage={isLoading ? "Loading..." : status === "pending" ? "No outstanding invoices. All balances are cleared! ✓" : "No invoices yet."}
            />

            <div className="mt-4 flex justify-end">
              <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Pending & Overdue */}
      {activeTab === "pending" && <PendingOverduePage />}

      {/* Tab 3: Patient Consolidated Statement */}
      {activeTab === "statement" && (
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
                  <Button variant="secondary" onClick={() => { setSelectedPatient(null); setSelectedVisitKey("all"); }} className="text-xs py-1.5">
                    Select Different Patient
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setIsStatementPrintModalOpen(true)}
                    className="text-xs py-1.5 flex items-center gap-1 bg-navy-700 hover:bg-navy-800 text-white font-bold"
                  >
                    <Printer className="h-4 w-4" /> {selectedVisitKey === "all" ? "Print Consolidated Statement" : `Print ${activeVisitGroup?.displayDate} Visit Bill`}
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
                          setSelectedVisitKey("all");
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
                      onClick={() => {
                        setSelectedPatient(p);
                        setSelectedVisitKey("all");
                      }}
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
      )}

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
                  <span className="text-[10px] text-slate-500 block mt-1 font-bold">Authorized Administrator Signature</span>
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
