import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  Receipt,
  AlertCircle,
  FileText,
  Search,
  User,
  Calendar,
  RefreshCw,
  Download,
  Building2,
  Stethoscope,
  Pill,
  Radio,
  FlaskConical,
  Filter,
  CalendarDays,
  ListFilter,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  X,
  IndianRupee,
  Layers
} from "lucide-react";
import { useInvoices } from "../../features/invoices";
import { usePatients } from "../../features/patients";
import { useMyHospital } from "../../features/hospitals";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { formatINR } from "../../lib/currency";
import { exportToExcel } from "../../lib/excelUtils";
import { PendingOverduePage } from "./PendingOverduePage";

const STATUS_TONE = {
  pending: "warning",
  partially_paid: "info",
  paid: "success",
  overdue: "danger"
} as const;

type BillingStreamKey = "ALL" | "IP" | "OP" | "PHARMACY" | "RADIOLOGY" | "LAB" | "PENDING" | "STATEMENT";

interface DayWiseGroup {
  dateKey: string;
  displayDate: string;
  dayName: string;
  invoicesCount: number;
  streamCounts: Record<string, number>;
  grossTotal: number;
  discountTotal: number;
  netRevenue: number;
  balanceDue: number;
  invoices: any[];
}

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
  const queryClient = useQueryClient();

  // Active Main Navigation Stream
  const [activeStream, setActiveStream] = useState<BillingStreamKey>("ALL");

  // View Mode: Detailed Bills vs Day-Wise Summary
  const [viewMode, setViewMode] = useState<"detailed" | "day_wise">("detailed");

  // Filter States (Clean & Simple)
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "last7" | "this_month" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination for Detailed Bills
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Day Drilldown Filter (when user inspects a specific day from day-wise view)
  const [selectedDayDrilldown, setSelectedDayDrilldown] = useState<string | null>(null);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Single invoice receipt modal
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);

  // Hospital profile
  const { data: hospitalData } = useMyHospital();

  // Query Invoices across all streams
  const { data: invoicesData, isLoading } = useInvoices({
    limit: 1000
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Billing records refreshed!", { id: "finance-refresh" });
    } catch {
      toast.error("Failed to refresh records.", { id: "finance-refresh-err" });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper for invoice description/reason
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
        return "OPD Consultation & Care";
      case "IP":
        return "Inpatient Ward Stay & Treatment";
      case "PHARMACY":
        return "Pharmacy Prescription Dispensary";
      case "RADIOLOGY":
        return "Radiology / Imaging Diagnostics";
      case "LAB":
        return "Laboratory Diagnostics & Pathology";
      default:
        return `${type} Hospital Service`;
    }
  }

  // Raw combined invoices list
  const allRawInvoices = useMemo(() => invoicesData?.data ?? [], [invoicesData]);

  // Stream counts & live subtotals
  const streamStats = useMemo(() => {
    const stats = {
      ALL: { count: 0, revenue: 0 },
      IP: { count: 0, revenue: 0 },
      OP: { count: 0, revenue: 0 },
      PHARMACY: { count: 0, revenue: 0 },
      RADIOLOGY: { count: 0, revenue: 0 },
      LAB: { count: 0, revenue: 0 },
      PENDING: { count: 0, balance: 0 },
    };

    allRawInvoices.forEach((inv: any) => {
      const type = (inv.billingType || "OP").toUpperCase();
      const net = inv.totals?.total || 0;
      const balance = inv.totals?.patientBalance || 0;

      stats.ALL.count += 1;
      stats.ALL.revenue += net;

      if (type === "IP") {
        stats.IP.count += 1;
        stats.IP.revenue += net;
      } else if (type === "OP") {
        stats.OP.count += 1;
        stats.OP.revenue += net;
      } else if (type === "PHARMACY") {
        stats.PHARMACY.count += 1;
        stats.PHARMACY.revenue += net;
      } else if (type === "RADIOLOGY") {
        stats.RADIOLOGY.count += 1;
        stats.RADIOLOGY.revenue += net;
      } else if (type === "LAB") {
        stats.LAB.count += 1;
        stats.LAB.revenue += net;
      }

      if (balance > 0 || inv.status === "pending" || inv.status === "partially_paid" || inv.status === "overdue") {
        stats.PENDING.count += 1;
        stats.PENDING.balance += balance;
      }
    });

    return stats;
  }, [allRawInvoices]);

  // Date Presets Calculation helper
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfLast7 = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Filtered invoices according to activeStream, datePreset, statusFilter, search, and drilldown
  const filteredInvoices = useMemo(() => {
    return allRawInvoices.filter((inv: any) => {
      const type = (inv.billingType || "OP").toUpperCase();
      const status = inv.status || "pending";
      const balance = inv.totals?.patientBalance || 0;

      // 1. Stream Filter
      if (activeStream === "IP" && type !== "IP") return false;
      if (activeStream === "OP" && type !== "OP") return false;
      if (activeStream === "PHARMACY" && type !== "PHARMACY") return false;
      if (activeStream === "RADIOLOGY" && type !== "RADIOLOGY") return false;
      if (activeStream === "LAB" && type !== "LAB") return false;
      if (activeStream === "PENDING" && balance <= 0 && status === "paid") return false;

      // 2. Day Drilldown Filter
      const invDate = new Date(inv.issuedAt || inv.createdAt);
      const invDateKey = !isNaN(invDate.getTime()) ? invDate.toISOString().split("T")[0] : "unknown";
      if (selectedDayDrilldown && invDateKey !== selectedDayDrilldown) {
        return false;
      }

      // 3. Date Preset Filter
      if (datePreset !== "all") {
        if (datePreset === "today" && invDate < startOfToday) return false;
        if (datePreset === "yesterday" && (invDate < startOfYesterday || invDate >= startOfToday)) return false;
        if (datePreset === "last7" && invDate < startOfLast7) return false;
        if (datePreset === "this_month" && invDate < startOfThisMonth) return false;
        if (datePreset === "custom") {
          if (customStartDate && invDateKey < customStartDate) return false;
          if (customEndDate && invDateKey > customEndDate) return false;
        }
      }

      // 4. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          if (status !== "pending" && balance <= 0) return false;
        } else if (statusFilter === "paid") {
          if (status !== "paid" || balance > 0) return false;
        } else if (statusFilter === "partially_paid") {
          if (status !== "partially_paid") return false;
        } else if (statusFilter === "overdue") {
          if (status !== "overdue") return false;
        }
      }

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = typeof inv.patient === "object" ? inv.patient?.name || "" : "";
        const pUhid = typeof inv.patient === "object" ? inv.patient?.uhid || "" : "";
        const invId = (inv._id || "").toLowerCase();
        const reason = getInvoiceReason(inv).toLowerCase();
        const streamStr = type.toLowerCase();

        if (
          !pName.toLowerCase().includes(q) &&
          !pUhid.toLowerCase().includes(q) &&
          !invId.includes(q) &&
          !reason.includes(q) &&
          !streamStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    allRawInvoices,
    activeStream,
    selectedDayDrilldown,
    datePreset,
    customStartDate,
    customEndDate,
    statusFilter,
    searchQuery,
    startOfToday,
    startOfYesterday,
    startOfLast7,
    startOfThisMonth
  ]);

  // Aggregate Day-Wise Summary
  const dayWiseGroups = useMemo<DayWiseGroup[]>(() => {
    const map = new Map<string, any[]>();

    filteredInvoices.forEach((inv: any) => {
      const d = new Date(inv.issuedAt || inv.createdAt);
      const dateKey = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "Undated";
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(inv);
    });

    const groups: DayWiseGroup[] = [];

    map.forEach((invs, dateKey) => {
      const dateObj = dateKey === "Undated" ? null : new Date(dateKey + "T00:00:00");
      const displayDate = dateObj
        ? dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "Undated Records";
      const dayName = dateObj ? dateObj.toLocaleDateString("en-IN", { weekday: "short" }) : "—";

      const streamCounts: Record<string, number> = {};
      let grossTotal = 0;
      let discountTotal = 0;
      let netRevenue = 0;
      let balanceDue = 0;

      invs.forEach((inv: any) => {
        const type = (inv.billingType || "OP").toUpperCase();
        streamCounts[type] = (streamCounts[type] || 0) + 1;

        const sub = inv.totals?.subtotal || inv.totals?.total || 0;
        const disc = inv.totals?.discount || 0;
        const total = inv.totals?.total || 0;
        const bal = inv.totals?.patientBalance || 0;
        const paid = Math.max(0, total - (inv.totals?.insuranceCovered || 0) - bal);

        grossTotal += sub;
        discountTotal += disc;
        netRevenue += paid;
        balanceDue += bal;
      });

      groups.push({
        dateKey,
        displayDate,
        dayName,
        invoicesCount: invs.length,
        streamCounts,
        grossTotal,
        discountTotal,
        netRevenue,
        balanceDue,
        invoices: invs,
      });
    });

    groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return groups;
  }, [filteredInvoices]);

  // Financial tallies
  const activeTallies = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let net = 0;
    let collected = 0;
    let balance = 0;

    filteredInvoices.forEach((inv: any) => {
      const sub = inv.totals?.subtotal || inv.totals?.total || 0;
      const disc = inv.totals?.discount || 0;
      const total = inv.totals?.total || 0;
      const bal = inv.totals?.patientBalance || 0;
      const paid = Math.max(0, total - (inv.totals?.insuranceCovered || 0) - bal);

      gross += sub;
      discount += disc;
      net += total;
      collected += paid;
      balance += bal;
    });

    return {
      count: filteredInvoices.length,
      gross,
      discount,
      net,
      collected,
      balance,
    };
  }, [filteredInvoices]);

  // Paginated detailed invoices
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, page]);

  // Reset page helper
  const handleFilterChange = () => {
    setPage(1);
  };

  const hasActiveFilters = datePreset !== "all" || statusFilter !== "all" || searchQuery.trim() !== "" || selectedDayDrilldown !== null;

  const handleClearAllFilters = () => {
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setStatusFilter("all");
    setSearchQuery("");
    setSelectedDayDrilldown(null);
    setPage(1);
  };

  // Export handler
  const handleExport = () => {
    const todayStr = new Date().toISOString().split("T")[0];

    if (viewMode === "day_wise") {
      const headers = [
        "Date",
        "Day of Week",
        "Total Invoices",
        "Streams Breakdown",
        "Gross Billed (INR)",
        "Discounts (INR)",
        "Net Collected / Paid (INR)",
        "Outstanding Balance (INR)",
        "Collection Rate (%)"
      ];

      const rows = dayWiseGroups.map((g) => {
        const streamBreakdown = Object.entries(g.streamCounts)
          .map(([type, count]) => `${type}: ${count}`)
          .join(", ");
        const collectionRate = g.grossTotal > 0 ? Math.round((g.netRevenue / g.grossTotal) * 100) : 100;

        return [
          g.displayDate,
          g.dayName,
          g.invoicesCount,
          streamBreakdown,
          g.grossTotal.toFixed(2),
          g.discountTotal.toFixed(2),
          g.netRevenue.toFixed(2),
          g.balanceDue.toFixed(2),
          `${collectionRate}%`
        ];
      });

      exportToExcel(`HMS_DayWise_Revenue_Report_${todayStr}`, headers, rows);
    } else {
      const headers = [
        "Invoice No",
        "Date Issued",
        "Patient Name",
        "UHID",
        "Billing Stream",
        "Service Particulars / Reason",
        "Payment Mode",
        "Subtotal (INR)",
        "Discount (INR)",
        "Tax Amount (INR)",
        "Insurance Split (INR)",
        "Total Amount (INR)",
        "Net Paid (INR)",
        "Balance Due (INR)",
        "Status"
      ];

      const rows = filteredInvoices.map((inv: any) => {
        const pName = typeof inv.patient === "object" ? inv.patient?.name || "Walk-in" : "Walk-in";
        const pUhid = typeof inv.patient === "object" ? inv.patient?.uhid || "—" : "—";
        const invNo = `#${inv._id.slice(-8).toUpperCase()}`;
        const dateStr = new Date(inv.issuedAt || inv.createdAt).toLocaleDateString("en-IN");
        const stream = (inv.billingType || "OP").toUpperCase();
        const reason = getInvoiceReason(inv);
        const sub = (inv.totals?.subtotal || inv.totals?.total || 0).toFixed(2);
        const disc = (inv.totals?.discount || 0).toFixed(2);
        const tax = (inv.totals?.taxAmount || 0).toFixed(2);
        const ins = (inv.totals?.insuranceCovered || 0).toFixed(2);
        const total = (inv.totals?.total || 0).toFixed(2);
        const bal = (inv.totals?.patientBalance || 0);
        const paid = Math.max(0, (inv.totals?.total || 0) - (inv.totals?.insuranceCovered || 0) - bal).toFixed(2);

        return [
          invNo,
          dateStr,
          pName,
          pUhid,
          stream,
          reason,
          inv.paymentMode || "Cash",
          sub,
          disc,
          tax,
          ins,
          total,
          paid,
          bal.toFixed(2),
          inv.status?.toUpperCase() || "PENDING"
        ];
      });

      exportToExcel(`HMS_Billing_Ledger_${activeStream}_${todayStr}`, headers, rows);
    }
  };

  // -------------------------------------------------------------
  // PATIENT CONSOLIDATED STATEMENT STATE & HANDLERS
  // -------------------------------------------------------------
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [selectedVisitKey, setSelectedVisitKey] = useState<string>("all");
  const [isStatementPrintModalOpen, setIsStatementPrintModalOpen] = useState(false);

  const { data: searchedPatientsData, isLoading: searchingPatients } = usePatients({ search: patientSearchQuery });
  const { data: patientInvoicesData, isLoading: loadingPatientInvoices } = useInvoices({
    patient: selectedPatient?._id,
    limit: 1000
  });

  const recentPatientsMap = new Map<string, any>();
  allRawInvoices.forEach((inv: any) => {
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

  const groupInvoicesByVisit = (invoices: any[]): VisitGroup[] => {
    const map = new Map<string, any[]>();

    invoices.forEach((inv) => {
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
      const displayDate =
        dateKey === "Unknown Date"
          ? "Unknown Date"
          : new Date(dateKey + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric"
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
  const activeVisitGroup = selectedVisitKey === "all" ? null : visitGroups.find((v) => v.dateKey === selectedVisitKey);
  const displayedPatientInvoices =
    selectedVisitKey === "all" ? patientInvoices : activeVisitGroup ? activeVisitGroup.invoices : [];

  const patientGross = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.subtotal || inv.totals?.total || 0), 0);
  const patientTax = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.taxAmount || 0), 0);
  const patientDiscount = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.discount || 0), 0);
  const patientInsurance = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.insuranceCovered || 0), 0);
  const patientTotalNet = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.total || 0), 0);
  const patientBalanceDue = displayedPatientInvoices.reduce((sum: number, inv: any) => sum + (inv.totals?.patientBalance || 0), 0);
  const patientTotalPaid = Math.max(0, patientTotalNet - patientInsurance - patientBalanceDue);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full pb-16 font-sans space-y-5">
      <AllBranchesNoticeBanner />

      {/* Modern, Clean Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/admin" className="hover:text-emerald-700 transition">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Revenue & Billing Streams</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Revenue Analytics & Billing Streams
              </h1>
              <p className="text-xs text-slate-500">
                Hospital billing telemetry, multi-stream breakdown, and day-wise financial ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isLoading ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </Button>

          {activeStream !== "STATEMENT" && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleExport}
              disabled={filteredInvoices.length === 0}
              className="flex items-center gap-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{viewMode === "day_wise" ? "Export Day Summary" : "Export Report"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stream Selector Tabs - Clean, spacious, with badges */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-0.5 scrollbar-none">
        {[
          { key: "ALL", label: "Consolidated (All)", icon: Receipt, count: streamStats.ALL.count },
          { key: "IP", label: "IP Billing", icon: Building2, count: streamStats.IP.count },
          { key: "OP", label: "OP Billing", icon: Stethoscope, count: streamStats.OP.count },
          { key: "PHARMACY", label: "Pharmacy", icon: Pill, count: streamStats.PHARMACY.count },
          { key: "RADIOLOGY", label: "Radiology", icon: Radio, count: streamStats.RADIOLOGY.count },
          { key: "LAB", label: "Laboratory", icon: FlaskConical, count: streamStats.LAB.count },
          { key: "PENDING", label: "Pending Dues", icon: AlertCircle, count: streamStats.PENDING.count, isAlert: true },
          { key: "STATEMENT", label: "Patient Statement", icon: User, count: null },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeStream === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setActiveStream(item.key as BillingStreamKey);
                setSelectedDayDrilldown(null);
                setPage(1);
              }}
              className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
                isActive
                  ? item.isAlert
                    ? "border-amber-600 text-amber-800 font-bold bg-amber-50/40"
                    : "border-emerald-700 text-emerald-800 font-bold bg-emerald-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? (item.isAlert ? "text-amber-600" : "text-emerald-700") : "text-slate-400"}`} />
              <span>{item.label}</span>
              {item.count !== null && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? item.isAlert
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Billing Streams (Consolidated, IP, OP, Pharmacy, Radiology, Lab) */}
      {activeStream !== "PENDING" && activeStream !== "STATEMENT" && (
        <div className="space-y-4">
          {/* Calm, Simplified Financial Telemetry Bar (No Bulky KPI Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="px-3 border-r border-slate-100 last:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Invoices
              </span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {activeTallies.count}
              </span>
            </div>
            <div className="px-3 border-r border-slate-100 last:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Gross Billed
              </span>
              <span className="text-lg font-bold text-slate-800 font-mono mt-0.5 block">
                {formatINR(activeTallies.gross)}
              </span>
            </div>
            <div className="px-3 border-r border-slate-100 last:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Net Collected (Paid)
              </span>
              <span className="text-lg font-bold text-emerald-700 font-mono mt-0.5 block">
                {formatINR(activeTallies.collected)}
              </span>
            </div>
            <div className="px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Outstanding Balance
              </span>
              <span
                className={`text-lg font-black font-mono mt-0.5 block ${
                  activeTallies.balance > 0 ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {formatINR(activeTallies.balance)}
              </span>
            </div>
          </div>

          {/* Unified, Clean Single-Row Filter Toolbar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left Side: Search + Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative min-w-[220px] max-w-sm flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 pointer-events-none">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search invoice #, patient, UHID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleFilterChange();
                    }}
                    className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        handleFilterChange();
                      }}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Date Period Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={datePreset}
                    onChange={(e) => {
                      setDatePreset(e.target.value as any);
                      setSelectedDayDrilldown(null);
                      handleFilterChange();
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="all">Period: All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7">Last 7 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="custom">Custom Range...</option>
                  </select>
                </div>

                {/* Payment Status Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      handleFilterChange();
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="all">Status: All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                {/* Reset Filters Pill */}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAllFilters}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline px-2 py-1 rounded transition"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Right Side: View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start lg:self-auto">
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    viewMode === "detailed"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Bills View</span>
                </button>
                <button
                  onClick={() => setViewMode("day_wise")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    viewMode === "day_wise"
                      ? "bg-emerald-700 text-white shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Day-Wise Summary</span>
                </button>
              </div>
            </div>

            {/* Custom Range Sub-bar (Only when custom range is selected) */}
            {datePreset === "custom" && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                <span className="font-bold text-slate-600">Custom Date Range:</span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      handleFilterChange();
                    }}
                    className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-500">To:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      handleFilterChange();
                    }}
                    className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50"
                  />
                </div>
              </div>
            )}

            {/* Active Day Drilldown Notice */}
            {selectedDayDrilldown && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs text-amber-900">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    Showing invoices for day: <strong>{selectedDayDrilldown}</strong> ({filteredInvoices.length} bills)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedDayDrilldown(null);
                    handleFilterChange();
                  }}
                  className="font-bold text-amber-800 hover:underline text-xs"
                >
                  View All Days
                </button>
              </div>
            )}
          </div>

          {/* VIEW MODE 1: DAY-WISE SUMMARY TABLE */}
          {viewMode === "day_wise" && (
            <Card className="overflow-hidden p-0 border border-slate-200">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-emerald-700" />
                    Day-Wise Collections Ledger ({dayWiseGroups.length} Days)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">Click "Inspect Day" to examine that date's invoices</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-3">Day</th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                      <th className="py-2.5 px-3">Streams Breakdown</th>
                      <th className="py-2.5 px-3 text-right">Gross Total</th>
                      <th className="py-2.5 px-3 text-right">Discounts</th>
                      <th className="py-2.5 px-3 text-right">Net Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {dayWiseGroups.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          {isLoading ? "Loading day-wise ledger..." : "No billing records found for the applied period."}
                        </td>
                      </tr>
                    ) : (
                      dayWiseGroups.map((group) => {
                        const isDrilled = selectedDayDrilldown === group.dateKey;
                        return (
                          <tr
                            key={group.dateKey}
                            className={`hover:bg-slate-50 transition-colors ${
                              isDrilled ? "bg-amber-50/60 font-semibold" : ""
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                {group.displayDate}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500">{group.dayName}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                                {group.invoicesCount}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {Object.entries(group.streamCounts).map(([type, cnt]) => (
                                  <span
                                    key={type}
                                    className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  >
                                    {type}: {cnt}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                              {formatINR(group.grossTotal)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-red-500">
                              {group.discountTotal > 0 ? `-${formatINR(group.discountTotal)}` : "₹0.00"}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatINR(group.netRevenue)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              <span
                                className={`font-bold ${
                                  group.balanceDue > 0 ? "text-red-600" : "text-emerald-700"
                                }`}
                              >
                                {formatINR(group.balanceDue)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => {
                                  setSelectedDayDrilldown(group.dateKey);
                                  setViewMode("detailed");
                                  setPage(1);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold transition"
                              >
                                <span>Inspect Day</span>
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {dayWiseGroups.length > 0 && (
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-4 uppercase text-[10px] tracking-wider text-slate-500">
                          Summary Total
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black">{activeTallies.count}</td>
                        <td></td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{formatINR(activeTallies.gross)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-500">
                          {activeTallies.discount > 0 ? `-${formatINR(activeTallies.discount)}` : "₹0.00"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatINR(activeTallies.collected)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                          {formatINR(activeTallies.balance)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          )}

          {/* VIEW MODE 2: DETAILED BILLS MASTER TABLE */}
          {viewMode === "detailed" && (
            <Card className="overflow-hidden p-0 border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-3">Date Issued</th>
                      <th className="py-2.5 px-3">Patient & UHID</th>
                      <th className="py-2.5 px-3">Stream</th>
                      <th className="py-2.5 px-3">Service Particulars</th>
                      <th className="py-2.5 px-3 text-right">Total Bill</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          {isLoading ? "Loading billing invoices..." : "No invoices found matching your filters."}
                        </td>
                      </tr>
                    ) : (
                      paginatedInvoices.map((inv: any) => {
                        const pName = typeof inv.patient === "object" ? inv.patient?.name || "Walk-in" : "Walk-in";
                        const pUhid = typeof inv.patient === "object" ? inv.patient?.uhid : null;
                        const type = (inv.billingType || "OP").toUpperCase();
                        const reason = getInvoiceReason(inv);
                        const total = inv.totals?.total || 0;
                        const bal = inv.totals?.patientBalance || 0;
                        const paid = Math.max(0, total - (inv.totals?.insuranceCovered || 0) - bal);

                        const streamColor =
                          type === "IP"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : type === "OP"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : type === "PHARMACY"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : type === "RADIOLOGY"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : type === "LAB"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-700 border-slate-200";

                        return (
                          <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                #{inv._id.slice(-8).toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              <div>{new Date(inv.issuedAt || inv.createdAt).toLocaleDateString("en-IN")}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{pName}</div>
                              {pUhid && <div className="text-[10px] font-mono text-slate-400">{pUhid}</div>}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${streamColor}`}
                              >
                                {type}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className="font-medium text-slate-700 max-w-[200px] truncate block"
                                title={reason}
                              >
                                {reason}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                              {formatINR(total)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                              {formatINR(paid)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              <span
                                className={`font-semibold ${
                                  bal > 0 ? "text-red-600 font-bold" : "text-emerald-700"
                                }`}
                              >
                                {formatINR(bal)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Badge tone={STATUS_TONE[inv.status as keyof typeof STATUS_TONE] || "info"}>
                                {inv.status.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Link
                                  to={`/admin/finance/invoices/${inv._id}`}
                                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                                >
                                  View
                                </Link>
                                <span className="text-slate-200">|</span>
                                <button
                                  onClick={() => setSelectedInvoiceForModal(inv)}
                                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                                >
                                  Receipt
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Simple Pagination Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Showing <strong>{paginatedInvoices.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong>–
                  <strong>{Math.min(page * pageSize, filteredInvoices.length)}</strong> of{" "}
                  <strong>{filteredInvoices.length}</strong> invoices
                </span>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Sub-view: Pending & Overdue Full Dedicated Page */}
      {activeStream === "PENDING" && <PendingOverduePage />}

      {/* Sub-view: Patient Consolidated Statement Dedicated Page */}
      {activeStream === "STATEMENT" && (
        <div className="space-y-5">
          <Card className="space-y-3.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Select Patient for Consolidated Statement</h2>
                <p className="text-xs text-slate-500">
                  Search patient by name, UHID, or mobile to view full visit billing history & print receipt statement.
                </p>
              </div>
              {selectedPatient && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSelectedVisitKey("all");
                    }}
                    className="text-xs py-1.5"
                  >
                    Select Different Patient
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setIsStatementPrintModalOpen(true)}
                    className="text-xs py-1.5 flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                  >
                    <Printer className="h-3.5 w-3.5" />{" "}
                    {selectedVisitKey === "all"
                      ? "Print Consolidated Statement"
                      : `Print ${activeVisitGroup?.displayDate} Visit Bill`}
                  </Button>
                </div>
              )}
            </div>

            <div className="relative max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search patient by name, UHID, or mobile number..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-emerald-600 bg-slate-50/50"
              />
            </div>

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
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                            : "bg-white border-slate-200 hover:border-emerald-300 text-slate-700"
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.uhid} • {p.phone}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {p.gender}, {p.age} yrs
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedPatient && recentPatients.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">Quick Select Patient with Recent Billing:</span>
                <div className="flex flex-wrap gap-1.5">
                  {recentPatients.map((p: any) => (
                    <button
                      key={p._id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSelectedVisitKey("all");
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-medium text-slate-700 transition"
                    >
                      <User className="h-3 w-3 text-emerald-600" />
                      <span>{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({p.uhid})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {selectedPatient ? (
            <div className="space-y-5">
              {/* Patient Banner */}
              <div className="bg-emerald-800 text-white rounded-xl p-4 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-base text-white">
                    {selectedPatient.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {selectedPatient.name}
                      <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded text-white capitalize font-mono">
                        {selectedPatient.uhid}
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-200">
                      Mobile: {selectedPatient.phone || "N/A"} • Age/Gender: {selectedPatient.age} Yrs /{" "}
                      <span className="capitalize">{selectedPatient.gender}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => setIsStatementPrintModalOpen(true)}
                    className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs py-1.5 px-3 shadow"
                  >
                    <Printer className="h-3.5 w-3.5" />{" "}
                    {selectedVisitKey === "all"
                      ? "Print Consolidated Statement"
                      : `Print ${activeVisitGroup?.displayDate} Visit Bill`}
                  </Button>
                </div>
              </div>

              {/* Visit Sessions Grouping Bar */}
              {visitGroups.length > 0 && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-emerald-700" /> Patient Visit Sessions (
                        {visitGroups.length} Visits)
                      </h4>
                    </div>
                    {selectedVisitKey !== "all" && (
                      <button
                        onClick={() => setSelectedVisitKey("all")}
                        className="text-xs font-bold text-emerald-700 hover:text-slate-900 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 transition"
                      >
                        View All Visits
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <button
                      onClick={() => setSelectedVisitKey("all")}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        selectedVisitKey === "all"
                          ? "bg-emerald-50 border-emerald-400 shadow-2xs ring-1 ring-emerald-400"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-slate-800">All Visits History</span>
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {patientInvoices.length} Bills
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">Consolidated Multi-Visit Summary</div>
                      <div className="text-xs font-bold text-emerald-700 mt-1 font-mono">
                        {formatINR(patientInvoices.reduce((sum: number, i: any) => sum + (i.totals?.total || 0), 0))}
                      </div>
                    </button>

                    {visitGroups.map((v) => {
                      const isSelected = selectedVisitKey === v.dateKey;
                      return (
                        <div
                          key={v.dateKey}
                          onClick={() => setSelectedVisitKey(v.dateKey)}
                          className={`cursor-pointer p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                            isSelected
                              ? "bg-emerald-50/70 border-emerald-400 shadow-2xs ring-1 ring-emerald-400"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-1 mb-1">
                              <span className="font-bold text-xs text-slate-800">{v.displayDate}</span>
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {v.invoices.length} {v.invoices.length === 1 ? "Bill" : "Bills"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 my-1">
                              {v.billingTypes.map((t) => (
                                <span
                                  key={t}
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 mt-1.5">
                            <span className="text-xs font-bold text-slate-800 font-mono">{formatINR(v.totalNet)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVisitKey(v.dateKey);
                                setIsStatementPrintModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-2 py-0.5 rounded shadow-2xs"
                            >
                              <Printer className="h-3 w-3" /> Print
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Patient Statement Financial Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {selectedVisitKey === "all" ? "Gross Charges" : "Visit Gross"}
                  </span>
                  <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">{formatINR(patientGross)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Discounts</span>
                  <span className="text-xs font-bold text-red-500 font-mono mt-0.5 block">-{formatINR(patientDiscount)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Insurance Split</span>
                  <span className="text-xs font-bold text-blue-600 font-mono mt-0.5 block">-{formatINR(patientInsurance)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Settled Paid</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono mt-0.5 block">{formatINR(patientTotalPaid)}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Balance Due</span>
                  <span className={`text-xs font-black font-mono mt-0.5 block ${patientBalanceDue > 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {formatINR(patientBalanceDue)}
                  </span>
                </div>
              </div>

              {/* Consolidated Bills List */}
              <Card className="space-y-3 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-700" />
                    {selectedVisitKey === "all"
                      ? `Complete Billing Ledger (${patientInvoices.length} Bills)`
                      : `Visit Ledger: ${activeVisitGroup?.displayDate} (${displayedPatientInvoices.length} Bills)`}
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">Includes OP, IP, Pharmacy, Lab & Radiology</span>
                </h3>

                {loadingPatientInvoices ? (
                  <div className="py-10 text-center text-xs text-slate-400">Loading patient statement...</div>
                ) : displayedPatientInvoices.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">No invoices recorded for this visit selection.</div>
                ) : (
                  <div className="space-y-3">
                    {displayedPatientInvoices.map((inv: any) => (
                      <div key={inv._id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 border-b border-slate-200 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700 uppercase text-[11px]">
                              INV: #{inv._id.slice(-8).toUpperCase()}
                            </span>
                            <span className="rounded bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 text-[9px] uppercase border border-emerald-200">
                              {inv.billingType || "OP"}
                            </span>
                            <span className="text-slate-400 text-[11px]">• {new Date(inv.issuedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge tone={STATUS_TONE[inv.status as keyof typeof STATUS_TONE] || "info"}>
                              {inv.status.replace("_", " ")}
                            </Badge>
                            <span className="font-bold text-slate-800 font-mono text-xs">
                              {formatINR(inv.totals?.total || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                              <tr className="text-[9px] font-bold uppercase text-slate-400 border-b pb-1">
                                <th className="py-1">Line Particulars</th>
                                <th className="py-1 text-center">Category</th>
                                <th className="py-1 text-center">Qty</th>
                                <th className="py-1 text-right">Unit Price</th>
                                <th className="py-1 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                              {inv.items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="py-1.5 font-medium text-slate-800">{item.description}</td>
                                  <td className="py-1.5 text-center uppercase text-[9px] text-slate-400">
                                    {item.category || inv.billingType}
                                  </td>
                                  <td className="py-1.5 text-center">{item.quantity}</td>
                                  <td className="py-1.5 text-right font-mono">{formatINR(item.amount)}</td>
                                  <td className="py-1.5 text-right font-bold text-slate-800 font-mono">
                                    {formatINR(item.quantity * item.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
                            <div>
                              <span>Mode: {inv.paymentMode || "Cash"}</span>
                              {inv.totals?.insuranceCovered > 0 && (
                                <span className="ml-3 text-blue-600 font-medium">
                                  Insurance Split: {formatINR(inv.totals.insuranceCovered)}
                                </span>
                              )}
                            </div>
                            <div>
                              <span>Balance Due: </span>
                              <span
                                className={`font-bold font-mono ${
                                  inv.totals?.patientBalance > 0 ? "text-red-600" : "text-emerald-700"
                                }`}
                              >
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
            <div className="py-14 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <User className="h-9 w-9 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No Patient Selected</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Search for a patient by Name, UHID, or Mobile number above, or click on a quick-select patient to load their statement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Printable Receipt for Single Invoice */}
      <Modal
        title={
          selectedInvoiceForModal
            ? `Invoice Receipt #${selectedInvoiceForModal._id.slice(-8).toUpperCase()}`
            : "Invoice Details"
        }
        isOpen={!!selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        size="md"
      >
        {selectedInvoiceForModal && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{hospitalData?.name || "HMS Hospital"}</h4>
                  <p className="text-xs text-slate-500">Official Patient Billing Receipt</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-slate-700 block">
                    #{selectedInvoiceForModal._id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedInvoiceForModal.issuedAt || selectedInvoiceForModal.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                  <p className="font-bold text-slate-800">
                    {typeof selectedInvoiceForModal.patient === "object"
                      ? selectedInvoiceForModal.patient?.name || "Walk-in"
                      : "Walk-in"}
                  </p>
                  {typeof selectedInvoiceForModal.patient === "object" && (
                    <p className="text-slate-500 font-mono text-[10px]">{selectedInvoiceForModal.patient?.uhid}</p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Stream</span>
                  <p className="font-bold text-emerald-800 uppercase">
                    {selectedInvoiceForModal.billingType || "OP"}
                  </p>
                  <p className="text-slate-500 text-[10px]">Mode: {selectedInvoiceForModal.paymentMode || "Cash"}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-slate-200 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Particulars:</span>
                <div className="space-y-1">
                  {(selectedInvoiceForModal.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-700">
                        {item.description} (x{item.quantity})
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatINR(item.quantity * item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    {formatINR(selectedInvoiceForModal.totals?.subtotal || selectedInvoiceForModal.totals?.total || 0)}
                  </span>
                </div>
                {selectedInvoiceForModal.totals?.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatINR(selectedInvoiceForModal.totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 text-sm border-t border-slate-300 pt-1">
                  <span>Total Amount:</span>
                  <span className="font-mono">{formatINR(selectedInvoiceForModal.totals?.total || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono">
                    {formatINR(selectedInvoiceForModal.totals?.patientBalance || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedInvoiceForModal(null)} className="text-xs">
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Printable Consolidated Patient Statement View */}
      <Modal
        title={
          selectedVisitKey === "all"
            ? `Consolidated Billing Statement — ${selectedPatient?.name || "Patient"}`
            : `Visit Billing Statement (${activeVisitGroup?.displayDate}) — ${selectedPatient?.name || "Patient"}`
        }
        isOpen={isStatementPrintModalOpen}
        onClose={() => setIsStatementPrintModalOpen(false)}
      >
        {selectedPatient && (
          <div className="space-y-6">
            <div id="consolidated-patient-statement-print" className="space-y-4 p-2 bg-white">
              <div className="flex justify-between border-b pb-4 items-center">
                <div className="flex items-center gap-3">
                  {hospitalData?.logoUrl ? (
                    <img
                      src={hospitalData.logoUrl}
                      alt={hospitalData.name}
                      className="h-12 w-12 object-contain rounded bg-slate-50 p-0.5 border"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-emerald-100 text-emerald-800 font-bold text-lg">
                      {hospitalData?.name ? hospitalData.name.charAt(0).toUpperCase() : "H"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-emerald-800">{hospitalData?.name || "HMS Enterprise"}</h3>
                    <p className="text-xs text-slate-500">
                      {selectedVisitKey === "all"
                        ? "Consolidated Patient Billing Statement & Tax Receipt"
                        : `Visit Billing Statement & Tax Receipt (${activeVisitGroup?.displayDate})`}
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

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Patient Information:</h5>
                  <p className="font-bold text-slate-800 text-sm">{selectedPatient.name}</p>
                  <p className="text-slate-600 font-mono font-semibold">UHID: {selectedPatient.uhid}</p>
                  <p className="text-slate-500">Mobile: {selectedPatient.phone || "N/A"}</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide">Demographics & Status:</h5>
                  <p className="text-slate-700">
                    Age / Gender: {selectedPatient.age} Yrs / <span className="capitalize">{selectedPatient.gender}</span>
                  </p>
                  <p className="text-slate-700">Blood Group: {selectedPatient.bloodGroup || "N/A"}</p>
                  <p className="text-slate-700">
                    Visit Session:{" "}
                    <span className="capitalize font-semibold">
                      {selectedVisitKey === "all" ? "All Visits (Full History)" : activeVisitGroup?.displayDate}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1">
                  Detailed Particulars Ledger
                </h5>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
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
                      inv.items?.map((item: any, i: number) => (
                        <tr key={`${inv._id}-${i}`} className="text-slate-700">
                          <td className="py-2 px-2 text-[10px] text-slate-500">
                            {new Date(inv.issuedAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2 font-mono text-[10px] text-slate-500">
                            {inv._id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-2 px-2 font-bold uppercase text-[9px] text-slate-600">
                            {inv.billingType || "OP"}
                          </td>
                          <td className="py-2 px-2 font-medium text-slate-800">{item.description}</td>
                          <td className="py-2 px-1 text-center">{item.quantity}</td>
                          <td className="py-2 px-2 text-right font-mono">{formatINR(item.amount)}</td>
                          <td className="py-2 px-2 text-right font-bold font-mono">
                            {formatINR(item.quantity * item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

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
                  <span className="text-[10px] text-slate-500 block mt-1 font-bold">
                    Authorized Administrator Signature
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Official Hospital Statement
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsStatementPrintModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePrint}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  <Printer className="h-4 w-4" /> Print{" "}
                  {selectedVisitKey === "all" ? "Consolidated Statement" : "Visit Bill"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
