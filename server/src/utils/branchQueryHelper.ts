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

/**
 * Safely combines a hospital/branch query with an additional query object.
 * Prevents property overwrites when both queries contain `$or` clauses (e.g. branch filter $or vs date/search $or).
 */
export function combineBranchQuery(hospitalFilter: any, additionalQuery: Record<string, any> = {}): Record<string, unknown> {
  const branchQuery = buildBranchQuery(hospitalFilter);

  if (!additionalQuery || Object.keys(additionalQuery).length === 0) {
    return branchQuery;
  }

  if (branchQuery.$or && additionalQuery.$or) {
    const { $or: branchOr, ...branchRest } = branchQuery as any;
    const { $or: addOr, ...addRest } = additionalQuery as any;
    return {
      ...branchRest,
      ...addRest,
      $and: [
        { $or: branchOr },
        { $or: addOr }
      ]
    };
  }

  return {
    ...branchQuery,
    ...additionalQuery
  };
}

export function parseHospitalAndBranch(filterOrId: any): { targetHospital: any; targetBranch: any } {
  if (!filterOrId) return { targetHospital: null, targetBranch: null };
  if (typeof filterOrId === "object" && filterOrId.hospital) {
    return {
      targetHospital: filterOrId.hospital,
      targetBranch: "branch" in filterOrId ? filterOrId.branch : null,
    };
  }
  return { targetHospital: filterOrId, targetBranch: null };
}
