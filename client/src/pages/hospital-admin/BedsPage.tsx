import { useState } from "react";
import toast from "react-hot-toast";
import { 
  Building2, 
  DoorOpen, 
  BedDouble, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Filter, 
  X, 
  Check, 
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  DollarSign
} from "lucide-react";

import { useWards, useCreateWard, useUpdateWard, useDeleteWard, WardInfo } from "../../features/wards";
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, RoomInfo } from "../../features/rooms";
import { useBeds, useCreateBed, useUpdateBed, useDeleteBed, BedInfo } from "../../features/beds";
import {
  useRoomTariffs,
  useCreateRoomTariff,
  useUpdateRoomTariff,
  useDeleteRoomTariff,
  RoomTariffInfo
} from "../../features/roomTariffs";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { InputField, SelectField, TextareaField } from "../../components/ui/Field";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";

const WARD_TYPE_OPTIONS = ["General Ward", "Semi-Private Ward", "Private Ward", "ICU", "NICU", "Emergency Ward"];
const ROOM_TYPE_OPTIONS = ["General", "Semi-Private", "Private", "ICU", "NICU", "Emergency"];
const BED_STATUS_OPTIONS = ["Available", "Occupied", "Reserved", "Cleaning", "Maintenance"];

const BED_STATUS_COLORS: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
  Available: "success",
  Occupied: "danger",
  Reserved: "info",
  Cleaning: "warning",
  Maintenance: "neutral",
};

export function BedsPage() {
  const [activeTab, setActiveTab] = useState<"wards" | "rooms" | "beds" | "tariffs">("wards");

  // Room Tariff Config states
  const { data: tariffData, isLoading: isLoadingTariffs } = useRoomTariffs();
  const createTariffMutation = useCreateRoomTariff();
  const updateTariffMutation = useUpdateRoomTariff();
  const deleteTariffMutation = useDeleteRoomTariff();
  
  const [isTariffModalOpen, setTariffModalOpen] = useState(false);
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null);
  
  const [tariffForm, setTariffForm] = useState({
    ward: "",
    roomType: "Non AC" as "AC" | "Non AC",
    tariff: 0,
    nursingTariff: 300,
    status: "Active" as "Active" | "Inactive",
    effectiveDate: new Date().toISOString().split("T")[0],
    description: ""
  });

  const resetTariffForm = () => {
    setTariffForm({
      ward: "",
      roomType: "Non AC",
      tariff: 0,
      nursingTariff: 300,
      status: "Active",
      effectiveDate: new Date().toISOString().split("T")[0],
      description: ""
    });
    setEditingTariffId(null);
  };

  const triggerEditTariff = (t: RoomTariffInfo) => {
    setTariffForm({
      ward: t.ward,
      roomType: t.roomType,
      tariff: t.tariff,
      nursingTariff: t.nursingTariff || 300,
      status: t.status,
      effectiveDate: t.effectiveDate ? new Date(t.effectiveDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      description: t.description || ""
    });
    setEditingTariffId(t._id);
    setTariffModalOpen(true);
  };

  const handleTariffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tariffForm.ward || !tariffForm.roomType || tariffForm.tariff === undefined) {
      setFormError("Ward, Room Type and Tariff Price are required.");
      return;
    }
    setFormError(null);
    try {
      if (editingTariffId) {
        await updateTariffMutation.mutateAsync({ id: editingTariffId, payload: tariffForm });
      } else {
        await createTariffMutation.mutateAsync(tariffForm);
      }
      setTariffModalOpen(false);
      resetTariffForm();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to save Room Tariff.");
    }
  };

  const handleDeleteTariff = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this room tariff configuration?")) {
      try {
        await deleteTariffMutation.mutateAsync(id);
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to delete room tariff.");
      }
    }
  };

  // Pagination states
  const [wardPage, setWardPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);
  const [bedPage, setBedPage] = useState(1);

  // Search & Filter states
  const [wardSearch, setWardSearch] = useState("");
  const [wardTypeFilter, setWardTypeFilter] = useState("");
  const [wardStatusFilter, setWardStatusFilter] = useState("");

  const [roomSearch, setRoomSearch] = useState("");
  const [roomWardFilter, setRoomWardFilter] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState("");

  const [bedSearch, setBedSearch] = useState("");
  const [bedWardFilter, setBedWardFilter] = useState("");
  const [bedRoomFilter, setBedRoomFilter] = useState("");
  const [bedStatusFilter, setBedStatusFilter] = useState("");

  const [tariffSearch, setTariffSearch] = useState("");

  // Data Fetching
  const { data: wardData, isLoading: isLoadingWards } = useWards({
    search: wardSearch || undefined,
    wardType: wardTypeFilter || undefined,
    status: wardStatusFilter || undefined,
    page: wardPage,
    limit: 8
  });

  const { data: roomData, isLoading: isLoadingRooms } = useRooms({
    search: roomSearch || undefined,
    ward: roomWardFilter || undefined,
    status: roomStatusFilter || undefined,
    page: roomPage,
    limit: 8
  });

  const { data: bedData, isLoading: isLoadingBeds } = useBeds({
    search: bedSearch || undefined,
    ward: bedWardFilter || undefined,
    room: bedRoomFilter || undefined,
    status: bedStatusFilter || undefined,
    page: bedPage,
    limit: 8
  });

  // Fetch all wards and rooms without pagination for dropdown options
  const { data: allWardsOption } = useWards({ limit: 100 });
  const { data: allRoomsOption } = useRooms({ limit: 100 });

  // Mutations
  const createWardMutation = useCreateWard();
  const updateWardMutation = useUpdateWard();
  const deleteWardMutation = useDeleteWard();

  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const deleteRoomMutation = useDeleteRoom();

  const createBedMutation = useCreateBed();
  const updateBedMutation = useUpdateBed();
  const deleteBedMutation = useDeleteBed();

  // Modals Visibility
  const [isWardModalOpen, setWardModalOpen] = useState(false);
  const [isRoomModalOpen, setRoomModalOpen] = useState(false);
  const [isBedModalOpen, setBedModalOpen] = useState(false);

  // Edit IDs
  const [editingWardId, setEditingWardId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingBedId, setEditingBedId] = useState<string | null>(null);

  // Form states
  const [wardForm, setWardForm] = useState({
    name: "",
    code: "",
    wardType: "General Ward",
    floorNumber: 0,
    description: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [roomForm, setRoomForm] = useState({
    roomNumber: "",
    roomName: "",
    wardId: "",
    floor: 0,
    roomType: "General",
    acType: "Non AC",
    capacity: 2,
    description: "",
    status: "Active" as "Active" | "Inactive"
  });

  const [bedForm, setBedForm] = useState({
    bedNumber: "",
    roomId: "",
    bedType: "Standard",
    status: "Available"
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Summary counts
  const totalWardsCount = allWardsOption?.wards.length ?? 0;
  const totalRoomsCount = allRoomsOption?.rooms.length ?? 0;
  const totalBedsCount = bedData?.pagination.total ?? 0;
  const occupiedBedsCount = allRoomsOption?.rooms.reduce((sum, r) => sum + (r.capacity - r.capacity), 0) ?? 0; // wait, let's get occupied beds count by query beds
  const { data: allBedsForStats } = useBeds({ limit: 500 });
  const statsTotalBeds = allBedsForStats?.beds.length ?? 0;
  const statsOccupiedBeds = allBedsForStats?.beds.filter(b => b.isOccupied).length ?? 0;
  const statsAvailableBeds = statsTotalBeds - statsOccupiedBeds;

  const filteredTariffs = tariffData?.filter(t => 
    t.ward?.toLowerCase().includes(tariffSearch.toLowerCase()) ||
    t.roomType?.toLowerCase().includes(tariffSearch.toLowerCase()) ||
    t.description?.toLowerCase().includes(tariffSearch.toLowerCase())
  );

  // ── Form Submissions ─────────────────────────────────────────────────────────

  const handleWardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!wardForm.name.trim() || !wardForm.code.trim()) {
      setFormError("Ward Name and Code are required.");
      return;
    }

    try {
      if (editingWardId) {
        const updateMutation = updateWardMutation; // resolve TypeScript typings
        await updateWardMutation.mutateAsync({
          ...wardForm,
          id: editingWardId
        } as any);
      } else {
        await createWardMutation.mutateAsync(wardForm);
      }
      setWardModalOpen(false);
      resetWardForm();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Operation failed.");
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!roomForm.roomNumber.trim() || !roomForm.wardId) {
      setFormError("Room Number and Ward selection are required.");
      return;
    }

    try {
      if (editingRoomId) {
        await updateRoomMutation.mutateAsync({
          ...roomForm,
          id: editingRoomId
        } as any);
      } else {
        await createRoomMutation.mutateAsync(roomForm);
      }
      setRoomModalOpen(false);
      resetRoomForm();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Operation failed.");
    }
  };

  const handleBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!bedForm.bedNumber.trim() || !bedForm.roomId) {
      setFormError("Bed Number and Room selection are required.");
      return;
    }

    try {
      if (editingBedId) {
        await updateBedMutation.mutateAsync({
          ...bedForm,
          id: editingBedId
        } as any);
      } else {
        await createBedMutation.mutateAsync(bedForm);
      }
      setBedModalOpen(false);
      resetBedForm();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Operation failed.");
    }
  };

  // ── Form Reset / Edit triggers ──────────────────────────────────────────────

  const resetWardForm = () => {
    setWardForm({ name: "", code: "", wardType: "General Ward", floorNumber: 0, description: "", status: "Active" });
    setEditingWardId(null);
    setFormError(null);
  };

  const resetRoomForm = () => {
    setRoomForm({ roomNumber: "", roomName: "", wardId: "", floor: 0, roomType: "General", acType: "Non AC", capacity: 2, description: "", status: "Active" });
    setEditingRoomId(null);
    setFormError(null);
  };

  const resetBedForm = () => {
    setBedForm({ bedNumber: "", roomId: "", bedType: "Standard", status: "Available" });
    setEditingBedId(null);
    setFormError(null);
  };

  const triggerEditWard = (ward: WardInfo) => {
    setWardForm({
      name: ward.name,
      code: ward.code,
      wardType: ward.wardType,
      floorNumber: ward.floorNumber,
      description: ward.description,
      status: ward.status
    });
    setEditingWardId(ward._id);
    setWardModalOpen(true);
  };

  const triggerEditRoom = (room: RoomInfo) => {
    const wardId = typeof room.ward === "object" ? room.ward._id : room.ward;
    setRoomForm({
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      wardId: wardId,
      floor: room.floor,
      roomType: room.roomType,
      acType: room.acType || "Non AC",
      capacity: room.capacity,
      description: room.description,
      status: room.status
    });
    setEditingRoomId(room._id);
    setRoomModalOpen(true);
  };

  const triggerEditBed = (bed: BedInfo) => {
    const roomId = typeof bed.room === "object" ? bed.room._id : bed.room;
    setBedForm({
      bedNumber: bed.bedNumber,
      roomId: roomId,
      bedType: bed.bedType,
      status: bed.status
    });
    setEditingBedId(bed._id);
    setBedModalOpen(true);
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleToggleWardStatus = async (ward: WardInfo) => {
    const nextStatus = ward.status === "Active" ? "Inactive" : "Active";
    if (window.confirm(`Are you sure you want to make this ward ${nextStatus.toLowerCase()}?`)) {
      try {
        await updateWardMutation.mutateAsync({ status: nextStatus, id: ward._id } as any);
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to update ward status.");
      }
    }
  };

  const handleDeleteWard = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this ward? This cannot be undone.")) {
      try {
        await deleteWardMutation.mutateAsync(id);
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to delete ward.");
      }
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this room? This cannot be undone.")) {
      try {
        await deleteRoomMutation.mutateAsync(id);
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to delete room.");
      }
    }
  };

  const handleDeleteBed = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this bed?")) {
      try {
        await deleteBedMutation.mutateAsync(id);
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to delete bed.");
      }
    }
  };

  // ── Columns Definitions ──────────────────────────────────────────────────────

  const wardColumns: Column<WardInfo>[] = [
    { header: "Ward Name", render: (w) => <span className="font-semibold text-slate-800">{w.name}</span> },
    { header: "Code", render: (w) => <span className="font-mono text-xs font-bold text-slate-500">{w.code}</span> },
    { header: "Type", render: (w) => <Badge tone="info">{w.wardType}</Badge> },
    { header: "Floor", render: (w) => <span className="text-slate-600">Floor {w.floorNumber}</span> },
    { header: "Description", render: (w) => <span className="text-slate-500 text-xs truncate max-w-[200px]" title={w.description}>{w.description || "—"}</span> },
    { 
      header: "Status", 
      render: (w) => (
        <Badge tone={w.status === "Active" ? "success" : "neutral"}>{w.status.toUpperCase()}</Badge>
      ) 
    },
    {
      header: "Actions",
      render: (w) => (
        <div className="flex items-center gap-3">
          <button onClick={() => triggerEditWard(w)} className="text-slate-400 hover:text-navy-700 transition-colors" title="Edit Ward">
            <Pencil className="h-4 w-4" />
          </button>
          <button 
            onClick={() => handleToggleWardStatus(w)} 
            className={`transition-colors p-1 rounded ${w.status === "Active" ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}
            title={w.status === "Active" ? "Deactivate Ward" : "Activate Ward"}
          >
            {w.status === "Active" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
          <button onClick={() => handleDeleteWard(w._id)} className="text-slate-400 hover:text-red-650 transition-colors" title="Delete Ward">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const roomColumns: Column<RoomInfo>[] = [
    { 
      header: "Room Info", 
      render: (r) => (
        <div>
          <span className="font-bold text-slate-800">Room {r.roomNumber}</span>
          {r.roomName && <span className="text-xs text-slate-450 ml-1.5 font-medium">({r.roomName})</span>}
        </div>
      ) 
    },
    { header: "Ward", render: (r) => <span className="text-slate-700 font-semibold">{r.wardName}</span> },
    { header: "Floor", render: (r) => <span className="text-slate-650">Floor {r.floor}</span> },
    { header: "Type", render: (r) => <Badge tone={r.roomType === "ICU" || r.roomType === "NICU" ? "danger" : "info"}>{r.roomType}</Badge> },
    { header: "Capacity", render: (r) => <span className="text-slate-650 font-bold">{r.capacity} Beds</span> },
    { 
      header: "Status", 
      render: (r) => (
        <Badge tone={r.status === "Active" ? "success" : "neutral"}>{r.status.toUpperCase()}</Badge>
      ) 
    },
    {
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-3">
          <button onClick={() => triggerEditRoom(r)} className="text-slate-400 hover:text-navy-700 transition-colors" title="Edit Room">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDeleteRoom(r._id)} className="text-slate-400 hover:text-red-650 transition-colors" title="Delete Room">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const bedColumns: Column<BedInfo>[] = [
    { 
      header: "Bed Code", 
      render: (b) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-700">{b.bedCode}</span>
        </div>
      ) 
    },
    { header: "Bed No.", render: (b) => <span className="font-semibold text-slate-800">Bed {b.bedNumber}</span> },
    { header: "Room", render: (b) => <span className="text-slate-650">Room {typeof b.room === "object" ? b.room.roomNumber : "—"}</span> },
    { header: "Ward", render: (b) => <span className="text-slate-650 font-medium">{typeof b.ward === "object" ? b.ward.name : "—"}</span> },
    { header: "Type", render: (b) => <Badge tone="neutral">{b.bedType}</Badge> },
    { 
      header: "Status", 
      render: (b) => (
        <Badge tone={BED_STATUS_COLORS[b.status] || "neutral"}>{b.status.toUpperCase()}</Badge>
      ) 
    },
    {
      header: "Actions",
      render: (b) => (
        <div className="flex items-center gap-3">
          <button onClick={() => triggerEditBed(b)} className="text-slate-400 hover:text-navy-700 transition-colors" title="Edit Bed / Status">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDeleteBed(b._id)} className="text-slate-400 hover:text-red-650 transition-colors" title="Delete Bed" disabled={b.status === "Occupied"}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const tariffColumns: Column<RoomTariffInfo>[] = [
    { header: "Ward Name", render: (t) => <span className="font-semibold text-slate-800">{t.ward}</span> },
    { header: "Room Type", render: (t) => <Badge tone="info">{t.roomType}</Badge> },
    { header: "Daily Tariff Price", render: (t) => <span className="font-mono text-slate-700 font-bold">₹{t.tariff}</span> },
    { header: "Nursing Package Price", render: (t) => <span className="font-mono text-slate-600">₹{t.nursingTariff || 300}</span> },
    { header: "Effective Date", render: (t) => <span className="text-xs text-slate-500">{t.effectiveDate ? new Date(t.effectiveDate).toLocaleDateString("en-IN") : "—"}</span> },
    { 
      header: "Status", 
      render: (t) => (
        <Badge tone={t.status === "Active" ? "success" : "neutral"}>{t.status.toUpperCase()}</Badge>
      ) 
    },
    {
      header: "Actions",
      render: (t) => (
        <div className="flex items-center gap-3">
          <button onClick={() => triggerEditTariff(t)} className="text-slate-400 hover:text-navy-700 transition-colors" title="Edit Tariff">
            <Pencil className="h-4 w-4" />
          </button>
          <button 
            onClick={async () => {
              if (window.confirm("Are you sure you want to delete this room tariff config?")) {
                try {
                  await deleteTariffMutation.mutateAsync(t._id);
                  toast.success("Room tariff deleted successfully.");
                } catch {
                  toast.error("Failed to delete room tariff.");
                }
              }
            }} 
            className="text-slate-400 hover:text-red-650 transition-colors" 
            title="Delete Tariff"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ward, Room & Bed Configuration</h1>
          <p className="text-sm text-slate-500">Configure clinic layout grids, check occupancy statuses, and assign beds.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "wards" && (
            <Button variant="primary" onClick={() => { resetWardForm(); setWardModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Ward
            </Button>
          )}
          {activeTab === "rooms" && (
            <Button variant="primary" onClick={() => { resetRoomForm(); setRoomModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Room
            </Button>
          )}
          {activeTab === "beds" && (
            <Button variant="primary" onClick={() => { resetBedForm(); setBedModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Bed
            </Button>
          )}
          {activeTab === "tariffs" && (
            <Button variant="primary" onClick={() => { resetTariffForm(); setTariffModalOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Tariff
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Wards" value={totalWardsCount} icon={<Building2 className="h-5 w-5" />} />
        <KpiCard label="Total Rooms" value={totalRoomsCount} icon={<DoorOpen className="h-5 w-5" />} />
        <KpiCard label="Occupied Beds" value={statsOccupiedBeds} icon={<BedDouble className="h-5 w-5 text-red-500" />} />
        <KpiCard label="Available Beds" value={statsAvailableBeds} icon={<BedDouble className="h-5 w-5 text-emerald-500" />} emphasis />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("wards")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "wards" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building2 className="h-4 w-4" /> Wards
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "rooms" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <DoorOpen className="h-4 w-4" /> Rooms
          </button>
          <button
            onClick={() => setActiveTab("beds")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "beds" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <BedDouble className="h-4 w-4" /> Beds
          </button>
          <button
            onClick={() => setActiveTab("tariffs")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "tariffs" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Room Tariffs
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: WARDS */}
      {activeTab === "wards" && (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search wards..."
                  value={wardSearch}
                  onChange={(e) => { setWardSearch(e.target.value); setWardPage(1); }}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>

              <select
                value={wardTypeFilter}
                onChange={(e) => { setWardTypeFilter(e.target.value); setWardPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Ward Types</option>
                {WARD_TYPE_OPTIONS.map(type => <option key={type} value={type}>{type}</option>)}
              </select>

              <select
                value={wardStatusFilter}
                onChange={(e) => { setWardStatusFilter(e.target.value); setWardPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {(wardSearch || wardTypeFilter || wardStatusFilter) && (
              <button 
                onClick={() => { setWardSearch(""); setWardTypeFilter(""); setWardStatusFilter(""); setWardPage(1); }}
                className="text-xs text-navy-700 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
              </button>
            )}
          </div>

          <DataTable 
            columns={wardColumns} 
            rows={wardData?.wards ?? []} 
            rowKey={(w) => w._id} 
            emptyMessage={isLoadingWards ? "Loading..." : "No wards found."} 
          />

          {wardData && (
            <div className="flex justify-end pt-3">
              <Pagination page={wardPage} totalPages={wardData.pagination.totalPages} onPageChange={setWardPage} />
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT 2: ROOMS */}
      {activeTab === "rooms" && (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={roomSearch}
                  onChange={(e) => { setRoomSearch(e.target.value); setRoomPage(1); }}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>

              <select
                value={roomWardFilter}
                onChange={(e) => { setRoomWardFilter(e.target.value); setRoomPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Wards</option>
                {allWardsOption?.wards.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>

              <select
                value={roomStatusFilter}
                onChange={(e) => { setRoomStatusFilter(e.target.value); setRoomPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {(roomSearch || roomWardFilter || roomStatusFilter) && (
              <button 
                onClick={() => { setRoomSearch(""); setRoomWardFilter(""); setRoomStatusFilter(""); setRoomPage(1); }}
                className="text-xs text-navy-700 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
              </button>
            )}
          </div>

          <DataTable 
            columns={roomColumns} 
            rows={roomData?.rooms ?? []} 
            rowKey={(r) => r._id} 
            emptyMessage={isLoadingRooms ? "Loading..." : "No rooms found."} 
          />

          {roomData && (
            <div className="flex justify-end pt-3">
              <Pagination page={roomPage} totalPages={roomData.pagination.totalPages} onPageChange={setRoomPage} />
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT 3: BEDS */}
      {activeTab === "beds" && (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search beds..."
                  value={bedSearch}
                  onChange={(e) => { setBedSearch(e.target.value); setBedPage(1); }}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>

              <select
                value={bedWardFilter}
                onChange={(e) => { setBedWardFilter(e.target.value); setBedRoomFilter(""); setBedPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Wards</option>
                {allWardsOption?.wards.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>

              <select
                value={bedRoomFilter}
                onChange={(e) => { setBedRoomFilter(e.target.value); setBedPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Rooms</option>
                {allRoomsOption?.rooms
                  .filter(r => !bedWardFilter || (typeof r.ward === "object" ? r.ward._id : r.ward) === bedWardFilter)
                  .map(r => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}
              </select>

              <select
                value={bedStatusFilter}
                onChange={(e) => { setBedStatusFilter(e.target.value); setBedPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Bed Statuses</option>
                {BED_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            {(bedSearch || bedWardFilter || bedRoomFilter || bedStatusFilter) && (
              <button 
                onClick={() => { setBedSearch(""); setBedWardFilter(""); setBedRoomFilter(""); setBedStatusFilter(""); setBedPage(1); }}
                className="text-xs text-navy-700 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
              </button>
            )}
          </div>

          <DataTable 
            columns={bedColumns} 
            rows={bedData?.beds ?? []} 
            rowKey={(b) => b._id} 
            emptyMessage={isLoadingBeds ? "Loading..." : "No beds found."} 
          />

          {bedData && (
            <div className="flex justify-end pt-3">
              <Pagination page={bedPage} totalPages={bedData.pagination.totalPages} onPageChange={setBedPage} />
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT 4: ROOM TARIFFS */}
      {activeTab === "tariffs" && (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tariffs..."
                  value={tariffSearch}
                  onChange={(e) => { setTariffSearch(e.target.value); }}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>
            </div>
          </div>

          <DataTable 
            columns={tariffColumns} 
            rows={filteredTariffs ?? []} 
            rowKey={(t) => t._id} 
            emptyMessage={isLoadingTariffs ? "Loading..." : "No room tariffs found."} 
          />
        </Card>
      )}

      {/* ── MODALS ── */}

      {/* Ward Add/Edit Modal */}
      <Modal 
        title={editingWardId ? "Edit Ward Details" : "Add New Ward"} 
        isOpen={isWardModalOpen} 
        onClose={() => { setWardModalOpen(false); resetWardForm(); }}
      >
        <form onSubmit={handleWardSubmit} className="space-y-4">
          <InputField 
            label="Ward Name *" 
            required 
            value={wardForm.name} 
            onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} 
            placeholder="e.g. Intensive Care Unit" 
          />
          <InputField 
            label="Ward Code (Unique) *" 
            required 
            disabled={!!editingWardId}
            value={wardForm.code} 
            onChange={(e) => setWardForm({ ...wardForm, code: e.target.value })} 
            placeholder="e.g. ICU, GW" 
          />
          <SelectField 
            label="Ward Type *" 
            value={wardForm.wardType} 
            onChange={(e) => setWardForm({ ...wardForm, wardType: e.target.value })}
          >
            {WARD_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </SelectField>
          <InputField 
            label="Floor Number *" 
            type="number" 
            required 
            value={wardForm.floorNumber} 
            onChange={(e) => setWardForm({ ...wardForm, floorNumber: Number(e.target.value) })} 
          />
          <TextareaField 
            label="Description" 
            value={wardForm.description} 
            onChange={(e) => setWardForm({ ...wardForm, description: e.target.value })} 
            placeholder="Brief description of ward location and clinical specialties..."
            rows={3}
          />
          <SelectField 
            label="Status" 
            value={wardForm.status} 
            onChange={(e) => setWardForm({ ...wardForm, status: e.target.value as any })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </SelectField>

          {formError && <p className="text-xs text-red-650 font-semibold">{formError}</p>}
          <Button type="submit" variant="primary" className="w-full justify-center" disabled={createWardMutation.isPending || updateWardMutation.isPending}>
            {createWardMutation.isPending || updateWardMutation.isPending ? "Saving..." : "Save Ward"}
          </Button>
        </form>
      </Modal>

      {/* Room Add/Edit Modal */}
      <Modal 
        title={editingRoomId ? "Edit Room Details" : "Add New Room"} 
        isOpen={isRoomModalOpen} 
        onClose={() => { setRoomModalOpen(false); resetRoomForm(); }}
      >
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          <InputField 
            label="Room Number *" 
            required 
            value={roomForm.roomNumber} 
            onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} 
            placeholder="e.g. 201, ICU-A" 
          />
          <InputField 
            label="Room Name" 
            value={roomForm.roomName} 
            onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })} 
            placeholder="e.g. Deluxe Suite (Optional)" 
          />
          <SelectField 
            label="Assign to Ward *" 
            required 
            value={roomForm.wardId} 
            onChange={(e) => setRoomForm({ ...roomForm, wardId: e.target.value })}
          >
            <option value="">Select Ward...</option>
            {allWardsOption?.wards.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
          </SelectField>
          <InputField 
            label="Floor *" 
            type="number" 
            required 
            value={roomForm.floor} 
            onChange={(e) => setRoomForm({ ...roomForm, floor: Number(e.target.value) })} 
          />
          <SelectField 
            label="Room Type *" 
            value={roomForm.roomType} 
            onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
          >
            {ROOM_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </SelectField>
          <SelectField 
            label="AC Type *" 
            required 
            value={roomForm.acType || "Non AC"} 
            onChange={(e) => setRoomForm({ ...roomForm, acType: e.target.value })}
          >
            <option value="Non AC">Non AC</option>
            <option value="AC">AC</option>
          </SelectField>
          <InputField 
            label="Bed Capacity *" 
            type="number" 
            required 
            value={roomForm.capacity} 
            onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} 
            placeholder="Capacity (e.g. 2)" 
          />
          <TextareaField 
            label="Description" 
            value={roomForm.description} 
            onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })} 
            placeholder="Special features, equipment in room..."
            rows={2}
          />
          <SelectField 
            label="Status" 
            value={roomForm.status} 
            onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as any })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </SelectField>

          {formError && <p className="text-xs text-red-650 font-semibold">{formError}</p>}
          <Button type="submit" variant="primary" className="w-full justify-center" disabled={createRoomMutation.isPending || updateRoomMutation.isPending}>
            {createRoomMutation.isPending || updateRoomMutation.isPending ? "Saving..." : "Save Room"}
          </Button>
        </form>
      </Modal>

      {/* Bed Add/Edit Modal */}
      <Modal 
        title={editingBedId ? "Edit Bed Details" : "Add New Bed"} 
        isOpen={isBedModalOpen} 
        onClose={() => { setBedModalOpen(false); resetBedForm(); }}
      >
        <form onSubmit={handleBedSubmit} className="space-y-4">
          <SelectField 
            label="Select Room *" 
            required 
            value={bedForm.roomId} 
            onChange={(e) => setBedForm({ ...bedForm, roomId: e.target.value })}
          >
            <option value="">Select Room...</option>
            {allRoomsOption?.rooms.map(r => (
              <option key={r._id} value={r._id}>Room {r.roomNumber} ({r.roomType} - {r.wardName})</option>
            ))}
          </SelectField>
          <InputField 
            label="Bed Number / Label *" 
            required 
            value={bedForm.bedNumber} 
            onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })} 
            placeholder="e.g. B-1, A, ICU-2" 
          />
          <InputField 
            label="Bed Type" 
            value={bedForm.bedType} 
            onChange={(e) => setBedForm({ ...bedForm, bedType: e.target.value })} 
            placeholder="e.g. Standard Electric, Manual (Optional)" 
          />
          {editingBedId && (
            <SelectField 
              label="Bed Status *" 
              value={bedForm.status} 
              onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}
            >
              {BED_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </SelectField>
          )}

          {formError && <p className="text-xs text-red-650 font-semibold">{formError}</p>}
          <Button type="submit" variant="primary" className="w-full justify-center" disabled={createBedMutation.isPending || updateBedMutation.isPending}>
            {createBedMutation.isPending || updateBedMutation.isPending ? "Saving..." : "Save Bed"}
          </Button>
        </form>
      </Modal>

      {/* Room Tariff Add/Edit Modal */}
      <Modal
        title={editingTariffId ? "Edit Room Tariff Details" : "Add New Room Tariff"}
        isOpen={isTariffModalOpen}
        onClose={() => { setTariffModalOpen(false); resetTariffForm(); }}
      >
        <form onSubmit={handleTariffSubmit} className="space-y-4">
          <SelectField
            label="Select Ward *"
            required
            value={tariffForm.ward}
            onChange={(e) => setTariffForm({ ...tariffForm, ward: e.target.value })}
          >
            <option value="">Select Ward...</option>
            {allWardsOption?.wards.map(w => (
              <option key={w._id} value={w.name}>{w.name}</option>
            ))}
          </SelectField>
          <SelectField
            label="Room Type *"
            required
            value={tariffForm.roomType}
            onChange={(e) => setTariffForm({ ...tariffForm, roomType: e.target.value as any })}
          >
            <option value="Non AC">Non AC</option>
            <option value="AC">AC</option>
          </SelectField>
          <InputField
            label="Daily Tariff Price (₹) *"
            type="number"
            required
            value={tariffForm.tariff}
            onChange={(e) => setTariffForm({ ...tariffForm, tariff: Number(e.target.value) })}
            placeholder="e.g. 1500"
          />
          <InputField
            label="Daily Nursing Package Price (₹) *"
            type="number"
            required
            value={tariffForm.nursingTariff}
            onChange={(e) => setTariffForm({ ...tariffForm, nursingTariff: Number(e.target.value) })}
            placeholder="e.g. 300"
          />
          <InputField
            label="Effective Date *"
            type="date"
            required
            value={tariffForm.effectiveDate}
            onChange={(e) => setTariffForm({ ...tariffForm, effectiveDate: e.target.value })}
          />
          <TextareaField
            label="Description"
            value={tariffForm.description}
            onChange={(e) => setTariffForm({ ...tariffForm, description: e.target.value })}
            placeholder="e.g. General ward with sharing bed configuration"
            rows={2}
          />
          <SelectField
            label="Status"
            value={tariffForm.status}
            onChange={(e) => setTariffForm({ ...tariffForm, status: e.target.value as any })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </SelectField>

          {formError && <p className="text-xs text-red-650 font-semibold">{formError}</p>}
          <Button type="submit" variant="primary" className="w-full justify-center" disabled={createTariffMutation.isPending || updateTariffMutation.isPending}>
            {createTariffMutation.isPending || updateTariffMutation.isPending ? "Saving..." : "Save Room Tariff"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
