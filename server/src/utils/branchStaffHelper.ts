import { Types } from "mongoose";
import { Branch } from "../models/Branch";
import { Staff } from "../models/Staff";
import { Doctor } from "../models/Doctor";
import { User } from "../models/User";

/**
 * Calculates real-time total staff (doctors + support staff + staff users) count per branch.
 * Persists the computed counts back to the Branch documents in MongoDB.
 */
export async function getRealtimeStaffCountsForBranches(
  branchIds: (Types.ObjectId | string)[]
): Promise<Map<string, number>> {
  if (!branchIds || branchIds.length === 0) return new Map();

  const objectIds = branchIds.map((id) => (typeof id === "string" ? new Types.ObjectId(id) : id));
  const stringIds = objectIds.map((id) => id.toString());

  const branchMap = new Map<string, Set<string>>();
  stringIds.forEach((id) => branchMap.set(id, new Set<string>()));

  const [staffDocs, doctorDocs, userDocs] = await Promise.all([
    Staff.find({ branch: { $in: objectIds } }).select("branch _id email name").lean(),
    Doctor.find({
      branch: { $in: objectIds },
      isActive: { $ne: false },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    }).select("branch _id email name user").lean(),
    User.find({
      branch: { $in: objectIds },
      role: { $nin: ["patient", "super_admin"] }
    }).select("branch _id email name").lean(),
  ]);

  staffDocs.forEach((s) => {
    if (!s.branch) return;
    const bId = s.branch.toString();
    const set = branchMap.get(bId);
    if (set) {
      const key = (s.email && s.email.trim()) ? s.email.toLowerCase().trim() : ((s.name && s.name.trim()) ? s.name.toLowerCase().trim() : s._id.toString());
      set.add(key);
    }
  });

  doctorDocs.forEach((d) => {
    if (!d.branch) return;
    const bId = d.branch.toString();
    const set = branchMap.get(bId);
    if (set) {
      const key = (d.email && d.email.trim()) ? d.email.toLowerCase().trim() : (d.user ? d.user.toString() : ((d.name && d.name.trim()) ? d.name.toLowerCase().trim() : d._id.toString()));
      set.add(key);
    }
  });

  userDocs.forEach((u) => {
    if (!u.branch) return;
    const bId = u.branch.toString();
    const set = branchMap.get(bId);
    if (set) {
      const key = (u.email && u.email.trim()) ? u.email.toLowerCase().trim() : ((u.name && u.name.trim()) ? u.name.toLowerCase().trim() : u._id.toString());
      set.add(key);
    }
  });

  const countMap = new Map<string, number>();
  const updatePromises: Promise<unknown>[] = [];

  for (const [bId, set] of branchMap.entries()) {
    const realtimeCount = set.size;
    countMap.set(bId, realtimeCount);
    updatePromises.push(
      Branch.updateOne({ _id: new Types.ObjectId(bId) }, { $set: { totalStaff: realtimeCount } })
    );
  }

  await Promise.all(updatePromises);
  return countMap;
}
