import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, AlertCircle, TrendingUp, Users, IndianRupee,
  Search, Filter, Download, Phone, Mail, MessageSquare,
  Eye, Printer, CreditCard, Clock, Calendar, ChevronDown,
  X, RefreshCw, ChevronLeft, ChevronRight, FileText,
  CheckCircle2, ArrowUpRight, BanknoteIcon
} from "lucide-react";
import { usePendingOverdue, PendingOverdueItem } from "../../features/invoices";
import { useDepartments } from "../../features/departments";
import { useDoctors } from "../../features/doctors";
import { useBranches } from "../../features/branches";
import { formatINR } from "../../lib/currency";
import { Badge } from "../../components/ui/Badge";
import { socket } from "../../lib/socket";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_CONFIG = {
  pending: { tone: "warning" as const, label: "Pending", bg: "bg-amber-50 border-amber-200 text-amber-800" },
  partially_paid: { tone: "info" as const, label: "Partial", bg: "bg-blue-50 border-blue-200 text-blue-800" },
  overdue: { tone: "danger" as const, label: "Overdue", bg: "bg-red-50 border-red-200 text-red-800" },
};

const BILLING_TYPE_LABELS: Record<string, string> = {
  OP: "OP Consultation",
  IP: "IP Admission",
  PHARMACY: "Pharmacy",
  LAB: "Laboratory",
  RADIOLOGY: "Radiology",
  SURGERY: "Surgery",
  EMERGENCY: "Emergency",
  OTHER: "Other",
};

function SummaryKpi({ label, value, sub, icon, accentClass }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accentClass: string;
}) {
  return (
    <div className={`relative bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-4 overflow-hidden`}>
      <div className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${accentClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-black text-slate-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function PatientSidePanel({ item, onClose }: { item: PendingOverdueItem; onClose: () => void }) {
  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black">{item.patient?.name || "Patient"}</h2>
              <p className="text-xs font-mono text-slate-300 mt-0.5">UHID: {item.patient?.uhid}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-slate-300">Mobile</p>
              <p className="font-semibold text-white">{item.patient?.phone || "N/A"}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="text-slate-300">Age / Gender</p>
              <p className="font-semibold text-white capitalize">{item.patient?.age} / {item.patient?.gender}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status */}
          <div className={`border rounded-xl p-3 ${statusConf.bg}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Payment Status: {statusConf.label}</p>
                {item.daysOverdue > 0 && (
                  <p className="text-xs mt-0.5">{item.daysOverdue} days past due date</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Details</h3>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
              <Row label="Invoice No" value={`#${item.invoiceNo}`} mono />
              <Row label="Invoice Type" value={BILLING_TYPE_LABELS[item.billingType] || item.billingType} />
              <Row label="Issued On" value={new Date(item.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
              {item.dueDate && <Row label="Due Date" value={new Date(item.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />}
              {item.doctor && <Row label="Doctor" value={item.doctor.name} />}
              {item.department && <Row label="Department" value={item.department.name} />}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Summary</h3>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
              <Row label="Total Bill" value={formatINR(item.totals?.total || 0)} bold />
              <Row label="Amount Paid" value={formatINR(item.amountPaid)} color="text-emerald-600" />
              <Row label="Pending Amount" value={formatINR(item.pendingAmount)} color="text-red-600 font-black" bold />
              {item.totals?.insuranceCovered > 0 && (
                <Row label="Insurance Covered" value={formatINR(item.totals.insuranceCovered)} color="text-blue-600" />
              )}
            </div>
          </div>

          {/* Payment Timeline */}
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Timeline</h3>
            <div className="relative pl-5 border-l-2 border-slate-200 space-y-3 py-2">
              <TimelineEvent
                icon={<FileText className="h-3 w-3" />}
                label="Invoice Generated"
                date={new Date(item.issuedAt).toLocaleDateString("en-IN")}
                color="bg-slate-400"
              />
              {item.amountPaid > 0 && (
                <TimelineEvent
                  icon={<CheckCircle2 className="h-3 w-3" />}
                  label={`Partial Payment: ${formatINR(item.amountPaid)}`}
                  date="Received"
                  color="bg-emerald-500"
                />
              )}
              {item.dueDate && (
                <TimelineEvent
                  icon={<Calendar className="h-3 w-3" />}
                  label={`Due Date: ${formatINR(item.pendingAmount)} outstanding`}
                  date={new Date(item.dueDate).toLocaleDateString("en-IN")}
                  color={item.daysOverdue > 0 ? "bg-red-500" : "bg-amber-500"}
                />
              )}
              {item.daysOverdue > 0 && (
                <TimelineEvent
                  icon={<AlertTriangle className="h-3 w-3" />}
                  label={`${item.daysOverdue} Days Overdue`}
                  date="Today"
                  color="bg-red-600"
                />
              )}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t bg-slate-50 grid grid-cols-2 gap-2">
          <Link
            to={`/admin/finance/invoices/${item._id}`}
            className="flex items-center justify-center gap-1.5 bg-navy-700 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-navy-800 transition col-span-2"
          >
            <Eye className="h-4 w-4" /> View Full Invoice
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-300 transition"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <a
            href={`tel:${item.patient?.phone}`}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition"
          >
            <Phone className="h-3.5 w-3.5" /> Call Patient
          </a>
          <a
            href={`mailto:?subject=Payment Reminder - ${item.patient?.name}&body=Dear ${item.patient?.name},%0A%0AYou have a pending payment of ${formatINR(item.pendingAmount)} for Invoice #${item.invoiceNo}.%0A%0APlease contact us to settle the dues.%0A%0AThank you.`}
            className="flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-blue-700 transition"
          >
            <Mail className="h-3.5 w-3.5" /> Email Reminder
          </a>
          <a
            href={`https://wa.me/${(item.patient?.phone || "").replace(/\D/g, "")}?text=Dear ${encodeURIComponent(item.patient?.name || "Patient")}, you have a pending payment of ${encodeURIComponent(formatINR(item.pendingAmount))} for Invoice %23${item.invoiceNo}. Please visit the hospital to settle your dues.`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 bg-green-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-green-600 transition"
          >
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, bold, color }: { label: string; value: string; mono?: boolean; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-xs ${mono ? "font-mono" : ""} ${bold ? "font-bold" : "font-medium"} ${color || "text-slate-800"}`}>{value}</span>
    </div>
  );
}

function TimelineEvent({ icon, label, date, color }: { icon: React.ReactNode; label: string; date: string; color: string }) {
  return (
    <div className="relative flex items-start gap-2">
      <div className={`absolute -left-[1.35rem] h-5 w-5 rounded-full ${color} flex items-center justify-center text-white flex-shrink-0`}>
        {icon}
      </div>
      <div className="pl-1">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-400">{date}</p>
      </div>
    </div>
  );
}

export function PendingOverduePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [uhid, setUhid] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedUhid, setDebouncedUhid] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");
  const [billingType, setBillingType] = useState("");
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [selectedItem, setSelectedItem] = useState<PendingOverdueItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedUhid(uhid);
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search, uhid]);

  const { data, isLoading, isError, refetch } = usePendingOverdue({
    page, limit: 20,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    department: department || undefined,
    doctor: doctor || undefined,
    billingType: billingType || undefined,
    status: status || undefined,
    branch: branch || undefined,
    search: debouncedSearch || undefined,
    uhid: debouncedUhid || undefined,
  });

  const { data: deptsData } = useDepartments({ activeOnly: true });
  const { data: doctorsData } = useDoctors({}, { enabled: true });
  const { data: branchesData } = useBranches({});

  // Real-time sync
  useEffect(() => {
    const reload = () => queryClient.invalidateQueries({ queryKey: ["invoices", "pending-overdue"] });
    socket.on("billing_updated", reload);
    socket.on("dashboard_update", reload);
    socket.on("ip_billing_update", reload);
    return () => {
      socket.off("billing_updated", reload);
      socket.off("dashboard_update", reload);
      socket.off("ip_billing_update", reload);
    };
  }, [queryClient]);

  const summary = data?.summary;
  const items = data?.data || [];
  const pagination = data?.pagination;

  const hasActiveFilters = !!(dateFrom || dateTo || department || doctor || billingType || status || branch || search || uhid);

  const clearFilters = () => {
    setDateFrom(""); setDateTo(""); setDepartment(""); setDoctor("");
    setBillingType(""); setStatus(""); setBranch(""); setSearch(""); setUhid("");
    setPage(1);
  };

  const exportCSV = () => {
    if (!items.length) return;
    const headers = ["Invoice No", "UHID", "Patient Name", "Mobile", "Department", "Doctor", "Invoice Type", "Total Bill", "Amount Paid", "Pending Amount", "Due Date", "Days Overdue", "Status"];
    const rows = items.map(i => [
      i.invoiceNo, i.patient?.uhid, i.patient?.name, i.patient?.phone,
      i.department?.name || "", i.doctor?.name || "",
      BILLING_TYPE_LABELS[i.billingType] || i.billingType,
      i.totals?.total, i.amountPaid, i.pendingAmount,
      i.dueDate ? new Date(i.dueDate).toLocaleDateString("en-IN") : "",
      i.daysOverdue, i.status
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pending_report_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Pending & Overdue Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time tracking of all unpaid and overdue patient invoices.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 px-3 py-2 rounded-lg transition shadow"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryKpi
          label="Pending Patients"
          value={String(summary?.pendingPatients ?? "—")}
          sub="Unique patients with dues"
          icon={<Users className="h-5 w-5 text-violet-600" />}
          accentClass="bg-violet-50 text-violet-600"
        />
        <SummaryKpi
          label="Total Pending"
          value={summary ? formatINR(summary.totalPendingAmount) : "—"}
          sub="All unpaid balances"
          icon={<IndianRupee className="h-5 w-5 text-amber-600" />}
          accentClass="bg-amber-50 text-amber-600"
        />
        <SummaryKpi
          label="Overdue Amount"
          value={summary ? formatINR(summary.overdueAmount) : "—"}
          sub="Past due date"
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
          accentClass="bg-red-50 text-red-600"
        />
        <SummaryKpi
          label="Today's Collections"
          value={summary ? formatINR(summary.todayCollection) : "—"}
          sub={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          icon={<BanknoteIcon className="h-5 w-5 text-emerald-600" />}
          accentClass="bg-emerald-50 text-emerald-600"
        />
        <SummaryKpi
          label="This Month"
          value={summary ? formatINR(summary.monthCollection) : "—"}
          sub={new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          accentClass="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Patient Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none bg-slate-50"
            />
          </div>
          {/* UHID Search */}
          <div className="relative w-40">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="UHID..."
              value={uhid}
              onChange={e => setUhid(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none bg-slate-50"
            />
          </div>
          {/* Status filter */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:border-navy-500 outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          {/* Billing Type */}
          <select
            value={billingType}
            onChange={e => { setBillingType(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:border-navy-500 outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(BILLING_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 py-2 px-3 text-sm font-semibold rounded-xl border transition ${showFilters ? "bg-navy-50 border-navy-300 text-navy-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
          >
            <Filter className="h-4 w-4" /> Filters
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 py-2 px-3 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Date From</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:border-navy-500 outline-none bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Date To</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:border-navy-500 outline-none bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Department</label>
              <select value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-navy-500 outline-none">
                <option value="">All Departments</option>
                {(deptsData || []).map((d: any) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Doctor</label>
              <select value={doctor} onChange={e => { setDoctor(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-navy-500 outline-none">
                <option value="">All Doctors</option>
                {(doctorsData?.data || []).map((d: any) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Branch</label>
              <select value={branch} onChange={e => { setBranch(e.target.value); setPage(1); }}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-navy-500 outline-none">
                <option value="">All Branches</option>
                {(branchesData?.data || []).map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm font-semibold">Loading pending invoices...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-sm font-bold text-slate-700">Failed to load pending invoices</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">An error occurred while fetching invoice records.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 rounded-xl transition"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-3" />
            <p className="text-sm font-bold text-slate-600">No Pending Invoices</p>
            <p className="text-xs text-slate-400 mt-1">All invoices are cleared! No pending or overdue records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Total Bill</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Overdue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const conf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-50 transition cursor-pointer ${item.status === "overdue" ? "bg-red-50/40" : ""}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-700">#{item.invoiceNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                            {item.patient?.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{item.patient?.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.patient?.uhid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.patient?.phone || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.department?.name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{item.doctor?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                          {BILLING_TYPE_LABELS[item.billingType] || item.billingType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-800">
                        {formatINR(item.totals?.total || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-600">
                        {formatINR(item.amountPaid)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-black text-red-600">
                        {formatINR(item.pendingAmount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.dueDate
                          ? new Date(item.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.daysOverdue > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" /> {item.daysOverdue}d
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Badge tone={conf.tone}>{conf.label}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            title="View Details"
                            onClick={() => setSelectedItem(item)}
                            className="p-1.5 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            to={`/admin/finance/invoices/${item._id}`}
                            title="View Invoice"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                          <a
                            href={`https://wa.me/${(item.patient?.phone || "").replace(/\D/g, "")}?text=Dear ${encodeURIComponent(item.patient?.name || "Patient")}, you have a pending payment of ${encodeURIComponent(formatINR(item.pendingAmount))} for Invoice %23${item.invoiceNo}. Please visit the hospital to settle your dues.`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp Reminder"
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                          <button
                            title="Collect Payment"
                            onClick={() => setSelectedItem(item)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of <span className="font-bold">{pagination.total}</span> invoices
            </p>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4)) + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${pg === pagination.page ? "bg-navy-700 text-white border-navy-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Side Panel */}
      {selectedItem && (
        <PatientSidePanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.25s ease-out; }
      `}</style>
    </div>
  );
}
