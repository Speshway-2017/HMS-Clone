import { FormEvent, useEffect, useRef, useState } from "react";
import {
  X,
  Pencil,
  Building2,
  MapPin,
  User2,
  BadgeDollarSign,
  Settings2,
  Palette,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Department } from "../../types/domain";
import { useUpdateDepartment } from "../../features/departments";
import { useDoctors } from "../../features/doctors";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEPT_CODE_RE = /^[A-Za-z0-9\-_]{0,20}$/;

const STATUS_OPTIONS = [
  { value: "operational", label: "Operational" },
  { value: "under_maintenance", label: "Under Maintenance" },
  { value: "temporarily_closed", label: "Temporarily Closed" },
  { value: "critical_load", label: "Critical Load" },
  { value: "peak_hours", label: "Peak Hours" },
  { value: "inactive", label: "Inactive" },
] as const;

const COLOR_PALETTES = [
  { value: "#1e3a5f", label: "Navy Blue" },
  { value: "#0f766e", label: "Teal" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#b91c1c", label: "Crimson" },
  { value: "#0369a1", label: "Sky Blue" },
  { value: "#166534", label: "Forest Green" },
  { value: "#92400e", label: "Amber" },
  { value: "#374151", label: "Slate" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Form state type
// ─────────────────────────────────────────────────────────────────────────────

interface DeptFormState {
  name: string;
  code: string;
  description: string;
  specialization: string;
  departmentHead: string;
  floor: string;
  building: string;
  consultationFee: string;
  isEmergency: boolean;
  status: Department["status"];
  colorTheme: string;
  displayOrder: string;
}

function toFormState(dept: Department): DeptFormState {
  return {
    name: dept.name,
    code: dept.code ?? "",
    description: dept.description ?? "",
    specialization: dept.specialization ?? "",
    departmentHead:
      typeof dept.departmentHead === "object" && dept.departmentHead !== null
        ? dept.departmentHead._id
        : (dept.departmentHead as string) ?? "",
    floor: dept.floor ?? "",
    building: dept.building ?? "",
    consultationFee: String(dept.consultationFee ?? 0),
    isEmergency: dept.isEmergency ?? false,
    status: dept.status ?? "operational",
    colorTheme: dept.colorTheme ?? "",
    displayOrder: String(dept.displayOrder ?? 0),
  };
}

function hasChanges(original: DeptFormState, current: DeptFormState): boolean {
  return (Object.keys(original) as Array<keyof DeptFormState>).some(
    (k) => String(original[k]) !== String(current[k]),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface EditDepartmentModalProps {
  department: Department | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditDepartmentModal({ department, isOpen, onClose }: EditDepartmentModalProps) {
  const updateDept = useUpdateDepartment(department?._id ?? "");

  // Fetch doctors list for Department Head dropdown
  const { data: doctorsData } = useDoctors(
    { department: undefined },
    { enabled: isOpen },
  );

  const [form, setForm] = useState<DeptFormState>(() =>
    department ? toFormState(department) : ({} as DeptFormState),
  );
  const [originalForm, setOriginalForm] = useState<DeptFormState>(() =>
    department ? toFormState(department) : ({} as DeptFormState),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof DeptFormState, string>>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Re-populate whenever a new department is opened
  useEffect(() => {
    if (department && isOpen) {
      const state = toFormState(department);
      setForm(state);
      setOriginalForm(state);
      setErrors({});
      setFeedback(null);
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [department, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !department) return null;

  // ── Helpers ────────────────────────────────────────────────────────────

  function set<K extends keyof DeptFormState>(field: K, value: DeptFormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // ── Validation ─────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Partial<Record<keyof DeptFormState, string>> = {};

    const trimmedName = form.name.trim();
    if (!trimmedName) errs.name = "Department name is required.";
    else if (trimmedName.length < 2) errs.name = "Name must be at least 2 characters.";

    if (form.code.trim() && !DEPT_CODE_RE.test(form.code.trim())) {
      errs.code = "Code must be 1–20 alphanumeric/dash/underscore characters.";
    }

    const fee = parseFloat(form.consultationFee);
    if (isNaN(fee) || fee < 0) errs.consultationFee = "Consultation fee cannot be negative.";

    const order = parseInt(form.displayOrder, 10);
    if (isNaN(order)) errs.displayOrder = "Display order must be a whole number.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!validate()) return;

    // Change detection
    if (!hasChanges(originalForm, form)) {
      setFeedback({ type: "info", message: "No changes detected." });
      return;
    }

    const payload: Partial<Department> = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim(),
      specialization: form.specialization.trim(),
      departmentHead: form.departmentHead || null,
      floor: form.floor.trim(),
      building: form.building.trim(),
      consultationFee: parseFloat(form.consultationFee) || 0,
      isEmergency: form.isEmergency,
      status: form.status,
      colorTheme: form.colorTheme,
      displayOrder: parseInt(form.displayOrder, 10) || 0,
    };

    try {
      await updateDept.mutateAsync(payload);
      setFeedback({ type: "success", message: "Department updated successfully." });
      setOriginalForm(form); // reset baseline so subsequent edits are tracked correctly
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not update department. Please try again.";
      setFeedback({ type: "error", message: msg });
    }
  }

  const isSaving = updateDept.isPending;
  const doctors = doctorsData?.data ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-navy-700 to-navy-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Pencil className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Edit Department</h2>
              <p className="text-xs text-navy-200">{department.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Feedback banner ────────────────────────────────────────── */}
        {feedback && (
          <div
            className={`flex items-center gap-2 border-b px-6 py-3 text-sm font-medium ${
              feedback.type === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : feedback.type === "info"
                ? "border-amber-100 bg-amber-50 text-amber-700"
                : "border-red-100 bg-red-50 text-red-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {feedback.message}
          </div>
        )}

        {/* ── Form ───────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="divide-y divide-slate-100">

          {/* Section: Department Identity */}
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              Department Identity
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <InputField
                  ref={nameRef}
                  id="edit-dept-name"
                  label="Department Name"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Cardiology"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              <div>
                <InputField
                  id="edit-dept-code"
                  label="Department Code"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="e.g. CARD-001"
                  maxLength={20}
                />
                {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
              </div>
              <div className="sm:col-span-2">
                <TextareaField
                  id="edit-dept-description"
                  label="Description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Brief description of the department's purpose"
                  rows={2}
                />
              </div>
              <InputField
                id="edit-dept-specialization"
                label="Specialization"
                value={form.specialization}
                onChange={(e) => set("specialization", e.target.value)}
                placeholder="e.g. Interventional Cardiology"
              />
              <SelectField
                id="edit-dept-status"
                label="Department Status"
                value={form.status}
                onChange={(e) => set("status", e.target.value as Department["status"])}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </SelectField>
            </div>
          </div>

          {/* Section: Leadership */}
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <User2 className="h-3.5 w-3.5" />
              Leadership
            </div>
            <SelectField
              id="edit-dept-head"
              label="Department Head (Doctor)"
              value={form.departmentHead}
              onChange={(e) => set("departmentHead", e.target.value)}
            >
              <option value="">— None assigned —</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name}{doc.specialization ? ` — ${doc.specialization}` : ""}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Section: Location */}
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                id="edit-dept-floor"
                label="Floor"
                value={form.floor}
                onChange={(e) => set("floor", e.target.value)}
                placeholder="e.g. 3rd Floor"
              />
              <InputField
                id="edit-dept-building"
                label="Building"
                value={form.building}
                onChange={(e) => set("building", e.target.value)}
                placeholder="e.g. Block A"
              />
              <InputField
                id="edit-dept-location"
                label="Wing / Location"
                value={""}
                readOnly
                disabled
                placeholder="Use floor + building"
              />
            </div>
          </div>

          {/* Section: Financial & Operational */}
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              Financial &amp; Operational
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <InputField
                  id="edit-dept-fee"
                  label="Consultation Fee (₹)"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.consultationFee}
                  onChange={(e) => set("consultationFee", e.target.value)}
                  placeholder="e.g. 500"
                />
                {errors.consultationFee && (
                  <p className="mt-1 text-xs text-red-500">{errors.consultationFee}</p>
                )}
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 transition hover:bg-slate-100 w-full">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex-1">
                    Emergency Department
                  </span>
                  <div className="relative">
                    <input
                      id="edit-dept-emergency"
                      type="checkbox"
                      className="sr-only"
                      checked={form.isEmergency}
                      onChange={(e) => set("isEmergency", e.target.checked)}
                    />
                    <div
                      className={`h-6 w-11 rounded-full transition-colors ${
                        form.isEmergency ? "bg-red-500" : "bg-slate-300"
                      }`}
                    />
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        form.isEmergency ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Display Settings */}
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Settings2 className="h-3.5 w-3.5" />
              Display Settings
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <InputField
                  id="edit-dept-order"
                  label="Display Order"
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(e) => set("displayOrder", e.target.value)}
                  placeholder="0"
                  hint="Lower number = appears first"
                />
                {errors.displayOrder && (
                  <p className="mt-1 text-xs text-red-500">{errors.displayOrder}</p>
                )}
              </div>
              <div>
                <div className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <Palette className="h-3 w-3" />
                  Color Theme
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLOR_PALETTES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      aria-label={`Select ${c.label}`}
                      onClick={() => set("colorTheme", c.value)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        form.colorTheme === c.value
                          ? "border-slate-800 scale-110 shadow-md"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <button
                    type="button"
                    title="No color"
                    onClick={() => set("colorTheme", "")}
                    className={`h-7 w-7 rounded-full border-2 border-slate-300 bg-white text-slate-300 transition-transform hover:scale-110 ${
                      !form.colorTheme ? "border-slate-800 scale-110 shadow-md" : ""
                    }`}
                  >
                    <X className="h-3 w-3 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-b-2xl bg-slate-50 px-6 py-4">
            <p className="text-xs text-slate-400">
              Department ID: <span className="font-mono text-slate-500">{department._id}</span>
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving} id="edit-dept-save-btn">
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
