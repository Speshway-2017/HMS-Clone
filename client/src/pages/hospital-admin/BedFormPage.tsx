import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BedDouble,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Loader2
} from "lucide-react";

import { useWards } from "../../features/wards";
import { useRooms } from "../../features/rooms";
import { useCreateBed, useUpdateBed } from "../../features/beds";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InputField, SelectField } from "../../components/ui/Field";

const REAL_WORLD_BED_TYPES = [
  "Standard Bed",
  "Electric Bed",
  "ICU Bed",
  "Ventilator Bed",
  "Birthing Bed"
];

const REAL_WORLD_BED_STATUSES = [
  "Available",
  "Occupied",
  "Reserved",
  "Maintenance",
  "Cleaning",
  "Blocked"
];

export function BedFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const urlWardId = searchParams.get("wardId");
  const urlRoomId = searchParams.get("roomId");
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { data: wardsData } = useWards({ limit: 200 });
  const { data: roomsData } = useRooms({ limit: 500 });

  const wards = wardsData?.wards || [];
  const rooms = roomsData?.rooms || [];

  const createBedMutation = useCreateBed();
  const updateBedMutation = useUpdateBed();

  const [selectedWardId, setSelectedWardId] = useState(urlWardId || "");
  const [form, setForm] = useState<{
    roomId: string;
    bedNumber: string;
    bedType: string;
    status: string;
  }>({
    roomId: urlRoomId || "",
    bedNumber: "",
    bedType: "Standard Bed",
    status: "Available"
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Filter rooms based on selected ward
  const filteredRooms = useMemo(() => {
    if (!selectedWardId) return rooms;
    return rooms.filter((r) => {
      const wId = typeof r.ward === "object" ? r.ward._id : r.ward;
      return String(wId) === String(selectedWardId);
    });
  }, [rooms, selectedWardId]);

  // Set default ward & room from URL or list
  useEffect(() => {
    if (urlRoomId && !form.roomId) {
      setForm((prev) => ({ ...prev, roomId: urlRoomId }));
    } else if (filteredRooms.length > 0 && !form.roomId && !isEditing) {
      setForm((prev) => ({ ...prev, roomId: filteredRooms[0]._id }));
    }
  }, [urlRoomId, filteredRooms, isEditing]);

  // Load existing bed on edit
  useEffect(() => {
    if (isEditing && id) {
      setIsLoading(true);
      setFetchError(null);
      api
        .get(`/beds/${id}`)
        .then((res) => {
          const bed = res.data?.data?.bed;
          if (bed) {
            const rId = typeof bed.room === "object" ? bed.room._id : bed.room;
            const wId = typeof bed.ward === "object" ? bed.ward._id : bed.ward;
            if (wId) setSelectedWardId(String(wId));
            setForm({
              roomId: String(rId),
              bedNumber: bed.bedNumber || "",
              bedType: bed.bedType || "Standard Bed",
              status: bed.status || "Available"
            });
          } else {
            setFetchError("Unable to load bed details.");
          }
        })
        .catch(() => {
          setFetchError("Unable to load bed details. Please try again.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditing]);

  const validate = () => {
    const errs: Record<string, string | undefined> = {};
    if (!form.roomId) errs.roomId = "Please select a Destination Room.";
    if (!form.bedNumber.trim()) errs.bedNumber = "Bed Number is required.";
    if (!form.bedType.trim()) errs.bedType = "Bed Hardware Type is required.";
    if (!form.status) errs.status = "Bed Status is required.";
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

    const payload = {
      roomId: form.roomId,
      bedNumber: form.bedNumber.trim(),
      bedType: form.bedType,
      status: form.status
    };

    try {
      if (isEditing && id) {
        await updateBedMutation.mutateAsync({ ...payload, id } as any);
        toast.success("✓ Bed Updated Successfully");
      } else {
        await createBedMutation.mutateAsync(payload as any);
        toast.success("✓ Bed Created Successfully");
      }
      navigate("/admin/beds");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save bed. Please check inputs.";
      setFormError(serverMsg);
      toast.error(serverMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-medium">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <span>Loading bed details...</span>
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
            <span className="text-slate-900 font-bold">{isEditing ? "Edit Bed" : "Create Bed"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BedDouble className="h-6 w-6 text-emerald-700" />
            {isEditing ? `Edit Bed: ${form.bedNumber}` : "Create Hospital Bed"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Allocate a bed to a hospital room and configure hardware specification and operational status.
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

      {/* Bed Form Card */}
      <Card className="p-6 sm:p-8 bg-white shadow-xs border border-slate-200/90 rounded-2xl">
        <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Bed Allocation Details</h2>
          <span className="text-xs font-semibold text-slate-400">* Required Fields</span>
        </div>

        <form onSubmit={handleSave} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hospital Ward (Filter)
              </label>
              <select
                value={selectedWardId}
                onChange={(e) => {
                  setSelectedWardId(e.target.value);
                  setForm((prev) => ({ ...prev, roomId: "" }));
                  if (fieldErrors.roomId) setFieldErrors((prev) => ({ ...prev, roomId: undefined }));
                }}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="">All Wards</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>{w.name} ({w.wardType})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Destination Room <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.roomId}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({ ...prev, roomId: val }));
                  if (fieldErrors.roomId) setFieldErrors((prev) => ({ ...prev, roomId: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 bg-white font-medium ${
                  fieldErrors.roomId ? "border-rose-400 text-rose-900" : "border-slate-300 text-slate-900"
                }`}
                required
              >
                <option value="">-- Choose Room --</option>
                {filteredRooms.map((r) => (
                  <option key={r._id} value={r._id}>
                    Room {r.roomNumber} ({r.wardName || "Ward"} • {r.roomType})
                  </option>
                ))}
              </select>
              {fieldErrors.roomId && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.roomId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Bed Number / Code *"
              placeholder="e.g. 101-A, Bed-101, ICU-B1"
              value={form.bedNumber}
              error={fieldErrors.bedNumber}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, bedNumber: val }));
                if (fieldErrors.bedNumber) setFieldErrors((prev) => ({ ...prev, bedNumber: undefined }));
              }}
              required
            />

            <SelectField
              label="Bed Hardware Type *"
              value={form.bedType}
              onChange={(e) => setForm((prev) => ({ ...prev, bedType: e.target.value }))}
            >
              {REAL_WORLD_BED_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </SelectField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Bed Status *"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {REAL_WORLD_BED_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
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
              disabled={createBedMutation.isPending || updateBedMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Update Bed" : "Save Bed"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
