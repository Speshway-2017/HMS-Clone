import { Staff } from "../models/Staff";
import { User } from "../models/User";
import { Doctor } from "../models/Doctor";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { Department } from "../models/Department";

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
  if (clean.includes("nur")) return "NUR";
  if (clean.includes("recep") || clean.includes("front")) return "REC";
  if (clean.includes("pharm")) return "PHM";
  if (clean.includes("lab")) return "LAB";
  if (clean.includes("radio") || clean.includes("scan")) return "RAD";
  if (clean.includes("account") || clean.includes("bill")) return "ACC";
  if (clean.includes("admin")) return "ADM";
  if (clean.includes("staf")) return "STF";
  return clean.substring(0, 3).toUpperCase() || "STF";
}

export function getPersonInitials(name?: string): string {
  if (!name || !name.trim()) return "";
  // Strip doctor/salutation prefixes: Dr., Mr., Mrs., Ms., Prof.
  const cleanName = name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase().replace(/[^A-Z]/g, "X");
  }
  const first = parts[0][0].toUpperCase().replace(/[^A-Z]/g, "X");
  const last = parts[parts.length - 1][0].toUpperCase().replace(/[^A-Z]/g, "X");
  return `${first}${last}`;
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
 * Generates composite ID encoding Hospital, Role, and Person:
 * Format: <HOSP_CODE>-<ROLE_CODE>-<INITIALS><SEQ> (e.g. HOSP-001-DOC-PD01 or HOSP-001-NUR-RS01)
 * Fallback without name: <HOSP_CODE>-<ROLE_CODE>-001
 * For independent admins, returns ADM-001.
 */
export async function generateUniqueEmployeeId(
  role: string,
  hospitalId?: any,
  branchId?: any,
  personName?: string
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

  const initials = getPersonInitials(personName);

  // If person initials exist, form prefix: <HOSP>-<ROLE>-<INITIALS> (e.g. HOSP-001-DOC-PD)
  // Else fallback to <HOSP>-<ROLE> (e.g. HOSP-001-DOC)
  if (initials) {
    const basePrefix = `${hospCode}-${rolePrefix}-${initials}`;
    let seq = 1;
    let candidate = `${basePrefix}${String(seq).padStart(2, "0")}`;

    while (
      (await Staff.exists({ employeeId: candidate })) ||
      (await User.exists({ employeeId: candidate })) ||
      (await Doctor.exists({ $or: [{ licenseNo: candidate }, { employeeId: candidate }] }))
    ) {
      seq++;
      candidate = `${basePrefix}${String(seq).padStart(2, "0")}`;
    }

    return candidate;
  }

  // 2. Base sequential prefix: e.g. HOSP-001-DOC-001
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

export function getDepartmentPrefix(name?: string): string {
  if (!name || !name.trim()) return "DEP";
  const clean = name.replace(/^(department of|dept of|dept\.?)\s+/i, "").trim();
  const words = clean.split(/[\s&/,\.-]+/).filter(Boolean);
  if (words.length === 0) return "DEP";
  if (words.length === 1) {
    const w = words[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
    return w.slice(0, 4) || "DEP";
  }
  const initials = words.map((w) => w[0]).join("").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (initials.length >= 2 && initials.length <= 4) {
    return initials;
  }
  return words[0].slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "") || "DEP";
}

export async function generateUniqueDepartmentCode(
  hospitalId?: any,
  branchId?: any,
  departmentName?: string
): Promise<string> {
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

  const deptPrefix = getDepartmentPrefix(departmentName);
  const basePrefix = `${hospCode}-${deptPrefix}`;
  const regex = new RegExp(`^${basePrefix}-(\\d+)`, "i");

  const query: any = { code: regex };
  if (hospitalId) query.hospital = hospitalId;

  const existingDepts = await Department.find(query).select("code");
  let maxNum = 0;
  for (const d of existingDepts) {
    const match = d.code?.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${basePrefix}-${String(nextNum).padStart(3, "0")}`;

  while (await Department.exists({ code: candidate })) {
    nextNum++;
    candidate = `${basePrefix}-${String(nextNum).padStart(3, "0")}`;
  }

  return candidate;
}
