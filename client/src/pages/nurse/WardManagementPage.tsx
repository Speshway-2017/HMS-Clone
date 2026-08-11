import { useState, useMemo } from "react";
import { BedDouble, Search, RefreshCw, CheckCircle2, Shield } from "lucide-react";
import { useNurseBeds, useNurseWards } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";

export function WardManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState("all");

  const { data: beds = [], isLoading: loadingBeds, refetch: refetchBeds } = useNurseBeds();
  const { data: wards = [] } = useNurseWards();

  const metrics = useMemo(() => {
    const totalBeds = beds.length;
    const occupied = beds.filter((b: any) => {
      const st = (b.status || "").toLowerCase();
      return st === "occupied" || b.isOccupied === true;
    }).length;
    const available = beds.filter((b: any) => {
      const st = (b.status || "").toLowerCase();
      return (st === "available" || st === "active") && !b.isOccupied;
    }).length;
    const maintenance = beds.filter((b: any) => {
      const st = (b.status || "").toLowerCase();
      return st === "maintenance" || st === "cleaning" || st === "blocked";
    }).length;

    return { totalBeds, occupied, available, maintenance };
  }, [beds]);

  const filteredBeds = useMemo(() => {
    return beds.filter((b: any) => {
      const bNum = b.bedCode || b.bedNumber || "";
      const wardName = b.ward?.name || b.wardName || "";
      const roomNum = b.room?.roomNumber || b.roomNumber || "";
      const patientName = b.patient?.name || b.patientName || b.admission?.patient?.name || "";
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        bNum.toLowerCase().includes(query) ||
        wardName.toLowerCase().includes(query) ||
        roomNum.toLowerCase().includes(query) ||
        patientName.toLowerCase().includes(query);
      const matchesWard = selectedWard === "all" || wardName.toLowerCase() === selectedWard.toLowerCase();
      return matchesSearch && matchesWard;
    });
  }, [beds, searchTerm, selectedWard]);

  const columns: Column<any>[] = [
    {
      header: "Bed ID",
      render: (row) => <span className="font-bold text-navy-900">{row.bedCode || row.bedNumber || "Bed ID"}</span>,
    },
    {
      header: "Ward Name",
      render: (row) => <span className="font-semibold text-slate-800">{row.ward?.name || row.wardName || "General Ward"}</span>,
    },
    {
      header: "Room Number",
      render: (row) => <span className="text-xs font-mono text-slate-600">Room {row.room?.roomNumber || row.roomNumber || "N/A"}</span>,
    },
    {
      header: "Patient Name",
      render: (row) => {
        const pName = row.patient?.name || row.patientName || row.admission?.patient?.name;
        const isOccupied = row.isOccupied === true || (row.status || "").toLowerCase() === "occupied";
        if (isOccupied && pName) {
          return (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-xs">{pName}</span>
              {row.patient?.uhid && (
                <span className="text-[10px] text-slate-400 font-mono">UHID: {row.patient.uhid}</span>
              )}
            </div>
          );
        }
        return <span className="font-bold text-slate-400 text-xs font-mono">-</span>;
      },
    },
    {
      header: "Occupancy Status",
      render: (row) => {
        const rawStatus = (row.status || "").toLowerCase();
        const isOccupied = rawStatus === "occupied" || row.isOccupied === true;
        const isCleaning = rawStatus === "cleaning";
        const isMaintenance = rawStatus === "maintenance" || rawStatus === "blocked";
        const isAvailable = (rawStatus === "available" || rawStatus === "active") && !row.isOccupied;

        let label = "Available";
        let colorClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";

        if (isOccupied) {
          label = "Occupied";
          colorClass = "bg-purple-50 text-purple-700 border border-purple-200";
        } else if (isCleaning) {
          label = "Cleaning";
          colorClass = "bg-blue-50 text-blue-700 border border-blue-200";
        } else if (isMaintenance) {
          label = "Maintenance";
          colorClass = "bg-amber-50 text-amber-700 border border-amber-200";
        } else if (isAvailable) {
          label = "Available";
          colorClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
        } else {
          label = row.status || "Available";
        }

        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${colorClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      header: "Daily Bed Tariff",
      render: (row) => {
        const tariff = row.room?.tariff?.roomChargePerDay || row.dailyRate || row.pricePerDay || 1500;
        return <span className="text-xs font-bold text-slate-700">₹{tariff}/day</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Nurse</span>
            <span>/</span>
            <span className="text-slate-700">Ward Management</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Ward & Bed Management</h1>
          <p className="text-xs text-slate-500">Overview of ward capacity, bed allocations, and inpatient room management.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Ward Beds</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{metrics.totalBeds}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Occupied Beds</p>
          <p className="mt-2 text-2xl font-extrabold text-purple-600">{metrics.occupied}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Available Beds</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.available}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Maintenance / Cleaning</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{metrics.maintenance}</p>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search bed ID or ward..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-navy-900 focus:outline-none"
            />
          </div>

          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Wards</option>
            {wards.map((w: any) => (
              <option key={w._id} value={w.name}>{w.name}</option>
            ))}
          </select>
        </div>

        <DataTable
          columns={columns}
          rows={filteredBeds}
          rowKey={(r: any) => r._id || Math.random().toString()}
          emptyMessage="No ward beds configured."
        />
      </div>
    </div>
  );
}
