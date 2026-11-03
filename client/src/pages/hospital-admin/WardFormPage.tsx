import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Building2,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Wand2,
  ArrowRight,
  Loader2
} from "lucide-react";

import { useCreateWard, useUpdateWard } from "../../features/wards";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";

const REAL_WORLD_WARD_TYPES = [
  "General Ward",
  "VIP Ward",
  "ICU",
  "NICU",
  "PICU",
  "Emergency",
  "Isolation",
  "Maternity"
];

const WARD_LIMITS = {
  NAME: 100,
  CODE: 20,
  FLOOR_MIN: -5,
  FLOOR_MAX: 100,
  MAX_ROOMS_MIN: 1,
  MAX_ROOMS_MAX: 500,
  DESCRIPTION: 500,
} as const;

const WARD_NAME_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()]+$/;
const WARD_CODE_REGEX = /^[A-Za-z0-9\-_/]+$/;

function generateWardCode(name: string, wardType: string): string {
  const prefix = wardType === "ICU" ? "ICU"
    : wardType === "NICU" ? "NICU"
    : wardType === "PICU" ? "PICU"
    : wardType === "Emergency" ? "EMG"
    : wardType === "Isolation" ? "ISO"
    : wardType === "Maternity" ? "MAT"
    : wardType === "VIP Ward" ? "VIP"
    : "WRD";

  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

export function WardFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const createWardMutation = useCreateWard();
  const updateWardMutation = useUpdateWard();

  const [form, setForm] = useState<{
    name: string;
    code: string;
    wardType: string;
    floorNumber: number | string;
    maxRooms: number | string;
    description: string;
    status: "Active" | "Inactive";
  }>({
    name: "",
    code: "",
    wardType: "General Ward",
    floorNumber: 1,
    maxRooms: 20,
    description: "",
    status: "Active"
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-generate ward code when wardType changes if creating new ward and code is empty
  useEffect(() => {
    if (!isEditing && !form.code) {
      setForm((prev) => ({ ...prev, code: generateWardCode(prev.name, prev.wardType) }));
    }
  }, [form.wardType, isEditing]);

  // Load existing ward record by ID on edit
  useEffect(() => {
    if (isEditing && id) {
      setIsLoading(true);
      setFetchError(null);
      api
        .get(`/wards/${id}`)
        .then((res) => {
          const ward = res.data.data?.ward;
          if (ward) {
            setForm({
              name: ward.name || "",
              code: ward.code || "",
              wardType: ward.wardType || "General Ward",
              floorNumber: ward.floorNumber ?? 1,
              maxRooms: ward.maxRooms ?? 20,
              description: ward.description || "",
              status: ward.status || "Active"
            });
            const errs: Record<string, string | undefined> = {};
            const nErr = validateField("name", ward.name || "");
            if (nErr) errs.name = nErr;
            const cErr = validateField("code", ward.code || "");
            if (cErr) errs.code = cErr;
            const fErr = validateField("floorNumber", ward.floorNumber ?? 1);
            if (fErr) errs.floorNumber = fErr;
            setFieldErrors(errs);
            if (Object.keys(errs).length > 0) {
              setFormError("Invalid data is not accepted. Please enter valid data");
            }
          } else {
            setFetchError("Unable to load existing ward details. Please try again.");
          }
        })
        .catch(() => {
          setFetchError("Unable to load existing ward details. Please try again.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditing]);

  const validateField = (
    field: "name" | "code" | "wardType" | "floorNumber" | "maxRooms" | "description",
    value: any
  ): string | undefined => {
    const valStr = typeof value === "string" ? value : String(value ?? "");
    const trimmed = valStr.trim();

    if (field === "name") {
      if (!trimmed) {
        return "Ward Name is required. Field is required. Please fill out this field";
      }
      if (valStr.length > WARD_LIMITS.NAME) {
        return `Ward Name cannot exceed ${WARD_LIMITS.NAME} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 2 || !WARD_NAME_REGEX.test(trimmed)) {
        return "Ward Name contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "code") {
      if (!trimmed) {
        return "Ward Code is required. Field is required. Please fill out this field";
      }
      if (valStr.length > WARD_LIMITS.CODE) {
        return `Ward Code cannot exceed ${WARD_LIMITS.CODE} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!WARD_CODE_REGEX.test(trimmed)) {
        return "Ward Code contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "wardType") {
      if (!trimmed) {
        return "Ward Type is required. Field is required. Please fill out this field";
      }
      return undefined;
    }

    if (field === "floorNumber") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return "Floor Number is required. Field is required. Please fill out this field";
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Floor Number must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < WARD_LIMITS.FLOOR_MIN) {
        return `Floor Number cannot be less than ${WARD_LIMITS.FLOOR_MIN}. Invalid data is not accepted. Please enter valid data`;
      }
      if (num > WARD_LIMITS.FLOOR_MAX) {
        return `Floor Number cannot exceed ${WARD_LIMITS.FLOOR_MAX}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "maxRooms") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return undefined; // optional
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Maximum Rooms Capacity must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < WARD_LIMITS.MAX_ROOMS_MIN) {
        return `Maximum Rooms Capacity must be at least ${WARD_LIMITS.MAX_ROOMS_MIN}. Invalid data is not accepted. Please enter valid data`;
      }
      if (num > WARD_LIMITS.MAX_ROOMS_MAX) {
        return `Maximum Rooms Capacity cannot exceed ${WARD_LIMITS.MAX_ROOMS_MAX}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "description") {
      if (valStr.length > WARD_LIMITS.DESCRIPTION) {
        return `Description cannot exceed ${WARD_LIMITS.DESCRIPTION} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && /<script|javascript:|data:/i.test(trimmed)) {
        return "Description contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string,
    currentLen: number,
    limit: number,
    label: string,
    allowedCharRegex?: RegExp
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

    if (allowedCharRegex && e.key.length === 1 && !allowedCharRegex.test(e.key)) {
      e.preventDefault();
      const msg = `${label} contains invalid data. Invalid data is not accepted. Please enter valid data`;
      setFormError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-invalid-char` });
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Too long text is not accepted. Please enter valid data`;
      setFormError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-limit` });
    }
  };

  const handleNumberKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: string,
    label: string,
    allowNegative = false
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

    if (!allowNegative && e.key === "-") {
      e.preventDefault();
      const msg = `${label} cannot be negative. Invalid data is not accepted. Please enter valid data`;
      setFormError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-no-neg` });
      return;
    }

    if (e.key === "e" || e.key === "E" || e.key === "+") {
      e.preventDefault();
      const msg = "Please enter valid data";
      setFormError(msg);
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-inv-key` });
      return;
    }

    if (!allowNegative && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const msg = "Please enter valid data";
      setFormError(msg);
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-not-digit` });
    }
  };

  const handleBlur = (
    field: "name" | "code" | "wardType" | "floorNumber" | "maxRooms" | "description"
  ) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setFormError("Please enter valid data");
    }
  };

  const handleAutoGenerateCode = () => {
    const code = generateWardCode(form.name, form.wardType);
    setForm((prev) => ({ ...prev, code }));
    setFieldErrors((prev) => ({ ...prev, code: undefined }));
  };

  const handleSave = async (proceedToRooms = false) => {
    setFormError(null);

    const nameErr = validateField("name", form.name);
    const codeErr = validateField("code", form.code);
    const wardTypeErr = validateField("wardType", form.wardType);
    const floorNumberErr = validateField("floorNumber", form.floorNumber);
    const maxRoomsErr = validateField("maxRooms", form.maxRooms);
    const descriptionErr = validateField("description", form.description);

    const errors: Record<string, string | undefined> = {
      name: nameErr,
      code: codeErr,
      wardType: wardTypeErr,
      floorNumber: floorNumberErr,
      maxRooms: maxRoomsErr,
      description: descriptionErr,
    };

    setFieldErrors(errors);
    setTouched({
      name: true,
      code: true,
      wardType: true,
      floorNumber: true,
      maxRooms: true,
      description: true,
    });

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean);
      setFormError(firstError || "Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "ward-form-invalid" });
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      wardType: form.wardType,
      floorNumber: Number(form.floorNumber),
      maxRooms: form.maxRooms !== "" ? Number(form.maxRooms) : 20,
      description: form.description.trim(),
      status: form.status,
    };

    try {
      let savedWardId = id;
      if (isEditing && id) {
        await updateWardMutation.mutateAsync({ ...payload, id } as any);
        toast.success("✓ Ward Updated Successfully");
      } else {
        const created = await createWardMutation.mutateAsync(payload as any);
        savedWardId = created._id;
        toast.success("✓ Ward Created Successfully");
      }

      if (proceedToRooms) {
        navigate(`/admin/beds/create-room?wardId=${savedWardId}`);
      } else {
        navigate("/admin/beds");
      }
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Please enter valid data";
      setFormError(serverMsg);
      toast.error(serverMsg, { id: "ward-save-error" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-semibold">
        <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
        <span>Loading existing ward details...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium flex items-center justify-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          {fetchError}
        </div>
        <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
          <ArrowLeft className="h-4 w-4" /> Back to Wards List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-20 px-2 sm:px-4">
      {/* Breadcrumb Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/admin" className="hover:text-navy-700 transition">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/admin/beds" className="hover:text-navy-700 transition">Beds & Wards</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900 font-bold">{isEditing ? `Edit Ward: ${form.name}` : "Create Ward"}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Building2 className="h-7 w-7 text-navy-700" />
              {isEditing ? `Edit Ward — ${form.name}` : "Step 1 — Create Ward Master"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing
                ? "Update existing hospital ward parameters, code, capacity, and operational status."
                : "Hospital Ward represents a hospital department/section (General, ICU, VIP, NICU, Emergency)."}
            </p>
          </div>

          <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
            <ArrowLeft className="h-4 w-4" /> Back to Wards List
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {formError && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in duration-150">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Ward Master Form Card */}
      <Card className="p-6 space-y-6 bg-white shadow-sm border border-slate-200">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Ward Identification & Hospital Section Details</h2>
          <span className="text-xs font-medium text-slate-500">* Required Fields</span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Ward Name *"
              placeholder="e.g. Executive VIP Ward, Main Intensive Care Unit"
              value={form.name}
              maxLength={WARD_LIMITS.NAME}
              showCharCount
              error={fieldErrors.name}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, name: val }));
                const err = validateField("name", val);
                setFieldErrors((prev) => ({ ...prev, name: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "name", form.name.length, WARD_LIMITS.NAME, "Ward Name", WARD_NAME_REGEX)}
              onBlur={() => handleBlur("name")}
              required
            />

            <div>
              <InputField
                label="Ward Code *"
                placeholder="e.g. ICU-001, WRD-102"
                value={form.code}
                maxLength={WARD_LIMITS.CODE}
                showCharCount
                error={fieldErrors.code}
                rightElement={
                  !isEditing && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateCode}
                      className="text-[11px] font-bold text-navy-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 className="h-3 w-3" /> Auto Generate
                    </button>
                  )
                }
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setForm((prev) => ({ ...prev, code: val }));
                  const err = validateField("code", val);
                  setFieldErrors((prev) => ({ ...prev, code: err }));
                  if (!err && formError === "Please enter valid data") setFormError(null);
                }}
                onKeyDown={(e) => handleKeyGuard(e, "code", form.code.length, WARD_LIMITS.CODE, "Ward Code", WARD_CODE_REGEX)}
                onBlur={() => handleBlur("code")}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Ward Type (Hospital Section) *"
              value={form.wardType}
              error={fieldErrors.wardType}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, wardType: val }));
                const err = validateField("wardType", val);
                setFieldErrors((prev) => ({ ...prev, wardType: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onBlur={() => handleBlur("wardType")}
            >
              {REAL_WORLD_WARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectField>

            <InputField
              label="Floor Number *"
              type="number"
              min={WARD_LIMITS.FLOOR_MIN}
              max={WARD_LIMITS.FLOOR_MAX}
              value={form.floorNumber}
              error={fieldErrors.floorNumber}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, floorNumber: val }));
                const err = validateField("floorNumber", raw);
                setFieldErrors((prev) => ({ ...prev, floorNumber: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "floorNumber", "Floor Number", true)}
              onBlur={() => handleBlur("floorNumber")}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Maximum Rooms Capacity"
              type="number"
              min={WARD_LIMITS.MAX_ROOMS_MIN}
              max={WARD_LIMITS.MAX_ROOMS_MAX}
              value={form.maxRooms}
              error={fieldErrors.maxRooms}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, maxRooms: val }));
                const err = validateField("maxRooms", raw);
                setFieldErrors((prev) => ({ ...prev, maxRooms: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "maxRooms", "Maximum Rooms Capacity")}
              onBlur={() => handleBlur("maxRooms")}
            />

            <SelectField
              label="Ward Status *"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </SelectField>
          </div>

          <TextareaField
            label="Description (Optional)"
            rows={3}
            placeholder="Ward specialty notes, equipment configuration..."
            value={form.description}
            maxLength={WARD_LIMITS.DESCRIPTION}
            showCharCount
            error={fieldErrors.description}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, description: val }));
              const err = validateField("description", val);
              setFieldErrors((prev) => ({ ...prev, description: err }));
              if (!err && formError === "Please enter valid data") setFormError(null);
            }}
            onKeyDown={(e) => handleKeyGuard(e, "description", form.description.length, WARD_LIMITS.DESCRIPTION, "Description")}
            onBlur={() => handleBlur("description")}
          />

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/beds")}>
              Cancel
            </Button>

            <div className="flex gap-3">
              <Button
                type="submit"
                variant={isEditing ? "primary" : "secondary"}
                disabled={createWardMutation.isPending || updateWardMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Update Ward" : "Save Ward"}
              </Button>

              {!isEditing && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleSave(true)}
                  disabled={createWardMutation.isPending || updateWardMutation.isPending}
                >
                  Next: Create Rooms <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
