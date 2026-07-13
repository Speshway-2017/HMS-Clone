import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "../components/ui/Sidebar";
import { Topbar } from "../components/ui/Topbar";
import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";

export function DashboardLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.hospital) {
      socket.emit("join_hospital", user.hospital);
    }
  }, [user]);

  useEffect(() => {
    const handleUpdate = (data: any) => {
      console.log("Real-time update received via Socket.IO:", data);
      // Invalidate all query keys to trigger real-time auto-updates
      queryClient.invalidateQueries();
    };

    socket.on("dashboard_update", handleUpdate);
    socket.on("admission:request:created", handleUpdate);
    socket.on("admission_request_update", handleUpdate);
    socket.on("prescription:new", handleUpdate);
    socket.on("prescription:updated", handleUpdate);
    socket.on("prescription:dispensed", handleUpdate);
    return () => {
      socket.off("dashboard_update", handleUpdate);
      socket.off("admission:request:created", handleUpdate);
      socket.off("admission_request_update", handleUpdate);
      socket.off("prescription:new", handleUpdate);
      socket.off("prescription:updated", handleUpdate);
      socket.off("prescription:dispensed", handleUpdate);
    };
  }, [queryClient]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
