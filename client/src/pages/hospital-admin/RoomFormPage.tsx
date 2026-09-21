import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  DoorOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Check,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  IndianRupee,
  BedDouble,
  Layers,
  FileText,
  ArrowRight,
  Loader2
} from "lucide-react";

import { useWards } from "../../features/wards";
import { useCreateRoom, useUpdateRoom } from "../../features/rooms";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { Badge } from "../../components/ui/Badge";

// Accommodation Categories
const REAL_WORLD_ROOM_CATEGORIES = [
  "General",
  "Semi Private",
  "Private",
  "Deluxe",
  "Suite"
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoadingRoomData, setIsLoadingRoomData] = useState(isEditing);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Wards list
  const { data: wardsData } = useWards({ limit: 200 });
  const wards = wardsData?.wards || [];

  // Mutations
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();

  // Form State
  const [form, setForm] = useState({
    wardId: urlWardId || "",
    roomNumber: "",
    roomName: "",
    floor: 1,
    roomCategory: "General",
    acType: "Non AC" as "AC" | "Non AC",
    capacity: 2,
    autoGenerateBeds: true,
    bedPrefix: "",
    customBeds: [] as string[],
    description: "",
    status: "Available" as "Available" | "Occupied" | "Cleaning" | "Maintenance" | "Blocked" | "Inactive",
    // Tariff Fields
    consultationCharge: 500,
    dailyRoomCharge: 1500,
    nursingCharge: 300,
    maintenanceCharge: 100,
    extraBedCharge: 500,
    emergencyCharge: 0,
    admissionDeposit: 5000,
    gstPercent: 5,
    effectiveFrom: new Date().toISOString().split("T")[0],
    tariffStatus: "Active" as "Active" | "Inactive"
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Auto-select ward if urlWardId provided or if wards load
  useEffect(() => {
    if (urlWardId && !form.wardId) {
      setForm((prev) => ({ ...prev, wardId: urlWardId }));
    } else if (wards.length > 0 && !form.wardId) {
      setForm((prev) => ({ ...prev, wardId: wards[0]._id }));
    }
  }, [urlWardId, wards]);

  // Load existing room record by ID on edit
  useEffect(() => {
    if (isEditing && id) {
      setIsLoadingRoomData(true);
      setFetchError(null);
      api
        .get(`/rooms/${id}`)
        .then((res) => {
          const room = res.data.data?.room;
          if (room) {
            const wId = typeof room.ward === "object" ? room.ward._id : room.ward;
            setForm({
              wardId: String(wId),
              roomNumber: room.roomNumber || "",
              roomName: room.roomName || "",
              floor: room.floor ?? 1,
              roomCategory: REAL_WORLD_ROOM_CATEGORIES.includes(room.roomType) ? room.roomType : "General",
              acType: room.acType || "Non AC",
              capacity: room.capacity ?? 2,
              autoGenerateBeds: true,
              bedPrefix: `Bed-${room.roomNumber}`,
              customBeds: [],
              description: room.description || "",
              status: room.status || "Available",
              consultationCharge: room.tariff?.consultationCharge ?? 500,
              dailyRoomCharge: room.tariff?.roomChargePerDay ?? 1500,
              nursingCharge: room.tariff?.nursingCharge ?? 300,
              maintenanceCharge: room.tariff?.maintenanceCharge ?? 100,
              extraBedCharge: room.tariff?.extraBedCharge ?? 500,
              emergencyCharge: room.tariff?.emergencyCharge ?? 0,
              admissionDeposit: room.tariff?.admissionDeposit ?? 5000,
              gstPercent: room.tariff?.gstPercent ?? 5,
              effectiveFrom: room.tariff?.effectiveFrom
                ? new Date(room.tariff.effectiveFrom).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
              tariffStatus: room.tariff?.status || "Active"
            });
          } else {
            setFetchError("Unable to load existing room details. Please try again.");
          }
        })
        .catch(() => {
          setFetchError("Unable to load existing room details. Please try again.");
        })
        .finally(() => {
          setIsLoadingRoomData(false);
        });
    }
  }, [id, isEditing]);

  // Auto set bed prefix when roomNumber changes
  useEffect(() => {
    if (form.roomNumber.trim() && !form.bedPrefix) {
      setForm((prev) => ({ ...prev, bedPrefix: `Bed-${form.roomNumber.trim()}` }));
    }
  }, [form.roomNumber]);

  // Auto calculate Total Daily Charge
  const totalDailyCharge = useMemo(() => {
    const base = Number(form.dailyRoomCharge) || 0;
    const nursing = Number(form.nursingCharge) || 0;
    const maintenance = Number(form.maintenanceCharge) || 0;
    const gstAmount = (base * (Number(form.gstPercent) || 0)) / 100;
    return Math.round(base + nursing + maintenance + gstAmount);
  }, [form.dailyRoomCharge, form.nursingCharge, form.maintenanceCharge, form.gstPercent]);

  // Preview generated beds
  const previewBedsList = useMemo(() => {
    if (!form.roomNumber.trim() || form.capacity <= 0) return [];
    const list = [];
    const prefix = form.bedPrefix.trim() || `Bed-${form.roomNumber.trim()}`;
    const cap = Math.min(form.capacity, 50);
    for (let i = 0; i < cap; i++) {
      const letter = getBedLetter(i);
      list.push(`${prefix}-${letter}`);
    }
    return list;
  }, [form.roomNumber, form.capacity, form.bedPrefix]);

  const selectedWardObj = useMemo(() => {
    return wards.find((w) => w._id === form.wardId);
  }, [wards, form.wardId]);

  const validateAndProceed = (nextStep: 1 | 2 | 3 | 4) => {
    setFormError(null);

    if (currentStep === 1) {
      if (!form.wardId) {
        setFormError("Please select a Ward.");
        return;
      }
      if (!form.roomNumber.trim()) {
        setFormError("Room Number is required.");
        return;
      }
    }

    if (currentStep === 2) {
      if (form.capacity <= 0) {
        setFormError("Room bed capacity must be at least 1.");
        return;
      }
    }

    if (currentStep === 3) {
      if (form.dailyRoomCharge < 0) {
        setFormError("Daily Room Charge cannot be negative.");
        return;
      }
    }

    setCurrentStep(nextStep);
  };

  const handleSaveRoom = async (proceedToBeds = false) => {
    setFormError(null);

    if (!form.wardId || !form.roomNumber.trim()) {
      setFormError("Ward selection and Room Number are required.");
      setCurrentStep(1);
      return;
    }

    const payload = {
      wardId: form.wardId,
      roomNumber: form.roomNumber.trim(),
      roomName: form.roomName.trim(),
      floor: Number(form.floor),
      roomType: form.roomCategory,
      acType: form.acType,
      capacity: Number(form.capacity),
      autoGenerateBeds: form.autoGenerateBeds,
      description: form.description,
      status: form.status,
      tariff: {
        consultationCharge: Number(form.consultationCharge),
        roomChargePerDay: Number(form.dailyRoomCharge),
        nursingCharge: Number(form.nursingCharge),
        maintenanceCharge: Number(form.maintenanceCharge),
        extraBedCharge: Number(form.extraBedCharge),
        emergencyCharge: Number(form.emergencyCharge),
        admissionDeposit: Number(form.admissionDeposit),
        gstPercent: Number(form.gstPercent),
        effectiveFrom: form.effectiveFrom,
        status: form.tariffStatus
      }
    };

    try {
      let savedRoomId = id;
      if (isEditing && id) {
        await updateRoomMutation.mutateAsync({ ...payload, id } as any);
        toast.success("Room capacity updated successfully.");
      } else {
        const created = await createRoomMutation.mutateAsync(payload as any);
        savedRoomId = created._id;
        toast.success("✓ Room Created Successfully");
      }

      if (proceedToBeds) {
        navigate(`/admin/beds/create-beds?roomId=${savedRoomId}&wardId=${form.wardId}`);
      } else {
        navigate("/admin/beds");
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Operation failed.");
    }
  };

  const stepsList = [
    { number: 1, label: "Step 1", title: "Room Details", icon: DoorOpen },
    { number: 2, label: "Step 2", title: "Bed Capacity", icon: BedDouble },
    { number: 3, label: "Step 3", title: "Room Tariff", icon: IndianRupee },
    { number: 4, label: "Step 4", title: "Review & Save", icon: FileText }
  ];

  if (isLoadingRoomData) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-semibold">
        <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
        <span>Loading existing room details...</span>
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
          <ArrowLeft className="h-4 w-4" /> Back to Rooms List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-20 px-2 sm:px-4">
      {/* Breadcrumb Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/admin" className="hover:text-navy-700 transition">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/admin/beds" className="hover:text-navy-700 transition">Beds & Wards</Link>
          {selectedWardObj && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 font-medium">{selectedWardObj.name} ({selectedWardObj.wardType})</span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900 font-bold">{isEditing ? `Edit Room: ${form.roomNumber}` : "Create Room"}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <DoorOpen className="h-7 w-7 text-navy-700" />
              {isEditing ? `Edit Room — Room ${form.roomNumber}` : "Step 2 — Create Room Master"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing
                ? "Update room details, climate, capacity, and integrated tariffs."
                : "Configure room accommodation categories (General, Semi Private, Private, Deluxe, Suite), climate, and tariff charges."}
            </p>
          </div>

          <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
            <ArrowLeft className="h-4 w-4" /> Back to Rooms List
          </Button>
        </div>
      </div>

      {/* Multi-Step Wizard Progress Bar */}
      <Card className="p-4 sm:p-6 bg-white shadow-sm border border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stepsList.map((step) => {
            const isCompleted = currentStep > step.number;
            const isActive = currentStep === step.number;

            return (
              <div
                key={step.number}
                onClick={() => {
                  if (step.number < currentStep) setCurrentStep(step.number as any);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition border cursor-pointer ${
                  isActive
                    ? "bg-navy-700/5 border-navy-700 text-navy-700 shadow-2xs"
                    : isCompleted
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                    : "bg-slate-50/50 border-slate-200 text-slate-400"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition ${
                    isActive
                      ? "bg-navy-700 text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : step.number}
                </div>

                <div className="overflow-hidden">
                  <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                    {step.label}
                  </span>
                  <span className="text-xs font-bold truncate block">{step.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Error Alert */}
      {formError && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          {formError}
        </div>
      )}

      {/* STEP 1: ROOM DETAILS */}
      {currentStep === 1 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-navy-700" /> Step 1 — Room Identification & Climate
            </h2>
            <span className="text-xs font-medium text-slate-500">* Required Fields</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Destination Ward *
              </label>
              <select
                value={form.wardId}
                onChange={(e) => setForm({ ...form, wardId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 bg-white font-medium"
                required
              >
                <option value="">-- Choose Hospital Ward --</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.wardType} • Floor {w.floorNumber})
                  </option>
                ))}
              </select>
            </div>

            <InputField
              label="Room Number *"
              placeholder="e.g. 101, 202-A, ICU-01"
              value={form.roomNumber}
              onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InputField
              label="Optional Room Name"
              placeholder="e.g. Presidential Suite"
              value={form.roomName}
              onChange={(e) => setForm({ ...form, roomName: e.target.value })}
            />

            <InputField
              label="Floor Number *"
              type="number"
              min={0}
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
            />

            <SelectField
              label="Room Category (Accommodation) *"
              value={form.roomCategory}
              onChange={(e) => setForm({ ...form, roomCategory: e.target.value })}
            >
              {REAL_WORLD_ROOM_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectField>
          </div>

          {/* Climate Setup */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-700">
              Climate Configuration
            </h3>

            <div className="flex gap-8 items-center">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="acType"
                  value="AC"
                  checked={form.acType === "AC"}
                  onChange={() => setForm({ ...form, acType: "AC" })}
                  className="h-4 w-4 text-navy-700 focus:ring-navy-500"
                />
                ○ AC Room
              </label>

              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="acType"
                  value="Non AC"
                  checked={form.acType === "Non AC"}
                  onChange={() => setForm({ ...form, acType: "Non AC" })}
                  className="h-4 w-4 text-navy-700 focus:ring-navy-500"
                />
                ○ Non AC Room
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Room Operational Status *"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            >
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Blocked">Blocked</option>
              <option value="Inactive">Inactive</option>
            </SelectField>

            <TextareaField
              label="Description (Optional)"
              rows={2}
              placeholder="Room location or operational notes..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </Card>
      )}

      {/* STEP 2: BED CAPACITY */}
      {currentStep === 2 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-navy-700" /> Step 2 — Bed Capacity & Auto Generator
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Total Beds (Capacity) *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={form.capacity}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(100, Math.floor(Number(e.target.value) || 1)));
                  setForm({ ...form, capacity: val });
                }}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-navy-500"
              />
            </div>

            <InputField
              label="Bed Code Prefix"
              placeholder="e.g. Bed-101"
              value={form.bedPrefix}
              onChange={(e) => setForm({ ...form, bedPrefix: e.target.value })}
            />

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autoGenerateBeds}
                  onChange={(e) => setForm({ ...form, autoGenerateBeds: e.target.checked })}
                  className="h-4 w-4 rounded text-navy-700 focus:ring-navy-500"
                />
                Auto Generate {previewBedsList.length} Beds
              </label>
            </div>
          </div>

          {/* Bed Code Preview Grid */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Bed Code Preview ({previewBedsList.length} Beds):
              </span>
            </div>

            {previewBedsList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {previewBedsList.map((bedCode, idx) => (
                  <div key={idx} className="p-2.5 bg-white border border-slate-300 rounded-lg text-center font-mono text-xs font-bold text-slate-800 shadow-2xs">
                    {bedCode}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Enter Room Number on Step 1 to preview generated bed codes.</p>
            )}
          </div>
        </Card>
      )}

      {/* STEP 3: ROOM TARIFF */}
      {currentStep === 3 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-navy-700" /> Step 3 — Room Tariff Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Room Tariff belongs to Room (NOT Bed) and automatically applies upon patient admission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InputField
              label="Consultation / Doctor Visit Charge (₹)"
              type="number"
              min={0}
              value={form.consultationCharge}
              onChange={(e) => setForm({ ...form, consultationCharge: Number(e.target.value) })}
            />

            <InputField
              label="Daily Room Charge (₹) *"
              type="number"
              min={0}
              value={form.dailyRoomCharge}
              onChange={(e) => setForm({ ...form, dailyRoomCharge: Number(e.target.value) })}
            />

            <InputField
              label="Nursing Charge (₹)"
              type="number"
              min={0}
              value={form.nursingCharge}
              onChange={(e) => setForm({ ...form, nursingCharge: Number(e.target.value) })}
            />

            <InputField
              label="Maintenance Charge (₹)"
              type="number"
              min={0}
              value={form.maintenanceCharge}
              onChange={(e) => setForm({ ...form, maintenanceCharge: Number(e.target.value) })}
            />

            <InputField
              label="GST Tax Rate (%)"
              type="number"
              min={0}
              max={28}
              value={form.gstPercent}
              onChange={(e) => setForm({ ...form, gstPercent: Number(e.target.value) })}
            />

            <InputField
              label="Admission / Security Deposit (₹)"
              type="number"
              min={0}
              value={form.admissionDeposit}
              onChange={(e) => setForm({ ...form, admissionDeposit: Number(e.target.value) })}
            />
          </div>

          {/* Auto Calculated Total Daily Charge */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                Calculated Total Daily Charge
              </span>
              <span className="text-xs text-emerald-700">
                Sum of Daily Charge (₹{form.dailyRoomCharge}) + Nursing (₹{form.nursingCharge}) + Maintenance (₹{form.maintenanceCharge}) + GST ({form.gstPercent}%)
              </span>
            </div>
            <div className="text-right font-mono font-bold text-xl text-emerald-900">
              ₹{totalDailyCharge.toLocaleString("en-IN")} / day
            </div>
          </div>
        </Card>
      )}

      {/* STEP 4: REVIEW & SAVE */}
      {currentStep === 4 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Step 4 — Master Review & Confirmation
            </h2>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Ward Name:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedWardObj?.name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Room Number:</span>
                <span className="font-bold text-slate-900 text-sm">Room {form.roomNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Category & Climate:</span>
                <span className="font-semibold text-slate-800">
                  <Badge tone="info">{form.roomCategory}</Badge> • {form.acType}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Total Daily Charge:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">₹{totalDailyCharge} / day</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Auto Generated Beds ({previewBedsList.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {previewBedsList.map((code, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-mono font-bold text-slate-800 text-xs">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Sticky Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/beds")}>
            Cancel
          </Button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button type="button" variant="secondary" onClick={() => setCurrentStep((prev) => (prev - 1) as any)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
            )}

            {currentStep < 4 ? (
              <Button type="button" variant="primary" onClick={() => validateAndProceed((currentStep + 1) as any)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant={isEditing ? "primary" : "secondary"}
                  onClick={() => handleSaveRoom(false)}
                  disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" /> {isEditing ? "Update Room" : "Save Room"}
                </Button>

                {!isEditing && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleSaveRoom(true)}
                    disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                  >
                    Next: Configure Beds <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
