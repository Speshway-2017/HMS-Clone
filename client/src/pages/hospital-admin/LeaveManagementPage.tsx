import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Check,
  Ban,
  AlertCircle,
  Zap,
} from "lucide-react";
import {
  useLeaveRequests,
  useApplyLeave,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
  LeaveRequest,
} from "../../features/leaves";
import { useStaffList } from "../../features/staff";
import { useDoctors } from "../../features/doctors";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { socket } from "../../lib/socket";

export function LeaveManagementPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>("Pending");
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Apply Leave Modal State
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveRequest["leaveType"]>("Casual Leave");
  const [fromDate, setFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    employeeId?: string;
    leaveType?: string;
    fromDate?: string;
    toDate?: string;
    reason?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Reject Modal State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries & Mutations
  const { data: leavesRes, isLoading: leavesLoading, refetch } = useLeaveRequests({
    status: selectedStatus || undefined,
    leaveType: selectedLeaveType || undefined,
    search: search || undefined,
  });

  useEffect(() => {
    const handleSync = () => refetch();
    socket.on("leave:updated", handleSync);
    socket.on("dashboard_update", handleSync);
    return () => {
      socket.off("leave:updated", handleSync);
      socket.off("dashboard_update", handleSync);
    };
  }, [refetch]);

  const { data: staffRes } = useStaffList({});
  const { data: docRes } = useDoctors({} as any);

  const applyLeave = useApplyLeave();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();
  const cancelLeave = useCancelLeave();

  // Unified Employee list for dropdown
  const allEmployees: any[] = [];
  if (docRes?.data) {
    docRes.data.forEach((doc: any) => {
      allEmployees.push({
        _id: doc._id,
        employeeId: doc.licenseNo || `DOC-${doc._id.slice(-5).toUpperCase()}`,
        name: doc.name,
        type: "Doctor",
        role: doc.specialization ? `Doctor (${doc.specialization})` : "Doctor",
      });
    });
  }
  if (staffRes?.data) {
    staffRes.data.forEach((st: any) => {
      allEmployees.push({
        _id: st._id,
        employeeId: st.employeeId || `STF-${st._id.slice(-5).toUpperCase()}`,
        name: st.name,
        type: "Staff",
        role: st.role || "Staff Member",
      });
    });
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errs: Record<string, string> = {};
    if (!selectedEmployeeId) {
      errs.employeeId = "Please select an employee. Please enter valid data";
    }
    if (!fromDate) {
      errs.fromDate = "From Date is required. Please enter valid data";
    }
    if (!toDate) {
      errs.toDate = "To Date is required. Please enter valid data";
    }
    if (fromDate && toDate && fromDate > toDate) {
      errs.toDate = "To Date cannot be earlier than From Date. Please enter valid data";
    }
    if (reason && reason.length > 500) {
      errs.reason = "Reason cannot exceed 500 characters. Please enter valid data";
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstErr = Object.values(errs)[0];
      setFormError("Please enter valid data");
      toast.error(firstErr || "Please enter valid data", { id: "leave-val-err" });
      return;
    }

    const emp = allEmployees.find((e) => e.employeeId === selectedEmployeeId || e._id === selectedEmployeeId);
    if (!emp) {
      toast.error("Selected employee not found. Please enter valid data");
      return;
    }

    try {
      await applyLeave.mutateAsync({
        employeeId: emp._id || emp.employeeId,
        employeeType: emp.type,
        leaveType,
        fromDate,
        toDate,
        reason: reason.trim(),
      });

      toast.success("Staff leave applied successfully!");
      setIsApplyOpen(false);
      setSelectedEmployeeId("");
      setReason("");
      setFieldErrors({});
      setFormError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to submit leave request. Please enter valid data";
      setFormError("Please enter valid data");
      toast.error(msg, { id: "apply-leave-err" });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeave.mutateAsync(id);
      toast.success("Leave request approved successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to approve leave");
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingLeaveId) return;
    try {
      await rejectLeave.mutateAsync({ id: rejectingLeaveId, rejectionReason });
      toast.success("Leave request rejected successfully.");
      setIsRejectOpen(false);
      setRejectingLeaveId(null);
      setRejectionReason("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to reject leave");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelLeave.mutateAsync(id);
      toast.success("Leave request cancelled successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to cancel leave");
    }
  };

  const leaves: LeaveRequest[] = leavesRes?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge tone="success">Approved</Badge>;
      case "Rejected":
        return <Badge tone="danger">Rejected</Badge>;
      case "Cancelled":
        return <Badge tone="neutral">Cancelled</Badge>;
      default:
        return <Badge tone="warning">Pending Approval</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Leave Management</h1>
          <p className="text-sm text-slate-500">
            Process staff leave applications with automatic real-time attendance sync and LOP calculations.
          </p>
        </div>
        <Button onClick={() => { setIsApplyOpen(true); setFieldErrors({}); setFormError(null); }} className="flex items-center gap-2" aria-label="Apply Staff Leave">
          <Plus className="h-4 w-4" /> Apply Staff Leave
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Pending Approvals"
          value={leaves.filter((l) => l.status === "Pending").length}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <KpiCard
          label="Approved Leaves"
          value={leaves.filter((l) => l.status === "Approved").length}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <KpiCard
          label="Unpaid Leaves (LOP)"
          value={leaves.filter((l) => l.leaveType === "Unpaid Leave" && l.status === "Approved").length}
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
        />
        <KpiCard
          label="Rejected Requests"
          value={leaves.filter((l) => l.status === "Rejected").length}
          icon={<XCircle className="h-5 w-5 text-slate-600" />}
        />
      </div>

      {/* Filter Bar */}
      <Card className="p-4 bg-slate-50 border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <SelectField
            label="Status Filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </SelectField>

          <SelectField
            label="Leave Type"
            value={selectedLeaveType}
            onChange={(e) => setSelectedLeaveType(e.target.value)}
          >
            <option value="">All Leave Types</option>
            <option value="Casual Leave">Casual Leave</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Earned Leave">Earned Leave</option>
            <option value="Maternity Leave">Maternity Leave</option>
            <option value="Paternity Leave">Paternity Leave</option>
            <option value="Compensatory Leave">Compensatory Leave</option>
            <option value="Unpaid Leave">Unpaid Leave (LOP)</option>
          </SelectField>

          <div className="flex flex-col justify-end sm:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Employee Name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Leave Requests Table */}
      <Card className="overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Leave Applications</h3>
          <span className="text-xs text-slate-500">
            Approved leaves automatically update daily staff attendance
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Leave ID</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4 text-center">Total Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leavesLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading leave requests...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No leave requests found for the selected criteria.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-semibold text-navy-700">
                      {leave.leaveId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{leave.employeeName}</div>
                      <div className="text-xs font-mono text-slate-500">{leave.employeeId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          leave.leaveType === "Unpaid Leave"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {leave.leaveType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {leave.fromDate} → {leave.toDate}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {leave.totalDays}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {leave.reason || "No reason specified"}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(leave.status)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {leave.status === "Pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(leave._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRejectingLeaveId(leave._id);
                              setIsRejectOpen(true);
                            }}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {leave.status === "Approved" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCancel(leave._id)}
                          className="text-slate-600 hover:bg-slate-100"
                        >
                          Cancel Leave
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* APPLY LEAVE MODAL */}
      <Modal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        title="Apply Staff Leave"
      >
        <form onSubmit={handleApplySubmit} noValidate className="space-y-4">
          <SelectField
            label="Select Employee"
            value={selectedEmployeeId}
            error={fieldErrors.employeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              setFieldErrors((prev) => ({ ...prev, employeeId: undefined }));
              if (formError === "Please enter valid data") setFormError(null);
            }}
            required
          >
            <option value="">Select Employee...</option>
            {allEmployees.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.name} ({emp.employeeId}) - {emp.role}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Leave Type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as any)}
            required
          >
            <option value="Casual Leave">Casual Leave (Paid)</option>
            <option value="Sick Leave">Sick Leave (Paid)</option>
            <option value="Earned Leave">Earned Leave (Paid)</option>
            <option value="Maternity Leave">Maternity Leave (Paid)</option>
            <option value="Paternity Leave">Paternity Leave (Paid)</option>
            <option value="Compensatory Leave">Compensatory Leave (Paid)</option>
            <option value="Unpaid Leave">Unpaid Leave (Loss of Pay - LOP)</option>
            <option value="Unpaid Leave (LOP)">Unpaid Leave (LOP)</option>
            <option value="Emergency Leave">Emergency Leave</option>
            <option value="Paid Leave">Paid Leave</option>
          </SelectField>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="From Date"
              type="date"
              value={fromDate}
              error={fieldErrors.fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, fromDate: undefined }));
                if (formError === "Please enter valid data") setFormError(null);
              }}
              required
            />
            <InputField
              label="To Date"
              type="date"
              value={toDate}
              error={fieldErrors.toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, toDate: undefined }));
                if (formError === "Please enter valid data") setFormError(null);
              }}
              required
            />
          </div>

          <TextareaField
            label="Reason for Leave"
            rows={3}
            value={reason}
            error={fieldErrors.reason}
            maxLength={500}
            showCharCount
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.length <= 500) {
                setFieldErrors((prev) => ({ ...prev, reason: undefined }));
              }
            }}
            placeholder="Provide reason for leave request..."
          />

          {formError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-md text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Once approved, attendance records for this period will automatically update. Unpaid leave will auto-deduct in Payroll.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setIsApplyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Leave Request</Button>
          </div>
        </form>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Leave Request"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason</label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State the reason for rejecting this leave..."
              className="w-full text-sm border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
              Reject Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
