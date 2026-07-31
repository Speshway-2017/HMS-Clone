import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "../components/ui/Sidebar";
import { Topbar } from "../components/ui/Topbar";
import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";
import { useDoctorProfileMe } from "../features/doctors";
import { useMyHospital } from "../features/hospitals";

export function DashboardLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: doctorProfile } = useDoctorProfileMe();
  const { data: hospital } = useMyHospital({ enabled: !!user?.hospital });

  useEffect(() => {
    if (hospital?.logoUrl) {
      let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(favicon);
      }
      favicon.href = hospital.logoUrl;
    }
  }, [hospital?.logoUrl]);

  useEffect(() => {
    if (user?.hospital) {
      socket.emit("join_hospital", user.hospital);
    }
    if (user?.role === "doctor" && doctorProfile?._id) {
      socket.emit("join_doctor", doctorProfile._id);
    }
  }, [user, doctorProfile]);

  useEffect(() => {
    const handleUpdate = (data: unknown) => {
      console.log("Real-time update received via Socket.IO:", data);
      // Invalidate all query keys to trigger real-time auto-updates
      queryClient.invalidateQueries();
    };

    const handleDeptUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    };

    socket.on("dashboard_update", handleUpdate);
    socket.on("admission:request:created", handleUpdate);
    socket.on("admission_request_update", handleUpdate);
    socket.on("prescription:new", handleUpdate);
    socket.on("prescription:updated", handleUpdate);
    socket.on("prescription:dispensed", handleUpdate);
    socket.on("notification:new", handleUpdate);
    // Department real-time events
    socket.on("department:updated", handleDeptUpdate);
    socket.on("department:statusChanged", handleDeptUpdate);
    socket.on("department:deleted", handleDeptUpdate);

    return () => {
      socket.off("dashboard_update", handleUpdate);
      socket.off("admission:request:created", handleUpdate);
      socket.off("admission_request_update", handleUpdate);
      socket.off("prescription:new", handleUpdate);
      socket.off("prescription:updated", handleUpdate);
      socket.off("prescription:dispensed", handleUpdate);
      socket.off("notification:new", handleUpdate);
      socket.off("department:updated", handleDeptUpdate);
      socket.off("department:statusChanged", handleDeptUpdate);
      socket.off("department:deleted", handleDeptUpdate);
    };
  }, [queryClient]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
