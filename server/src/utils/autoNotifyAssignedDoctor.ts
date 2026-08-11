import { Types } from "mongoose";
import { Admission } from "../models/Admission";
import { OPVisit } from "../models/OPVisit";
import { Appointment } from "../models/Appointment";
import { Patient } from "../models/Patient";
import { createDoctorNotification } from "./notificationHelper";

interface AutoNotifyOptions {
  hospitalId: Types.ObjectId | string;
  patientId: Types.ObjectId | string;
  patientName: string;
  uhid?: string;
  nurseName: string;
  title: string;
  message: string;
  type?: "admission_request" | "appointment" | "inventory" | "invoice" | "general";
  severity?: "info" | "warning" | "critical";
  link?: string;
  extraData?: any;
}

/**
 * Automatically finds the assigned doctor for a patient and sends a targeted,
 * real-time WebSockets & DB notification strictly to that doctor.
 */
export async function notifyAssignedDoctorForPatient(options: AutoNotifyOptions) {
  try {
    let assignedDoctorId: Types.ObjectId | string | null = null;
    let wardName = "General Ward";
    let bedNumber = "N/A";
    let roomNumber = "N/A";

    // 1. Check active inpatient admission
    const activeAdmission = await Admission.findOne({
      hospital: options.hospitalId,
      patient: options.patientId,
      status: { $in: ["admitted", "Admitted", "Under Observation", "Under Treatment", "In Ward", "ICU", "Bed Allocated"] }
    })
      .populate("room", "roomNumber category")
      .populate("bed", "bedNumber");

    if (activeAdmission) {
      wardName = activeAdmission.ward || wardName;
      bedNumber = (activeAdmission.bed as any)?.bedNumber || bedNumber;
      roomNumber = (activeAdmission.room as any)?.roomNumber || roomNumber;

      if (activeAdmission.admittingDoctor) {
        assignedDoctorId = activeAdmission.admittingDoctor;
      }
    }

    // 2. Fallback: Check recent OPVisit or Appointment
    if (!assignedDoctorId) {
      const recentVisit = await OPVisit.findOne({ hospital: options.hospitalId, patient: options.patientId }).sort({ date: -1 });
      if (recentVisit && recentVisit.doctor) {
        assignedDoctorId = recentVisit.doctor;
      } else {
        const recentAppt = await Appointment.findOne({ hospital: options.hospitalId, patient: options.patientId }).sort({ appointmentDate: -1 });
        if (recentAppt && recentAppt.doctor) {
          assignedDoctorId = recentAppt.doctor;
        }
      }
    }

    // 3. Fallback: Check Patient model directly
    if (!assignedDoctorId) {
      const pt = await Patient.findById(options.patientId);
      if (pt && (pt as any).assignedDoctor) {
        assignedDoctorId = (pt as any).assignedDoctor;
      }
    }

    if (!assignedDoctorId) {
      console.log(`[AutoNotifyDoctor] No assigned doctor found for Patient ${options.patientName} (${options.patientId})`);
      return null;
    }

    const payloadData = {
      patientId: options.patientId.toString(),
      patientName: options.patientName,
      uhid: options.uhid || "UHID",
      ward: wardName,
      bedNumber: bedNumber,
      roomNumber: roomNumber,
      nurseName: options.nurseName,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priority: options.severity === "critical" ? "High" : "Normal",
      sound: options.severity === "critical",
      notificationType: options.title,
      status: "Unread",
      ...(options.extraData || {})
    };

    const notification = await createDoctorNotification({
      hospital: options.hospitalId,
      recipientDoctor: assignedDoctorId,
      title: options.title,
      message: options.message,
      type: options.type || "general",
      severity: options.severity || "info",
      link: options.link || `/doctor/ip-management`,
      data: payloadData
    });

    console.log(`✓ [AutoNotifyDoctor] Sent real-time notification to Doctor ${assignedDoctorId} for Patient ${options.patientName}`);
    return notification;
  } catch (err) {
    console.error("[AutoNotifyDoctor] Error sending assigned doctor notification:", err);
    return null;
  }
}

/**
 * Checks vital signs for CRITICAL values and triggers high-priority alerts if thresholds crossed.
 */
export async function checkCriticalVitalsAndNotify(vitals: {
  hospitalId: Types.ObjectId | string;
  patientId: Types.ObjectId | string;
  patientName: string;
  uhid?: string;
  nurseName: string;
  temperature?: string;
  bloodPressure?: string;
  pulseRate?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  bloodSugar?: string;
  painScore?: string;
}) {
  const criticalReasons: string[] = [];

  // 1. Oxygen Saturation (SpO2 < 92%)
  if (vitals.oxygenSaturation) {
    const spo2 = parseFloat(vitals.oxygenSaturation);
    if (!isNaN(spo2) && spo2 < 92) {
      criticalReasons.push(`Low SpO₂: ${vitals.oxygenSaturation}%`);
    }
  }

  // 2. Blood Pressure (Systolic > 160 or < 90, Diastolic > 100 or < 60)
  if (vitals.bloodPressure && vitals.bloodPressure.includes("/")) {
    const parts = vitals.bloodPressure.split("/");
    const sys = parseFloat(parts[0]);
    const dia = parseFloat(parts[1]);
    if (!isNaN(sys) && (sys > 160 || sys < 90)) {
      criticalReasons.push(`Abnormal BP Systolic: ${sys} mmHg`);
    }
    if (!isNaN(dia) && (dia > 100 || dia < 60)) {
      criticalReasons.push(`Abnormal BP Diastolic: ${dia} mmHg`);
    }
  }

  // 3. Temperature (> 101°F or > 38.3°C or < 95°F)
  if (vitals.temperature) {
    const temp = parseFloat(vitals.temperature);
    if (!isNaN(temp)) {
      if (temp > 101 || (temp > 38.3 && temp < 45)) {
        criticalReasons.push(`High Fever Temp: ${vitals.temperature}°`);
      } else if (temp < 95) {
        criticalReasons.push(`Hypothermia Temp: ${vitals.temperature}°`);
      }
    }
  }

  // 4. Pulse Rate (> 120 bpm or < 50 bpm)
  if (vitals.pulseRate) {
    const pulse = parseFloat(vitals.pulseRate);
    if (!isNaN(pulse) && (pulse > 120 || pulse < 50)) {
      criticalReasons.push(`Abnormal Pulse: ${vitals.pulseRate} bpm`);
    }
  }

  // 5. Respiratory Rate (> 24 or < 10)
  if (vitals.respiratoryRate) {
    const resp = parseFloat(vitals.respiratoryRate);
    if (!isNaN(resp) && (resp > 24 || resp < 10)) {
      criticalReasons.push(`Abnormal Resp Rate: ${vitals.respiratoryRate}/min`);
    }
  }

  // 6. Blood Sugar (> 250 mg/dL or < 70 mg/dL)
  if (vitals.bloodSugar) {
    const sugar = parseFloat(vitals.bloodSugar);
    if (!isNaN(sugar) && (sugar > 250 || sugar < 70)) {
      criticalReasons.push(`Critical Blood Sugar: ${vitals.bloodSugar} mg/dL`);
    }
  }

  // 7. Pain Score (>= 8)
  if (vitals.painScore) {
    const pain = parseFloat(vitals.painScore);
    if (!isNaN(pain) && pain >= 8) {
      criticalReasons.push(`Severe Pain Score: ${vitals.painScore}/10`);
    }
  }

  if (criticalReasons.length > 0) {
    // Send CRITICAL HIGH PRIORITY RED ALERT
    return await notifyAssignedDoctorForPatient({
      hospitalId: vitals.hospitalId,
      patientId: vitals.patientId,
      patientName: vitals.patientName,
      uhid: vitals.uhid,
      nurseName: vitals.nurseName,
      title: "Critical Patient Alert",
      message: `CRITICAL ALERT: Patient ${vitals.patientName} requires immediate attention! ${criticalReasons.join("; ")}`,
      severity: "critical",
      extraData: {
        criticalAlert: true,
        reasons: criticalReasons,
        vitalsSummary: `BP: ${vitals.bloodPressure || 'N/A'}, Temp: ${vitals.temperature || 'N/A'}, Pulse: ${vitals.pulseRate || 'N/A'}, SpO2: ${vitals.oxygenSaturation || 'N/A'}%`
      }
    });
  } else {
    // Send Standard Vitals Update Notification
    return await notifyAssignedDoctorForPatient({
      hospitalId: vitals.hospitalId,
      patientId: vitals.patientId,
      patientName: vitals.patientName,
      uhid: vitals.uhid,
      nurseName: vitals.nurseName,
      title: "Patient Vitals Updated",
      message: `Latest patient vitals have been recorded for Patient ${vitals.patientName} by Nurse ${vitals.nurseName}.`,
      severity: "info"
    });
  }
}
