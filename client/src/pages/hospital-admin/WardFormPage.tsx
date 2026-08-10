import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
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

  const [form, setForm] = useState({
    name: "",
    code: "",
    wardType: "General Ward",
    floorNumber: 1,
    nurseStation: "Nurse Station A",
    maxRooms: 20,
    description: "",
    status: "Active" as "Active" | "Inactive"
  });

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
              nurseStation: ward.nurseStation || "Nurse Station A",
              maxRooms: ward.maxRooms ?? 20,
              description: ward.description || "",
              status: ward.status || "Active"
            });
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

  const handleAutoGenerateCode = () => {
    setForm({ ...form, code: generateWardCode(form.name, form.wardType) });
  };

  const handleSave = async (proceedToRooms = false) => {
    setFormError(null);

    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Ward Name and Ward Code are required.");
      return;
    }

    try {
      let savedWardId = id;
      if (isEditing && id) {
        await updateWardMutation.mutateAsync({ ...form, id } as any);
        toast.success("✓ Ward Updated Successfully");
      } else {
        const created = await createWardMutation.mutateAsync(form as any);
        savedWardId = created._id;
        toast.success("✓ Ward Created Successfully");
      }

      if (proceedToRooms) {
        navigate(`/admin/beds/create-room?wardId=${savedWardId}`);
      } else {
        navigate("/admin/beds");
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Operation failed.");
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
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          {formError}
        </div>
      )}

      {/* Ward Master Form Card */}
      <Card className="p-6 space-y-6 bg-white shadow-sm border border-slate-200">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Ward Identification & Hospital Section Details</h2>
          <span className="text-xs font-medium text-slate-500">* Required Fields</span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Ward Name *"
              placeholder="e.g. Executive VIP Ward, Main Intensive Care Unit"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Ward Code *</span>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="text-[11px] font-bold text-navy-700 hover:underline flex items-center gap-1"
                  >
                    <Wand2 className="h-3 w-3" /> Auto Generate
                  </button>
                )}
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. ICU-001, WRD-102"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-navy-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SelectField
              label="Ward Type (Hospital Section) *"
              value={form.wardType}
              onChange={(e) => setForm({ ...form, wardType: e.target.value })}
            >
              {REAL_WORLD_WARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectField>

            <InputField
              label="Floor Number *"
              type="number"
              min={0}
              value={form.floorNumber}
              onChange={(e) => setForm({ ...form, floorNumber: Number(e.target.value) })}
              required
            />

            <InputField
              label="Nurse Station"
              placeholder="e.g. Nurse Station 3, NS-Alpha"
              value={form.nurseStation}
              onChange={(e) => setForm({ ...form, nurseStation: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Maximum Rooms Capacity"
              type="number"
              min={1}
              value={form.maxRooms}
              onChange={(e) => setForm({ ...form, maxRooms: Number(e.target.value) })}
            />

            <SelectField
              label="Ward Status *"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
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
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
