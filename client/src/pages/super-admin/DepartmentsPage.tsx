import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowRight, MoreVertical, Pencil, PowerOff, Power, Trash2, AlertTriangle } from "lucide-react";
import { useDepartments, useToggleDepartmentStatus, useDeleteDepartment } from "../../features/departments";
import { useAuth } from "../../context/AuthContext";
import { useBranchContext } from "../../context/BranchContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { getDepartmentTheme } from "../../config/departmentTheme";
import { ROLE_HOME_PATH } from "../../types/auth";
import { Department } from "../../types/domain";
import { EditDepartmentModal } from "./EditDepartmentModal";

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
}

function ThreeDotMenu({ department, onEdit, onToggleStatus, onDelete, isToggling }: ThreeDotMenuProps) {
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
          {/* Edit */}
          <button
            type="button"
            onClick={handleEdit}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5 text-emerald-600" />
            Edit Department
          </button>

          {/* Disable / Enable */}
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

          <div className="my-1 border-t border-slate-100" />

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Department
          </button>
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
  const { isAllBranches } = useBranchContext();
  const { data: departments, isLoading } = useDepartments();
  const { user } = useAuth();
  const basePath = ROLE_HOME_PATH[user!.role];
  const isSuperAdmin = user?.role === "super_admin";

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Department | null>(null);

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
      {!isSuperAdmin && <AllBranchesNoticeBanner />}

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
        {(!isAllBranches || isSuperAdmin) ? (
          <Link to={`${basePath}/departments/new`}>
            <Button variant="secondary" className="bg-white">
              <Plus className="h-4 w-4" /> Add Department
            </Button>
          </Link>
        ) : (
          <Button
            variant="secondary"
            disabled
            className="bg-white/60 text-white/50 opacity-60 cursor-not-allowed border-none shadow-none"
            title="Switch to a specific branch to add departments"
          >
            <Plus className="h-4 w-4" /> Add Department (Read Only)
          </Button>
        )}
      </div>

      {isLoading && <p className="text-slate-400">Loading...</p>}
      {!isLoading && departments?.length === 0 && (
        <p className="text-slate-400">No departments yet — add the first one.</p>
      )}

      {!isLoading && departments && departments.length > 0 && (() => {
        // Group departments by branch name
        const groupedDepts: Record<string, Department[]> = {};
        departments.forEach((dept) => {
          let branchName = "Main Hospital";
          if (dept.branch && typeof dept.branch === "object") {
            branchName = dept.branch.name;
          }
          if (!groupedDepts[branchName]) {
            groupedDepts[branchName] = [];
          }
          groupedDepts[branchName].push(dept);
        });

        const branchNames = Object.keys(groupedDepts).sort((a, b) => {
          if (a === "Main Hospital") return -1;
          if (b === "Main Hospital") return 1;
          return a.localeCompare(b);
        });

        return (
          <div className="space-y-8">
            {branchNames.map((branchName) => (
              <div key={branchName} className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                  {branchName} ({groupedDepts[branchName].length})
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedDepts[branchName].map((dept) => (
                    <DepartmentCard
                      key={dept._id}
                      dept={dept}
                      basePath={basePath}
                      onEdit={() => setEditTarget(dept)}
                      onDeleteClick={() => handleDeleteClick(dept)}
                      isAllBranches={isAllBranches}
                      isSuperAdmin={isSuperAdmin}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Edit modal */}
      <EditDepartmentModal
        department={editTarget}
        isOpen={editTarget !== null}
        onClose={() => setEditTarget(null)}
      />

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
  isAllBranches: boolean;
  isSuperAdmin?: boolean;
}

function DepartmentCard({ dept, basePath, onEdit, onDeleteClick, isAllBranches, isSuperAdmin }: DepartmentCardProps) {
  const theme = getDepartmentTheme(dept.category);
  const status = STATUS_LABEL[dept.status] ?? STATUS_LABEL.operational;
  const toggleStatus = useToggleDepartmentStatus(dept._id);

  return (
    <div
      className={`relative rounded-xl border bg-slate-50 p-5 transition ${
        dept.isDisabled ? "border-slate-200 opacity-70" : "border-slate-200"
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
          {(!isAllBranches || isSuperAdmin) && (
            <ThreeDotMenu
              department={dept}
              onEdit={onEdit}
              onToggleStatus={() => toggleStatus.mutate()}
              onDelete={onDeleteClick}
              isToggling={toggleStatus.isPending}
            />
          )}
        </div>
      </div>

      {/* Name + description */}
      <h3 className="text-lg font-semibold text-emerald-700">{dept.name}</h3>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {dept.code && <span className="font-mono">{dept.code}</span>}
        {dept.branch && typeof dept.branch === "object" && (
          <>
            {dept.code && <span>•</span>}
            <span className="font-semibold text-slate-500">{dept.branch.name}</span>
          </>
        )}
      </div>
      <p className="mt-1.5 text-sm text-slate-500">{dept.description || "No description provided."}</p>

      {/* Extra badges */}
      {(dept.isEmergency || dept.specialization) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {dept.isEmergency && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              Emergency
            </span>
          )}
          {dept.specialization && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {dept.specialization}
            </span>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 bg-white py-2 text-center">
          <div className="text-xs text-slate-400">Doctors</div>
          <div className="text-sm font-semibold text-slate-800">{dept.doctors}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white py-2 text-center">
          <div className="text-xs text-slate-400">Beds</div>
          <div className="text-sm font-semibold text-slate-800">
            {dept.occupiedBeds}/{dept.totalBeds}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white py-2 text-center">
          <div className="text-xs text-slate-400">Rating</div>
          <div className="text-sm font-semibold text-slate-800">{dept.rating}%</div>
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
