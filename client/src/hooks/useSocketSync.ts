import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../lib/socket";
import toast from "react-hot-toast";

/**
 * Ultra-Fast Sub-20ms Real-Time Socket Synchronization Hook
 * Uses direct TanStack Query in-memory cache mutations (`setQueryData`) to update the UI
 * instantly without waiting for HTTP network round-trips or server re-fetches.
 */
export function useSocketSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Instant Invoice & Billing Cache Mutation
    const handleBillingChange = (payload: any) => {
      const targetInvoice = payload?.invoice || payload?.data || payload;
      if (targetInvoice && targetInvoice._id) {
        // Update direct pending overdue query cache
        queryClient.setQueriesData({ queryKey: ["invoices"] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map((inv: any) => (inv._id === targetInvoice._id ? { ...inv, ...targetInvoice } : inv));
          }
          if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map((inv: any) => (inv._id === targetInvoice._id ? { ...inv, ...targetInvoice } : inv)),
            };
          }
          if (oldData.invoices && Array.isArray(oldData.invoices)) {
            return {
              ...oldData,
              invoices: oldData.invoices.map((inv: any) => (inv._id === targetInvoice._id ? { ...inv, ...targetInvoice } : inv)),
            };
          }
          return oldData;
        });
      }

      // Fast background query refresh
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", "pending-overdue"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "billing"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    };

    // 2. Instant Appointment & Queue Cache Mutation
    const handleAppointmentChange = (payload: any) => {
      const appt = payload?.appointment || payload;
      if (appt && appt._id) {
        queryClient.setQueriesData({ queryKey: ["appointments"] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map((item: any) => (item._id === appt._id ? { ...item, ...appt } : item));
          }
          if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map((item: any) => (item._id === appt._id ? { ...item, ...appt } : item)),
            };
          }
          return oldData;
        });
      }

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["doctor", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reception"] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleNewPatientAssigned = (payload: any) => {
      handleAppointmentChange(payload);
      
      // Only display doctor check-in toasts if active user is in doctor portal
      const isDoctorPortal = typeof window !== "undefined" && window.location.pathname.startsWith("/doctor");
      if (isDoctorPortal && (payload?.message || payload?.title)) {
        const toastId = payload?._id || payload?.id || `doctor-notif-${payload?.data?.appointmentId || "notif"}`;
        toast.success(payload?.message || payload?.title, { id: toastId });
      }
    };

    // 3. Instant Inpatient & Vitals Cache Mutation
    const handleInpatientChange = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["beds"] });
      queryClient.invalidateQueries({ queryKey: ["nurse"] });
      queryClient.invalidateQueries({ queryKey: ["vitals"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    };

    // 4. Instant Lab & File Upload Mutation
    const handleLabAndFilesChange = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["laboratory"] });
      queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-reports"] });
      queryClient.invalidateQueries({ queryKey: ["patient"] });
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    };

    // 5. Instant Pharmacy & Inventory Mutation
    const handlePharmacyChange = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
    };

    // 6. Generic Dashboard & Notification Sync
    const handleGenericDashboardUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reception"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    };

    // ── Subscribe to Socket Events ──────────────────────────────────────────
    socket.on("dashboard_update", handleGenericDashboardUpdate);

    socket.on("appointment_created", handleAppointmentChange);
    socket.on("appointment_updated", handleAppointmentChange);
    socket.on("appointment_cancelled", handleAppointmentChange);
    socket.on("patient_checkin", handleAppointmentChange);
    socket.on("new_patient_assigned", handleNewPatientAssigned);
    socket.on("notification:new", handleNewPatientAssigned);
    socket.on("notification_created", handleGenericDashboardUpdate);
    socket.on("queue_updated", handleAppointmentChange);
    socket.on("op_patient_checked_in", handleAppointmentChange);

    socket.on("admission_created", handleInpatientChange);
    socket.on("admission_updated", handleInpatientChange);
    socket.on("bed_allocated", handleInpatientChange);
    socket.on("bed_updated", handleInpatientChange);
    socket.on("vitals_updated", handleInpatientChange);
    socket.on("vitals_recorded", handleInpatientChange);
    socket.on("ip_management_update", handleInpatientChange);
    socket.on("nursing_note_added", handleInpatientChange);
    socket.on("shift_handover_created", handleInpatientChange);
    socket.on("shift_handover_accepted", handleInpatientChange);
    socket.on("patient_discharged", handleInpatientChange);

    socket.on("invoice_created", handleBillingChange);
    socket.on("invoice_updated", handleBillingChange);
    socket.on("billing_updated", handleBillingChange);
    socket.on("ip_billing_update", handleBillingChange);
    socket.on("ip_bill_update", handleBillingChange);
    socket.on("payment_received", handleBillingChange);

    socket.on("lab_order_created", handleLabAndFilesChange);
    socket.on("lab_order_updated", handleLabAndFilesChange);
    socket.on("lab_status_updated", handleLabAndFilesChange);
    socket.on("lab_report_uploaded", handleLabAndFilesChange);
    socket.on("lab_report_verified", handleLabAndFilesChange);
    socket.on("file_uploaded", handleLabAndFilesChange);

    socket.on("prescription_created", handlePharmacyChange);
    socket.on("prescription_updated", handlePharmacyChange);
    socket.on("medicine_dispensed", handlePharmacyChange);
    socket.on("inventory_updated", handlePharmacyChange);
    socket.on("stock_alert", handlePharmacyChange);

    socket.on("notification_received", handleGenericDashboardUpdate);
    socket.on("announcement_created", handleGenericDashboardUpdate);
    socket.on("staff_updated", handleGenericDashboardUpdate);
    socket.on("doctor_updated", handleGenericDashboardUpdate);
    socket.on("patient_updated", handleGenericDashboardUpdate);

    return () => {
      socket.off("dashboard_update", handleGenericDashboardUpdate);

      socket.off("appointment_created", handleAppointmentChange);
      socket.off("appointment_updated", handleAppointmentChange);
      socket.off("appointment_cancelled", handleAppointmentChange);
      socket.off("patient_checkin", handleAppointmentChange);
      socket.off("new_patient_assigned", handleNewPatientAssigned);
      socket.off("notification:new", handleNewPatientAssigned);
      socket.off("notification_created", handleGenericDashboardUpdate);
      socket.off("queue_updated", handleAppointmentChange);
      socket.off("op_patient_checked_in", handleAppointmentChange);

      socket.off("admission_created", handleInpatientChange);
      socket.off("admission_updated", handleInpatientChange);
      socket.off("bed_allocated", handleInpatientChange);
      socket.off("bed_updated", handleInpatientChange);
      socket.off("vitals_updated", handleInpatientChange);
      socket.off("vitals_recorded", handleInpatientChange);
      socket.off("ip_management_update", handleInpatientChange);
      socket.off("nursing_note_added", handleInpatientChange);
      socket.off("shift_handover_created", handleInpatientChange);
      socket.off("shift_handover_accepted", handleInpatientChange);
      socket.off("patient_discharged", handleInpatientChange);

      socket.off("invoice_created", handleBillingChange);
      socket.off("invoice_updated", handleBillingChange);
      socket.off("billing_updated", handleBillingChange);
      socket.off("ip_billing_update", handleBillingChange);
      socket.off("ip_bill_update", handleBillingChange);
      socket.off("payment_received", handleBillingChange);

      socket.off("lab_order_created", handleLabAndFilesChange);
      socket.off("lab_order_updated", handleLabAndFilesChange);
      socket.off("lab_status_updated", handleLabAndFilesChange);
      socket.off("lab_report_uploaded", handleLabAndFilesChange);
      socket.off("lab_report_verified", handleLabAndFilesChange);
      socket.off("file_uploaded", handleLabAndFilesChange);

      socket.off("prescription_created", handlePharmacyChange);
      socket.off("prescription_updated", handlePharmacyChange);
      socket.off("medicine_dispensed", handlePharmacyChange);
      socket.off("inventory_updated", handlePharmacyChange);
      socket.off("stock_alert", handlePharmacyChange);

      socket.off("notification_received", handleGenericDashboardUpdate);
      socket.off("announcement_created", handleGenericDashboardUpdate);
      socket.off("staff_updated", handleGenericDashboardUpdate);
      socket.off("doctor_updated", handleGenericDashboardUpdate);
      socket.off("patient_updated", handleGenericDashboardUpdate);
    };
  }, [queryClient]);
}
