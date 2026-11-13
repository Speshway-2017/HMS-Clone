import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BedDouble,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
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
  "Maintenance"
];

const BED_LIMITS = {
  BED_PREFIX: 50,
  BED_COUNT_MIN: 1,
  BED_COUNT_MAX: 50,
} as const;

const BED_PREFIX_REGEX = /^[A-Za-z0-9\-_./\s]+$/;

function getBedLetter(index: number): string {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

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
  const { data: roomsData } = useRooms({ limit: 200 });

  const wards = wardsData?.wards || [];
  const rooms = roomsData?.rooms || [];

  const createBedMutation = useCreateBed();
  const updateBedMutation = useUpdateBed();

  const [selectedWardId, setSelectedWardId] = useState(urlWardId || "");
  const [form, setForm] = useState<{
    roomId: string;
    bedPrefix: string;
    startingNumber: number;
    numberOfBeds: number | string;
    bedType: string;
    status: string;
    autoGenerateBedIds: boolean;
  }>({
    roomId: urlRoomId || "",
    bedPrefix: "Bed",
    startingNumber: 1,
    numberOfBeds: 2,
    bedType: "Standard Bed",
    status: "Available",
    autoGenerateBedIds: true
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Filter rooms based on selected ward
  const filteredRooms = useMemo(() => {
    if (!selectedWardId) return rooms;
    return rooms.filter((r) => {
      const wId = typeof r.ward === "object" ? r.ward._id : r.ward;
      return String(wId) === String(selectedWardId);
    });
  }, [rooms, selectedWardId]);

  // Set default ward & room from URL or available list
  useEffect(() => {
    if (urlRoomId && !form.roomId) {
      setForm((prev) => ({ ...prev, roomId: urlRoomId }));
    } else if (filteredRooms.length > 0 && !form.roomId && !isEditing) {
      setForm((prev) => ({ ...prev, roomId: filteredRooms[0]._id }));
    }
  }, [urlRoomId, filteredRooms, isEditing]);

  // Update bedPrefix when room changes
  useEffect(() => {
    if (form.roomId && !isEditing) {
      const selectedRoom = rooms.find((r) => r._id === form.roomId);
      if (selectedRoom) {
        setForm((prev) => ({
          ...prev,
          bedPrefix: `Bed-${selectedRoom.roomNumber}`
        }));
        if (!selectedWardId) {
          const wId = typeof selectedRoom.ward === "object" ? selectedRoom.ward._id : selectedRoom.ward;
          setSelectedWardId(String(wId));
        }
      }
    }
  }, [form.roomId, rooms, isEditing]);

  // Load existing bed record by ID on edit
  useEffect(() => {
    if (isEditing && id) {
      setIsLoading(true);
      setFetchError(null);
      api
        .get(`/beds/${id}`)
        .then((res) => {
          const bed = res.data.data?.bed;
          if (bed) {
            const rId = typeof bed.room === "object" ? bed.room._id : bed.room;
            const wId = typeof bed.ward === "object" ? bed.ward._id : bed.ward;
            setForm({
              roomId: String(rId),
              bedPrefix: bed.bedNumber || "",
              startingNumber: 1,
              numberOfBeds: 1,
              bedType: bed.bedType || "Standard Bed",
              status: bed.status || "Available",
              autoGenerateBedIds: false
            });
            if (wId) {
              setSelectedWardId(String(wId));
            }
            setFieldErrors({});
          } else {
            setFetchError("Unable to load existing bed details. Please try again.");
          }
        })
        .catch(() => {
          setFetchError("Unable to load existing bed details. Please try again.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditing]);

  const selectedWardObj = useMemo(() => wards.find((w) => w._id === selectedWardId), [wards, selectedWardId]);
  const selectedRoomObj = useMemo(() => rooms.find((r) => r._id === form.roomId), [rooms, form.roomId]);

  // Preview list of calculated bed IDs
  const previewGeneratedBedIds = useMemo(() => {
    const num = Number(form.numberOfBeds) || 0;
    if (num <= 0) return [];
    const list = [];
    const prefix = form.bedPrefix.trim() || "Bed";
    const count = Math.min(num, 50);

    for (let i = 0; i < count; i++) {
      if (prefix.includes("-")) {
        const letter = getBedLetter(i);
        list.push(`${prefix}-${letter}`);
      } else {
        list.push(`${prefix}-${i + 1}`);
      }
    }
    return list;
  }, [form.bedPrefix, form.numberOfBeds]);

  const validateField = (field: "roomId" | "bedPrefix" | "numberOfBeds", value: any): string | undefined => {
    const valStr = typeof value === "string" ? value : String(value ?? "");
    const trimmed = valStr.trim();

    if (field === "roomId") {
      if (!trimmed) {
        return "Please select a destination Room. Field is required. Please fill out this field";
      }
      return undefined;
    }

    if (field === "bedPrefix") {
      if (!trimmed) {
        return "Bed Number / Prefix is required. Field is required. Please fill out this field";
      }
      if (valStr.length > BED_LIMITS.BED_PREFIX) {
        return `Bed Number cannot exceed ${BED_LIMITS.BED_PREFIX} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!BED_PREFIX_REGEX.test(trimmed)) {
        return "Bed Number contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "numberOfBeds") {
      if (!isEditing) {
        if (valStr === "" || valStr === null || valStr === undefined) {
          return "Number of Beds is required. Field is required. Please fill out this field";
        }
        const num = Number(value);
        if (isNaN(num)) {
          return "Number of Beds must be a valid number. Invalid data is not accepted. Please enter valid data";
        }
        if (num < BED_LIMITS.BED_COUNT_MIN) {
          return `Number of Beds must be at least ${BED_LIMITS.BED_COUNT_MIN}. Invalid data is not accepted. Please enter valid data`;
        }
        if (num > BED_LIMITS.BED_COUNT_MAX) {
          return `Number of Beds cannot exceed ${BED_LIMITS.BED_COUNT_MAX}. Too long text is not accepted. Please enter valid data`;
        }
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

  const handleNumberKeyGuard = (e: React.KeyboardEvent<HTMLInputElement>, field: string, label: string) => {
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

    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
      e.preventDefault();
      const msg = `${label} cannot be negative. Invalid data is not accepted. Please enter valid data`;
      setFormError("Please enter valid data");
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-no-neg` });
      return;
    }

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const msg = "Please enter valid data";
      setFormError(msg);
      setFieldErrors((prev) => ({ ...prev, [field]: msg }));
      toast.error(msg, { id: `${field}-inv-digit` });
    }
  };

  const handleBlur = (field: "roomId" | "bedPrefix" | "numberOfBeds") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setFormError("Please enter valid data");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const roomErr = validateField("roomId", form.roomId);
    const prefixErr = validateField("bedPrefix", form.bedPrefix);
    const countErr = validateField("numberOfBeds", form.numberOfBeds);

    const errors = { roomId: roomErr, bedPrefix: prefixErr, numberOfBeds: countErr };
    setFieldErrors(errors);
    setTouched({ roomId: true, bedPrefix: true, numberOfBeds: true });

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean);
      setFormError(firstError || "Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "bed-form-invalid" });
      return;
    }

    try {
      if (isEditing && id) {
        await updateBedMutation.mutateAsync({
          id,
          roomId: form.roomId,
          bedNumber: form.bedPrefix.trim(),
          bedType: form.bedType,
          status: form.status
        } as any);
        toast.success("✓ Bed Updated Successfully");
      } else {
        const bedsToCreate = previewGeneratedBedIds.length > 0 ? previewGeneratedBedIds : [form.bedPrefix.trim()];
        let createdCount = 0;

        for (const bNum of bedsToCreate) {
          await createBedMutation.mutateAsync({
            roomId: form.roomId,
            bedNumber: bNum,
            bedType: form.bedType,
            status: form.status
          });
          createdCount++;
        }

        toast.success(`✓ ${createdCount > 1 ? `${createdCount} Beds Generated Successfully` : "Bed Created Successfully"}`);
      }
      navigate("/admin/beds");
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Please enter valid data";
      setFormError(serverMsg);
      toast.error(serverMsg, { id: "bed-save-error" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-semibold">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <span>Loading existing bed details...</span>
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
          <ArrowLeft className="h-4 w-4" /> Back to Beds List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-20 px-2 sm:px-4">
      {/* Breadcrumb Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/admin" className="hover:text-emerald-700 transition">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/admin/beds" className="hover:text-emerald-700 transition">Beds & Wards</Link>
          {selectedWardObj && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 font-medium">{selectedWardObj.name}</span>
            </>
          )}
          {selectedRoomObj && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 font-medium">Room {selectedRoomObj.roomNumber}</span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900 font-bold">{isEditing ? `Edit Bed: ${form.bedPrefix}` : "Configure Beds"}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <BedDouble className="h-7 w-7 text-emerald-700" />
              {isEditing ? `Edit Bed — ${form.bedPrefix}` : "Step 3 — Configure Beds inside Room"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing
                ? "Update bed number, hardware specification, and operational status."
                : "Individual Patient Allocation: Assign bed specification types and operational status within room containers."}
            </p>
          </div>

          <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
            <ArrowLeft className="h-4 w-4" /> Back to Beds List
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

      {/* Bed Generation Form Card */}
      <Card className="p-6 space-y-6 bg-white shadow-sm border border-slate-200">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Bed Allocation & Hardware Specification</h2>
          <span className="text-xs font-medium text-slate-500">* Required Fields</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hospital Ward
              </label>
              <select
                value={selectedWardId}
                onChange={(e) => {
                  setSelectedWardId(e.target.value);
                  setForm((prev) => ({ ...prev, roomId: "" }));
                  setFieldErrors((prev) => ({ ...prev, roomId: undefined }));
                }}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 bg-white"
              >
                <option value="">All Wards</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>{w.name} ({w.wardType})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Destination Room <span className="text-red-500">*</span>
              </label>
              <select
                value={form.roomId}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({ ...prev, roomId: val }));
                  const err = validateField("roomId", val);
                  setFieldErrors((prev) => ({ ...prev, roomId: err }));
                  if (!err && formError === "Please enter valid data") setFormError(null);
                }}
                onBlur={() => handleBlur("roomId")}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-navy-500 bg-white font-medium ${
                  fieldErrors.roomId ? "border-red-500 text-red-900" : "border-slate-300 text-slate-900"
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
                <p className="mt-1 text-xs font-medium text-red-600" role="alert">
                  {fieldErrors.roomId}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Bed Number / Prefix *"
              placeholder="e.g. Bed-101 or ICU-B"
              value={form.bedPrefix}
              maxLength={BED_LIMITS.BED_PREFIX}
              showCharCount
              error={fieldErrors.bedPrefix}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, bedPrefix: val }));
                const err = validateField("bedPrefix", val);
                setFieldErrors((prev) => ({ ...prev, bedPrefix: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "bedPrefix", form.bedPrefix.length, BED_LIMITS.BED_PREFIX, "Bed Number", BED_PREFIX_REGEX)}
              onBlur={() => handleBlur("bedPrefix")}
              required
            />

            {!isEditing && (
              <InputField
                label="Number of Beds *"
                type="number"
                min={BED_LIMITS.BED_COUNT_MIN}
                max={BED_LIMITS.BED_COUNT_MAX}
                value={form.numberOfBeds}
                error={fieldErrors.numberOfBeds}
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = raw === "" ? "" : Number(raw);
                  setForm((prev) => ({ ...prev, numberOfBeds: val }));
                  const err = validateField("numberOfBeds", raw);
                  setFieldErrors((prev) => ({ ...prev, numberOfBeds: err }));
                  if (!err && formError === "Please enter valid data") setFormError(null);
                }}
                onKeyDown={(e) => handleNumberKeyGuard(e, "numberOfBeds", "Number of Beds")}
                onBlur={() => handleBlur("numberOfBeds")}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Bed Hardware Type *"
              value={form.bedType}
              onChange={(e) => setForm((prev) => ({ ...prev, bedType: e.target.value }))}
            >
              {REAL_WORLD_BED_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </SelectField>

            <SelectField
              label="Initial Bed Status *"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {REAL_WORLD_BED_STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </SelectField>
          </div>

          {/* Generated Bed Preview Box */}
          {!isEditing && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Bed Allocation Preview ({previewGeneratedBedIds.length} Beds):
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded border">
                  Room: {selectedRoomObj ? `Room ${selectedRoomObj.roomNumber}` : "—"}
                </span>
              </div>

              {previewGeneratedBedIds.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {previewGeneratedBedIds.map((code, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-300 rounded-lg text-center font-mono text-xs font-bold text-slate-800 shadow-2xs">
                      {code}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Select room to preview generated bed IDs.</p>
              )}
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/beds")}>
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={createBedMutation.isPending || updateBedMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Update Bed" : "Save & Finish"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
