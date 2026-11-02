import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Briefcase, ClipboardList, PlusCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { useDepartment, useCreateDepartment, useUpdateDepartment } from "../../features/departments";
import { useHospitals } from "../../features/hospitals";
import { useBranches } from "../../features/branches";
import { useAuth } from "../../context/AuthContext";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { DEPARTMENT_CATEGORIES } from "../../config/departmentTheme";
import { ROLE_HOME_PATH } from "../../types/auth";
import toast from "react-hot-toast";

const PRESET_SERVICES = ["Outpatient Care", "Emergency Services", "Diagnostic Imaging", "Intensive Care (ICU)", "Pediatric Wing"];

const DEPT_LIMITS = {
  NAME: 50,
  LOCATION: 100,
  HEAD_NAME: 100,
  BEDS: 9999,
  STAFF: 9999,
} as const;

const DEPT_NAME_REGEX = /^[a-zA-Z\s\.\-&/()]+$/;
const PERSON_NAME_REGEX = /^[a-zA-Z\s\.\-']+$/;
const LOCATION_REGEX = /^[a-zA-Z0-9\s\.\-/,#()]+$/;

export function DepartmentFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const basePath = ROLE_HOME_PATH[user!.role];
  const { data: department } = useDepartment(id);
  const { data: hospitalsData } = useHospitals({ page: 1 }, { enabled: isSuperAdmin });
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment(id ?? "");

  const [form, setForm] = useState({
    name: "",
    hospital: "",
    branch: "",
    category: DEPARTMENT_CATEGORIES[0],
    description: "",
    headName: "",
    location: "",
    totalBeds: 0,
    occupiedBeds: 0,
    doctors: 0,
    nurses: 0,
    support: 0,
    services: [] as string[],
  });
  const [customService, setCustomService] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data: branchesData } = useBranches({ hospitalId: form.hospital || undefined }, { enabled: isSuperAdmin });

  useEffect(() => {
    if (department) {
      setForm({
        name: department.name,
        hospital: typeof department.hospital === "object" ? department.hospital._id : department.hospital,
        branch: department.branch ?? "",
        category: department.category,
        description: department.description,
        headName: department.headName,
        location: department.location,
        totalBeds: department.totalBeds,
        occupiedBeds: department.occupiedBeds,
        doctors: department.doctors,
        nurses: department.nurses,
        support: department.support,
        services: department.services,
      });
    }
  }, [department]);

  const validateField = (field: string, value: any): string | undefined => {
    if (field === "name") {
      const str = typeof value === "string" ? value : String(value ?? "");
      const trimmed = str.trim();
      if (!trimmed) {
        return "Department Name is required. Please fill out this field";
      }
      if (str.length > DEPT_LIMITS.NAME) {
        return `Department Name cannot exceed ${DEPT_LIMITS.NAME} characters. Please enter valid data`;
      }
      if (trimmed.length < 2 || !DEPT_NAME_REGEX.test(trimmed)) {
        return "Department Name contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "location") {
      const str = typeof value === "string" ? value : String(value ?? "");
      const trimmed = str.trim();
      if (!trimmed) return undefined;
      if (str.length > DEPT_LIMITS.LOCATION) {
        return `Location cannot exceed ${DEPT_LIMITS.LOCATION} characters. Please enter valid data`;
      }
      if (!LOCATION_REGEX.test(trimmed)) {
        return "Location contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (field === "headName") {
      const str = typeof value === "string" ? value : String(value ?? "");
      const trimmed = str.trim();
      if (!trimmed) return undefined;
      if (str.length > DEPT_LIMITS.HEAD_NAME) {
        return `Department Head cannot exceed ${DEPT_LIMITS.HEAD_NAME} characters. Please enter valid data`;
      }
      if (!PERSON_NAME_REGEX.test(trimmed)) {
        return "Department Head contains invalid data. Please enter valid data";
      }
      return undefined;
    }

    if (["totalBeds", "occupiedBeds", "doctors", "nurses", "support"].includes(field)) {
      const num = Number(value);
      const labelMap: Record<string, string> = {
        totalBeds: "Total Beds",
        occupiedBeds: "Occupied Beds",
        doctors: "Doctors",
        nurses: "Nurses",
        support: "Support Staff",
      };
      const label = labelMap[field] || field;
      if (isNaN(num)) {
        return `${label} must be a valid number. Please enter valid data`;
      }
      if (num < 0) {
        return `${label} cannot be negative. Please enter valid data`;
      }
      if (num > DEPT_LIMITS.BEDS) {
        return `${label} cannot exceed ${DEPT_LIMITS.BEDS}. Please enter valid data`;
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "name" | "location" | "headName",
    currentLen: number,
    limit: number,
    label: string
  ) => {
    const allowed = ["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      setFormError("Please enter valid data");
      toast.error(msg, { id: `dept-${field}-limit` });
    }
  };

  const updateNumericField = (field: "totalBeds" | "occupiedBeds" | "doctors" | "nurses" | "support", val: number) => {
    const clamped = Math.max(0, Math.min(DEPT_LIMITS.BEDS, val));
    setForm((f) => ({ ...f, [field]: clamped }));
    const err = validateField(field, clamped);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (!err && formError === "Please enter valid data") setFormError(null);
  };

  function toggleService(service: string) {
    setForm((f) => ({
      ...f,
      services: f.services.includes(service) ? f.services.filter((s) => s !== service) : [...f.services, service],
    }));
  }

  function addCustomService() {
    if (customService.trim()) {
      setForm((f) => ({ ...f, services: [...f.services, customService.trim()] }));
      setCustomService("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nameErr = validateField("name", form.name);
    const locErr = validateField("location", form.location);
    const headErr = validateField("headName", form.headName);
    const bedsErr = validateField("totalBeds", form.totalBeds);
    const occErr = validateField("occupiedBeds", form.occupiedBeds);
    const docErr = validateField("doctors", form.doctors);
    const nurErr = validateField("nurses", form.nurses);
    const supErr = validateField("support", form.support);

    let hospErr: string | undefined = undefined;
    if (isSuperAdmin && !form.hospital) {
      hospErr = "Parent Hospital is required. Please fill out this field";
    }

    const errs: Record<string, string | undefined> = {
      name: nameErr,
      location: locErr,
      headName: headErr,
      totalBeds: bedsErr,
      occupiedBeds: occErr,
      doctors: docErr,
      nurses: nurErr,
      support: supErr,
      hospital: hospErr,
    };

    setFieldErrors(errs);

    const hasAnyError = Object.values(errs).some(Boolean);
    if (hasAnyError) {
      const first = Object.values(errs).find(Boolean);
      setFormError("Please fill out this field");
      toast.error(first || "Please enter valid data", { id: "dept-val-err" });
      return;
    }

    const payload = { ...form, branch: form.branch || null };
    try {
      if (isEdit) {
        await updateDepartment.mutateAsync(payload);
        toast.success("Department updated successfully!");
      } else {
        await createDepartment.mutateAsync(payload);
        toast.success("Department created successfully!");
      }
      navigate(`${basePath}/departments`);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.message || "Could not save department. Please enter valid data";
      setFormError("Please enter valid data");
      toast.error(serverMsg, { id: "dept-submit-err" });
    }
  }

  const isSaving = createDepartment.isPending || updateDepartment.isPending;
  const allServices = Array.from(new Set([...PRESET_SERVICES, ...form.services]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to={`${basePath}/departments`} className="hover:text-navy-700">
            Departments
          </Link>{" "}
          &gt; {isEdit ? "Edit Department" : "Add New Department"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Department" : "Register New Department"}</h1>
        <p className="text-sm text-slate-500">Configure operational identity and resource allocation for the medical unit.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={Briefcase} title="Department Identity">
          <InputField
            label="Department Name"
            required
            maxLength={DEPT_LIMITS.NAME}
            showCharCount
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, name: val });
              const err = validateField("name", val);
              setFieldErrors((prev) => ({ ...prev, name: err }));
              if (!err && formError) setFormError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "name", form.name.length, DEPT_LIMITS.NAME, "Department Name")}
            onBlur={() => {
              const err = validateField("name", form.name);
              setFieldErrors((prev) => ({ ...prev, name: err }));
            }}
            placeholder="e.g. Cardiology"
          />
          <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {DEPARTMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          {isSuperAdmin && (
            <>
              <SelectField
                label="Parent Hospital"
                required
                value={form.hospital}
                error={fieldErrors.hospital}
                onChange={(e) => {
                  setForm({ ...form, hospital: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, hospital: undefined }));
                }}
              >
                <option value="">Select Hospital</option>
                {hospitalsData?.data.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Branch Location"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                disabled={!branchesData?.data.length}
              >
                <option value="">{branchesData?.data.length ? "Select Branch (optional)" : "No branches for this hospital"}</option>
                {branchesData?.data.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </SelectField>
            </>
          )}
          <InputField
            label="Location (Wing/Floor)"
            maxLength={DEPT_LIMITS.LOCATION}
            showCharCount
            value={form.location}
            error={fieldErrors.location}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, location: val });
              const err = validateField("location", val);
              setFieldErrors((prev) => ({ ...prev, location: err }));
              if (!err && formError) setFormError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "location", form.location.length, DEPT_LIMITS.LOCATION, "Location")}
            onBlur={() => {
              const err = validateField("location", form.location);
              setFieldErrors((prev) => ({ ...prev, location: err }));
            }}
            placeholder="e.g. Wing B, Floor 4"
          />
        </FormSection>

        <FormSection icon={ClipboardList} title="Operational Details">
          <InputField
            label="Department Head"
            maxLength={DEPT_LIMITS.HEAD_NAME}
            showCharCount
            value={form.headName}
            error={fieldErrors.headName}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, headName: val });
              const err = validateField("headName", val);
              setFieldErrors((prev) => ({ ...prev, headName: err }));
              if (!err && formError) setFormError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "headName", form.headName.length, DEPT_LIMITS.HEAD_NAME, "Department Head")}
            onBlur={() => {
              const err = validateField("headName", form.headName);
              setFieldErrors((prev) => ({ ...prev, headName: err }));
            }}
            placeholder="Search by name"
          />
          <InputField
            label="Total Beds"
            type="number"
            min={0}
            max={DEPT_LIMITS.BEDS}
            value={form.totalBeds}
            error={fieldErrors.totalBeds}
            onChange={(e) => {
              const num = Number(e.target.value);
              updateNumericField("totalBeds", isNaN(num) ? 0 : num);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && form.totalBeds <= 0) e.preventDefault();
            }}
            inputRightElement={
              <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  aria-label="Up Arrow"
                  title="Up Arrow"
                  onClick={() => updateNumericField("totalBeds", form.totalBeds + 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Down Arrow"
                  title="Down Arrow"
                  onClick={() => updateNumericField("totalBeds", form.totalBeds - 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            }
          />
          <InputField
            label="Occupied Beds"
            type="number"
            min={0}
            max={DEPT_LIMITS.BEDS}
            value={form.occupiedBeds}
            error={fieldErrors.occupiedBeds}
            onChange={(e) => {
              const num = Number(e.target.value);
              updateNumericField("occupiedBeds", isNaN(num) ? 0 : num);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && form.occupiedBeds <= 0) e.preventDefault();
            }}
            inputRightElement={
              <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  aria-label="Up Arrow"
                  title="Up Arrow"
                  onClick={() => updateNumericField("occupiedBeds", form.occupiedBeds + 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Down Arrow"
                  title="Down Arrow"
                  onClick={() => updateNumericField("occupiedBeds", form.occupiedBeds - 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            }
          />
          <InputField
            label="Doctors"
            type="number"
            min={0}
            max={DEPT_LIMITS.STAFF}
            value={form.doctors}
            error={fieldErrors.doctors}
            onChange={(e) => {
              const num = Number(e.target.value);
              updateNumericField("doctors", isNaN(num) ? 0 : num);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && form.doctors <= 0) e.preventDefault();
            }}
            inputRightElement={
              <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  aria-label="Up Arrow"
                  title="Up Arrow"
                  onClick={() => updateNumericField("doctors", form.doctors + 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Down Arrow"
                  title="Down Arrow"
                  onClick={() => updateNumericField("doctors", form.doctors - 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            }
          />
          <InputField
            label="Nurses"
            type="number"
            min={0}
            max={DEPT_LIMITS.STAFF}
            value={form.nurses}
            error={fieldErrors.nurses}
            onChange={(e) => {
              const num = Number(e.target.value);
              updateNumericField("nurses", isNaN(num) ? 0 : num);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && form.nurses <= 0) e.preventDefault();
            }}
            inputRightElement={
              <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  aria-label="Up Arrow"
                  title="Up Arrow"
                  onClick={() => updateNumericField("nurses", form.nurses + 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Down Arrow"
                  title="Down Arrow"
                  onClick={() => updateNumericField("nurses", form.nurses - 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            }
          />
          <InputField
            label="Support Staff"
            type="number"
            min={0}
            max={DEPT_LIMITS.STAFF}
            value={form.support}
            error={fieldErrors.support}
            onChange={(e) => {
              const num = Number(e.target.value);
              updateNumericField("support", isNaN(num) ? 0 : num);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && form.support <= 0) e.preventDefault();
            }}
            inputRightElement={
              <div className="flex flex-col border border-slate-300 rounded overflow-hidden shadow-2xs bg-white">
                <button
                  type="button"
                  aria-label="Up Arrow"
                  title="Up Arrow"
                  onClick={() => updateNumericField("support", form.support + 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors border-b border-slate-200 cursor-pointer"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Down Arrow"
                  title="Down Arrow"
                  onClick={() => updateNumericField("support", form.support - 1)}
                  className="px-1 py-0.5 text-slate-500 hover:text-navy-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            }
          />
        </FormSection>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Services &amp; Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {allServices.map((service) => (
              <button
                type="button"
                key={service}
                onClick={() => toggleService(service)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  form.services.includes(service) ? "border-navy-700 bg-navy-700 text-white" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {service}
              </button>
            ))}
            <div className="flex items-center gap-1 rounded-full border border-dashed border-navy-300 px-3 py-2">
              <input
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="Custom service"
                className="w-28 bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={addCustomService} className="text-navy-700 cursor-pointer">
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(`${basePath}/departments`)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Department" : "Create Department"}
          </Button>
        </div>
      </form>
    </div>
  );
}
