import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
import { Branch } from "../src/models/Branch";
import { Staff } from "../src/models/Staff";
import { Doctor } from "../src/models/Doctor";
import { User } from "../src/models/User";

dotenv.config();

async function computeRealtimeStaffCounts(branchIds: Types.ObjectId[]): Promise<Map<string, number>> {
  const branchMap = new Map<string, Set<string>>();
  branchIds.forEach(id => branchMap.set(id.toString(), new Set<string>()));

  const [staffDocs, doctorDocs, userDocs] = await Promise.all([
    Staff.find({ branch: { $in: branchIds } }).select("branch _id email name").lean(),
    Doctor.find({
      branch: { $in: branchIds },
      isActive: { $ne: false },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    }).select("branch _id email name user").lean(),
    User.find({
      branch: { $in: branchIds },
      role: { $nin: ["patient", "super_admin"] }
    }).select("branch _id email name").lean(),
  ]);

  staffDocs.forEach(s => {
    if (!s.branch) return;
    const bId = s.branch.toString();
    const set = branchMap.get(bId);
    if (set) {
      const key = (s.email && s.email.trim()) ? s.email.toLowerCase().trim() : ((s.name && s.name.trim()) ? s.name.toLowerCase().trim() : s._id.toString());
      set.add(key);
    }
  });

  doctorDocs.forEach(d => {
    if (!d.branch) return;
    const bId = d.branch.toString();
    const set = branchMap.get(bId);
    if (set) {
      const key = (d.email && d.email.trim()) ? d.email.toLowerCase().trim() : (d.user ? d.user.toString() : ((d.name && d.name.trim()) ? d.name.toLowerCase().trim() : d._id.toString()));
      set.add(key);
    }
  });

  userDocs.forEach(u => {
    if (!u.branch) return;
    const bId = u.branch.toString();
    const set = branchMap.get(bId);
    if (set) {
      const key = (u.email && u.email.trim()) ? u.email.toLowerCase().trim() : ((u.name && u.name.trim()) ? u.name.toLowerCase().trim() : u._id.toString());
      set.add(key);
    }
  });

  const countMap = new Map<string, number>();
  for (const [bId, set] of branchMap.entries()) {
    countMap.set(bId, set.size);
  }
  return countMap;
}

async function test() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const branches = await Branch.find({});
  const countMap = await computeRealtimeStaffCounts(branches.map(b => b._id));

  for (const b of branches) {
    const realtimeCount = countMap.get(b._id.toString()) || 0;
    console.log(`Branch: ${b.name} (${b.branchId}) => Realtime Staff Count: ${realtimeCount}`);
  }

  await mongoose.disconnect();
}

test();
