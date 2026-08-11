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
  if (clean.includes("nur")) return "NUR";
  if (clean.includes("recep")) return "REC";
  if (clean.includes("lab")) return "LAB";
  if (clean.includes("radio")) return "RAD";
  if (clean.includes("account")) return "ACC";
  if (clean.includes("pharm")) return "PHA";
  if (clean.includes("admin")) return "ADM";
  return clean.substring(0, 3).toUpperCase() || "EMP";
}

export async function generateUniqueEmployeeId(
  role: string,
  hospitalId: any,
  branchId?: any
): Promise<string> {
  const rolePrefix = getRolePrefix(role);
  const year = new Date().getFullYear();

  // 1. Get Hospital Code / Prefix
  let hospCode = "HOSP";
  if (hospitalId) {
    try {
      const hosp = await Hospital.findById(hospitalId).select("code name");
      if (hosp) {
        if (hosp.code && hosp.code.trim()) {
          hospCode = hosp.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        } else if (hosp.name && hosp.name.trim()) {
          hospCode = hosp.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
        }
      }
    } catch (e) {
      // Ignore query or ObjectId errors
    }
  }
  if (!hospCode) hospCode = "HOSP";

  // 2. Get Branch Code / Prefix
  let branchPrefix = "MAIN";
  if (branchId && String(branchId) !== "null" && String(branchId) !== "undefined") {
    try {
      const br = await Branch.findById(branchId).select("branchId name");
      if (br) {
        if (br.branchId && br.branchId.trim()) {
          branchPrefix = br.branchId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        } else if (br.name && br.name.trim()) {
          branchPrefix = br.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
        }
      } else if (typeof branchId === "string" && branchId.length < 12) {
        branchPrefix = branchId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      }
    } catch (e) {
      // Ignore invalid ObjectId errors
    }
  }
  if (!branchPrefix) branchPrefix = "MAIN";

  // 3. Construct ID Prefix: e.g. SPESH-MAIN-ACC or SPESH-BR01-ACC
  const prefix = `${hospCode}-${branchPrefix}-${rolePrefix}`;
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)`, "i");

  // Find existing staff & users with matching prefix
  const existingStaff = await Staff.find({ employeeId: regex }).select("employeeId");
  const existingUsers = await User.find({ employeeId: regex }).select("employeeId");

  let maxNum = 0;
  for (const s of [...existingStaff, ...existingUsers]) {
    const match = s.employeeId?.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;

  // 4. Global Uniqueness Loop across Staff, User, and Doctor collections
  while (
    (await Staff.exists({ employeeId: candidate })) ||
    (await User.exists({ employeeId: candidate })) ||
    (await Doctor.exists({ $or: [{ licenseNo: candidate }, { employeeId: candidate }] }))
  ) {
    nextNum++;
    candidate = `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;
  }

  return candidate;
}

export async function generateUniqueHospitalCode(name: string): Promise<string> {
  const cleanName = (name || "").trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = cleanName.split(/\s+/).filter(Boolean);
  
  let baseCode = "";
  if (words.length > 0) {
    baseCode = words[0].toUpperCase();
    if (baseCode.length > 6) {
      baseCode = baseCode.slice(0, 6);
    }
  }
  if (!baseCode || baseCode.length < 3) {
    baseCode = "HOSP";
  }

  const regex = new RegExp(`^${baseCode}-(\\d+)`, "i");

  const existingHospitals = await Hospital.find({
    $or: [
      { code: new RegExp(`^${baseCode}`, "i") },
      { code: regex }
    ]
  }).select("code");

  let maxNum = 0;
  for (const h of existingHospitals) {
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
  let candidate = `${baseCode}-${String(nextNum).padStart(2, "0")}`;

  while (await Hospital.exists({ code: candidate })) {
    nextNum++;
    candidate = `${baseCode}-${String(nextNum).padStart(2, "0")}`;
  }

  return candidate;
}


