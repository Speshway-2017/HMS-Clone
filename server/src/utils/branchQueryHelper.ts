import { Types } from "mongoose";

/**
 * Builds a resilient MongoDB query object for hospital and branch scoping.
 * 
 * - If `hospitalFilter.branch` is a specific branch ID (e.g. `BRANCH_B_ID`), matches ONLY `branch: BRANCH_B_ID`.
 * - If `hospitalFilter.branch` is `null` (Main Hospital), matches ONLY `branch: null` or `{ branch: { $exists: false } }`.
 * - If `hospitalFilter` has no `branch` property (e.g. admin "all branches" view), matches all records for the hospital.
 */
export function buildBranchQuery(hospitalFilter: any): Record<string, unknown> {
  if (!hospitalFilter) {
    return { hospital: null };
  }

  if (typeof hospitalFilter !== "object" || hospitalFilter instanceof Types.ObjectId) {
    return { hospital: hospitalFilter };
  }

  // If passed tenantContext object with queryFilter
  if (hospitalFilter.queryFilter) {
    return hospitalFilter.queryFilter;
  }

  if (!hospitalFilter.hospital) {
    return { hospital: null };
  }

  const query: Record<string, unknown> = {
    hospital: hospitalFilter.hospital,
  };

  if ("branch" in hospitalFilter) {
    if (hospitalFilter.branch !== null && hospitalFilter.branch !== undefined) {
      query.branch = hospitalFilter.branch;
    } else {
      query.$or = [
        { branch: null },
        { branch: { $exists: false } },
      ];
    }
  }

  return query;
}

export function parseHospitalAndBranch(filterOrId: any): { targetHospital: any; targetBranch: any } {
  if (!filterOrId) return { targetHospital: null, targetBranch: null };

  if (typeof filterOrId === "object") {
    if (filterOrId.queryFilter) {
      return {
        targetHospital: filterOrId.queryFilter.hospital,
        targetBranch: "branch" in filterOrId.queryFilter ? filterOrId.queryFilter.branch : (filterOrId.branchId || null),
      };
    }
    if (filterOrId.hospital) {
      return {
        targetHospital: filterOrId.hospital,
        targetBranch: "branch" in filterOrId ? filterOrId.branch : (filterOrId.branchId || null),
      };
    }
    if (filterOrId.hospitalId) {
      return {
        targetHospital: filterOrId.hospitalId,
        targetBranch: filterOrId.branchId || filterOrId.branch || null,
      };
    }
  }

  return { targetHospital: filterOrId, targetBranch: null };
}
