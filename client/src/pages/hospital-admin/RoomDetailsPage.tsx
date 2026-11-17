import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  DoorOpen,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Plus,
  Snowflake,
  Wind,
  IndianRupee,
  BedDouble,
  ShieldAlert,
  Loader2,
  Building2,
  Layers,
  Activity,
  CheckCircle2
} from "lucide-react";

import { useRoom } from "../../features/rooms";
import { useBeds, useUpdateBed, BedInfo } from "../../features/beds";
import { useBranchContext } from "../../context/BranchContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

const BED_STATUS_COLORS: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
  Available: "success",
  Occupied: "danger",
  Reserved: "info",
  Cleaning: "warning",
  Maintenance: "warning",
  Blocked: "neutral"
};

export function RoomDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAllBranches } = useBranchContext();

  const { data: room, isLoading: isLoadingRoom, error: roomError, refetch: refetchRoom } = useRoom(id);
  const { data: bedsData, isLoading: isLoadingBeds, refetch: refetchBeds } = useBeds({ room: id, limit: 100 });
  const updateBedMutation = useUpdateBed();

  const beds = bedsData?.beds || [];

  const handleMarkCleaning = async (bed: BedInfo) => {
    const nextStatus = bed.status === "Cleaning" ? "Available" : "Cleaning";
    try {
      await updateBedMutation.mutateAsync({ id: bed._id, status: nextStatus });
      await Promise.all([refetchBeds(), refetchRoom()]);
      toast.success(`Bed ${bed.bedCode} marked as ${nextStatus}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update bed status.");
    }
  };

  const handleToggleBedBlock = async (bed: BedInfo) => {
    if (bed.status === "Occupied" || (bed.patient && bed.isOccupied)) {
      toast.error("Occupied bed cannot be blocked.");
      return;
    }
    const nextStatus = bed.status === "Blocked" ? "Available" : "Blocked";
    try {
      await updateBedMutation.mutateAsync({ id: bed._id, status: nextStatus });
      await Promise.all([refetchBeds(), refetchRoom()]);
      toast.success(`Bed ${bed.bedCode} is now ${nextStatus}.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update bed status.");
    }
  };

  if (isLoadingRoom || isLoadingBeds) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3 text-slate-600 font-medium">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        <span>Loading room specifications & live telemetry...</span>
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
          <span>Unable to load room details. The room may have been deleted.</span>
        </div>
        <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
          <ArrowLeft className="h-4 w-4" /> Back to Beds & Wards
        </Button>
      </div>
    );
  }

  const wardName = typeof room.ward === "object" && room.ward ? (room.ward as any).name : room.wardName || "Ward";
  const wardId = typeof room.ward === "object" && room.ward ? (room.ward as any)._id : String(room.ward);
  const occupiedCount = beds.filter((b) => b.status === "Occupied" || (b.isOccupied && b.patient)).length;
  const availableCount = Math.max(0, room.capacity - occupiedCount);

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
            <span className="text-slate-900 font-bold">Room {room.roomNumber} Specifications</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <DoorOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Room {room.roomNumber} Specifications & Live Beds
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Ward: <strong className="text-slate-700">{wardName}</strong> • Floor {room.floor} • Capacity: {room.capacity} Beds
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => navigate("/admin/beds")}>
            <ArrowLeft className="h-4 w-4" /> Back to Beds & Wards
          </Button>

          {!isAllBranches && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/beds/create-beds?roomId=${room._id}&wardId=${wardId}`)}
              >
                <Plus className="h-4 w-4 text-emerald-700" /> Add Bed
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate(`/admin/beds/edit-room/${room._id}`)}
              >
                <Pencil className="h-4 w-4" /> Edit Room
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid: Room Specifications & Tariff */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Core Specifications */}
        <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-700" /> Accommodation Specs
            </span>
            <Badge tone={room.status === "Available" || room.status === "Active" ? "success" : "neutral"}>
              {room.status.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Ward (Section):</span>
              <span className="font-bold text-slate-900">{wardName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Room Category:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {room.roomType}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Climate Classification:</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                  room.acType === "AC"
                    ? "bg-sky-50 text-sky-800 border border-sky-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {room.acType === "AC" ? (
                  <Snowflake className="h-3.5 w-3.5 text-sky-600" />
                ) : (
                  <Wind className="h-3.5 w-3.5 text-slate-500" />
                )}
                {room.acType}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Floor Level:</span>
              <span className="font-bold text-slate-800">Floor {room.floor}</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Bed Capacity & Occupancy Status */}
        <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-emerald-700" /> Bed Telemetry
            </span>
            <span className="text-xs font-bold text-slate-500">
              Total: {room.capacity} Beds
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="block text-2xl font-black text-emerald-800">{availableCount}</span>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Available</span>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <span className="block text-2xl font-black text-rose-800">{occupiedCount}</span>
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Occupied</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100">
            <span>Configured Beds:</span>
            <strong className="text-slate-800">{beds.length} / {room.capacity} allocated</strong>
          </div>
        </Card>

        {/* Card 3: Room Tariff Structure */}
        <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-700" /> Room Tariff Structure
            </span>
            <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Daily Charge
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-center">
            <span className="block text-3xl font-black text-emerald-900 font-mono">
              ₹{room.tariff?.roomChargePerDay ? room.tariff.roomChargePerDay.toLocaleString() : "1,500"}
            </span>
            <span className="text-xs font-semibold text-emerald-700">Per Day (24-Hour Inpatient Stay)</span>
          </div>

          <p className="text-[11px] text-slate-500 text-center italic">
            Configured by hospital administration for billing and admission calculation.
          </p>
        </Card>
      </div>

      {/* Live Beds Section */}
      <Card className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-emerald-700" />
              Beds Allocated in Room {room.roomNumber} ({beds.length} Beds)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live patient allocation, telemetry status, and sanitation controls.
            </p>
          </div>

          {!isAllBranches && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/beds/create-beds?roomId=${room._id}&wardId=${wardId}`)}
            >
              <Plus className="h-3.5 w-3.5 text-emerald-700" /> Add Another Bed
            </Button>
          )}
        </div>

        {beds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beds.map((bed) => {
              const isOccupied = bed.status === "Occupied" || (bed.isOccupied && bed.patient);

              return (
                <div
                  key={bed._id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOccupied
                      ? "bg-rose-50/60 border-rose-200 shadow-2xs"
                      : bed.status === "Cleaning" || bed.status === "Maintenance"
                      ? "bg-amber-50/50 border-amber-200"
                      : bed.status === "Blocked"
                      ? "bg-slate-100/60 border-slate-300 opacity-80"
                      : "bg-emerald-50/40 border-emerald-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isOccupied
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        <BedDouble className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-mono text-sm font-bold text-slate-900 block">
                          {bed.bedCode}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {bed.bedType || "Standard Bed"}
                        </span>
                      </div>
                    </div>

                    <Badge tone={BED_STATUS_COLORS[bed.status] || "neutral"}>
                      {bed.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Patient Info or Vacant Slot */}
                  <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/80 mb-3 text-xs">
                    {isOccupied && bed.patient ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Admitted Patient:</span>
                          <strong className="text-slate-900">{bed.patient.name}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">UHID:</span>
                          <span className="font-mono font-bold text-slate-700">{bed.patient.uhid}</span>
                        </div>
                        {bed.patient.phone && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Contact:</span>
                            <span className="text-slate-700">{bed.patient.phone}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Patient Allocation:</span>
                        <span className="font-bold text-emerald-700">Vacant & Available</span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  {!isAllBranches && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                      <div className="flex items-center gap-2">
                        {!isOccupied && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMarkCleaning(bed)}
                              className="text-xs font-semibold text-amber-700 hover:underline px-2 py-1 rounded bg-amber-50 border border-amber-200 cursor-pointer"
                            >
                              {bed.status === "Cleaning" ? "Finish Cleaning" : "Clean"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleBedBlock(bed)}
                              className="text-xs font-semibold text-slate-700 hover:underline px-2 py-1 rounded bg-slate-100 border border-slate-200 cursor-pointer"
                            >
                              {bed.status === "Blocked" ? "Unblock" : "Block"}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/admin/beds/edit-bed/${bed._id}`)}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
            <BedDouble className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Beds Allocated in Room {room.roomNumber}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This room has a capacity of {room.capacity} beds, but no bed units have been created yet.
            </p>
            {!isAllBranches && (
              <Button
                variant="primary"
                onClick={() => navigate(`/admin/beds/create-beds?roomId=${room._id}&wardId=${wardId}`)}
              >
                <Plus className="h-4 w-4" /> Add First Bed
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
