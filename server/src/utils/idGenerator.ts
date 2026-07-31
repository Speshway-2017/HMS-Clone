import { Staff } from "../models/Staff";

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

export async function generateUniqueEmployeeId(role: string, hospitalId: any): Promise<string> {
  const prefix = getRolePrefix(role);
  const year = new Date().getFullYear();

  const regex = new RegExp(`^${prefix}-${year}-(\\d+)`, "i");
  const existingStaff = await Staff.find({
    hospital: hospitalId,
    employeeId: regex,
  }).select("employeeId");

  let maxNum = 0;
  for (const s of existingStaff) {
    const match = s.employeeId?.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;

  while (await Staff.exists({ hospital: hospitalId, employeeId: candidate })) {
    nextNum++;
    candidate = `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;
  }

  return candidate;
}
