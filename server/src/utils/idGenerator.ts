import { Staff } from "../models/Staff";
import { User } from "../models/User";
import { Doctor } from "../models/Doctor";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";

function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

export function generateBranchId(): string {
  return `BR-${randomDigits(5)}`;
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function getRolePrefix(role: string): string {
  const clean = (role || "").toLowerCase().trim();
  if (clean.includes("doc")) return "DOC";
  if (clean.includes("nur") || clean.includes("staff")) return "STF";
  if (clean.includes("recep")) return "REC";
  if (clean.includes("pharm")) return "PHM";
  if (clean.includes("lab")) return "LAB";
  if (clean.includes("radio")) return "RAD";
  if (clean.includes("admin")) return "ADM";
  return clean.substring(0, 3).toUpperCase() || "EMP";
}

/**
 * Generates the next sequential Unique Hospital ID (e.g. HOSP-001, HOSP-002).
 */
export async function generateNextHospitalId(): Promise<string> {
  const hospitals = await Hospital.find().select("code");
  let maxNum = 0;

  for (const h of hospitals) {
    if (h.code) {
      const match = h.code.match(/(\d+)$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `HOSP-${String(nextNum).padStart(3, "0")}`;

  while (await Hospital.exists({ code: candidate })) {
    nextNum++;
    candidate = `HOSP-${String(nextNum).padStart(3, "0")}`;
  }

  return candidate;
}

/**
 * Generates the next sequential Unique Administrator ID (e.g. ADM-001, ADM-002).
 */
export async function generateNextAdminId(): Promise<string> {
  const users = await User.find({
    $or: [{ role: { $in: ["admin", "hospital_admin"] } }, { employeeId: /^ADM-/i }],
  }).select("employeeId");

  let maxNum = 0;
  for (const u of users) {
    if (u.employeeId) {
      const match = u.employeeId.match(/(\d+)$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `ADM-${String(nextNum).padStart(3, "0")}`;

  while (await User.exists({ employeeId: candidate })) {
    nextNum++;
    candidate = `ADM-${String(nextNum).padStart(3, "0")}`;
  }

  return candidate;
}

/**
 * Generates derived staff IDs based on Hospital ID:
 * e.g. <HOSP_CODE>-DOC-001, <HOSP_CODE>-STF-001, <HOSP_CODE>-REC-001, <HOSP_CODE>-PHM-001.
 * For independent admins, returns ADM-001.
 */
export async function generateUniqueEmployeeId(
  role: string,
  hospitalId?: any,
  branchId?: any
): Promise<string> {
  const rolePrefix = getRolePrefix(role);

  // If role is Admin, use dedicated Admin ID sequence
  if (rolePrefix === "ADM") {
    return generateNextAdminId();
  }

  // 1. Resolve Hospital Unique Code / ID
  let hospCode = "HOSP-001";
  if (hospitalId) {
    try {
      const hosp = await Hospital.findById(hospitalId).select("code name");
      if (hosp) {
        if (hosp.code && hosp.code.trim()) {
          hospCode = hosp.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
        } else if (hosp.name && hosp.name.trim()) {
          hospCode = hosp.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Base prefix: e.g. HOSP-001-DOC or HOSP-001-STF
  const prefix = `${hospCode}-${rolePrefix}`;
  const regex = new RegExp(`^${prefix}-(\\d+)`, "i");

  const [existingStaff, existingUsers, existingDoctors] = await Promise.all([
    Staff.find({ employeeId: regex }).select("employeeId"),
    User.find({ employeeId: regex }).select("employeeId"),
    Doctor.find({
      $or: [{ licenseNo: regex }, { employeeId: regex }],
    }).select("licenseNo employeeId"),
  ]);

  let maxNum = 0;
  for (const s of [...existingStaff, ...existingUsers]) {
    const match = s.employeeId?.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  for (const d of existingDoctors) {
    const match = (d.licenseNo || (d as any).employeeId)?.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${prefix}-${String(nextNum).padStart(3, "0")}`;

  while (
    (await Staff.exists({ employeeId: candidate })) ||
    (await User.exists({ employeeId: candidate })) ||
    (await Doctor.exists({ $or: [{ licenseNo: candidate }, { employeeId: candidate }] }))
  ) {
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(3, "0")}`;
  }

  return candidate;
}

export async function generateUniqueHospitalCode(name?: string): Promise<string> {
  return generateNextHospitalId();
}
