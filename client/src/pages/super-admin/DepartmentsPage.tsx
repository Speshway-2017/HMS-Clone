import { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ArrowRight, MoreVertical, Pencil, PowerOff, Power, Trash2, AlertTriangle, Building2, MapPin } from "lucide-react";
import { useDepartments, useToggleDepartmentStatus, useDeleteDepartment } from "../../features/departments";
import { useHospitals } from "../../features/hospitals";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { getDepartmentTheme } from "../../config/departmentTheme";
import { ROLE_HOME_PATH } from "../../types/auth";
import { Department } from "../../types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// Status label map
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { text: string; tone: "success" | "danger" | "warning" }> = {
  operational: { text: "Operational", tone: "success" },
  critical_load: { text: "Critical Load", tone: "danger" },
  peak_hours: { text: "Peak Hours", tone: "warning" },
  inactive: { text: "Inactive", tone: "warning" },
  under_maintenance: { text: "Under Maintenance", tone: "warning" },
  temporarily_closed: { text: "Temporarily Closed", tone: "danger" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Three-dot menu component
// ─────────────────────────────────────────────────────────────────────────────

interface ThreeDotMenuProps {
  department: Department;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isSuperAdmin?: boolean;
}

function ThreeDotMenu({ department, onEdit, onToggleStatus, onDelete, isToggling, isSuperAdmin }: ThreeDotMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function close() { setOpen(false); }

  function handleEdit() { close(); onEdit(); }
  function handleToggle() { close(); onToggleStatus(); }
  function handleDelete() { close(); onDelete(); }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        id={`dept-menu-${department._id}`}
        aria-label="Department options"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        onBlur={(e) => {
          if (!menuRef.current?.contains(e.relatedTarget as Node)) close();
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-48 origin-top-right rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {/* Edit - Super Admin only */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleEdit}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5 text-emerald-600" />
              Edit Department
            </button>
          )}

          {/* Disable / Enable - Available to both Super Admin and Hospital Admin */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {department.isDisabled ? (
              <>
                <Power className="h-3.5 w-3.5 text-emerald-600" />
                Enable Department
              </>
            ) : (
              <>
                <PowerOff className="h-3.5 w-3.5 text-amber-600" />
                Disable Department
              </>
            )}
          </button>

          {/* Delete - Super Admin only */}
          {isSuperAdmin && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Department
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete confirmation modal
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  department: Department | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  errorMessage: string | null;
}

function DeleteConfirmModal({ department, onConfirm, onCancel, isDeleting, errorMessage }: DeleteConfirmModalProps) {
  if (!department) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">Delete Department</h3>
        <p className="mt-2 text-sm text-slate-500">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-700">"{department.name}"</span>?
          This action cannot be undone.
        </p>
        {errorMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            disabled={isDeleting || !!errorMessage}
            id="confirm-delete-dept-btn"
          >
            {isDeleting ? "Deleting…" : "Yes, Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function DepartmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const basePath = ROLE_HOME_PATH[user!.role];
  const isSuperAdmin = user?.role === "super_admin";

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(() => {
    return (typeof window !== "undefined" && localStorage.getItem("hms_super_admin_active_hospital_id")) || "all";
  });

  useEffect(() => {
    const handleContextChange = () => {
      const stored = localStorage.getItem("hms_super_admin_active_hospital_id") || "all";
      setSelectedHospitalId(stored);
    };
    window.addEventListener("hospital_context_change", handleContextChange);
    return () => window.removeEventListener("hospital_context_change", handleContextChange);
  }, []);

  const { data: hospitalsData } = useHospitals({ page: 1, limit: 100 }, { enabled: isSuperAdmin });

  const effectiveHospitalId = isSuperAdmin ? (selectedHospitalId !== "all" ? selectedHospitalId : undefined) : undefined;
  const { data: departments, isLoading } = useDepartments(effectiveHospitalId);

  // Delete state
  const deleteDept = useDeleteDepartment();
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toggle (disable/enable)
  const toggleStatusMap = useRef<Map<string, ReturnType<typeof useToggleDepartmentStatus>>>(new Map());

  function getToggle(id: string) {
    if (!toggleStatusMap.current.has(id)) {
      // We cannot call hooks conditionally, so we maintain a single shared mutation
    }
    return id;
  }
  void getToggle; // suppress unused warning — handled via ToggleWrapper below

  function handleDeleteClick(dept: Department) {
    setDeleteError(null);
    setDeleteTarget(dept);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deleteDept.mutateAsync(deleteTarget._id);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete department.";
      setDeleteError(msg);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-emerald-700 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Clinical Departments</h1>
          <p className="mt-1 text-sm text-emerald-100">
            {isSuperAdmin
              ? "Manage medical infrastructure and monitor departments across all registered hospitals."
              : "Manage medical infrastructure and monitor departments for your hospital."}
          </p>
        </div>
        {isSuperAdmin && (
          <Link to={`${basePath}/departments/new`}>
            <Button variant="secondary" className="bg-white">
              <Plus className="h-4 w-4" /> Add Department
            </Button>
          </Link>
        )}
      </div>

      {/* Parent Hospital Filter for Super Admin */}
      {isSuperAdmin && hospitalsData?.data && hospitalsData.data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Filter By Parent Hospital:
            </span>
            <select
              value={selectedHospitalId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedHospitalId(newId);
                localStorage.setItem("hms_super_admin_active_hospital_id", newId);
                const hosp = hospitalsData.data.find((h) => h._id === newId);
                if (hosp) {
                  localStorage.setItem("hms_hospital_name", hosp.name);
                  if (hosp.logoUrl) localStorage.setItem("hms_hospital_logo", hosp.logoUrl);
                }
                window.dispatchEvent(new Event("hospital_context_change"));
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="all">All Hospitals (Consolidated Network)</option>
              {hospitalsData.data.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} {h.code ? `(${h.code})` : ""}
                </option>
              ))}
            </select>
          </div>
          {selectedHospitalId !== "all" && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Displaying departments for selected hospital only
            </span>
          )}
        </div>
      )}

      {isLoading && <p className="text-slate-400">Loading...</p>}
      {!isLoading && departments?.length === 0 && (
        <p className="text-slate-400">No departments yet — add the first one.</p>
      )}

      {!isLoading && departments && departments.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <DepartmentCard
              key={dept._id}
              dept={dept}
              basePath={basePath}
              onEdit={() => navigate(`${basePath}/departments/${dept._id}/edit`)}
              onDeleteClick={() => handleDeleteClick(dept)}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        department={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
        isDeleting={deleteDept.isPending}
        errorMessage={deleteError}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Department card (extracted so each card manages its own toggle mutation)
// ─────────────────────────────────────────────────────────────────────────────

interface DepartmentCardProps {
  dept: Department;
  basePath: string;
  onEdit: () => void;
  onDeleteClick: () => void;
  isSuperAdmin?: boolean;
}

function DepartmentCard({ dept, basePath, onEdit, onDeleteClick, isSuperAdmin }: DepartmentCardProps) {
  const theme = getDepartmentTheme(dept.category);
  const status = STATUS_LABEL[dept.status] ?? STATUS_LABEL.operational;
  const toggleStatus = useToggleDepartmentStatus(dept._id);

  return (
    <div
      className={`relative rounded-xl border bg-slate-50 p-5 transition ${dept.isDisabled ? "border-slate-200 opacity-70" : "border-slate-200"
        }`}
      style={dept.colorTheme ? { borderLeftColor: dept.colorTheme, borderLeftWidth: 3 } : {}}
    >
      {/* Top row: icon + status + menu */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-lg p-2.5 ${theme.className}`}>
            <theme.icon className="h-5 w-5" />
          </span>
          {dept.isDisabled && (
            <Badge tone="warning">Disabled</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!dept.isDisabled && <Badge tone={status.tone}>{status.text}</Badge>}
          <ThreeDotMenu
            department={dept}
            onEdit={onEdit}
            onToggleStatus={() => toggleStatus.mutate()}
            onDelete={onDeleteClick}
            isToggling={toggleStatus.isPending}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </div>

      {/* Name + Code */}
      <h3 className="text-lg font-semibold text-emerald-800">{dept.name}</h3>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {dept.code && (
          <span className="font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            {dept.code}
          </span>
        )}
      </div>

      {/* Facility Location */}
      {dept.location && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{dept.location}</span>
        </div>
      )}

      {/* Description */}
      {dept.description ? (
        <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">{dept.description}</p>
      ) : !dept.location && (!dept.services || dept.services.length === 0) ? (
        <p className="mt-1.5 text-xs text-slate-400 italic">Integrated clinical care department</p>
      ) : null}

      {/* Extra badges */}
      {(dept.isEmergency || dept.specialization) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {dept.isEmergency && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 border border-red-100">
              24/7 Emergency
            </span>
          )}
          {dept.specialization && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
              {dept.specialization}
            </span>
          )}
        </div>
      )}

      {/* Services pills preview */}
      {dept.services && dept.services.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {dept.services.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-md bg-emerald-50/80 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100/80"
            >
              {s}
            </span>
          ))}
          {dept.services.length > 3 && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
              +{dept.services.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Relevant Clinical Outcomes & Parameters Grid (Replaced irrelevant Beds & Rating) */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 bg-white py-2 text-center shadow-2xs">
          <div className="text-[11px] font-medium text-slate-400">Specialists</div>
          <div className="text-sm font-bold text-slate-800">{dept.doctors || 0}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white py-2 text-center shadow-2xs">
          <div className="text-[11px] font-medium text-slate-400">Services</div>
          <div className="text-sm font-bold text-emerald-700">
            {dept.services?.length ? `${dept.services.length} Active` : "General"}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white py-2 text-center shadow-2xs">
          <div className="text-[11px] font-medium text-slate-400">Care Unit</div>
          <div className="text-xs font-bold text-slate-700 truncate px-1">
            {dept.isEmergency ? "Emergency" : "Standard"}
          </div>
        </div>
      </div>

      {/* Consultation fee (if set) */}
      {dept.consultationFee > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Consultation:{" "}
          <span className="font-semibold text-slate-700">
            ₹{dept.consultationFee.toLocaleString("en-IN")}
          </span>
        </p>
      )}

      {/* View Metrics button */}
      <Link to={`${basePath}/departments/${dept._id}/metrics`}>
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center border-emerald-200 text-emerald-700"
        >
          View Full Metrics <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
