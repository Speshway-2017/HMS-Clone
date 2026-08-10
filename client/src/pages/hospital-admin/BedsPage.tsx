import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  DoorOpen,
  BedDouble,
  Plus,
  Pencil,
  Trash2,
  Search,
  RotateCcw,
  Eye,
  Sparkles,
  UserPlus,
  ArrowRightLeft,
  Ban,
  Activity,
  Wrench
} from "lucide-react";

import { useWards, useDeleteWard, WardInfo } from "../../features/wards";
import { useRooms, useDeleteRoom, RoomInfo } from "../../features/rooms";
import { useBeds, useUpdateBed, useDeleteBed, BedInfo } from "../../features/beds";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";

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

const REAL_WORLD_ROOM_CATEGORIES = [
  "General",
  "Semi Private",
  "Private",
  "Deluxe",
  "Suite"
];

const BED_STATUS_COLORS: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
  Available: "success",
  Occupied: "danger",
  Reserved: "info",
  Cleaning: "warning",
  Maintenance: "neutral",
  Blocked: "danger"
};

export function BedsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"wards" | "rooms" | "beds">("wards");

  // Pagination states
  const [wardPage, setWardPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);
  const [bedPage, setBedPage] = useState(1);

  // Filters
  const [wardSearch, setWardSearch] = useState("");
  const [wardTypeFilter, setWardTypeFilter] = useState("");
  const [wardStatusFilter, setWardStatusFilter] = useState("");

  const [roomSearch, setRoomSearch] = useState("");
  const [roomWardFilter, setRoomWardFilter] = useState("");
  const [roomCategoryFilter, setRoomCategoryFilter] = useState("");

  const [bedSearch, setBedSearch] = useState("");
  const [bedWardFilter, setBedWardFilter] = useState("");
  const [bedRoomFilter, setBedRoomFilter] = useState("");
  const [bedStatusFilter, setBedStatusFilter] = useState("");

  // Queries
  const { data: wardData, isLoading: isLoadingWards } = useWards({
    search: wardSearch || undefined,
    wardType: wardTypeFilter || undefined,
    status: wardStatusFilter || undefined,
    page: wardPage,
    limit: 10
  });

  const { data: roomData, isLoading: isLoadingRooms } = useRooms({
    search: roomSearch || roomCategoryFilter || undefined,
    ward: roomWardFilter || undefined,
    page: roomPage,
    limit: 10
  });

  const { data: bedData, isLoading: isLoadingBeds } = useBeds({
    search: bedSearch || undefined,
    ward: bedWardFilter || undefined,
    room: bedRoomFilter || undefined,
    status: bedStatusFilter || undefined,
    page: bedPage,
    limit: 10
  });

  // Options & Overall Stats
  const { data: allWardsOption } = useWards({ limit: 200 });
  const { data: allRoomsOption } = useRooms({ limit: 200 });
  const { data: allBedsForStats } = useBeds({ limit: 1000 });

  // Enterprise Summary KPI Calculations
  const totalWardsCount = allWardsOption?.wards.length ?? 0;
  const totalRoomsCount = allRoomsOption?.rooms.length ?? 0;
  const statsTotalBeds = allBedsForStats?.beds.length ?? 0;
  const statsOccupiedBeds = allBedsForStats?.beds.filter((b) => b.status === "Occupied" || (b.isOccupied && b.patient)).length ?? 0;
  const statsAvailableBeds = allBedsForStats?.beds.filter((b) => b.status === "Available" && !b.patient).length ?? (statsTotalBeds - statsOccupiedBeds);
  const statsMaintenanceBeds = allBedsForStats?.beds.filter((b) => b.status === "Maintenance" || b.status === "Cleaning" || b.status === "Blocked").length ?? 0;
  const occupancyPercentage = statsTotalBeds > 0 ? ((statsOccupiedBeds / statsTotalBeds) * 100).toFixed(1) : "0.0";

  // Mutations
  const deleteWardMutation = useDeleteWard();
  const deleteRoomMutation = useDeleteRoom();
  const updateBedMutation = useUpdateBed();
  const deleteBedMutation = useDeleteBed();

  const [viewRoomDetails, setViewRoomDetails] = useState<RoomInfo | null>(null);

  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "Confirm Deletion",
    message: "",
    onConfirm: async () => {},
  });

  const [isDeletingEntity, setIsDeletingEntity] = useState(false);

  // ── Ward Deletion Handler ─────────────────────────────────────────────
  const handleDeleteWard = (id: string) => {
    setDeleteConfirmConfig({
      isOpen: true,
      title: "Delete Ward",
      message: "Are you sure you want to delete this ward? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteWardMutation.mutateAsync(id);
          toast.success("✓ Ward Deleted Successfully");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Failed to delete ward.");
        }
      },
    });
  };

  // ── Room Deletion Handler ─────────────────────────────────────────────
  const handleDeleteRoom = (room: RoomInfo) => {
    if (room.occupiedBeds && room.occupiedBeds > 0) {
      toast.error(`Cannot delete Room ${room.roomNumber} because ${room.occupiedBeds} patient(s) are currently admitted.`);
      return;
    }

    setDeleteConfirmConfig({
      isOpen: true,
      title: "Delete Room",
      message: `Are you sure you want to delete Room ${room.roomNumber} and its vacant beds? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteRoomMutation.mutateAsync(room._id);
          toast.success("✓ Room Deleted Successfully");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Failed to delete room.");
        }
      },
    });
  };

  // ── Bed Status Handlers ─────────────────────────────────────
  const handleToggleBedBlock = async (bed: BedInfo) => {
    if (bed.status === "Occupied" || (bed.patient && bed.isOccupied)) {
      toast.error("Occupied bed cannot be blocked.");
      return;
    }
    const nextStatus = bed.status === "Blocked" ? "Available" : "Blocked";
    try {
      await updateBedMutation.mutateAsync({ id: bed._id, status: nextStatus });
      toast.success(`Bed ${bed.bedCode} is now ${nextStatus}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update bed status.");
    }
  };

  const handleMarkCleaning = async (bed: BedInfo) => {
    if (bed.status === "Occupied" || (bed.patient && bed.isOccupied)) {
      toast.error("Cannot mark occupied bed as cleaning.");
      return;
    }
    const nextStatus = bed.status === "Cleaning" ? "Available" : "Cleaning";
    try {
      await updateBedMutation.mutateAsync({
        id: bed._id,
        status: nextStatus,
        lastSanitized: new Date().toISOString()
      });
      toast.success(`Bed ${bed.bedCode} status set to ${nextStatus}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update bed status.");
    }
  };

  const handleDeleteBed = (id: string) => {
    setDeleteConfirmConfig({
      isOpen: true,
      title: "Delete Bed Entry",
      message: "Are you sure you want to delete this bed entry? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteBedMutation.mutateAsync(id);
          toast.success("✓ Bed Deleted Successfully");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Failed to delete bed.");
        }
      },
    });
  };

  const handleExecuteDeleteConfirm = async () => {
    setIsDeletingEntity(true);
    try {
      await deleteConfirmConfig.onConfirm();
    } finally {
      setIsDeletingEntity(false);
      setDeleteConfirmConfig((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // ── Table Column Definitions ────────────────────────────────────────────────

  const wardColumns: Column<WardInfo>[] = [
    { header: "Ward Name", render: (w) => <span className="font-semibold text-slate-800">{w.name}</span> },
    { header: "Code", render: (w) => <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{w.code}</span> },
    { header: "Type (Section)", render: (w) => <Badge tone={w.wardType === "ICU" || w.wardType === "NICU" ? "danger" : "info"}>{w.wardType}</Badge> },
    { header: "Floor", render: (w) => <span className="text-slate-600 font-medium">Floor {w.floorNumber}</span> },
    { header: "Nurse Station", render: (w) => <span className="text-xs text-slate-600 font-medium">{(w as any).nurseStation || "NS-1"}</span> },
    { header: "Max Rooms", render: (w) => <span className="font-bold text-slate-700">{(w as any).maxRooms || 20} Rooms</span> },
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
          <button onClick={() => navigate(`/admin/beds/edit-ward/${w._id}`)} className="text-slate-400 hover:text-navy-700 transition-colors" title="Edit Ward Master">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDeleteWard(w._id)} className="text-slate-400 hover:text-red-650 transition-colors" title="Delete Ward">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  const roomColumns: Column<RoomInfo>[] = [
    {
      header: "Room Number",
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900">Room {r.roomNumber}</span>
          {r.roomName && <span className="text-xs text-slate-500 ml-1.5 font-medium">({r.roomName})</span>}
        </div>
      )
    },
    { header: "Ward", render: (r) => <span className="text-slate-700 font-semibold">{r.wardName || (typeof r.ward === "object" ? r.ward.name : "—")}</span> },
    { header: "Accommodation", render: (r) => <Badge tone="info">{r.roomType}</Badge> },
    {
      header: "Climate",
      render: (r) => (
        <Badge tone={r.acType === "AC" ? "info" : "neutral"}>{r.acType}</Badge>
      )
    },
    { header: "Floor", render: (r) => <span className="text-slate-600 font-medium">Floor {r.floor}</span> },
    { header: "Room Capacity", render: (r) => <span className="font-bold text-slate-900">{r.capacity} Beds</span> },
    {
      header: "Occupied",
      render: (r) => (
        <span className={`font-bold ${(r.occupiedBeds ?? 0) > 0 ? "text-red-600" : "text-slate-500"}`}>
          {r.occupiedBeds ?? 0}
        </span>
      )
    },
    {
      header: "Available",
      render: (r) => (
        <span className={`font-bold ${(r.capacity - (r.occupiedBeds ?? 0)) > 0 ? "text-emerald-600" : "text-slate-400"}`}>
          {Math.max(0, r.capacity - (r.occupiedBeds ?? 0))}
        </span>
      )
    },
    {
      header: "Daily Charge",
      render: (r) => (
        <span className="font-mono font-bold text-slate-800">
          ₹{r.tariff?.roomChargePerDay ?? "1,500"}
        </span>
      )
    },
    {
      header: "Status",
      render: (r) => (
        <Badge tone={r.status === "Active" || r.status === "Available" ? "success" : r.status === "Occupied" ? "danger" : "neutral"}>
          {r.status.toUpperCase()}
        </Badge>
      )
    },
    {
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-3">
          <button onClick={() => setViewRoomDetails(r)} className="text-slate-400 hover:text-navy-700 transition-colors" title="View Details">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => navigate(`/admin/beds/edit-room/${r._id}`)} className="text-slate-400 hover:text-navy-700 transition-colors" title="Edit Room Master Data">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDeleteRoom(r)} className="text-slate-400 hover:text-red-650 transition-colors" title="Delete Room">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  const bedColumns: Column<BedInfo>[] = [
    {
      header: "Bed ID",
      render: (b) => <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{b.bedCode}</span>
    },
    { header: "Ward", render: (b) => <span className="text-slate-700 font-semibold">{typeof b.ward === "object" ? b.ward.name : "—"}</span> },
    { header: "Room", render: (b) => <span className="text-slate-700 font-bold">Room {typeof b.room === "object" ? b.room.roomNumber : "—"}</span> },
    {
      header: "Patient",
      render: (b) => (
        <div>
          {b.patient ? (
            <div>
              <span className="font-semibold text-slate-900 block">{b.patient.name}</span>
              <span className="text-[11px] font-mono text-slate-500">{b.patient.uhid}</span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic">Unassigned</span>
          )}
        </div>
      )
    },
    {
      header: "Bed Type",
      render: (b) => <span className="text-xs text-slate-700 font-semibold">{b.bedType || "Standard Bed"}</span>
    },
    {
      header: "Bed Status",
      render: (b) => (
        <Badge tone={BED_STATUS_COLORS[b.status] || "neutral"}>{b.status.toUpperCase()}</Badge>
      )
    },
    {
      header: "Actions",
      render: (b) => (
        <div className="flex items-center gap-2">
          {b.status === "Available" && (
            <button
              onClick={() => navigate("/reception/ip-management")}
              className="text-xs bg-navy-700 text-white px-2 py-1 rounded hover:bg-navy-800 transition flex items-center gap-1 font-medium"
              title="Assign Patient"
            >
              <UserPlus className="h-3 w-3" /> Assign
            </button>
          )}
          {b.status === "Occupied" && (
            <button
              onClick={() => navigate("/reception/ip-management")}
              className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700 transition flex items-center gap-1 font-medium"
              title="Transfer Patient"
            >
              <ArrowRightLeft className="h-3 w-3" /> Transfer
            </button>
          )}
          <button
            onClick={() => navigate(`/admin/beds/edit-bed/${b._id}`)}
            className="p-1.5 rounded text-slate-400 hover:text-navy-700 transition"
            title="Edit Bed Master"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleBedBlock(b)}
            className={`p-1.5 rounded transition ${b.status === "Blocked" ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-slate-400 hover:bg-slate-100"}`}
            title={b.status === "Blocked" ? "Unblock Bed" : "Block Bed"}
            disabled={b.status === "Occupied"}
          >
            <Ban className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleMarkCleaning(b)}
            className={`p-1.5 rounded transition ${b.status === "Cleaning" ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-slate-400 hover:bg-slate-100"}`}
            title={b.status === "Cleaning" ? "Mark Cleaning Finished" : "Mark for Cleaning"}
            disabled={b.status === "Occupied"}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteBed(b._id)}
            className="p-1.5 rounded text-slate-400 hover:text-red-650 transition"
            title="Delete Bed"
            disabled={b.status === "Occupied"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-navy-700" /> Enterprise Beds & Wards Management
          </h1>
          <p className="text-sm text-slate-500">
            Hierarchy: Hospital → Ward (Section) → Room (Accommodation) → Bed (Patient Allocation)
          </p>
        </div>
        <div className="flex gap-3">
          {activeTab === "wards" && (
            <Button variant="primary" onClick={() => navigate("/admin/beds/create-ward")}>
              <Plus className="h-4 w-4" /> Create Ward
            </Button>
          )}
          {activeTab === "rooms" && (
            <Button variant="primary" onClick={() => navigate("/admin/beds/create-room")}>
              <Plus className="h-4 w-4" /> Create Room
            </Button>
          )}
          {activeTab === "beds" && (
            <Button variant="primary" onClick={() => navigate("/admin/beds/create-beds")}>
              <Plus className="h-4 w-4" /> Configure Beds
            </Button>
          )}
        </div>
      </div>

      {/* Real-World HMS Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <KpiCard label="Total Wards" value={totalWardsCount} icon={<Building2 className="h-4 w-4 text-navy-700" />} />
        <KpiCard label="Total Rooms" value={totalRoomsCount} icon={<DoorOpen className="h-4 w-4 text-indigo-600" />} />
        <KpiCard label="Total Beds" value={statsTotalBeds} icon={<BedDouble className="h-4 w-4 text-slate-600" />} />
        <KpiCard label="Occupied Beds" value={statsOccupiedBeds} icon={<BedDouble className="h-4 w-4 text-red-500" />} />
        <KpiCard label="Available Beds" value={statsAvailableBeds} icon={<BedDouble className="h-4 w-4 text-emerald-500" />} emphasis />
        <KpiCard label="Under Maintenance" value={statsMaintenanceBeds} icon={<Wrench className="h-4 w-4 text-amber-600" />} />
        <KpiCard label="Occupancy Rate" value={`${occupancyPercentage}%`} icon={<Activity className="h-4 w-4 text-sky-600" />} />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("wards")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "wards" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>🏥</span> Wards ({totalWardsCount})
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "rooms" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>🏨</span> Rooms ({totalRoomsCount})
          </button>
          <button
            onClick={() => setActiveTab("beds")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "beds" ? "border-navy-700 text-navy-700" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>🛏</span> Beds ({statsTotalBeds})
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: WARDS */}
      {activeTab === "wards" && (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ward name/code..."
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
                {REAL_WORLD_WARD_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
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
            emptyMessage={isLoadingWards ? "Loading wards..." : "No wards found. Click 'Create Ward' above."}
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
          <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search room number..."
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
                {allWardsOption?.wards.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>

              <select
                value={roomCategoryFilter}
                onChange={(e) => { setRoomCategoryFilter(e.target.value); setRoomPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Categories</option>
                {REAL_WORLD_ROOM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {(roomSearch || roomWardFilter || roomCategoryFilter) && (
              <button
                onClick={() => { setRoomSearch(""); setRoomWardFilter(""); setRoomCategoryFilter(""); setRoomPage(1); }}
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
            emptyMessage={isLoadingRooms ? "Loading rooms..." : "No rooms found. Click 'Create Room' above."}
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
          <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bed ID..."
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
                {allWardsOption?.wards.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>

              <select
                value={bedStatusFilter}
                onChange={(e) => { setBedStatusFilter(e.target.value); setBedPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Bed Statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Maintenance">Maintenance</option>
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
            emptyMessage={isLoadingBeds ? "Loading beds..." : "No beds found. Click 'Configure Beds' above."}
          />

          {bedData && (
            <div className="flex justify-end pt-3">
              <Pagination page={bedPage} totalPages={bedData.pagination.totalPages} onPageChange={setBedPage} />
            </div>
          )}
        </Card>
      )}

      {/* ROOM DETAILS MODAL */}
      {viewRoomDetails && (
        <Modal
          title={`Room ${viewRoomDetails.roomNumber} Master Specifications`}
          isOpen={!!viewRoomDetails}
          onClose={() => setViewRoomDetails(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 border">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Ward (Hospital Section):</span>
                <span className="font-bold text-slate-800">{viewRoomDetails.wardName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Accommodation Category:</span>
                <Badge tone="info">{viewRoomDetails.roomType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Climate:</span>
                <span className="font-semibold text-slate-700">{viewRoomDetails.acType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total Capacity:</span>
                <span className="font-bold text-slate-800">{viewRoomDetails.capacity} Beds</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg space-y-2">
              <span className="font-bold text-emerald-800 block">Configured Tariff Breakdown:</span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>Consultation Charge: <strong>₹{(viewRoomDetails.tariff as any)?.consultationCharge ?? 500}</strong></div>
                <div>Daily Room Charge: <strong>₹{viewRoomDetails.tariff?.roomChargePerDay ?? 1500}</strong></div>
                <div>Nursing Charge: <strong>₹{viewRoomDetails.tariff?.nursingCharge ?? 300}</strong></div>
                <div>Maintenance Charge: <strong>₹{(viewRoomDetails.tariff as any)?.maintenanceCharge ?? 100}</strong></div>
                <div>Admission Deposit: <strong>₹{viewRoomDetails.tariff?.admissionDeposit ?? 5000}</strong></div>
                <div>GST Tax Rate: <strong>{viewRoomDetails.tariff?.gstPercent ?? 5}%</strong></div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setViewRoomDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDeleteModal
        isOpen={deleteConfirmConfig.isOpen}
        title={deleteConfirmConfig.title}
        message={deleteConfirmConfig.message}
        isLoading={isDeletingEntity}
        onClose={() => setDeleteConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteDeleteConfirm}
      />
    </div>
  );
}
