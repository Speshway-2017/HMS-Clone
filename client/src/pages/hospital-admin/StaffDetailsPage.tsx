import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, UserCircle, Briefcase, Mail, Phone, Building2, CheckCircle2, Clock, Award, Activity } from "lucide-react";
import { useStaffMember } from "../../features/staff";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Staff } from "../../types/domain";

const DUTY_TONE: Record<Staff["dutyStatus"], "success" | "warning" | "neutral" | "danger"> = {
  on_duty: "success",
  late: "warning",
  off_duty: "neutral",
  on_leave: "danger",
};

export function StaffDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: staff, isLoading } = useStaffMember(id);

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading staff profile details...</div>;
  }

  if (!staff) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Staff Member Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">The requested staff record could not be found or has been removed.</p>
        <Link to="/admin/staff">
          <Button variant="primary">Return to Staff Directory</Button>
        </Link>
      </Card>
    );
  }

  const deptName = typeof staff.department === "object" && staff.department ? (staff.department as any).name : "Unassigned";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/admin/staff" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Staff Directory
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Staff Member Profile</h1>
          <p className="text-sm text-slate-500">Detailed operational credentials and professional assignment.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate("/admin/staff")}>
            Close
          </Button>
          <Link to={`/admin/staff/${staff._id}/edit`}>
            <Button variant="primary" className="bg-navy-700 hover:bg-navy-800">
              <Pencil className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Staff Banner Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {staff.photoUrl ? (
            <img src={staff.photoUrl} alt={staff.name} className="h-24 w-24 rounded-2xl object-cover border border-slate-200 shadow-md shrink-0" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-navy-100 text-2xl font-bold text-navy-700 shadow-sm shrink-0">
              {staff.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="space-y-3 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{staff.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="inline-block rounded-full bg-navy-50 px-3 py-0.5 text-xs font-bold text-navy-700 uppercase">
                    {staff.role || "Staff Member"}
                  </span>
                  <Badge tone={DUTY_TONE[staff.dutyStatus]}>{staff.dutyStatus.replace("_", " ")}</Badge>
                </div>
              </div>
              {staff.employeeId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center sm:text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Employee ID</span>
                  <span className="font-mono font-bold text-navy-700 text-sm">{staff.employeeId}</span>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{staff.email || "No email address"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{staff.phone || "No phone number"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Department: <strong className="text-slate-800">{deptName}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* Professional Details */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-navy-700 font-bold border-b pb-3">
            <Briefcase className="h-5 w-5" />
            <h3>Professional Details</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-medium">Designation / Role:</span>
              <span className="font-bold text-slate-800 capitalize">{staff.role || "Staff Member"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-medium">Assigned Department:</span>
              <span className="font-bold text-slate-800">{deptName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-medium">Employee Reference ID:</span>
              <span className="font-mono font-bold text-navy-700">{staff.employeeId || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block mb-1">Qualifications & Certifications:</span>
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-slate-700 font-medium leading-relaxed">
                {staff.qualifications || "No qualifications specified."}
              </div>
            </div>
          </div>
        </Card>

        {/* Operational Attendance & Performance */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-navy-700 font-bold border-b pb-3">
            <Activity className="h-5 w-5" />
            <h3>Operational Status & Performance</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-slate-500 font-medium">Current Duty Status:</span>
              <Badge tone={DUTY_TONE[staff.dutyStatus]}>{staff.dutyStatus.replace("_", " ")}</Badge>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-medium">Recorded Check-in Time:</span>
              <span className="font-bold text-slate-800">{staff.checkInTime || "Not Checked In"}</span>
            </div>
            <div className="space-y-1.5 border-b pb-3">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Assigned Task Load:</span>
                <span className="font-bold text-slate-800">{staff.taskLoad ?? 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-2 bg-navy-700 rounded-full" style={{ width: `${staff.taskLoad ?? 0}%` }} />
              </div>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500 font-medium">Performance Rating:</span>
              <span className="font-bold text-amber-600">★ {staff.rating ?? 5.0} / 5.0</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
