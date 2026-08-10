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
  const [form, setForm] = useState({
    roomId: urlRoomId || "",
    bedPrefix: "Bed",
    startingNumber: 1,
    numberOfBeds: 2,
    bedType: "Standard Bed",
    status: "Available",
    autoGenerateBedIds: true
  });

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
            setSelectedWardId(String(wId));
            setForm({
              roomId: String(rId),
              bedPrefix: bed.bedNumber || bed.bedCode || "",
              startingNumber: 1,
              numberOfBeds: 1,
              bedType: REAL_WORLD_BED_TYPES.includes(bed.bedType) ? bed.bedType : "Standard Bed",
              status: REAL_WORLD_BED_STATUSES.includes(bed.status) ? bed.status : "Available",
              autoGenerateBedIds: false
            });
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
    if (form.numberOfBeds <= 0) return [];
    const list = [];
    const prefix = form.bedPrefix.trim() || "Bed";
    const count = Math.min(form.numberOfBeds, 50);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.roomId) {
      setFormError("Please select a destination Room.");
      return;
    }

    if (!form.bedPrefix.trim()) {
      setFormError("Bed Prefix is required.");
      return;
    }

    try {
      if (isEditing && id) {
        await updateBedMutation.mutateAsync({
          id,
          roomId: form.roomId,
          bedNumber: form.bedPrefix,
          bedType: form.bedType,
          status: form.status
        } as any);
        toast.success("✓ Bed Updated Successfully");
      } else {
        const bedsToCreate = previewGeneratedBedIds.length > 0 ? previewGeneratedBedIds : [form.bedPrefix];
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
      setFormError(err.response?.data?.message || "Operation failed.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-semibold">
        <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
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
          <Link to="/admin" className="hover:text-navy-700 transition">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/admin/beds" className="hover:text-navy-700 transition">Beds & Wards</Link>
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
              <BedDouble className="h-7 w-7 text-navy-700" />
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
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          {formError}
        </div>
      )}

      {/* Bed Generation Form Card */}
      <Card className="p-6 space-y-6 bg-white shadow-sm border border-slate-200">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Bed Allocation & Hardware Specification</h2>
          <span className="text-xs font-medium text-slate-500">* Required Fields</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                Destination Room *
              </label>
              <select
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 bg-white font-medium"
                required
              >
                <option value="">-- Choose Room --</option>
                {filteredRooms.map((r) => (
                  <option key={r._id} value={r._id}>
                    Room {r.roomNumber} ({r.wardName || "Ward"} • {r.roomType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField
              label="Bed Number / Prefix *"
              placeholder="e.g. Bed-101 or ICU-B"
              value={form.bedPrefix}
              onChange={(e) => setForm({ ...form, bedPrefix: e.target.value })}
              required
            />

            {!isEditing && (
              <InputField
                label="Number of Beds *"
                type="number"
                min={1}
                max={50}
                value={form.numberOfBeds}
                onChange={(e) => setForm({ ...form, numberOfBeds: Number(e.target.value) })}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Bed Hardware Type *"
              value={form.bedType}
              onChange={(e) => setForm({ ...form, bedType: e.target.value })}
            >
              {REAL_WORLD_BED_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </SelectField>

            <SelectField
              label="Initial Bed Status *"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
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
                <span className="text-xs font-mono font-semibold text-navy-700 bg-white px-2.5 py-1 rounded border">
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
