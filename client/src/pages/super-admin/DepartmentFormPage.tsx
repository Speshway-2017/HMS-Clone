import { FormEvent, useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Building2, PlusCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useDepartment, useCreateDepartment, useUpdateDepartment } from "../../features/departments";
import { useHospitals } from "../../features/hospitals";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { ROLE_HOME_PATH } from "../../types/auth";
import { Department } from "../../types/domain";
import toast from "react-hot-toast";

const PRESET_SERVICES = [
  "Outpatient Care",
  "Emergency Services",
  "Diagnostic Imaging",
  "Intensive Care (ICU)",
  "Pediatric Wing",
  "Inpatient Ward Care",
  "Day Care Procedures",
  "Specialized Consultation"
];

const DEPT_LIMITS = {
  NAME: 50,
  CODE: 20,
  LOCATION: 100,
} as const;

const DEPT_NAME_REGEX = /^[a-zA-Z\s\.\-&/()]+$/;
const DEPT_CODE_REGEX = /^[a-zA-Z0-9\-_]+$/;
const LOCATION_REGEX = /^[a-zA-Z0-9\s\.\-/,#()]+$/;

export function DepartmentFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const basePath = ROLE_HOME_PATH[user!.role];
  const { data: department } = useDepartment(id);
  const { data: hospitalsData } = useHospitals({ page: 1, limit: 100 }, { enabled: isSuperAdmin });
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment(id ?? "");

  // Guard: Department creation and editing is restricted exclusively to Super Admin
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error("Department configuration is restricted to Super Admin.");
      navigate("/admin/departments", { replace: true });
    }
  }, [isSuperAdmin, navigate]);

  const [form, setForm] = useState({
    name: "",
    code: "",
    hospital: "",
    location: "",
    status: "operational" as Department["status"],
    description: "",
    services: [] as string[],
  });
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [customService, setCustomService] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const fetchNextCode = useCallback(
    (hospitalId?: string, deptName?: string) => {
      if (isEdit) return;
      setIsGeneratingCode(true);

      api
        .get("/departments/next-code", {
          params: {
            hospital: hospitalId || form.hospital || undefined,
            name: deptName !== undefined ? deptName : form.name,
          },
        })
        .then((res) => {
          const nextCode = res.data.data?.code;
          if (nextCode) {
            setForm((prev) => ({ ...prev, code: nextCode }));
            setFieldErrors((prev) => ({ ...prev, code: undefined }));
          }
        })
        .catch(() => {
          const hospObj = hospitalsData?.data.find((h) => h._id === (hospitalId || form.hospital));
          const hospCode = hospObj?.code || "HOSP-001";
          const clean = (deptName || form.name || "DEP")
            .replace(/^(department of|dept of|dept\.?)\s+/i, "")
            .trim();
          const words = clean.split(/[\s&/,\.-]+/).filter(Boolean);
          let abbr = "DEP";
          if (words.length === 1 && words[0]) {
            abbr = words[0].slice(0, 4).toUpperCase();
          } else if (words.length > 1) {
            abbr = words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
          }
          setForm((prev) => ({ ...prev, code: `${hospCode}-${abbr}-001` }));
        })
        .finally(() => setIsGeneratingCode(false));
    },
    [isEdit, form.hospital, form.name, hospitalsData]
  );

  useEffect(() => {
    if (department) {
      setForm({
        name: department.name,
        code: (department as any).code || "",
        hospital: typeof department.hospital === "object" ? department.hospital._id : department.hospital,
        location: department.location || "",
        status: ((department as any).status || "operational") as Department["status"],
        description: department.description || "",
        services: department.services || [],
      });
    }
  }, [department]);

  useEffect(() => {
    if (!isEdit && isSuperAdmin && hospitalsData?.data && hospitalsData.data.length > 0 && !form.hospital) {
      const activeHospId = localStorage.getItem("hms_super_admin_active_hospital_id");
      const defaultHosp =
        activeHospId && activeHospId !== "all" && hospitalsData.data.find((h) => h._id === activeHospId)
          ? activeHospId
          : hospitalsData.data[0]._id;
      setForm((f) => ({ ...f, hospital: defaultHosp }));
      fetchNextCode(defaultHosp, form.name);
    }
  }, [isEdit, isSuperAdmin, hospitalsData, form.hospital, form.name, fetchNextCode]);

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

    if (field === "code") {
      const str = typeof value === "string" ? value : String(value ?? "");
      const trimmed = str.trim();
      if (!trimmed) {
        return "Department Code is required. Please fill out this field";
      }
      if (str.length > DEPT_LIMITS.CODE) {
        return `Department Code cannot exceed ${DEPT_LIMITS.CODE} characters. Please enter valid data`;
      }
      if (!DEPT_CODE_REGEX.test(trimmed)) {
        return "Department Code must contain only letters, numbers, hyphens, and underscores";
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

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "name" | "code" | "location",
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
    const codeErr = validateField("code", form.code);
    const locErr = validateField("location", form.location);

    let hospErr: string | undefined = undefined;
    if (isSuperAdmin && !form.hospital) {
      hospErr = "Parent Hospital is required. Please fill out this field";
    }

    const errs: Record<string, string | undefined> = {
      name: nameErr,
      code: codeErr,
      location: locErr,
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

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      category: form.name.trim().toLowerCase() || "general",
      location: form.location.trim(),
      status: form.status,
      hospital: form.hospital,
      branch: null,
      services: form.services,
      description: form.description.trim(),
      specialization: (department as any)?.specialization || "",
      headName: department?.headName || "",
      departmentHead: (department as any)?.departmentHead || null,
      consultationFee: (department as any)?.consultationFee || 0,
      isEmergency: (department as any)?.isEmergency || false,
      totalBeds: department?.totalBeds || 0,
      occupiedBeds: department?.occupiedBeds || 0,
      doctors: department?.doctors || 0,
      nurses: department?.nurses || 0,
      support: department?.support || 0,
    };

    try {
      if (isEdit) {
        await updateDepartment.mutateAsync(payload);
        toast.success("Department updated successfully!");
      } else {
        await createDepartment.mutateAsync(payload);
        toast.success("Department registered successfully!");
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
    <div className="w-full space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to={`${basePath}/departments`} className="hover:text-emerald-700 transition-colors">
            Departments
          </Link>{" "}
          &gt; {isEdit ? "Edit Department" : "Add New Department"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Department Profile" : "Register New Department"}</h1>
        <p className="text-sm text-slate-500">
          {isEdit
            ? `Configure departmental identity, operational status, facility location, and clinical capabilities for ${form.name || "the medical unit"}.`
            : "Configure department name, unique department code, and facility location for the medical unit."}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Section 1: Department Identity & Facility Location */}
        <FormSection icon={Building2} title="Department Identity & Facility Location">
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
              if (!isEdit && form.name.trim() && (!form.code || form.code.includes("-DEP-"))) {
                fetchNextCode(form.hospital, form.name);
              }
            }}
            placeholder="e.g. Cardiology, Pulmonology, Obstetrics & Gynecology"
          />

          <InputField
            label="Unique Department Code (Auto-Generated)"
            required
            maxLength={DEPT_LIMITS.CODE}
            showCharCount
            value={form.code}
            error={fieldErrors.code}
            readOnly={isEdit}
            onChange={(e) => {
              if (isEdit) return;
              const val = e.target.value.toUpperCase();
              setForm({ ...form, code: val });
              const err = validateField("code", val);
              setFieldErrors((prev) => ({ ...prev, code: err }));
              if (!err && formError) setFormError(null);
            }}
            onKeyDown={(e) => !isEdit && handleKeyGuard(e, "code", form.code.length, DEPT_LIMITS.CODE, "Department Code")}
            onBlur={() => {
              const err = validateField("code", form.code);
              setFieldErrors((prev) => ({ ...prev, code: err }));
            }}
            rightElement={
              !isEdit ? (
                <button
                  type="button"
                  onClick={() => fetchNextCode(form.hospital, form.name)}
                  disabled={isGeneratingCode}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors px-1 cursor-pointer"
                  title="Re-generate unique Department Code"
                >
                  <RefreshCw className={`h-3 w-3 ${isGeneratingCode ? "animate-spin" : ""}`} />
                  Re-generate
                </button>
              ) : undefined
            }
            placeholder="e.g. HOSP-001-CRD-001"
            hint={isEdit ? "System-assigned immutable department code" : "Format: <Hospital>-<Department>-<Seq>"}
          />

          <InputField
            label="Facility Location (Wing / Floor / Room)"
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
            hint="Physical location inside the hospital facility"
          />

          <SelectField
            label="Department Operational Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Department["status"] })}
            hint="Operational intake and clinical workflow status"
          >
            <option value="operational">Operational (Active Services)</option>
            <option value="limited_service">Limited Service</option>
            <option value="temporarily_closed">Temporarily Closed</option>
            <option value="under_maintenance">Under Maintenance</option>
          </SelectField>

          {isSuperAdmin && (
            <SelectField
              label="Parent Hospital"
              required
              disabled={isEdit}
              value={form.hospital}
              error={fieldErrors.hospital}
              onChange={(e) => {
                const newHospital = e.target.value;
                setForm({ ...form, hospital: newHospital });
                setFieldErrors((prev) => ({ ...prev, hospital: undefined }));
                fetchNextCode(newHospital, form.name);
              }}
            >
              <option value="">Select Hospital</option>
              {hospitalsData?.data.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} {h.code ? `(${h.code})` : ""}
                </option>
              ))}
            </SelectField>
          )}

          <div className="md:col-span-2 space-y-1">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <label className="font-medium text-slate-700">Description / Clinical Scope (Optional)</label>
              <span className="text-slate-400">{form.description.length}/500</span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Overview of departmental care pathways, specialized clinical capabilities, and patient services..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-colors shadow-2xs"
            />
          </div>
        </FormSection>

        {/* Section 2: Services & Clinical Capabilities */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-2xs">
          <h2 className="mb-1 text-base font-bold text-slate-800">Services &amp; Clinical Capabilities</h2>
          <p className="mb-4 text-xs text-slate-500">Select active patient care pathways provided by this medical unit or add custom services.</p>
          <div className="flex flex-wrap gap-2">
            {allServices.map((service) => (
              <button
                type="button"
                key={service}
                onClick={() => toggleService(service)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  form.services.includes(service)
                    ? "border-emerald-700 bg-emerald-700 text-white shadow-xs"
                    : "border-slate-300 bg-white text-slate-600 hover:border-emerald-500 hover:text-emerald-700"
                }`}
              >
                {service}
              </button>
            ))}
            <div className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 shadow-2xs">
              <input
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomService();
                  }
                }}
                placeholder="Add custom service"
                className="w-36 bg-transparent text-xs outline-none text-slate-700 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={addCustomService}
                className="text-emerald-700 hover:text-emerald-800 cursor-pointer p-0.5 rounded transition-colors"
                title="Add service"
              >
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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={() => navigate(`${basePath}/departments`)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving} className="font-bold shadow-sm">
            {isSaving ? "Saving..." : isEdit ? "Save Department Profile" : "Register Department"}
          </Button>
        </div>
      </form>
    </div>
  );
}
