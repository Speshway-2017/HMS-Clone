import { Department } from "../models/Department";
import { Branch } from "../models/Branch";

/**
 * Inherit active parent hospital departments for a specific branch.
 */
export async function syncBranchDepartmentsForBranch(branchId: string | object, hospitalId: string | object) {
  const parentDepts = await Department.find({
    hospital: hospitalId,
    branch: null,
    isDisabled: { $ne: true },
  });

  for (const parentDept of parentDepts) {
    const existing = await Department.findOne({
      hospital: hospitalId,
      branch: branchId,
      $or: [
        { parentDepartment: parentDept._id },
        { name: { $regex: `^${parentDept.name.trim()}$`, $options: "i" } },
      ],
    });

    if (!existing) {
      await Department.create({
        hospital: hospitalId,
        branch: branchId,
        parentDepartment: parentDept._id,
        name: parentDept.name,
        code: parentDept.code ? `${parentDept.code}-${String(branchId).slice(-4)}` : "",
        description: parentDept.description,
        specialization: parentDept.specialization,
        category: parentDept.category,
        consultationFee: parentDept.consultationFee,
        isEmergency: parentDept.isEmergency,
        colorTheme: parentDept.colorTheme,
        displayOrder: parentDept.displayOrder,
        status: parentDept.status,
        isDisabled: false,
        isBranchCustomized: false,
        isBranchOnly: false,
      });
    }
  }
}

/**
 * Sync all branches across all hospitals to ensure no branch is missing parent departments.
 */
export async function syncAllBranchDepartments() {
  try {
    const activeBranches = await Branch.find({ status: "active" });
    for (const branch of activeBranches) {
      await syncBranchDepartmentsForBranch(branch._id, branch.hospital);
    }
  } catch (err) {
    console.error("Error in syncAllBranchDepartments:", err);
  }
}
