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

const ROOM_LIMITS = {
  ROOM_NUMBER: 20,
  ROOM_NAME: 100,
  FLOOR_MIN: -5,
  FLOOR_MAX: 100,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 50,
  BED_PREFIX: 50,
  DESCRIPTION: 500,
  CHARGE_MAX: 10000000,
  GST_MAX: 100,
} as const;

const ROOM_NUMBER_REGEX = /^[a-zA-Z0-9\-_./]+$/;
const ROOM_NAME_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()]+$/;
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
  const [form, setForm] = useState<{
    wardId: string;
    roomNumber: string;
    roomName: string;
    floor: number | string;
    roomCategory: string;
    acType: "AC" | "Non AC";
    capacity: number | string;
    autoGenerateBeds: boolean;
    bedPrefix: string;
    customBeds: string[];
    description: string;
    status: "Available" | "Occupied" | "Cleaning" | "Maintenance" | "Blocked" | "Inactive";
    consultationCharge: number | string;
    dailyRoomCharge: number | string;
    nursingCharge: number | string;
    maintenanceCharge: number | string;
    extraBedCharge: number | string;
    emergencyCharge: number | string;
    admissionDeposit: number | string;
    gstPercent: number | string;
    effectiveFrom: string;
    tariffStatus: "Active" | "Inactive";
  }>({
    wardId: urlWardId || "",
    roomNumber: "",
    roomName: "",
    floor: 1,
    roomCategory: "General",
    acType: "Non AC",
    capacity: 2,
    autoGenerateBeds: true,
    bedPrefix: "",
    customBeds: [],
    description: "",
    status: "Available",
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
    tariffStatus: "Active"
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [, setTouched] = useState<Record<string, boolean>>({});
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
            setFieldErrors({});
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

  const selectedWardObj = useMemo(() => wards.find((w) => w._id === form.wardId), [wards, form.wardId]);

  // Auto-fill bedPrefix if empty when roomNumber changes
  useEffect(() => {
    if (form.roomNumber && !isEditing) {
      setForm((prev) => ({
        ...prev,
        bedPrefix: prev.bedPrefix || `Bed-${prev.roomNumber.trim()}`
      }));
    }
  }, [form.roomNumber, isEditing]);

  // Dynamic Bed Code Generation Preview
  const previewBedsList = useMemo(() => {
    const numCap = Number(form.capacity) || 0;
    if (numCap <= 0) return [];
    const count = Math.min(numCap, 50);
    const list = [];
    const prefix = form.bedPrefix.trim() || `Bed-${form.roomNumber.trim() || "101"}`;

    for (let i = 0; i < count; i++) {
      const letter = getBedLetter(i);
      list.push(`${prefix}-${letter}`);
    }
    return list;
  }, [form.capacity, form.bedPrefix, form.roomNumber]);

  // Calculated daily room tariff
  const totalDailyCharge = useMemo(() => {
    const daily = Number(form.dailyRoomCharge) || 0;
    const nursing = Number(form.nursingCharge) || 0;
    const maintenance = Number(form.maintenanceCharge) || 0;
    const gstRate = Number(form.gstPercent) || 0;

    const subtotal = daily + nursing + maintenance;
    const gstAmount = Math.round((subtotal * gstRate) / 100);
    return subtotal + gstAmount;
  }, [form.dailyRoomCharge, form.nursingCharge, form.maintenanceCharge, form.gstPercent]);

  const validateField = (field: string, value: any): string | undefined => {
    const valStr = typeof value === "string" ? value : String(value ?? "");
    const trimmed = valStr.trim();

    if (field === "wardId") {
      if (!trimmed) {
        return "Please select a destination Ward. Field is required. Please fill out this field";
      }
      return undefined;
    }

    if (field === "roomNumber") {
      if (!trimmed) {
        return "Room Number is required. Field is required. Please fill out this field";
      }
      if (valStr.length > ROOM_LIMITS.ROOM_NUMBER) {
        return `Room Number cannot exceed ${ROOM_LIMITS.ROOM_NUMBER} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!ROOM_NUMBER_REGEX.test(trimmed)) {
        return "Room Number contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "roomName") {
      if (valStr.length > ROOM_LIMITS.ROOM_NAME) {
        return `Room Name cannot exceed ${ROOM_LIMITS.ROOM_NAME} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && !ROOM_NAME_REGEX.test(trimmed)) {
        return "Room Name contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "floor") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return "Floor Number is required. Field is required. Please fill out this field";
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Floor Number must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < ROOM_LIMITS.FLOOR_MIN) {
        return `Floor Number cannot be less than ${ROOM_LIMITS.FLOOR_MIN}. Invalid data is not accepted. Please enter valid data`;
      }
      if (num > ROOM_LIMITS.FLOOR_MAX) {
        return `Floor Number cannot exceed ${ROOM_LIMITS.FLOOR_MAX}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "capacity") {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return "Room bed capacity is required. Field is required. Please fill out this field";
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Room bed capacity must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < ROOM_LIMITS.CAPACITY_MIN) {
        return `Room bed capacity must be at least ${ROOM_LIMITS.CAPACITY_MIN}. Invalid data is not accepted. Please enter valid data`;
      }
      if (num > ROOM_LIMITS.CAPACITY_MAX) {
        return `Room bed capacity cannot exceed ${ROOM_LIMITS.CAPACITY_MAX}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "bedPrefix") {
      if (valStr.length > ROOM_LIMITS.BED_PREFIX) {
        return `Bed Prefix cannot exceed ${ROOM_LIMITS.BED_PREFIX} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && !BED_PREFIX_REGEX.test(trimmed)) {
        return "Bed Prefix contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "description") {
      if (valStr.length > ROOM_LIMITS.DESCRIPTION) {
        return `Description cannot exceed ${ROOM_LIMITS.DESCRIPTION} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed && /<script|javascript:|data:/i.test(trimmed)) {
        return "Description contains invalid data. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (
      [
        "consultationCharge",
        "dailyRoomCharge",
        "nursingCharge",
        "maintenanceCharge",
        "extraBedCharge",
        "emergencyCharge",
        "admissionDeposit"
      ].includes(field)
    ) {
      if (valStr === "" || valStr === null || valStr === undefined) {
        return field === "dailyRoomCharge" ? "Daily Room Charge is required. Field is required. Please fill out this field" : undefined;
      }
      const num = Number(value);
      if (isNaN(num)) {
        return "Charge must be a valid number. Invalid data is not accepted. Please enter valid data";
      }
      if (num < 0) {
        return "Charge cannot be negative. Invalid data is not accepted. Please enter valid data";
      }
      if (num > ROOM_LIMITS.CHARGE_MAX) {
        return `Charge cannot exceed ${ROOM_LIMITS.CHARGE_MAX.toLocaleString()}. Too long text is not accepted. Please enter valid data`;
      }
      return undefined;
    }

    if (field === "gstPercent") {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        return "GST must be valid. Invalid data is not accepted. Please enter valid data";
      }
      if (num > ROOM_LIMITS.GST_MAX) {
        return "GST cannot exceed 100%. Too long text is not accepted. Please enter valid data";
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
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, (form as any)[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: err }));
    if (err) {
      setFormError("Please enter valid data");
    }
  };

  const validateAndProceed = (nextStep: 1 | 2 | 3 | 4) => {
    setFormError(null);

    if (currentStep === 1) {
      const wardErr = validateField("wardId", form.wardId);
      const roomNumErr = validateField("roomNumber", form.roomNumber);
      const roomNameErr = validateField("roomName", form.roomName);
      const floorErr = validateField("floor", form.floor);
      const descErr = validateField("description", form.description);

      const errors = {
        wardId: wardErr,
        roomNumber: roomNumErr,
        roomName: roomNameErr,
        floor: floorErr,
        description: descErr,
      };

      setFieldErrors((prev) => ({ ...prev, ...errors }));
      const hasErrors = Object.values(errors).some(Boolean);
      if (hasErrors) {
        const firstError = Object.values(errors).find(Boolean);
        setFormError(firstError || "Please enter valid data");
        toast.error(firstError || "Please enter valid data", { id: "room-step1-invalid" });
        return;
      }
    }

    if (currentStep === 2) {
      const capErr = validateField("capacity", form.capacity);
      const prefixErr = validateField("bedPrefix", form.bedPrefix);

      const errors = { capacity: capErr, bedPrefix: prefixErr };
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      const hasErrors = Object.values(errors).some(Boolean);
      if (hasErrors) {
        const firstError = Object.values(errors).find(Boolean);
        setFormError(firstError || "Please enter valid data");
        toast.error(firstError || "Please enter valid data", { id: "room-step2-invalid" });
        return;
      }
    }

    if (currentStep === 3) {
      const dailyErr = validateField("dailyRoomCharge", form.dailyRoomCharge);
      const gstErr = validateField("gstPercent", form.gstPercent);

      const errors = { dailyRoomCharge: dailyErr, gstPercent: gstErr };
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      const hasErrors = Object.values(errors).some(Boolean);
      if (hasErrors) {
        const firstError = Object.values(errors).find(Boolean);
        setFormError(firstError || "Please enter valid data");
        toast.error(firstError || "Please enter valid data", { id: "room-step3-invalid" });
        return;
      }
    }

    setCurrentStep(nextStep);
  };

  const handleSaveRoom = async (proceedToBeds = false) => {
    setFormError(null);

    const wardErr = validateField("wardId", form.wardId);
    const roomNumErr = validateField("roomNumber", form.roomNumber);
    const roomNameErr = validateField("roomName", form.roomName);
    const floorErr = validateField("floor", form.floor);
    const capErr = validateField("capacity", form.capacity);
    const prefixErr = validateField("bedPrefix", form.bedPrefix);
    const descErr = validateField("description", form.description);
    const dailyErr = validateField("dailyRoomCharge", form.dailyRoomCharge);

    const allErrors = {
      wardId: wardErr,
      roomNumber: roomNumErr,
      roomName: roomNameErr,
      floor: floorErr,
      capacity: capErr,
      bedPrefix: prefixErr,
      description: descErr,
      dailyRoomCharge: dailyErr,
    };

    setFieldErrors(allErrors);
    const hasErrors = Object.values(allErrors).some(Boolean);
    if (hasErrors) {
      const firstError = Object.values(allErrors).find(Boolean);
      setFormError(firstError || "Please enter valid data");
      toast.error(firstError || "Please enter valid data", { id: "room-save-invalid" });
      if (wardErr || roomNumErr || roomNameErr || floorErr || descErr) {
        setCurrentStep(1);
      } else if (capErr || prefixErr) {
        setCurrentStep(2);
      } else if (dailyErr) {
        setCurrentStep(3);
      }
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
      description: form.description.trim(),
      status: form.status,
      tariff: {
        consultationCharge: Number(form.consultationCharge) || 0,
        roomChargePerDay: Number(form.dailyRoomCharge) || 0,
        nursingCharge: Number(form.nursingCharge) || 0,
        maintenanceCharge: Number(form.maintenanceCharge) || 0,
        extraBedCharge: Number(form.extraBedCharge) || 0,
        emergencyCharge: Number(form.emergencyCharge) || 0,
        admissionDeposit: Number(form.admissionDeposit) || 0,
        gstPercent: Number(form.gstPercent) || 0,
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
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Please enter valid data";
      setFormError(serverMsg);
      toast.error(serverMsg, { id: "room-save-error" });
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
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
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-28 px-2 sm:px-4">
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
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900 font-bold">{isEditing ? `Edit Room: ${form.roomNumber}` : "Create Room"}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <DoorOpen className="h-7 w-7 text-emerald-700" />
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

      {/* Progress Step Stepper */}
      <Card className="p-3 bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stepsList.map((step) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div
                key={step.number}
                onClick={() => {
                  if (step.number < currentStep) setCurrentStep(step.number as any);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition border cursor-pointer ${
                  isActive
                    ? "bg-emerald-700/5 border-emerald-700 text-emerald-700 shadow-2xs"
                    : isCompleted
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                    : "bg-slate-50/50 border-slate-200 text-slate-400"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition ${
                    isActive
                      ? "bg-emerald-700 text-white"
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
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in duration-150">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* STEP 1: ROOM DETAILS */}
      {currentStep === 1 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-700" /> Step 1 — Room Identification & Climate
            </h2>
            <span className="text-xs font-medium text-slate-500">* Required Fields</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Select Destination Ward <span className="text-red-500">*</span>
              </label>
              <select
                value={form.wardId}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({ ...prev, wardId: val }));
                  const err = validateField("wardId", val);
                  setFieldErrors((prev) => ({ ...prev, wardId: err }));
                  if (!err && formError === "Please enter valid data") setFormError(null);
                }}
                onBlur={() => handleBlur("wardId")}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-navy-500 bg-white font-medium ${
                  fieldErrors.wardId ? "border-red-500 text-red-900" : "border-slate-300 text-slate-900"
                }`}
                required
              >
                <option value="">-- Choose Hospital Ward --</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.wardType} • Floor {w.floorNumber})
                  </option>
                ))}
              </select>
              {fieldErrors.wardId && (
                <p className="mt-1 text-xs font-medium text-red-600" role="alert">
                  {fieldErrors.wardId}
                </p>
              )}
            </div>

            <InputField
              label="Room Number *"
              placeholder="e.g. 101, 202-A, ICU-01"
              value={form.roomNumber}
              maxLength={ROOM_LIMITS.ROOM_NUMBER}
              showCharCount
              error={fieldErrors.roomNumber}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, roomNumber: val }));
                const err = validateField("roomNumber", val);
                setFieldErrors((prev) => ({ ...prev, roomNumber: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "roomNumber", form.roomNumber.length, ROOM_LIMITS.ROOM_NUMBER, "Room Number", ROOM_NUMBER_REGEX)}
              onBlur={() => handleBlur("roomNumber")}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InputField
              label="Optional Room Name"
              placeholder="e.g. Presidential Suite"
              value={form.roomName}
              maxLength={ROOM_LIMITS.ROOM_NAME}
              showCharCount
              error={fieldErrors.roomName}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, roomName: val }));
                const err = validateField("roomName", val);
                setFieldErrors((prev) => ({ ...prev, roomName: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "roomName", form.roomName.length, ROOM_LIMITS.ROOM_NAME, "Room Name", ROOM_NAME_REGEX)}
              onBlur={() => handleBlur("roomName")}
            />

            <InputField
              label="Floor Number *"
              type="number"
              min={ROOM_LIMITS.FLOOR_MIN}
              max={ROOM_LIMITS.FLOOR_MAX}
              value={form.floor}
              error={fieldErrors.floor}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, floor: val }));
                const err = validateField("floor", raw);
                setFieldErrors((prev) => ({ ...prev, floor: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "floor", "Floor Number", true)}
              onBlur={() => handleBlur("floor")}
              required
            />

            <SelectField
              label="Room Category (Accommodation) *"
              value={form.roomCategory}
              onChange={(e) => setForm((prev) => ({ ...prev, roomCategory: e.target.value }))}
            >
              {REAL_WORLD_ROOM_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectField>
          </div>

          {/* Climate Setup */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Climate Configuration
            </h3>

            <div className="flex gap-8 items-center">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="acType"
                  value="AC"
                  checked={form.acType === "AC"}
                  onChange={() => setForm((prev) => ({ ...prev, acType: "AC" }))}
                  className="h-4 w-4 text-emerald-700 focus:ring-navy-500"
                />
                ○ AC Room
              </label>

              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="acType"
                  value="Non AC"
                  checked={form.acType === "Non AC"}
                  onChange={() => setForm((prev) => ({ ...prev, acType: "Non AC" }))}
                  className="h-4 w-4 text-emerald-700 focus:ring-navy-500"
                />
                ○ Non AC Room
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField
              label="Room Operational Status *"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
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
              maxLength={ROOM_LIMITS.DESCRIPTION}
              showCharCount
              error={fieldErrors.description}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, description: val }));
                const err = validateField("description", val);
                setFieldErrors((prev) => ({ ...prev, description: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "description", form.description.length, ROOM_LIMITS.DESCRIPTION, "Description")}
              onBlur={() => handleBlur("description")}
            />
          </div>
        </Card>
      )}

      {/* STEP 2: BED CAPACITY */}
      {currentStep === 2 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-emerald-700" /> Step 2 — Bed Capacity & Auto Generator
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InputField
              label="Total Beds (Capacity) *"
              type="number"
              min={ROOM_LIMITS.CAPACITY_MIN}
              max={ROOM_LIMITS.CAPACITY_MAX}
              value={form.capacity}
              error={fieldErrors.capacity}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, capacity: val }));
                const err = validateField("capacity", raw);
                setFieldErrors((prev) => ({ ...prev, capacity: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "capacity", "Bed Capacity")}
              onBlur={() => handleBlur("capacity")}
              required
            />

            <InputField
              label="Bed Code Prefix"
              placeholder="e.g. Bed-101"
              value={form.bedPrefix}
              maxLength={ROOM_LIMITS.BED_PREFIX}
              showCharCount
              error={fieldErrors.bedPrefix}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, bedPrefix: val }));
                const err = validateField("bedPrefix", val);
                setFieldErrors((prev) => ({ ...prev, bedPrefix: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleKeyGuard(e, "bedPrefix", form.bedPrefix.length, ROOM_LIMITS.BED_PREFIX, "Bed Prefix", BED_PREFIX_REGEX)}
              onBlur={() => handleBlur("bedPrefix")}
            />

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autoGenerateBeds}
                  onChange={(e) => setForm((prev) => ({ ...prev, autoGenerateBeds: e.target.checked }))}
                  className="h-4 w-4 rounded text-emerald-700 focus:ring-navy-500"
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
              <IndianRupee className="h-5 w-5 text-emerald-700" /> Step 3 — Room Tariff Configuration
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
              max={ROOM_LIMITS.CHARGE_MAX}
              value={form.consultationCharge}
              error={fieldErrors.consultationCharge}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, consultationCharge: val }));
                const err = validateField("consultationCharge", raw);
                setFieldErrors((prev) => ({ ...prev, consultationCharge: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "consultationCharge", "Consultation Charge")}
              onBlur={() => handleBlur("consultationCharge")}
            />

            <InputField
              label="Daily Room Charge (₹) *"
              type="number"
              min={0}
              max={ROOM_LIMITS.CHARGE_MAX}
              value={form.dailyRoomCharge}
              error={fieldErrors.dailyRoomCharge}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, dailyRoomCharge: val }));
                const err = validateField("dailyRoomCharge", raw);
                setFieldErrors((prev) => ({ ...prev, dailyRoomCharge: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "dailyRoomCharge", "Daily Room Charge")}
              onBlur={() => handleBlur("dailyRoomCharge")}
              required
            />

            <InputField
              label="Nursing Charge (₹)"
              type="number"
              min={0}
              max={ROOM_LIMITS.CHARGE_MAX}
              value={form.nursingCharge}
              error={fieldErrors.nursingCharge}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, nursingCharge: val }));
                const err = validateField("nursingCharge", raw);
                setFieldErrors((prev) => ({ ...prev, nursingCharge: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "nursingCharge", "Nursing Charge")}
              onBlur={() => handleBlur("nursingCharge")}
            />

            <InputField
              label="Maintenance Charge (₹)"
              type="number"
              min={0}
              max={ROOM_LIMITS.CHARGE_MAX}
              value={form.maintenanceCharge}
              error={fieldErrors.maintenanceCharge}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, maintenanceCharge: val }));
                const err = validateField("maintenanceCharge", raw);
                setFieldErrors((prev) => ({ ...prev, maintenanceCharge: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "maintenanceCharge", "Maintenance Charge")}
              onBlur={() => handleBlur("maintenanceCharge")}
            />

            <InputField
              label="GST Tax Rate (%)"
              type="number"
              min={0}
              max={ROOM_LIMITS.GST_MAX}
              value={form.gstPercent}
              error={fieldErrors.gstPercent}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, gstPercent: val }));
                const err = validateField("gstPercent", raw);
                setFieldErrors((prev) => ({ ...prev, gstPercent: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "gstPercent", "GST Tax Rate")}
              onBlur={() => handleBlur("gstPercent")}
            />

            <InputField
              label="Admission / Security Deposit (₹)"
              type="number"
              min={0}
              max={ROOM_LIMITS.CHARGE_MAX}
              value={form.admissionDeposit}
              error={fieldErrors.admissionDeposit}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? "" : Number(raw);
                setForm((prev) => ({ ...prev, admissionDeposit: val }));
                const err = validateField("admissionDeposit", raw);
                setFieldErrors((prev) => ({ ...prev, admissionDeposit: err }));
                if (!err && formError === "Please enter valid data") setFormError(null);
              }}
              onKeyDown={(e) => handleNumberKeyGuard(e, "admissionDeposit", "Admission Deposit")}
              onBlur={() => handleBlur("admissionDeposit")}
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
