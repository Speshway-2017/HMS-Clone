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
    const rawHosp = user?.hospital;
    const hospId = rawHosp
      ? (typeof rawHosp === "object" ? (rawHosp as any)._id || (rawHosp as any).id : rawHosp).toString()
      : null;

    const joinRooms = () => {
      if (hospId) {
        socket.emit("join_hospital", hospId);
      }
      if (user?.role === "doctor" && doctorProfile?._id) {
        socket.emit("join_doctor", doctorProfile._id.toString());
      }
    };

    joinRooms();
    socket.on("connect", joinRooms);
    return () => {
      socket.off("connect", joinRooms);
    };
  }, [user, doctorProfile]);

  useEffect(() => {
    const handleUpdate = () => {
      // Invalidate all query keys to trigger real-time auto-updates across dashboards
      queryClient.invalidateQueries();
    };

    const handleDeptUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    };

    const events = [
      "dashboard_update",
      "appointment_created",
      "appointment_updated",
      "queue_updated",
      "patient_updated",
      "patient_created",
      "billing_updated",
      "ip_billing_update",
      "ip_bill_update",
      "lab_order_created",
      "lab_order_updated",
      "lab_report_uploaded",
      "lab_result_updated",
      "vitals_updated",
      "inventory_updated",
      "new_admission_request",
      "admission_request_update",
      "discharge_requested",
      "new_appointment",
      "attendance:updated",
      "leave:updated",
      "prescription:new",
      "prescription:updated",
      "prescription:dispensed",
      "notification:new",
      "doctor:created",
      "doctor:updated",
      "doctor:deleted",
      "staff:created",
      "staff:updated",
      "staff:deleted",
      "blog:created",
      "blog:updated",
      "blog:deleted",
      "enquiry_updated",
      "enquiry:updated",
      "branch:created",
      "branch:updated",
      "branch:deleted",
      "hospital:updated",
      "hospital:deleted",
      "profile:updated"
    ];

    events.forEach((evt) => socket.on(evt, handleUpdate));
    socket.on("department:updated", handleDeptUpdate);
    socket.on("department:statusChanged", handleDeptUpdate);
    socket.on("department:deleted", handleDeptUpdate);

    return () => {
      events.forEach((evt) => socket.off(evt, handleUpdate));
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
        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
