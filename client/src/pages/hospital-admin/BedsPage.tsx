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
  Ban,
  Snowflake,
  Wind,
  IndianRupee,
  LayoutGrid,
  Table,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

import { useWards, useDeleteWard, WardInfo } from "../../features/wards";
import { useRooms, useDeleteRoom, RoomInfo } from "../../features/rooms";
import { useBeds, useUpdateBed, useDeleteBed, BedInfo } from "../../features/beds";
import { useBranchContext } from "../../context/BranchContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";

const BED_STATUS_COLORS: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
  Available: "success",
  Occupied: "danger",
  Reserved: "info",
  Cleaning: "warning",
  Maintenance: "neutral",
  Blocked: "danger"
};

export function BedsPage() {
  const { isAllBranches } = useBranchContext();
  const navigate = useNavigate();

  // Primary View Switcher: Schematic Floor Plan vs Tabular Management
  const [viewMode, setViewMode] = useState<"schematic" | "tabular">("schematic");

  // Tabular Mode active tab
  const [activeTab, setActiveTab] = useState<"wards" | "rooms" | "beds">("wards");

  // Pagination states
  const [wardPage, setWardPage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);
  const [bedPage, setBedPage] = useState(1);

  // Tabular Filters
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

  // Schematic Filters
  const [schematicSearch, setSchematicSearch] = useState("");
  const [schematicWardFilter, setSchematicWardFilter] = useState("all");
  const [schematicClimateFilter, setSchematicClimateFilter] = useState<"all" | "AC" | "Non AC">("all");
  const [schematicRoomTypeFilter, setSchematicRoomTypeFilter] = useState("all");
  const [schematicBedStatusFilter, setSchematicBedStatusFilter] = useState("all");

  // Queries for Tabular lists
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

  const { data: bedData, isLoading: isLoadingBeds, refetch: refetchBeds } = useBeds({
    search: bedSearch || undefined,
    ward: bedWardFilter || undefined,
    room: bedRoomFilter || undefined,
    status: bedStatusFilter || undefined,
    page: bedPage,
    limit: 10
  });

  // Comprehensive feeds for Schematic view & KPI calculations
  const { data: allWardsOption } = useWards({ limit: 200 });
  const { data: allRoomsOption } = useRooms({ limit: 500 });
  const { data: allBedsForStats, refetch: refetchAllBeds } = useBeds({ limit: 2000 });

  // Enterprise Summary KPI Calculations
  const allWards = allWardsOption?.wards ?? [];
  const allRooms = allRoomsOption?.rooms ?? [];
  const allBeds = allBedsForStats?.beds ?? [];

  const totalWardsCount = allWards.length;
  const totalRoomsCount = allRooms.length;
  const statsTotalBeds = allBeds.length;

  // Mutations
  const deleteWardMutation = useDeleteWard();
  const deleteRoomMutation = useDeleteRoom();
  const updateBedMutation = useUpdateBed();
  const deleteBedMutation = useDeleteBed();

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

  // ── Unique dynamic filter options for Schematic View ──────────────────
  const dynamicRoomTypes = useMemo(() => {
    const types = new Set<string>();
    allRooms.forEach((r) => {
      if (r.roomType) types.add(r.roomType);
    });
    return Array.from(types);
  }, [allRooms]);

  const dynamicWardTypes = useMemo(() => {
    const types = new Set<string>();
    allWards.forEach((w) => {
      if (w.wardType) types.add(w.wardType);
    });
    return Array.from(types);
  }, [allWards]);

  // ── Beds map by Room ID ───────────────────────────────────────────────
  const bedsByRoomId = useMemo(() => {
    const map = new Map<string, BedInfo[]>();
    allBeds.forEach((b) => {
      const rId = typeof b.room === "object" && b.room ? (b.room as any)._id : String(b.room);
      if (rId) {
        if (!map.has(rId)) map.set(rId, []);
        map.get(rId)!.push(b);
      }
    });
    return map;
  }, [allBeds]);

  // ── Grouped & Filtered Wards with Rooms for Schematic View ─────────────
  const schematicWardsData = useMemo(() => {
    const q = schematicSearch.toLowerCase().trim();

    return allWards
      .filter((ward) => {
        if (schematicWardFilter !== "all" && ward._id !== schematicWardFilter) return false;
        return true;
      })
      .map((ward) => {
        // Find rooms belonging to this ward
        const wardRooms = allRooms.filter((room) => {
          const wId = typeof room.ward === "object" && room.ward ? (room.ward as any)._id : String(room.ward);
          if (wId !== ward._id) return false;

          // Climate Filter
          if (schematicClimateFilter !== "all" && room.acType !== schematicClimateFilter) {
            return false;
          }

          // Room Type Filter
          if (schematicRoomTypeFilter !== "all" && room.roomType !== schematicRoomTypeFilter) {
            return false;
          }

          // Search Filter
          if (q) {
            const matchesRoomNum = room.roomNumber.toLowerCase().includes(q);
            const matchesRoomName = (room.roomName || "").toLowerCase().includes(q);
            const matchesWardName = ward.name.toLowerCase().includes(q);
            const roomBeds = bedsByRoomId.get(room._id) || [];
            const matchesBed = roomBeds.some(
              (b) =>
                b.bedCode.toLowerCase().includes(q) ||
                (b.patient && b.patient.name.toLowerCase().includes(q)) ||
                (b.patient && b.patient.uhid && b.patient.uhid.toLowerCase().includes(q))
            );
            if (!matchesRoomNum && !matchesRoomName && !matchesWardName && !matchesBed) {
              return false;
            }
          }

          // Bed Status Filter
          if (schematicBedStatusFilter !== "all") {
            const roomBeds = bedsByRoomId.get(room._id) || [];
            if (schematicBedStatusFilter === "Available" && !roomBeds.some((b) => b.status === "Available")) {
              return false;
            }
            if (schematicBedStatusFilter === "Occupied" && !roomBeds.some((b) => b.status === "Occupied")) {
              return false;
            }
            if (
              schematicBedStatusFilter === "Maintenance" &&
              !roomBeds.some((b) => b.status === "Maintenance" || b.status === "Cleaning" || b.status === "Blocked")
            ) {
              return false;
            }
          }

          return true;
        });

        // Compute telemetry for this ward
        let wardTotalBeds = 0;
        let wardOccupiedBeds = 0;
        let wardAvailableBeds = 0;

        wardRooms.forEach((r) => {
          const roomBeds = bedsByRoomId.get(r._id) || [];
          const cap = r.capacity || roomBeds.length || 1;
          wardTotalBeds += cap;
          const occ = roomBeds.filter((b) => b.status === "Occupied" || (b.isOccupied && b.patient)).length;
          wardOccupiedBeds += occ;
          wardAvailableBeds += Math.max(0, cap - occ);
        });

        return {
          ward,
          rooms: wardRooms,
          stats: {
            totalRooms: wardRooms.length,
            totalBeds: wardTotalBeds,
            occupiedBeds: wardOccupiedBeds,
            availableBeds: wardAvailableBeds,
          },
        };
      })
      .filter((group) => {
        // If searching and this ward has no matching rooms, check if ward name matches
        if (schematicSearch && group.rooms.length === 0) {
          return group.ward.name.toLowerCase().includes(schematicSearch.toLowerCase().trim());
        }
        return true;
      });
  }, [
    allWards,
    allRooms,
    bedsByRoomId,
    schematicWardFilter,
    schematicClimateFilter,
    schematicRoomTypeFilter,
    schematicBedStatusFilter,
    schematicSearch,
  ]);

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
      toast.error(
        `Cannot delete Room ${room.roomNumber} because ${room.occupiedBeds} patient(s) are currently admitted.`
      );
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
      await Promise.all([refetchBeds(), refetchAllBeds()]);
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
        lastSanitized: new Date().toISOString(),
      });
      await Promise.all([refetchBeds(), refetchAllBeds()]);
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
          await Promise.all([refetchBeds(), refetchAllBeds()]);
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
    {
      header: "Code",
      render: (w) => (
        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{w.code}</span>
      ),
    },
    {
      header: "Type (Section)",
      render: (w) => (
        <Badge tone={w.wardType === "ICU" || w.wardType === "NICU" ? "danger" : "info"}>{w.wardType}</Badge>
      ),
    },
    { header: "Floor", render: (w) => <span className="text-slate-600 font-medium">Floor {w.floorNumber}</span> },
    {
      header: "Max Rooms",
      render: (w) => <span className="font-bold text-slate-700">{w.maxRooms ?? 20} Rooms</span>,
    },
    {
      header: "Status",
      render: (w) => <Badge tone={w.status === "Active" ? "success" : "neutral"}>{w.status.toUpperCase()}</Badge>,
    },
    {
      header: "Actions",
      render: (w) => (
        <div className="flex items-center gap-3">
          {!isAllBranches ? (
            <>
              <button
                onClick={() => navigate(`/admin/beds/edit-ward/${w._id}`)}
                className="text-slate-400 hover:text-emerald-700 transition-colors"
                title="Edit Ward Master"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteWard(w._id)}
                className="text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete Ward"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Read-Only</span>
          )}
        </div>
      ),
    },
  ];

  const roomColumns: Column<RoomInfo>[] = [
    {
      header: "Room Number",
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900">Room {r.roomNumber}</span>
          {r.roomName && <span className="text-xs text-slate-500 ml-1.5 font-medium">({r.roomName})</span>}
        </div>
      ),
    },
    {
      header: "Ward",
      render: (r) => (
        <span className="text-slate-700 font-semibold">
          {r.wardName || (typeof r.ward === "object" && r.ward ? (r.ward as any).name : "—")}
        </span>
      ),
    },
    { header: "Accommodation", render: (r) => <Badge tone="info">{r.roomType}</Badge> },
    {
      header: "Climate",
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
            r.acType === "AC"
              ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
              : "bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          {r.acType === "AC" ? <Snowflake className="h-3 w-3 text-cyan-600" /> : <Wind className="h-3 w-3 text-slate-400" />}
          {r.acType}
        </span>
      ),
    },
    { header: "Floor", render: (r) => <span className="text-slate-600 font-medium">Floor {r.floor}</span> },
    { header: "Room Capacity", render: (r) => <span className="font-bold text-slate-900">{r.capacity} Beds</span> },
    {
      header: "Occupied",
      render: (r) => (
        <span className={`font-bold ${(r.occupiedBeds ?? 0) > 0 ? "text-rose-600" : "text-slate-500"}`}>
          {r.occupiedBeds ?? 0}
        </span>
      ),
    },
    {
      header: "Available",
      render: (r) => (
        <span
          className={`font-bold ${r.capacity - (r.occupiedBeds ?? 0) > 0 ? "text-emerald-600" : "text-slate-400"}`}
        >
          {Math.max(0, r.capacity - (r.occupiedBeds ?? 0))}
        </span>
      ),
    },
    {
      header: "Daily Tariff",
      render: (r) => (
        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          ₹{r.tariff?.roomChargePerDay ? r.tariff.roomChargePerDay.toLocaleString() : "1,500"}
        </span>
      ),
    },
    {
      header: "Status",
      render: (r) => (
        <Badge
          tone={
            r.status === "Active" || r.status === "Available"
              ? "success"
              : r.status === "Occupied"
              ? "danger"
              : "neutral"
          }
        >
          {r.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Actions",
      render: (r) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/beds/rooms/${r._id}`)}
            className="text-slate-400 hover:text-emerald-700 transition-colors"
            title="View Room Specifications"
          >
            <Eye className="h-4 w-4" />
          </button>
          {!isAllBranches ? (
            <>
              <button
                onClick={() => navigate(`/admin/beds/edit-room/${r._id}`)}
                className="text-slate-400 hover:text-emerald-700 transition-colors"
                title="Edit Room Master Data"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteRoom(r)}
                className="text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete Room"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Read-Only</span>
          )}
        </div>
      ),
    },
  ];

  const bedColumns: Column<BedInfo>[] = [
    {
      header: "Bed ID",
      render: (b) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{b.bedCode}</span>
      ),
    },
    {
      header: "Ward",
      render: (b) => (
        <span className="text-slate-700 font-semibold">
          {typeof b.ward === "object" && b.ward ? (b.ward as any).name : "—"}
        </span>
      ),
    },
    {
      header: "Room",
      render: (b) => (
        <span className="text-slate-700 font-bold">
          Room {typeof b.room === "object" && b.room ? (b.room as any).roomNumber : "—"}
        </span>
      ),
    },
    {
      header: "Patient Allocation",
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
      ),
    },
    {
      header: "Bed Type",
      render: (b) => <span className="text-xs text-slate-700 font-semibold">{b.bedType || "Standard Bed"}</span>,
    },
    {
      header: "Bed Status",
      render: (b) => <Badge tone={BED_STATUS_COLORS[b.status] || "neutral"}>{b.status.toUpperCase()}</Badge>,
    },
    {
      header: "Actions",
      render: (b) => (
        <div className="flex items-center gap-2">
          {!isAllBranches ? (
            <>
              <button
                onClick={() => navigate(`/admin/beds/edit-bed/${b._id}`)}
                className="p-1.5 rounded text-slate-400 hover:text-emerald-700 transition"
                title="Edit Bed"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleToggleBedBlock(b)}
                className={`p-1.5 rounded transition ${
                  b.status === "Blocked"
                    ? "text-red-600 bg-red-50 hover:bg-red-100"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                title={b.status === "Blocked" ? "Unblock Bed" : "Block Bed"}
                disabled={b.status === "Occupied"}
              >
                <Ban className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleMarkCleaning(b)}
                className={`p-1.5 rounded transition ${
                  b.status === "Cleaning"
                    ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                title={b.status === "Cleaning" ? "Mark Cleaning Finished" : "Mark for Cleaning"}
                disabled={b.status === "Occupied"}
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteBed(b._id)}
                className="p-1.5 rounded text-slate-400 hover:text-rose-600 transition"
                title="Delete Bed"
                disabled={b.status === "Occupied"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400 italic">Read-Only</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full pb-12 font-sans">
      <AllBranchesNoticeBanner />

      {/* ── Page Header & Navigation Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Enterprise Beds & Wards Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Hospital → Ward (User-Defined) → Room (AC / Non-AC & Tariff) → Bed (Patient Allocation)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher Pill */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("schematic")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "schematic"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-4 w-4 text-emerald-700" />
              Schematic Floor Plan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tabular")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === "tabular"
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table className="h-4 w-4 text-slate-600" />
              Tabular Master Data
            </button>
          </div>

          {!isAllBranches && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/admin/beds/create-ward")} className="shadow-2xs">
                <Plus className="h-4 w-4 text-emerald-700" /> New Ward
              </Button>
              <Button variant="primary" onClick={() => navigate("/admin/beds/create-room")} className="shadow-2xs">
                <Plus className="h-4 w-4" /> New Room
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 1: SCHEMATIC / DIAGRAMMATIC ARCHITECTURAL FLOOR PLAN VIEW
          ══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "schematic" && (
        <div className="space-y-6">
          {/* Schematic Global Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search room #, name, bed code, patient..."
                  value={schematicSearch}
                  onChange={(e) => setSchematicSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Ward Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={schematicWardFilter}
                  onChange={(e) => setSchematicWardFilter(e.target.value)}
                  className="bg-transparent font-medium outline-none cursor-pointer text-slate-700"
                >
                  <option value="all">All Wards ({allWards.length})</option>
                  {allWards.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} (Fl. {w.floorNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Climate Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs">
                <Snowflake className="h-3.5 w-3.5 text-cyan-600" />
                <select
                  value={schematicClimateFilter}
                  onChange={(e) => setSchematicClimateFilter(e.target.value as any)}
                  className="bg-transparent font-medium outline-none cursor-pointer text-slate-700"
                >
                  <option value="all">All Climates (AC & Non-AC)</option>
                  <option value="AC">❄️ AC Only</option>
                  <option value="Non AC">🌀 Non-AC Only</option>
                </select>
              </div>

              {/* Room Category Selector */}
              {dynamicRoomTypes.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs">
                  <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={schematicRoomTypeFilter}
                    onChange={(e) => setSchematicRoomTypeFilter(e.target.value)}
                    className="bg-transparent font-medium outline-none cursor-pointer text-slate-700"
                  >
                    <option value="all">All Room Types ({dynamicRoomTypes.length})</option>
                    {dynamicRoomTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bed Status Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={schematicBedStatusFilter}
                  onChange={(e) => setSchematicBedStatusFilter(e.target.value)}
                  className="bg-transparent font-medium outline-none cursor-pointer text-slate-700"
                >
                  <option value="all">All Bed Statuses</option>
                  <option value="Available">🟢 Available Only</option>
                  <option value="Occupied">🔴 Occupied Only</option>
                  <option value="Maintenance">🟡 Maintenance / Cleaning</option>
                </select>
              </div>
            </div>

            {(schematicSearch ||
              schematicWardFilter !== "all" ||
              schematicClimateFilter !== "all" ||
              schematicRoomTypeFilter !== "all" ||
              schematicBedStatusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSchematicSearch("");
                  setSchematicWardFilter("all");
                  setSchematicClimateFilter("all");
                  setSchematicRoomTypeFilter("all");
                  setSchematicBedStatusFilter("all");
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>

          {/* Schematic Ward Blocks */}
          {schematicWardsData.length > 0 ? (
            schematicWardsData.map(({ ward, rooms, stats }) => (
              <div
                key={ward._id}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5 transition-all"
              >
                {/* Ward Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs font-bold text-sm">
                      F{ward.floorNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">{ward.name}</h2>
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {ward.code}
                        </span>
                        <Badge tone={ward.wardType.includes("ICU") ? "danger" : "info"}>{ward.wardType}</Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Floor {ward.floorNumber} • Max Capacity: {ward.maxRooms ?? 20} Rooms
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 border border-slate-200">
                        {stats.totalRooms} Rooms
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200">
                        {stats.availableBeds} Available
                      </span>
                      <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-800 border border-rose-200">
                        {stats.occupiedBeds} Occupied
                      </span>
                    </div>

                    {!isAllBranches && (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/beds/create-room?wardId=${ward._id}`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 text-xs font-semibold shadow-2xs cursor-pointer transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Room
                      </button>
                    )}
                  </div>
                </div>

                {/* Rooms Grid inside Ward */}
                {rooms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {rooms.map((room) => {
                      const roomBeds = bedsByRoomId.get(room._id) || [];
                      const capacity = room.capacity || roomBeds.length || 1;
                      const occupiedCount = roomBeds.filter(
                        (b) => b.status === "Occupied" || (b.isOccupied && b.patient)
                      ).length;
                      const isFull = occupiedCount >= capacity;
                      const dailyTariff = room.tariff?.roomChargePerDay ?? 1500;

                      return (
                        <div
                          key={room._id}
                          className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all p-4 flex flex-col justify-between shadow-2xs space-y-4 hover:shadow-xs"
                        >
                          {/* Room Header Strip */}
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-base font-bold text-slate-900 tracking-tight">
                                    Room {room.roomNumber}
                                  </span>
                                  {room.roomName && (
                                    <span className="text-xs text-slate-500 font-medium">({room.roomName})</span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  {/* User-defined room category badge */}
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                                    {room.roomType}
                                  </span>

                                  {/* AC vs Non-AC Badge */}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                      room.acType === "AC"
                                        ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                                        : "bg-amber-50 text-amber-800 border border-amber-200"
                                    }`}
                                  >
                                    {room.acType === "AC" ? (
                                      <Snowflake className="h-3 w-3 text-cyan-600" />
                                    ) : (
                                      <Wind className="h-3 w-3 text-amber-600" />
                                    )}
                                    {room.acType}
                                  </span>
                                </div>
                              </div>

                              {/* User-Defined Room Tariff Pill */}
                              <div className="text-right">
                                <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs font-mono">
                                  <IndianRupee className="h-3 w-3 text-emerald-700" />
                                  {dailyTariff.toLocaleString()}
                                  <span className="text-[10px] text-emerald-600 font-normal">/day</span>
                                </span>
                              </div>
                            </div>

                            {/* Capacity progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                <span>Occupancy:</span>
                                <span>
                                  <strong className={isFull ? "text-rose-600" : "text-emerald-700"}>
                                    {occupiedCount}
                                  </strong>{" "}
                                  of {capacity} Beds
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isFull
                                      ? "bg-rose-500"
                                      : occupiedCount > 0
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(100, (occupiedCount / capacity) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Interactive Bed Slots Container */}
                          <div className="space-y-2 border-t border-slate-100 pt-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Bed Slots ({roomBeds.length}):
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                              {roomBeds.map((bed) => {
                                const isOccupied = bed.status === "Occupied" || (bed.isOccupied && bed.patient);
                                const isCleaning = bed.status === "Cleaning";
                                const isMaint = bed.status === "Maintenance" || bed.status === "Blocked";

                                return (
                                  <div
                                    key={bed._id}
                                    onClick={() => navigate(`/admin/beds/rooms/${room._id}`)}
                                    className={`relative p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                      isOccupied
                                        ? "bg-rose-50/70 border-rose-200 hover:border-rose-300"
                                        : isCleaning
                                        ? "bg-amber-50/70 border-amber-200 hover:border-amber-300"
                                        : isMaint
                                        ? "bg-slate-100 border-slate-200 hover:border-slate-300"
                                        : "bg-emerald-50/60 border-emerald-200 hover:border-emerald-300"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[11px] font-bold text-slate-800">
                                        {bed.bedNumber || bed.bedCode}
                                      </span>
                                      <BedDouble
                                        className={`h-3.5 w-3.5 ${
                                          isOccupied
                                            ? "text-rose-600"
                                            : isCleaning
                                            ? "text-amber-600"
                                            : isMaint
                                            ? "text-slate-500"
                                            : "text-emerald-600"
                                        }`}
                                      />
                                    </div>

                                    {isOccupied && bed.patient ? (
                                      <div className="mt-1">
                                        <p className="text-[11px] font-bold text-rose-900 truncate">
                                          {bed.patient.name}
                                        </p>
                                        <p className="text-[10px] font-mono text-rose-700 truncate">
                                          {bed.patient.uhid}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                                        <span
                                          className={
                                            isCleaning
                                              ? "text-amber-700"
                                              : isMaint
                                              ? "text-slate-600"
                                              : "text-emerald-700"
                                          }
                                        >
                                          {bed.status}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Room Actions Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/beds/rooms/${room._id}`)}
                              className="text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> Room Specs
                            </button>
                            {!isAllBranches && (
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/beds/edit-room/${room._id}`)}
                                className="text-slate-400 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit Room
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                    <DoorOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No rooms match the selected filters in this ward.</p>
                    {!isAllBranches && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/beds/create-room?wardId=${ward._id}`)}
                        className="mt-3 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Room to {ward.name}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <Card className="p-12 text-center rounded-2xl">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Wards or Rooms Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No rooms match the applied filters, or no wards have been created yet.
              </p>
              {!isAllBranches && (
                <div className="flex justify-center gap-3 mt-4">
                  <Button variant="primary" onClick={() => navigate("/admin/beds/create-ward")}>
                    <Plus className="h-4 w-4" /> Create First Ward
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODE 2: TABULAR DATA MANAGEMENT VIEW (WARDS, ROOMS, BEDS)
          ══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "tabular" && (
        <div className="space-y-6">
          {/* Tabs bar */}
          <div className="border-b border-slate-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("wards")}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "wards"
                    ? "border-emerald-700 text-emerald-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Building2 className="h-4 w-4" /> Wards ({totalWardsCount})
              </button>
              <button
                onClick={() => setActiveTab("rooms")}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "rooms"
                    ? "border-emerald-700 text-emerald-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <DoorOpen className="h-4 w-4" /> Rooms ({totalRoomsCount})
              </button>
              <button
                onClick={() => setActiveTab("beds")}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "beds"
                    ? "border-emerald-700 text-emerald-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <BedDouble className="h-4 w-4" /> Beds ({statsTotalBeds})
              </button>
            </div>
          </div>

          {/* TAB 1: WARDS */}
          {activeTab === "wards" && (
            <Card className="p-6 space-y-4 rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search ward name/code..."
                      value={wardSearch}
                      onChange={(e) => {
                        setWardSearch(e.target.value);
                        setWardPage(1);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <select
                    value={wardTypeFilter}
                    onChange={(e) => {
                      setWardTypeFilter(e.target.value);
                      setWardPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Ward Types</option>
                    {dynamicWardTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  <select
                    value={wardStatusFilter}
                    onChange={(e) => {
                      setWardStatusFilter(e.target.value);
                      setWardPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {(wardSearch || wardTypeFilter || wardStatusFilter) && (
                  <button
                    onClick={() => {
                      setWardSearch("");
                      setWardTypeFilter("");
                      setWardStatusFilter("");
                    }}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                  </button>
                )}
              </div>

              <DataTable
                columns={wardColumns}
                rows={wardData?.wards ?? []}
                rowKey={(w) => w._id}
                emptyMessage={isLoadingWards ? "Loading wards..." : "No wards found. Click 'New Ward' above."}
              />

              {wardData && (
                <div className="flex justify-end pt-3">
                  <Pagination page={wardPage} totalPages={wardData.pagination.totalPages} onPageChange={setWardPage} />
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: ROOMS */}
          {activeTab === "rooms" && (
            <Card className="p-6 space-y-4 rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search room # or name..."
                      value={roomSearch}
                      onChange={(e) => {
                        setRoomSearch(e.target.value);
                        setRoomPage(1);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <select
                    value={roomWardFilter}
                    onChange={(e) => {
                      setRoomWardFilter(e.target.value);
                      setRoomPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Wards</option>
                    {allWards.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={roomCategoryFilter}
                    onChange={(e) => {
                      setRoomCategoryFilter(e.target.value);
                      setRoomPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Room Categories</option>
                    {dynamicRoomTypes.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {(roomSearch || roomWardFilter || roomCategoryFilter) && (
                  <button
                    onClick={() => {
                      setRoomSearch("");
                      setRoomWardFilter("");
                      setRoomCategoryFilter("");
                    }}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                  </button>
                )}
              </div>

              <DataTable
                columns={roomColumns}
                rows={roomData?.rooms ?? []}
                rowKey={(r) => r._id}
                emptyMessage={isLoadingRooms ? "Loading rooms..." : "No rooms found. Click 'New Room' above."}
              />

              {roomData && (
                <div className="flex justify-end pt-3">
                  <Pagination page={roomPage} totalPages={roomData.pagination.totalPages} onPageChange={setRoomPage} />
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: BEDS */}
          {activeTab === "beds" && (
            <Card className="p-6 space-y-4 rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search bed code or patient..."
                      value={bedSearch}
                      onChange={(e) => {
                        setBedSearch(e.target.value);
                        setBedPage(1);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <select
                    value={bedWardFilter}
                    onChange={(e) => {
                      setBedWardFilter(e.target.value);
                      setBedPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Wards</option>
                    {allWards.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={bedRoomFilter}
                    onChange={(e) => {
                      setBedRoomFilter(e.target.value);
                      setBedPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Rooms</option>
                    {allRooms.map((r) => (
                      <option key={r._id} value={r._id}>
                        Room {r.roomNumber}
                      </option>
                    ))}
                  </select>

                  <select
                    value={bedStatusFilter}
                    onChange={(e) => {
                      setBedStatusFilter(e.target.value);
                      setBedPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                {(bedSearch || bedWardFilter || bedRoomFilter || bedStatusFilter) && (
                  <button
                    onClick={() => {
                      setBedSearch("");
                      setBedWardFilter("");
                      setBedRoomFilter("");
                      setBedStatusFilter("");
                    }}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
                  </button>
                )}
              </div>

              <DataTable
                columns={bedColumns}
                rows={bedData?.beds ?? []}
                rowKey={(b) => b._id}
                emptyMessage={isLoadingBeds ? "Loading beds..." : "No beds found."}
              />

              {bedData && (
                <div className="flex justify-end pt-3">
                  <Pagination page={bedPage} totalPages={bedData.pagination.totalPages} onPageChange={setBedPage} />
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
