import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { Info, MapPin, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useBranch, useCreateBranch, useUpdateBranch } from "../../features/branches";
import { useHospitals } from "../../features/hospitals";
import { FormSection } from "../../components/ui/FormSection";
import { InputField, SelectField } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

const CATEGORIES = ["General Hospital", "Specialty Clinic", "Diagnostic Center", "Emergency Care"];

const BRANCH_LIMITS = {
  NAME: 100,
  HEAD_NAME: 100,
  STREET: 250,
  CITY: 100,
  STATE: 100,
  ZIP: 20,
} as const;

const CITY_REGEX = /^[a-zA-Z\s\.\-']+$/;
const STATE_REGEX = /^[a-zA-Z\s\.\-']+$/;
const HEAD_REGEX = /^[a-zA-Z\s\.\-']+$/;
const ZIP_REGEX = /^[a-zA-Z0-9\s\-]+$/;
const STREET_REGEX = /^[a-zA-Z0-9\s,.\-#/'()]+$/;

export function BranchFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: branch } = useBranch(id);
  const { data: hospitalsData } = useHospitals({ page: 1, limit: 100 });
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch(id ?? "");

  const [form, setForm] = useState({
    name: "",
    hospital: searchParams.get("hospitalId") ?? "",
    category: CATEGORIES[0],
    street: "",
    city: "",
    state: "",
    zip: "",
    headName: "",
    totalStaff: 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    hospital?: string;
    headName?: string;
    totalStaff?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  }>({});

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name || "",
        hospital: typeof branch.hospital === "object" ? branch.hospital._id : branch.hospital || "",
        category: branch.category || CATEGORIES[0],
        street: branch.street || "",
        city: branch.city || "",
        state: branch.state || "",
        zip: branch.zip || "",
        headName: branch.headName || "",
        totalStaff: branch.totalStaff ?? 0,
      });
    }
  }, [branch]);

  const validateField = (field: string, value: any): string | undefined => {
    if (field === "name") {
      const trimmed = (value || "").trim();
      if (!trimmed) {
        return "Please enter valid data";
      }
      if (trimmed.length < 2) {
        return "Please enter valid data";
      }
      if (value.length > BRANCH_LIMITS.NAME) {
        return `Branch Name cannot exceed ${BRANCH_LIMITS.NAME} characters. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "hospital") {
      const trimmed = (value || "").trim();
      if (!trimmed) {
        return "Please enter valid data";
      }
      return undefined;
    }

    if (field === "headName") {
      const valStr = value || "";
      const trimmed = valStr.trim();
      if (!trimmed && valStr.length > 0) {
        return "Please enter valid data";
      }
      if (valStr.length > BRANCH_LIMITS.HEAD_NAME) {
        return `Branch Head cannot exceed ${BRANCH_LIMITS.HEAD_NAME} characters. Please enter valid data`;
      }
      if (trimmed && (!HEAD_REGEX.test(trimmed) || trimmed.length < 2)) {
        return "Please enter valid data";
      }
      return undefined;
    }

    if (field === "totalStaff") {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        return "Please enter valid data";
      }
      return undefined;
    }

    if (field === "street") {
      const valStr = value || "";
      const trimmed = valStr.trim();
      if (!trimmed && valStr.length > 0) {
        return "Please enter valid data";
      }
      if (valStr.length > BRANCH_LIMITS.STREET) {
        return `Full Street Address cannot exceed ${BRANCH_LIMITS.STREET} characters. Please enter valid data`;
      }
      if (trimmed && !STREET_REGEX.test(trimmed)) {
        return "Please enter valid data";
      }
      return undefined;
    }

    if (field === "city") {
      const valStr = value || "";
      const trimmed = valStr.trim();
      if (!trimmed && valStr.length > 0) {
        return "Please enter valid data";
      }
      if (valStr.length > BRANCH_LIMITS.CITY) {
        return `City cannot exceed ${BRANCH_LIMITS.CITY} characters. Please enter valid data`;
      }
      if (trimmed && (!CITY_REGEX.test(trimmed) || trimmed.length < 2)) {
        return "Please enter valid data";
      }
      return undefined;
    }

    if (field === "state") {
      const valStr = value || "";
      const trimmed = valStr.trim();
      if (!trimmed && valStr.length > 0) {
        return "Please enter valid data";
      }
      if (valStr.length > BRANCH_LIMITS.STATE) {
        return `State cannot exceed ${BRANCH_LIMITS.STATE} characters. Please enter valid data`;
      }
      if (trimmed && (!STATE_REGEX.test(trimmed) || trimmed.length < 2)) {
        return "Please enter valid data";
      }
      return undefined;
    }

    if (field === "zip") {
      const valStr = value || "";
      const trimmed = valStr.trim();
      if (!trimmed && valStr.length > 0) {
        return "Please enter valid data";
      }
      if (valStr.length > BRANCH_LIMITS.ZIP) {
        return `ZIP Code cannot exceed ${BRANCH_LIMITS.ZIP} characters. Please enter valid data`;
      }
      if (trimmed && !ZIP_REGEX.test(trimmed)) {
        return "Please enter valid data";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentLen: number,
    limit: number,
    label: string,
    allowedPattern?: RegExp
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // Pattern guard
    if (allowedPattern && e.key.length === 1 && !allowedPattern.test(e.key)) {
      e.preventDefault();
      const msg = "Please enter valid data";
      setError(msg);
      toast.error(msg, { id: `${label}-pattern-error` });
      return;
    }

    // Length guard
    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Please enter valid data`;
      setError("Please enter valid data");
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handleBlur = (field: string) => {
    const err = validateField(field, form[field as keyof typeof form]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setError("Please enter valid data");
      toast.error(err, { id: `branch-${field}-error` });
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nameErr = validateField("name", form.name);
    const hospitalErr = validateField("hospital", form.hospital);
    const headErr = validateField("headName", form.headName);
    const staffErr = validateField("totalStaff", form.totalStaff);
    const streetErr = validateField("street", form.street);
    const cityErr = validateField("city", form.city);
    const stateErr = validateField("state", form.state);
    const zipErr = validateField("zip", form.zip);

    const newFieldErrors = {
      name: nameErr,
      hospital: hospitalErr,
      headName: headErr,
      totalStaff: staffErr,
      street: streetErr,
      city: cityErr,
      state: stateErr,
      zip: zipErr,
    };
    setFieldErrors(newFieldErrors);

    const firstError =
      nameErr || hospitalErr || headErr || staffErr || streetErr || cityErr || stateErr || zipErr;

    if (firstError) {
      setError("Please enter valid data");
      toast.error(firstError.includes("exceed") ? firstError : "Please enter valid data", {
        id: "branch-submit-error",
      });
      return;
    }

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        headName: form.headName.trim(),
      };

      if (isEdit) {
        await updateBranch.mutateAsync(payload);
        toast.success("Branch updated successfully!");
      } else {
        await createBranch.mutateAsync(payload);
        toast.success("Branch created successfully!");
      }
      navigate("/super-admin/branches");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message || err?.message || "Could not save branch. Please enter valid data";
      setError("Please enter valid data");
      toast.error(serverMsg, { id: "branch-submit-error" });
    }
  }

  const isSaving = createBranch.isPending || updateBranch.isPending;

  return (
    <div className="w-full space-y-6">
      <div>
        <div className="text-sm text-slate-400">
          <Link to="/super-admin/branches" className="hover:text-emerald-700">
            Branches
          </Link>{" "}
          &gt; {isEdit ? "Edit Branch" : "Add New Branch"}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Branch" : "Add New Branch"}</h1>
        <p className="text-sm text-slate-500">
          Establish a new operational healthcare facility under the HMS enterprise network.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormSection icon={Info} title="Basic Information">
          <InputField
            label="Branch Name"
            required
            maxLength={BRANCH_LIMITS.NAME}
            showCharCount
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, name: val });
              const err = validateField("name", val);
              setFieldErrors((prev) => ({ ...prev, name: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, form.name.length, BRANCH_LIMITS.NAME, "Branch Name")}
            onBlur={() => handleBlur("name")}
            placeholder="e.g. Metro North Medical Center"
          />

          <SelectField
            label="Parent Hospital"
            required
            value={form.hospital}
            error={fieldErrors.hospital}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, hospital: val });
              const err = validateField("hospital", val);
              setFieldErrors((prev) => ({ ...prev, hospital: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("hospital")}
          >
            <option value="">Select Parent Organization</option>
            {hospitalsData?.data.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </SelectField>

          {isEdit && branch && (
            <InputField label="Branch ID" value={branch.branchId} disabled hint="System generated identifier." />
          )}

          <SelectField
            label="Branch Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>

          <InputField
            label="Branch Head"
            maxLength={BRANCH_LIMITS.HEAD_NAME}
            showCharCount
            value={form.headName}
            error={fieldErrors.headName}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, headName: val });
              const err = validateField("headName", val);
              setFieldErrors((prev) => ({ ...prev, headName: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, form.headName.length, BRANCH_LIMITS.HEAD_NAME, "Branch Head", /^[a-zA-Z\s\.\-']$/)
            }
            onBlur={() => handleBlur("headName")}
            placeholder="e.g. Dr. Sarah Jenkins"
          />

          <InputField
            label="Total Staff"
            type="number"
            min={0}
            value={form.totalStaff}
            error={fieldErrors.totalStaff}
            onChange={(e) => {
              const val = Number(e.target.value);
              setForm({ ...form, totalStaff: val });
              const err = validateField("totalStaff", val);
              setFieldErrors((prev) => ({ ...prev, totalStaff: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onBlur={() => handleBlur("totalStaff")}
          />
        </FormSection>

        <FormSection icon={MapPin} title="Location Details">
          <InputField
            label="Full Street Address"
            maxLength={BRANCH_LIMITS.STREET}
            showCharCount
            value={form.street}
            error={fieldErrors.street}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, street: val });
              const err = validateField("street", val);
              setFieldErrors((prev) => ({ ...prev, street: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, form.street.length, BRANCH_LIMITS.STREET, "Full Street Address", /^[a-zA-Z0-9\s,.\-#/'()]$/)
            }
            onBlur={() => handleBlur("street")}
            placeholder="123 Medical Plaza"
          />

          <InputField
            label="City"
            maxLength={BRANCH_LIMITS.CITY}
            showCharCount
            value={form.city}
            error={fieldErrors.city}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, city: val });
              const err = validateField("city", val);
              setFieldErrors((prev) => ({ ...prev, city: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, form.city.length, BRANCH_LIMITS.CITY, "City", /^[a-zA-Z\s\.\-']$/)
            }
            onBlur={() => handleBlur("city")}
            placeholder="e.g. Springfield"
          />

          <InputField
            label="State"
            maxLength={BRANCH_LIMITS.STATE}
            showCharCount
            value={form.state}
            error={fieldErrors.state}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, state: val });
              const err = validateField("state", val);
              setFieldErrors((prev) => ({ ...prev, state: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, form.state.length, BRANCH_LIMITS.STATE, "State", /^[a-zA-Z\s\.\-']$/)
            }
            onBlur={() => handleBlur("state")}
            placeholder="e.g. Illinois"
          />

          <InputField
            label="ZIP Code"
            maxLength={BRANCH_LIMITS.ZIP}
            showCharCount
            value={form.zip}
            error={fieldErrors.zip}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, zip: val });
              const err = validateField("zip", val);
              setFieldErrors((prev) => ({ ...prev, zip: err }));
              if (!err && error === "Please enter valid data") setError(null);
            }}
            onKeyDown={(e) =>
              handleKeyGuard(e, form.zip.length, BRANCH_LIMITS.ZIP, "ZIP Code", /^[a-zA-Z0-9\s\-]$/)
            }
            onBlur={() => handleBlur("zip")}
            placeholder="e.g. 62701"
          />
        </FormSection>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/super-admin/branches")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Branch" : "Create Branch"}
          </Button>
        </div>
      </form>
    </div>
  );
}
