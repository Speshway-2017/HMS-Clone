import { useState, useEffect } from "react";
import {
  Banknote,
  Search,
  Eye,
  Printer,
  Calculator,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Lock,
  Sliders,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  usePayrollSummary,
  useRecalculatePayroll,
  useSavePayrollAdjustments,
  useLockPayroll,
  useDisbursePayroll,
  PayrollEmployeeSummary,
  PayrollStatus,
} from "../../features/payroll";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { InputField, TextareaField } from "../../components/ui/Field";
import { socket } from "../../lib/socket";

export function AccountantPayrollPage() {
  const [search, setSearch] = useState("");
  const [payrollMonth, setPayrollMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<"All" | PayrollStatus>("All");

  // Modals state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<PayrollEmployeeSummary | null>(null);

  // Run Salary Calculation Form State
  const [calcBasicSalary, setCalcBasicSalary] = useState<number>(0);
  const [calcAllowances, setCalcAllowances] = useState<number>(0);
  const [calcDeductions, setCalcDeductions] = useState<number>(0);

  // Manual Adjustments Form State
  const [specialAllowance, setSpecialAllowance] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [incentives, setIncentives] = useState<number>(0);
  const [recovery, setRecovery] = useState<number>(0);
  const [professionalTax, setProfessionalTax] = useState<number>(200);
  const [remarks, setRemarks] = useState<string>("");

  // API Hooks
  const { data: payrollData, isLoading, refetch } = usePayrollSummary(payrollMonth);
  const recalculateMutation = useRecalculatePayroll();
  const saveAdjustmentsMutation = useSavePayrollAdjustments();
  const lockMutation = useLockPayroll();
  const disburseMutation = useDisbursePayroll();

  // Socket listener for real-time attendance / leave / payroll changes
  useEffect(() => {
    const handleSync = () => refetch();
    socket.on("attendance:updated", handleSync);
    socket.on("leave:updated", handleSync);
    socket.on("payroll:updated", handleSync);
    socket.on("payroll:needs_recalculation", handleSync);
    socket.on("dashboard_update", handleSync);
    return () => {
      socket.off("attendance:updated", handleSync);
      socket.off("leave:updated", handleSync);
      socket.off("payroll:updated", handleSync);
      socket.off("payroll:needs_recalculation", handleSync);
      socket.off("dashboard_update", handleSync);
    };
  }, [refetch]);

  const employees = payrollData?.employees || [];

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      emp.status === statusFilter ||
      (statusFilter === "Disbursed" && emp.status === "Paid");

    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalEmployees = employees.length;
  const needsRecalculationCount = employees.filter((e) => e.status === "Needs Recalculation").length;
  const calculatedCount = employees.filter((e) => e.status === "Calculated" || e.status === "Draft").length;
  const lockedCount = employees.filter((e) => e.status === "Locked").length;
  const disbursedCount = employees.filter((e) => e.status === "Disbursed" || e.status === "Paid").length;
  const totalDisbursedAmount = employees
    .filter((e) => e.status === "Disbursed" || e.status === "Paid")
    .reduce((sum, e) => sum + e.salaryBreakdown.netSalary, 0);

  // Actions
  const handleRecalculateAll = async () => {
    await recalculateMutation.mutateAsync({ month: payrollMonth });
    refetch();
  };

  const handleLockAll = async () => {
    await lockMutation.mutateAsync({ month: payrollMonth });
    refetch();
  };

  const handleOpenCalculateModal = (emp: PayrollEmployeeSummary) => {
    setSelectedSummary(emp);
    setCalcBasicSalary(emp.salaryBreakdown.basicSalary || 0);
    setCalcAllowances(emp.salaryBreakdown.allowances || 0);
    setCalcDeductions(emp.salaryBreakdown.totalDeductions || 0);
    setIsCalculateModalOpen(true);
  };

  const handleApproveSalaryCalculation = async () => {
    if (!selectedSummary) return;
    await saveAdjustmentsMutation.mutateAsync({
      employeeId: selectedSummary.employeeId,
      employeeRef: selectedSummary.employeeRef,
      employeeType: selectedSummary.employeeType,
      month: payrollMonth,
      specialAllowance: Math.max(0, calcAllowances - selectedSummary.salaryBreakdown.allowances),
      status: "Calculated",
    });
    setIsCalculateModalOpen(false);
    setSelectedSummary(null);
    refetch();
  };

  const handleOpenAdjustment = (emp: PayrollEmployeeSummary) => {
    setSelectedSummary(emp);
    setSpecialAllowance(emp.salaryBreakdown.specialAllowance || 0);
    setBonus(emp.salaryBreakdown.bonus || 0);
    setIncentives(emp.salaryBreakdown.incentives || 0);
    setRecovery(emp.salaryBreakdown.recovery || 0);
    setProfessionalTax(emp.salaryBreakdown.professionalTax ?? 200);
    setRemarks(emp.remarks || "");
    setIsAdjustmentOpen(true);
  };

  const handleSaveAdjustments = async (targetStatus: "Draft" | "Calculated") => {
    if (!selectedSummary) return;
    await saveAdjustmentsMutation.mutateAsync({
      employeeId: selectedSummary.employeeId,
      employeeRef: selectedSummary.employeeRef,
      employeeType: selectedSummary.employeeType,
      month: payrollMonth,
      specialAllowance,
      bonus,
      incentives,
      recovery,
      professionalTax,
      remarks,
      status: targetStatus,
    });
    setIsAdjustmentOpen(false);
    setSelectedSummary(null);
    refetch();
  };

  const handleRecalculateSingle = async (emp: PayrollEmployeeSummary) => {
    await recalculateMutation.mutateAsync({ month: payrollMonth, employeeId: emp.employeeId });
    refetch();
  };

  const handleDisburseSingle = async (emp: PayrollEmployeeSummary) => {
    await disburseMutation.mutateAsync({
      employeeId: emp.employeeId,
      employeeType: emp.employeeType,
      month: payrollMonth,
      paymentMethod: "Bank Transfer",
    });
    refetch();
  };

  const handleOpenDetail = (emp: PayrollEmployeeSummary) => {
    setSelectedSummary(emp);
    setIsDetailOpen(true);
  };

  const handleOpenPayslip = (emp: PayrollEmployeeSummary) => {
    setSelectedSummary(emp);
    setIsPayslipOpen(true);
  };

  const renderStatusPill = (status: PayrollStatus) => {
    switch (status) {
      case "Needs Recalculation":
        return (
          <div className="w-full bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full py-1.5 px-3 text-[10px] font-bold tracking-wider uppercase text-center flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
            <span>NEEDS RECALCULATION</span>
          </div>
        );
      case "Draft":
        return (
          <div className="w-full bg-slate-100/90 text-slate-500 rounded-full py-1.5 px-3 text-[10px] font-bold tracking-wider uppercase text-center">
            UNPROCESSED
          </div>
        );
      case "Calculated":
        return (
          <div className="w-full bg-sky-50 text-sky-700 border border-sky-200/80 rounded-full py-1.5 px-3 text-[10px] font-bold tracking-wider uppercase text-center">
            CALCULATED
          </div>
        );
      case "Locked":
        return (
          <div className="w-full bg-purple-50 text-purple-700 border border-purple-200/80 rounded-full py-1.5 px-3 text-[10px] font-bold tracking-wider uppercase text-center flex items-center justify-center gap-1">
            <Lock className="h-3 w-3 shrink-0" />
            <span>LOCKED</span>
          </div>
        );
      case "Disbursed":
      case "Paid":
        return (
          <div className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full py-1.5 px-3 text-[10px] font-bold tracking-wider uppercase text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>DISBURSED</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
          <p className="text-xs text-slate-500">
            Real-time automated payroll processing integrated with Attendance and Leave records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 font-medium">Month:</span>
            <input
              type="month"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="font-semibold text-slate-800 outline-none bg-transparent cursor-pointer"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecalculateAll}
            disabled={recalculateMutation.isPending}
            className="border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
            Recalculate All
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleLockAll}
            disabled={lockMutation.isPending}
            className="border-purple-300 text-purple-800 hover:bg-purple-50 rounded-xl"
          >
            <Lock className="h-3.5 w-3.5" /> Lock Month
          </Button>
        </div>
      </div>

      {/* Recalculation Alert Banner */}
      {needsRecalculationCount > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-amber-950 text-xs">
                {needsRecalculationCount} employee record(s) need payroll recalculation
              </p>
              <p className="text-[11px] text-amber-800">
                Attendance or leave was modified by Admin. Click below to refresh calculations.
              </p>
            </div>
          </div>
          <button
            onClick={handleRecalculateAll}
            disabled={recalculateMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow transition-colors flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Recalculate Now
          </button>
        </div>
      )}

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Employees"
          value={`${totalEmployees}`}
          icon={<Calculator className="h-4 w-4 text-navy-600" />}
        />
        <KpiCard
          label="Needs Recalculation"
          value={`${needsRecalculationCount}`}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        />
        <KpiCard
          label="Processed / Calculated"
          value={`${calculatedCount}`}
          icon={<Clock className="h-4 w-4 text-sky-600" />}
        />
        <KpiCard
          label="Total Disbursed"
          value={`₹${totalDisbursedAmount.toLocaleString("en-IN")}`}
          icon={<Banknote className="h-4 w-4 text-emerald-600" />}
          emphasis
        />
      </div>

      {/* Main Payroll Table Card - Matching Screenshot UI */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        {/* Top Controls: Search Bar & Status Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Pill Search Input */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee, ID, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1 bg-slate-100/70 p-1 rounded-xl border border-slate-200/60">
            {(["All", "Needs Recalculation", "Draft", "Calculated", "Locked", "Disbursed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  statusFilter === tab
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4 font-semibold">EMPLOYEE ID</th>
                <th className="py-3.5 px-4 font-semibold">EMPLOYEE NAME</th>
                <th className="py-3.5 px-4 font-semibold">ROLE / SPEC</th>
                <th className="py-3.5 px-4 font-semibold">SALARY CALCULATED</th>
                <th className="py-3.5 px-4 font-semibold">NET SALARY</th>
                <th className="py-3.5 px-4 font-semibold text-center w-40">STATUS</th>
                <th className="py-3.5 px-4 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Calculating payroll summaries...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No matching employee records for {payrollMonth}.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isDisbursed = emp.status === "Disbursed" || emp.status === "Paid";
                  const isLocked = emp.status === "Locked";
                  const needsRecalc = emp.status === "Needs Recalculation";
                  const isDraft = emp.status === "Draft";

                  return (
                    <tr
                      key={emp.employeeId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Employee ID */}
                      <td className="py-4 px-4 text-slate-400 font-normal font-sans text-xs whitespace-nowrap">
                        {emp.employeeId}
                      </td>

                      {/* Employee Name */}
                      <td className="py-4 px-4 font-bold text-slate-900 text-sm whitespace-nowrap">
                        {emp.employeeName}
                      </td>

                      {/* Role / Spec */}
                      <td className="py-4 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {emp.designation}
                      </td>

                      {/* Salary Calculated */}
                      <td className="py-4 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {isDraft ? (
                          <span className="text-slate-400">Not Run</span>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            ₹{emp.salaryBreakdown.grossSalary.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Net Salary */}
                      <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {isDraft ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : (
                          `₹${emp.salaryBreakdown.netSalary.toLocaleString("en-IN")}`
                        )}
                      </td>

                      {/* Status Pill Badge */}
                      <td className="py-4 px-4 text-center">
                        {renderStatusPill(emp.status)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Secondary actions: Breakdown & Adjust */}
                          <button
                            onClick={() => handleOpenDetail(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="View Formula & Attendance Breakdown"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {!isDisbursed && !isLocked && (
                            <button
                              onClick={() => handleOpenAdjustment(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                              title="Accountant Adjustments (Bonus, Special Allowance, Recovery)"
                            >
                              <Sliders className="h-4 w-4" />
                            </button>
                          )}

                          {/* Primary Action Button (Sleek Dark Navy Blue) */}
                          {needsRecalc ? (
                            <button
                              onClick={() => handleRecalculateSingle(emp)}
                              disabled={recalculateMutation.isPending}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Recalculate</span>
                            </button>
                          ) : isDraft ? (
                            <button
                              onClick={() => handleOpenCalculateModal(emp)}
                              className="bg-[#1e2b4f] hover:bg-[#15203d] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Calculator className="h-3.5 w-3.5" />
                              <span>Calculate</span>
                            </button>
                          ) : !isDisbursed ? (
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => handleDisburseSingle(emp)}
                                className="bg-[#10b981] hover:bg-[#059669] text-white px-3.5 py-1 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                              >
                                Disburse
                              </button>
                              <button
                                onClick={() => handleOpenPayslip(emp)}
                                className="text-slate-500 hover:text-slate-800 text-[11px] font-medium flex items-center gap-1 transition-colors"
                              >
                                <Eye className="h-3 w-3" /> Payslip
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenPayslip(emp)}
                              className="bg-[#1e2b4f] hover:bg-[#15203d] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Payslip</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 0: RUN SALARY CALCULATION MODAL (MATCHING SCREENSHOT) */}
      <Modal
        title="Run Salary Calculation"
        isOpen={isCalculateModalOpen}
        onClose={() => {
          setIsCalculateModalOpen(false);
          setSelectedSummary(null);
        }}
      >
        {selectedSummary && (
          <div className="space-y-4 text-xs">
            {/* Top Employee Profile Block */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Employee</span>
                <span className="font-bold text-slate-900">{selectedSummary.employeeName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Role</span>
                <span className="font-medium text-slate-800">{selectedSummary.designation}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Processing Month</span>
                <span className="font-bold text-navy-900">{selectedSummary.month}</span>
              </div>
            </div>

            {/* Input Fields matching screenshot */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  BASIC SALARY (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={calcBasicSalary}
                  onChange={(e) => setCalcBasicSalary(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  ALLOWANCES (BONUS, PERKS) (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={calcAllowances}
                  onChange={(e) => setCalcAllowances(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  DEDUCTIONS (TAX, PF, LEAVES) (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={calcDeductions}
                  onChange={(e) => setCalcDeductions(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white"
                />
              </div>
            </div>

            {/* Estimated Net Salary Box */}
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex justify-between items-center my-2">
              <span className="font-semibold text-slate-800 text-xs">Estimated Net Salary:</span>
              <span className="font-bold text-navy-900 text-base font-sans">
                ₹{Math.max(0, calcBasicSalary + calcAllowances - calcDeductions).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end items-center gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsCalculateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSalaryCalculation}
                disabled={saveAdjustmentsMutation.isPending}
                className="bg-[#1e2b4f] hover:bg-[#15203d] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                Approve Salary
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 1: ACCOUNTANT MANUAL ADJUSTMENTS MODAL */}
      <Modal
        title="Accountant Salary Adjustments"
        isOpen={isAdjustmentOpen}
        onClose={() => {
          setIsAdjustmentOpen(false);
          setSelectedSummary(null);
        }}
      >
        {selectedSummary && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedSummary.employeeName}</h4>
                <p className="text-slate-500 font-mono">
                  ID: {selectedSummary.employeeId} | {selectedSummary.designation}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                Accountant Adjustments
              </span>
            </div>

            {/* Read-Only Attendance Block */}
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-900 uppercase tracking-wider text-[10px]">
                  Attendance Summary (Read-Only from Admin Staff Attendance)
                </span>
                <span className="text-[10px] text-sky-700 font-medium">Locked for Accountant</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center bg-white p-2 rounded-lg border border-sky-200">
                <div>
                  <span className="text-slate-400 block text-[9px]">Working Days</span>
                  <span className="font-bold text-slate-800">{selectedSummary.attendanceSummary.workingDays}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Effective Present</span>
                  <span className="font-bold text-emerald-700">{selectedSummary.attendanceSummary.effectivePresentDays} d</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Unpaid LOP</span>
                  <span className="font-bold text-rose-600">{selectedSummary.attendanceSummary.unpaidLeaveDays} d</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">OT Hours</span>
                  <span className="font-bold text-indigo-700">{selectedSummary.attendanceSummary.overtimeHours} h</span>
                </div>
              </div>
            </div>

            {/* Editable Accountant Adjustments */}
            <div className="space-y-3">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Allowed Accountant Adjustments
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Special Allowance (₹)"
                  type="number"
                  min={0}
                  value={specialAllowance}
                  onChange={(e) => setSpecialAllowance(parseFloat(e.target.value) || 0)}
                />
                <InputField
                  label="Bonus (₹)"
                  type="number"
                  min={0}
                  value={bonus}
                  onChange={(e) => setBonus(parseFloat(e.target.value) || 0)}
                />
                <InputField
                  label="Incentives (₹)"
                  type="number"
                  min={0}
                  value={incentives}
                  onChange={(e) => setIncentives(parseFloat(e.target.value) || 0)}
                />
                <InputField
                  label="Recovery / Advance Deduction (₹)"
                  type="number"
                  min={0}
                  value={recovery}
                  onChange={(e) => setRecovery(parseFloat(e.target.value) || 0)}
                />
                <InputField
                  label="Professional Tax Override (₹)"
                  type="number"
                  min={0}
                  value={professionalTax}
                  onChange={(e) => setProfessionalTax(parseFloat(e.target.value) || 0)}
                />
              </div>

              <TextareaField
                label="Accountant Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="e.g. Festival bonus applied as per HR approval..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="secondary" onClick={() => setIsAdjustmentOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSaveAdjustments("Draft")}
                disabled={saveAdjustmentsMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSaveAdjustments("Calculated")}
                disabled={saveAdjustmentsMutation.isPending}
              >
                Save & Recalculate
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: DETAILED FORMULA & SALARY BREAKDOWN MODAL */}
      <Modal
        title="Indian Hospital Payroll Formula Breakdown"
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSummary(null);
        }}
      >
        {selectedSummary && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedSummary.employeeName}</h4>
                <p className="text-slate-500 font-mono">
                  ID: {selectedSummary.employeeId} | {selectedSummary.designation}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-mono">Month: {selectedSummary.month}</span>
              </div>
            </div>

            {/* Attendance Formulas */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                1. Synced Attendance Breakdown
              </h5>
              <div className="grid grid-cols-4 gap-2 text-center bg-slate-100 p-3 rounded-xl border">
                <div>
                  <span className="text-slate-500 block text-[9px]">Working Days</span>
                  <span className="font-bold text-slate-900">{selectedSummary.attendanceSummary.workingDays}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Present</span>
                  <span className="font-bold text-emerald-600">{selectedSummary.attendanceSummary.presentDays}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Half Day (0.5x)</span>
                  <span className="font-bold text-amber-600">{selectedSummary.attendanceSummary.halfDays}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Paid Leave</span>
                  <span className="font-bold text-sky-600">{selectedSummary.attendanceSummary.paidLeaveDays}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Weekly Off</span>
                  <span className="font-bold text-indigo-600">{selectedSummary.attendanceSummary.weeklyOffs}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Holidays</span>
                  <span className="font-bold text-purple-600">{selectedSummary.attendanceSummary.holidays}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Unpaid LOP</span>
                  <span className="font-bold text-rose-600">{selectedSummary.attendanceSummary.unpaidLeaveDays}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Effective Present</span>
                  <span className="font-bold text-emerald-700">{selectedSummary.attendanceSummary.effectivePresentDays} d</span>
                </div>
              </div>
            </div>

            {/* Formula Rates Box */}
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl space-y-1 font-mono text-[11px] text-amber-950">
              <div className="flex justify-between">
                <span>Per Day Salary Rate:</span>
                <span className="font-bold">₹{selectedSummary.salaryBreakdown.perDaySalary} / day</span>
              </div>
              <div className="flex justify-between">
                <span>Overtime Hourly Rate (1.5x):</span>
                <span className="font-bold">₹{selectedSummary.salaryBreakdown.hourlyRate} / hr</span>
              </div>
            </div>

            {/* Detailed Salary Components Table */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                2. Salary Calculation Formula Table
              </h5>
              <div className="border rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="p-2 flex justify-between bg-slate-50 font-semibold">
                  <span>Basic Salary</span>
                  <span>₹{selectedSummary.salaryBreakdown.basicSalary.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>Allowances</span>
                  <span>+ ₹{selectedSummary.salaryBreakdown.allowances.toLocaleString("en-IN")}</span>
                </div>
                {selectedSummary.salaryBreakdown.specialAllowance > 0 && (
                  <div className="p-2 flex justify-between">
                    <span>Special Allowance (Accountant)</span>
                    <span>+ ₹{selectedSummary.salaryBreakdown.specialAllowance.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {selectedSummary.salaryBreakdown.bonus > 0 && (
                  <div className="p-2 flex justify-between">
                    <span>Bonus</span>
                    <span>+ ₹{selectedSummary.salaryBreakdown.bonus.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {selectedSummary.salaryBreakdown.incentives > 0 && (
                  <div className="p-2 flex justify-between">
                    <span>Incentives</span>
                    <span>+ ₹{selectedSummary.salaryBreakdown.incentives.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="p-2 flex justify-between">
                  <span>Overtime Payment ({selectedSummary.attendanceSummary.overtimeHours} hrs @ 1.5x)</span>
                  <span>+ ₹{selectedSummary.salaryBreakdown.overtimePayment.toLocaleString("en-IN")}</span>
                </div>

                <div className="p-2 flex justify-between bg-emerald-50 text-emerald-950 font-bold">
                  <span>Gross Salary</span>
                  <span>₹{selectedSummary.salaryBreakdown.grossSalary.toLocaleString("en-IN")}</span>
                </div>

                <div className="p-2 flex justify-between text-rose-700">
                  <span>
                    LOP Deduction ({selectedSummary.attendanceSummary.unpaidLeaveDays} days @ ₹{selectedSummary.salaryBreakdown.perDaySalary}/day)
                  </span>
                  <span>- ₹{selectedSummary.salaryBreakdown.lopDeduction.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-2 flex justify-between text-rose-700">
                  <span>Provident Fund (PF - 12%)</span>
                  <span>- ₹{selectedSummary.salaryBreakdown.pfDeduction.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-2 flex justify-between text-rose-700">
                  <span>ESI Deduction (0.75%)</span>
                  <span>- ₹{selectedSummary.salaryBreakdown.esiDeduction.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-2 flex justify-between text-rose-700">
                  <span>Professional Tax (PT)</span>
                  <span>- ₹{selectedSummary.salaryBreakdown.professionalTax.toLocaleString("en-IN")}</span>
                </div>
                {selectedSummary.salaryBreakdown.recovery > 0 && (
                  <div className="p-2 flex justify-between text-rose-700">
                    <span>Recovery / Advance Deduction</span>
                    <span>- ₹{selectedSummary.salaryBreakdown.recovery.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="p-2.5 flex justify-between bg-navy-900 text-white font-bold text-sm">
                  <span>Calculated Net Payable Salary</span>
                  <span>₹{selectedSummary.salaryBreakdown.netSalary.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {selectedSummary.remarks && (
              <div className="p-2.5 bg-slate-50 border rounded-lg text-slate-700">
                <span className="font-semibold text-slate-900 block">Accountant Remarks:</span>
                <p>{selectedSummary.remarks}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
              {selectedSummary.status !== "Disbursed" && selectedSummary.status !== "Paid" && (
                <Button onClick={() => { setIsDetailOpen(false); handleDisburseSingle(selectedSummary); }}>
                  Disburse Payment Now
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: OFFICIAL PAYSLIP PREVIEW (MATCHING SCREENSHOT) */}
      <Modal
        title="Payslip Preview"
        isOpen={isPayslipOpen}
        onClose={() => {
          setIsPayslipOpen(false);
          setSelectedSummary(null);
        }}
      >
        {selectedSummary && (
          <div className="space-y-4">
            <div id="payslip-print-area" className="space-y-5 text-xs p-1 bg-white">
              {/* Hospital Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#1e2b4f]">HMS Enterprise</h3>
                  <p className="text-[11px] text-slate-400">Employee Payslip Receipt</p>
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-slate-800 tracking-wider text-[11px] uppercase">
                    SALARY STATEMENT
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedSummary.month}
                  </p>
                </div>
              </div>

              {/* Employee Info Block */}
              <div className="bg-slate-50/80 p-4 rounded-xl flex justify-between items-start border border-slate-100/80">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    EMPLOYEE INFO:
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{selectedSummary.employeeName}</p>
                  <p className="text-slate-500 font-mono text-xs">ID: {selectedSummary.employeeId}</p>
                  <p className="text-slate-500 text-xs">Role: {selectedSummary.designation}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    STATUS:
                  </span>
                  <span className="font-bold text-emerald-600 uppercase tracking-wider text-xs block">
                    {selectedSummary.status === "Draft" ? "UNPROCESSED" : selectedSummary.status}
                  </span>
                </div>
              </div>

              {/* Salary Component Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/60 border-b border-slate-100 text-slate-500 font-semibold text-xs">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Salary Component</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Inflow (₹)</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Deduction (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-800">Basic Salary</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-800">
                        ₹{selectedSummary.salaryBreakdown.basicSalary.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-normal">—</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-800">Allowance & Bonuses</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-800">
                        ₹{(
                          selectedSummary.salaryBreakdown.allowances +
                          (selectedSummary.salaryBreakdown.specialAllowance || 0) +
                          (selectedSummary.salaryBreakdown.bonus || 0) +
                          (selectedSummary.salaryBreakdown.incentives || 0) +
                          (selectedSummary.salaryBreakdown.overtimePayment || 0)
                        ).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-normal">—</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        Professional Tax, PF, Deductions
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-normal">—</td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600">
                        ₹{selectedSummary.salaryBreakdown.totalDeductions.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Salary Disbursed */}
              <div className="flex justify-between items-center py-2 px-1">
                <span className="font-bold text-slate-900 text-sm">Net Salary Disbursed:</span>
                <span className="font-bold text-[#1e2b4f] text-base font-sans">
                  ₹{selectedSummary.salaryBreakdown.netSalary.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Modal Footer Actions (Hidden on Printed Page) */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                <span>Print Payslip</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPayslipOpen(false)}
                className="bg-[#1e2b4f] hover:bg-[#15203d] text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


