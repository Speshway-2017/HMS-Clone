import { UserDocument } from "../models/User";
import { Attendance } from "../models/Attendance";
import { Staff } from "../models/Staff";
import { Doctor } from "../models/Doctor";
import { Shift } from "../models/Shift";
import { AuditLog } from "../models/AuditLog";
import { emitToHospital } from "../config/socket";

/**
 * Format Date object to HH:mm AM/PM string
 */
function formatTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hoursStr}:${minutesStr} ${ampm}`;
}

/**
 * Convert time string like "09:00 AM" to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Handle automatic attendance creation on employee login
 */
export async function handleAutoAttendanceOnLogin(user: UserDocument, reqInfo?: { ip?: string; userAgent?: string }) {
  try {
    if (!user || user.role === "patient" || !user.hospital) {
      return; // Only process hospital employees
    }

    const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const hospitalId = user.hospital;

    // Find employee master profile (Staff or Doctor)
    let empRef: any = null;
    let empType: "Staff" | "Doctor" = "Staff";
    let employeeId = user.employeeId || "";
    let employeeName = user.name;
    let designation: string = user.role;
    let department = null;
    let branch = null;
    let defaultShift = "General";

    if (user.role === "doctor") {
      empType = "Doctor";
      empRef = await Doctor.findOne({ email: user.email, hospital: hospitalId });
      if (empRef) {
        employeeId = empRef.licenseNo || employeeId || `DOC-${String(empRef._id).slice(-5).toUpperCase()}`;
        designation = empRef.specialization ? `Doctor (${empRef.specialization})` : "Doctor";
        department = empRef.department;
        branch = empRef.branch;
        defaultShift = empRef.shift || "General";
      }
    } else {
      empRef = await Staff.findOne({ email: user.email, hospital: hospitalId }) || await Staff.findOne({ employeeId: user.employeeId, hospital: hospitalId });
      if (empRef) {
        employeeId = empRef.employeeId || employeeId || `STF-${String(empRef._id).slice(-5).toUpperCase()}`;
        designation = empRef.role || user.role;
        department = empRef.department;
        branch = empRef.branch;
        defaultShift = empRef.shift || "General";
      }
    }

    if (!employeeId) {
      employeeId = `EMP-${String(user._id).slice(-6).toUpperCase()}`;
    }

    // Check if an attendance record ALREADY EXISTS for today to prevent duplicate attendance
    const existing = await Attendance.findOne({
      hospital: hospitalId,
      employeeId,
      date: todayDate,
    });

    const now = new Date();
    const checkInTimeStr = formatTime12h(now);

    // Look up shift settings if available
    const shiftDoc = await Shift.findOne({ hospital: hospitalId, name: defaultShift });
    const shiftStartTime = shiftDoc ? shiftDoc.startTime : "09:00 AM";
    const graceMinutes = shiftDoc ? shiftDoc.gracePeriodMinutes : 15;

    const loginMinutes = timeToMinutes(checkInTimeStr);
    const shiftStartMinutes = timeToMinutes(shiftStartTime);
    const isLate = loginMinutes > shiftStartMinutes + graceMinutes;
    const lateMinutes = isLate ? loginMinutes - shiftStartMinutes : 0;

    if (!existing) {
      // Create new attendance record automatically
      const newAttendance = await Attendance.create({
        hospital: hospitalId,
        branch,
        department,
        employeeRef: empRef ? empRef._id : user._id,
        employeeType: empType,
        employeeId,
        employeeName,
        designation,
        shift: defaultShift,
        shiftRef: shiftDoc ? shiftDoc._id : null,
        date: todayDate,
        checkInTime: checkInTimeStr,
        checkOutTime: "",
        workingHours: 8,
        overtimeHours: 0,
        isLate,
        lateMinutes,
        status: isLate ? "Present" : "Present",
        attendanceSource: "Automatic Login",
        markedBy: user._id,
        remarks: isLate ? `Late login by ${lateMinutes} mins` : "On-time login",
      });

      // Audit Log
      await AuditLog.create({
        hospital: hospitalId,
        user: user._id,
        userEmail: user.email,
        userRole: user.role as any,
        action: "Attendance Created via Login",
        entity: "Attendance",
        entityId: String(newAttendance._id),
        details: {
          employeeId,
          employeeName,
          date: todayDate,
          checkInTime: checkInTimeStr,
          isLate,
          lateMinutes,
        },
      });

      // Real-time Socket.IO emission to Admin Staff Attendance Dashboard
      emitToHospital(hospitalId, "attendance:updated", {
        type: "ATTENDANCE_LOGIN",
        attendance: newAttendance,
        timestamp: new Date(),
      });
    } else {
      // If record exists (e.g. absent/unmarked), update checkInTime if missing
      if (!existing.checkInTime || existing.checkInTime === "-") {
        existing.checkInTime = checkInTimeStr;
        existing.isLate = isLate;
        existing.lateMinutes = lateMinutes;
        if (existing.status === "Absent") {
          existing.status = "Present";
        }
        await existing.save();

        emitToHospital(hospitalId, "attendance:updated", {
          type: "ATTENDANCE_LOGIN_UPDATE",
          attendance: existing,
          timestamp: new Date(),
        });
      }
    }
  } catch (err) {
    console.error("Auto attendance login error:", err);
  }
}

/**
 * Handle automatic check-out on employee logout
 */
export async function handleAutoCheckoutOnLogout(user: UserDocument) {
  try {
    if (!user || user.role === "patient" || !user.hospital) {
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const hospitalId = user.hospital;
    const employeeId = user.employeeId || `EMP-${String(user._id).slice(-6).toUpperCase()}`;

    const attendance = await Attendance.findOne({
      hospital: hospitalId,
      employeeId,
      date: todayDate,
    });

    if (attendance && attendance.checkInTime) {
      const now = new Date();
      const checkOutTimeStr = formatTime12h(now);

      const inMins = timeToMinutes(attendance.checkInTime);
      const outMins = timeToMinutes(checkOutTimeStr);

      let totalMins = outMins - inMins;
      if (totalMins < 0) {
        // Crosses midnight (night shift)
        totalMins += 24 * 60;
      }

      const workingHours = Number((totalMins / 60).toFixed(1));
      const overtimeHours = Number(Math.max(0, workingHours - 8).toFixed(1));

      let status = attendance.status;
      if (workingHours >= 8) {
        status = "Present";
      } else if (workingHours >= 4 && workingHours < 8) {
        status = "Half Day";
      } else if (workingHours < 4) {
        status = "Absent";
      }

      attendance.checkOutTime = checkOutTimeStr;
      attendance.workingHours = workingHours;
      attendance.overtimeHours = overtimeHours;
      attendance.status = status;
      await attendance.save();

      // Audit Log
      await AuditLog.create({
        hospital: hospitalId,
        user: user._id,
        userEmail: user.email,
        userRole: user.role as any,
        action: "Attendance Updated via Logout",
        entity: "Attendance",
        entityId: String(attendance._id),
        details: {
          employeeId,
          checkOutTime: checkOutTimeStr,
          workingHours,
          status,
        },
      });

      // Socket.IO emission
      emitToHospital(hospitalId, "attendance:updated", {
        type: "ATTENDANCE_LOGOUT",
        attendance,
        timestamp: new Date(),
      });
    }
  } catch (err) {
    console.error("Auto attendance logout error:", err);
  }
}
