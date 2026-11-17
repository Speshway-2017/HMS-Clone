import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  DoorOpen,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Snowflake,
  Wind,
  BedDouble,
  Loader2
} from "lucide-react";

import { useWards } from "../../features/wards";
import { useCreateRoom, useUpdateRoom } from "../../features/rooms";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InputField, SelectField } from "../../components/ui/Field";

const REAL_WORLD_ROOM_CATEGORIES = [
  "General",
  "Single Private",
  "Twin Sharing",
  "Semi Private",
  "Deluxe",
  "Executive Suite",
  "Suite",
  "VIP Suite",
  "ICU Pod",
  "NICU Station",
  "Isolation Room",
  "Day Care"
];

function getBedLetter(index: number): string {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

export function RoomFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const urlWardId = searchParams.get("wardId");
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Wards list
  const { data: wardsData } = useWards({ limit: 200 });
  const wards = wardsData?.wards || [];

  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();

  const [form, setForm] = useState<{
    wardId: string;
    roomNumber: string;
    floor: number | string;
    roomCategory: string;
    acType: "AC" | "Non AC";
    capacity: number | string;
    dailyRoomCharge: number | string;
    status: "Available" | "Occupied" | "Cleaning" | "Maintenance" | "Blocked";
  }>({
    wardId: urlWardId || "",
    roomNumber: "",
    floor: 1,
    roomCategory: "General",
    acType: "Non AC",
    capacity: 2,
    dailyRoomCharge: 1500,
    status: "Available"
  });

  const [isCustomRoomCategory, setIsCustomRoomCategory] = useState(false);
  const [customRoomCategoryInput, setCustomRoomCategoryInput] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-select initial ward if urlWardId provided or when wards load
  useEffect(() => {
    if (urlWardId && !form.wardId) {
      setForm((prev) => ({ ...prev, wardId: urlWardId }));
      const foundWard = wards.find((w) => w._id === urlWardId);
      if (foundWard) {
        setForm((prev) => ({ ...prev, floor: foundWard.floorNumber ?? 1 }));
      }
    } else if (wards.length > 0 && !form.wardId && !isEditing) {
      setForm((prev) => ({
        ...prev,
        wardId: wards[0]._id,
        floor: wards[0].floorNumber ?? 1
      }));
    }
  }, [urlWardId, wards, isEditing]);

  // Load existing room details on edit
  useEffect(() => {
    if (isEditing && id) {
      setIsLoading(true);
      setFetchError(null);
      api
        .get(`/rooms/${id}`)
        .then((res) => {
          const room = res.data?.data?.room;
          if (room) {
            const wId = typeof room.ward === "object" ? room.ward._id : room.ward;
            const isCustom = !REAL_WORLD_ROOM_CATEGORIES.includes(room.roomType);
            setIsCustomRoomCategory(isCustom);
            if (isCustom) setCustomRoomCategoryInput(room.roomType || "");
            setForm({
              wardId: String(wId),
              roomNumber: room.roomNumber || "",
              floor: room.floor ?? 1,
              roomCategory: room.roomType || "General",
              acType: room.acType || "Non AC",
              capacity: room.capacity ?? 2,
              dailyRoomCharge: room.tariff?.roomChargePerDay ?? 1500,
              status: room.status === "Active" ? "Available" : room.status || "Available"
            });
          } else {
            setFetchError("Unable to load room details.");
          }
        })
        .catch(() => {
          setFetchError("Unable to load room details. Please try again.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditing]);

  // Bed generation preview
  const previewBeds = useMemo(() => {
    const cap = Number(form.capacity) || 0;
    if (cap <= 0) return [];
    const count = Math.min(cap, 50);
    const roomNum = form.roomNumber.trim() || "101";
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(`${roomNum}-${getBedLetter(i)}`);
    }
    return list;
  }, [form.capacity, form.roomNumber]);

  const validate = () => {
    const errs: Record<string, string | undefined> = {};
    if (!form.wardId) errs.wardId = "Please select a Destination Ward.";
    if (!form.roomNumber.trim()) errs.roomNumber = "Room Number is required.";
    const selectedCategory = isCustomRoomCategory ? customRoomCategoryInput.trim() : form.roomCategory.trim();
    if (!selectedCategory) errs.roomCategory = "Room Category is required.";
    if (form.floor === "" || form.floor === null || form.floor === undefined || isNaN(Number(form.floor))) {
      errs.floor = "Floor Number is required.";
    }
    const capNum = Number(form.capacity);
    if (!capNum || capNum < 1 || capNum > 50) {
      errs.capacity = "Bed Capacity must be between 1 and 50 beds.";
    }
    if (form.dailyRoomCharge === "" || form.dailyRoomCharge === null || isNaN(Number(form.dailyRoomCharge)) || Number(form.dailyRoomCharge) < 0) {
      errs.dailyRoomCharge = "Valid daily room tariff is required.";
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

    const resolvedCategory = isCustomRoomCategory ? customRoomCategoryInput.trim() : form.roomCategory.trim();

    const payload = {
      wardId: form.wardId,
      roomNumber: form.roomNumber.trim(),
      floor: Number(form.floor),
      roomType: resolvedCategory,
      acType: form.acType,
      capacity: Number(form.capacity),
      status: form.status,
      autoGenerateBeds: true,
      tariff: {
        roomChargePerDay: Number(form.dailyRoomCharge) || 0,
        status: "Active"
      }
    };

    try {
      if (isEditing && id) {
        await updateRoomMutation.mutateAsync({ ...payload, id } as any);
        toast.success("✓ Room Updated Successfully");
      } else {
        await createRoomMutation.mutateAsync(payload as any);
        toast.success("✓ Room & Bed Capacity Provisioned Successfully");
      }
      navigate("/admin/beds");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save room. Please check inputs.";
      setFormError(serverMsg);
      toast.error(serverMsg);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-medium">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <span>Loading room details...</span>
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
            <span className="text-slate-900 font-bold">{isEditing ? "Edit Room" : "Create Room"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <DoorOpen className="h-6 w-6 text-emerald-700" />
            {isEditing ? `Edit Room: ${form.roomNumber}` : "Create Hospital Room"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign ward, specify user-defined room category, climate (AC / Non AC), bed capacity, and daily tariff.
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

      {/* Room Form Card */}
      <Card className="p-6 sm:p-8 bg-white shadow-xs border border-slate-200/90 rounded-2xl">
        <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Room Specifications & Tariff</h2>
          <span className="text-xs font-semibold text-slate-400">* Required Fields</span>
        </div>

        <form onSubmit={handleSave} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Destination Ward <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.wardId}
                onChange={(e) => {
                  const val = e.target.value;
                  const selectedWard = wards.find((w) => w._id === val);
                  setForm((prev) => ({
                    ...prev,
                    wardId: val,
                    floor: selectedWard?.floorNumber ?? prev.floor
                  }));
                  if (fieldErrors.wardId) setFieldErrors((prev) => ({ ...prev, wardId: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 bg-white font-medium ${
                  fieldErrors.wardId ? "border-rose-400 text-rose-900" : "border-slate-300 text-slate-900"
                }`}
                required
              >
                <option value="">-- Select Hospital Ward --</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.wardType} • Floor {w.floorNumber})
                  </option>
                ))}
              </select>
              {fieldErrors.wardId && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.wardId}</p>
              )}
            </div>

            <InputField
              label="Room Number *"
              placeholder="e.g. 101, 204-B, ICU-01"
              value={form.roomNumber}
              error={fieldErrors.roomNumber}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, roomNumber: val }));
                if (fieldErrors.roomNumber) setFieldErrors((prev) => ({ ...prev, roomNumber: undefined }));
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <SelectField
                label="Room Category / Type *"
                value={isCustomRoomCategory ? "__CUSTOM__" : form.roomCategory}
                error={!isCustomRoomCategory ? fieldErrors.roomCategory : undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__CUSTOM__") {
                    setIsCustomRoomCategory(true);
                    setForm((prev) => ({ ...prev, roomCategory: customRoomCategoryInput || "" }));
                  } else {
                    setIsCustomRoomCategory(false);
                    setForm((prev) => ({ ...prev, roomCategory: val }));
                    if (fieldErrors.roomCategory) setFieldErrors((prev) => ({ ...prev, roomCategory: undefined }));
                  }
                }}
              >
                {REAL_WORLD_ROOM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__CUSTOM__">+ Define Custom Room Type...</option>
              </SelectField>

              {isCustomRoomCategory && (
                <div className="mt-2">
                  <InputField
                    label="Custom Room Category Name *"
                    placeholder="e.g. Isolation Suite, Executive Pod"
                    value={customRoomCategoryInput}
                    error={fieldErrors.roomCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomRoomCategoryInput(val);
                      setForm((prev) => ({ ...prev, roomCategory: val }));
                      if (fieldErrors.roomCategory) setFieldErrors((prev) => ({ ...prev, roomCategory: undefined }));
                    }}
                    required
                  />
                </div>
              )}
            </div>

            {/* Climate Division Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Climate Classification <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, acType: "AC" }))}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    form.acType === "AC"
                      ? "bg-sky-50 border-sky-400 text-sky-800 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Snowflake className="h-4 w-4 text-sky-500" /> Air Conditioned (AC)
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, acType: "Non AC" }))}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    form.acType === "Non AC"
                      ? "bg-slate-100 border-slate-400 text-slate-800 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Wind className="h-4 w-4 text-slate-500" /> Non-AC
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InputField
              label="Floor Number *"
              type="number"
              min={-5}
              max={100}
              value={form.floor}
              error={fieldErrors.floor}
              onChange={(e) => {
                const raw = e.target.value;
                setForm((prev) => ({ ...prev, floor: raw === "" ? "" : Number(raw) }));
                if (fieldErrors.floor) setFieldErrors((prev) => ({ ...prev, floor: undefined }));
              }}
              required
            />

            <InputField
              label="Bed Capacity (Count) *"
              type="number"
              min={1}
              max={50}
              value={form.capacity}
              error={fieldErrors.capacity}
              onChange={(e) => {
                const raw = e.target.value;
                setForm((prev) => ({ ...prev, capacity: raw === "" ? "" : Number(raw) }));
                if (fieldErrors.capacity) setFieldErrors((prev) => ({ ...prev, capacity: undefined }));
              }}
              required
            />

            <InputField
              label="Room Tariff (₹ / Day) *"
              type="number"
              min={0}
              placeholder="e.g. 1500"
              value={form.dailyRoomCharge}
              error={fieldErrors.dailyRoomCharge}
              onChange={(e) => {
                const raw = e.target.value;
                setForm((prev) => ({ ...prev, dailyRoomCharge: raw === "" ? "" : Number(raw) }));
                if (fieldErrors.dailyRoomCharge) setFieldErrors((prev) => ({ ...prev, dailyRoomCharge: undefined }));
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Room Status *"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="Available">Available (Vacant & Ready)</option>
              <option value="Occupied">Occupied</option>
              <option value="Cleaning">Cleaning / Sanitization</option>
              <option value="Maintenance">Maintenance / Repair</option>
              <option value="Blocked">Blocked</option>
            </SelectField>
          </div>

          {/* Live Bed Provisioning Preview */}
          {!isEditing && previewBeds.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4 text-emerald-700" />
                  Auto-Provisioned Beds ({previewBeds.length}):
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Capacity: {form.capacity} Beds
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {previewBeds.map((bedCode) => (
                  <span
                    key={bedCode}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white border border-emerald-200 text-emerald-900 shadow-2xs"
                  >
                    {bedCode}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/beds")}>
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Update Room" : "Save Room"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
