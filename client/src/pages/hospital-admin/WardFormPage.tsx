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
  Loader2
} from "lucide-react";

import { useCreateWard, useUpdateWard } from "../../features/wards";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InputField, SelectField } from "../../components/ui/Field";

const REAL_WORLD_WARD_TYPES = [
  "General Ward",
  "Semi-Private Ward",
  "Private Ward",
  "Deluxe Wing",
  "VIP Suite Ward",
  "Maternity Ward",
  "Labour & Delivery",
  "Post-Operative Ward",
  "ICU",
  "NICU",
  "PICU",
  "Emergency Ward",
  "Isolation Ward",
  "Day Care Unit",
  "IVF & Fertility Wing"
];

function generateWardCode(wardType: string): string {
  const prefix =
    wardType === "ICU"
      ? "ICU"
      : wardType === "NICU"
      ? "NICU"
      : wardType === "PICU"
      ? "PICU"
      : wardType === "Emergency Ward"
      ? "EMG"
      : wardType === "Isolation Ward"
      ? "ISO"
      : wardType === "Maternity Ward"
      ? "MAT"
      : wardType === "VIP Suite Ward"
      ? "VIP"
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
    status: "Active" | "Inactive";
  }>({
    name: "",
    code: "",
    wardType: "General Ward",
    floorNumber: 1,
    status: "Active"
  });

  const [isCustomWardType, setIsCustomWardType] = useState(false);
  const [customWardTypeInput, setCustomWardTypeInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-generate code when creating new ward and code is empty
  useEffect(() => {
    if (!isEditing && !form.code) {
      setForm((prev) => ({ ...prev, code: generateWardCode(prev.wardType) }));
    }
  }, [form.wardType, isEditing]);

  // Load existing ward on edit
  useEffect(() => {
    if (isEditing && id) {
      setIsLoading(true);
      setFetchError(null);
      api
        .get(`/wards/${id}`)
        .then((res) => {
          const ward = res.data?.data?.ward;
          if (ward) {
            const isCustom = !REAL_WORLD_WARD_TYPES.includes(ward.wardType);
            setIsCustomWardType(isCustom);
            if (isCustom) setCustomWardTypeInput(ward.wardType || "");
            setForm({
              name: ward.name || "",
              code: ward.code || "",
              wardType: ward.wardType || "General Ward",
              floorNumber: ward.floorNumber ?? 1,
              status: ward.status || "Active"
            });
          } else {
            setFetchError("Unable to load existing ward details.");
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

  const validate = () => {
    const errs: Record<string, string | undefined> = {};
    if (!form.name.trim()) errs.name = "Ward Name is required.";
    if (!form.code.trim()) errs.code = "Ward Code is required.";
    const selectedType = isCustomWardType ? customWardTypeInput.trim() : form.wardType.trim();
    if (!selectedType) errs.wardType = "Ward Type is required.";
    if (form.floorNumber === "" || form.floorNumber === null || form.floorNumber === undefined || isNaN(Number(form.floorNumber))) {
      errs.floorNumber = "Floor Number is required.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      setFormError("Please fill out all required fields properly.");
      return;
    }

    const resolvedWardType = isCustomWardType ? customWardTypeInput.trim() : form.wardType.trim();

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      wardType: resolvedWardType,
      floorNumber: Number(form.floorNumber),
      status: form.status
    };

    try {
      if (isEditing && id) {
        await updateWardMutation.mutateAsync({ ...payload, id } as any);
        toast.success("✓ Ward Updated Successfully");
      } else {
        await createWardMutation.mutateAsync(payload as any);
        toast.success("✓ Ward Created Successfully");
      }
      navigate("/admin/beds");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save ward. Please verify inputs.";
      setFormError(serverMsg);
      toast.error(serverMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-medium">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <span>Loading ward details...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          {fetchError}
        </div>
        <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
          <ArrowLeft className="h-4 w-4" /> Back to Beds & Wards
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-16 font-sans">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-emerald-700 transition">Dashboard</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/admin/beds" className="hover:text-emerald-700 transition">Beds & Wards</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-900 font-bold">{isEditing ? "Edit Ward" : "Create Ward"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-emerald-700" />
            {isEditing ? `Edit Ward: ${form.name}` : "Create Hospital Ward"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure hospital section, section type, floor, and operational availability.
          </p>
        </div>

        <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
          <ArrowLeft className="h-4 w-4" /> Back to Beds & Wards
        </Button>
      </div>

      {/* Error Alert */}
      {formError && (
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in duration-150">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Ward Form Card */}
      <Card className="p-6 sm:p-8 bg-white shadow-xs border border-slate-200/90 rounded-2xl">
        <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Ward Identification & Section Details</h2>
          <span className="text-xs font-semibold text-slate-400">* Required Fields</span>
        </div>

        <form onSubmit={handleSave} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Ward Name *"
              placeholder="e.g. Executive VIP Ward, Cardiology Unit"
              value={form.name}
              error={fieldErrors.name}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, name: val }));
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              required
            />

            <div>
              <InputField
                label="Ward Code *"
                placeholder="e.g. WRD-101, ICU-001"
                value={form.code}
                error={fieldErrors.code}
                rightElement={
                  !isEditing && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, code: generateWardCode(prev.wardType) }))}
                      className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 className="h-3 w-3" /> Auto Generate
                    </button>
                  )
                }
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setForm((prev) => ({ ...prev, code: val }));
                  if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: undefined }));
                }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <SelectField
                label="Ward Type (Section) *"
                value={isCustomWardType ? "__CUSTOM__" : form.wardType}
                error={!isCustomWardType ? fieldErrors.wardType : undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__CUSTOM__") {
                    setIsCustomWardType(true);
                    setForm((prev) => ({ ...prev, wardType: customWardTypeInput || "" }));
                  } else {
                    setIsCustomWardType(false);
                    setForm((prev) => ({ ...prev, wardType: val }));
                    if (fieldErrors.wardType) setFieldErrors((prev) => ({ ...prev, wardType: undefined }));
                  }
                }}
              >
                {REAL_WORLD_WARD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="__CUSTOM__">+ Define Custom Ward Type...</option>
              </SelectField>

              {isCustomWardType && (
                <div className="mt-2">
                  <InputField
                    label="Custom Ward Type Name *"
                    placeholder="e.g. Fertility Care Wing, Surgical Pod"
                    value={customWardTypeInput}
                    error={fieldErrors.wardType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomWardTypeInput(val);
                      setForm((prev) => ({ ...prev, wardType: val }));
                      if (fieldErrors.wardType) setFieldErrors((prev) => ({ ...prev, wardType: undefined }));
                    }}
                    required
                  />
                </div>
              )}
            </div>

            <InputField
              label="Floor Number *"
              type="number"
              min={-5}
              max={100}
              value={form.floorNumber}
              error={fieldErrors.floorNumber}
              onChange={(e) => {
                const raw = e.target.value;
                setForm((prev) => ({ ...prev, floorNumber: raw === "" ? "" : Number(raw) }));
                if (fieldErrors.floorNumber) setFieldErrors((prev) => ({ ...prev, floorNumber: undefined }));
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Ward Status *"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="Active">Active (Operational)</option>
              <option value="Inactive">Inactive (Closed / Under Renovation)</option>
            </SelectField>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/beds")}>
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={createWardMutation.isPending || updateWardMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Update Ward" : "Save Ward"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
