import mongoose from "mongoose";
import dotenv from "dotenv";
import "../src/models/Hospital";
import { Branch } from "../src/models/Branch";
import { getRealtimeStaffCountsForBranches } from "../src/utils/branchStaffHelper";

dotenv.config();

async function testBranchApi() {
  await mongoose.connect(process.env.MONGO_URI as string);

  const rawBranches = await Branch.find({}).populate("hospital", "name").sort({ createdAt: -1 });
  const allMatchingIds = rawBranches.map((b) => b._id);
  const countMap = await getRealtimeStaffCountsForBranches(allMatchingIds);

  const branches = rawBranches.map((b) => {
    const obj = b.toObject();
    const realtimeCount = countMap.get(b._id.toString()) ?? 0;
    obj.totalStaff = realtimeCount;
    return obj;
  });

  let grandTotalStaff = 0;
  for (const cnt of countMap.values()) {
    grandTotalStaff += cnt;
  }

  console.log("=== API RESPONSE SIMULATION ===");
  console.log(`Total Branches: ${branches.length}`);
  console.log(`Grand Total Staff Across Branches: ${grandTotalStaff}`);
  console.log("\nBranches Details:");
  branches.forEach((b) => {
    console.log(` - ID: ${b._id} | Code: ${b.branchId} | Name: ${b.name} | real-time totalStaff: ${b.totalStaff}`);
  });

  await mongoose.disconnect();
}

testBranchApi();
