import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const collections = ["admissions", "invoices", "payments", "appointments", "opvisits", "queues", "rooms", "beds"];

  for (const colName of collections) {
    const docs = await db.collection(colName).find({ branch: null }).toArray();
    console.log(`\n=== Collection ${colName} (branch: null) count: ${docs.length} ===`);
    let needsBranchCount = 0;
    for (const d of docs) {
      let branchToAssign = null;
      if (d.doctor || d.admittingDoctor) {
        const doc = await db.collection("doctors").findOne({ _id: d.doctor || d.admittingDoctor });
        if (doc && doc.branch) branchToAssign = doc.branch;
      }
      if (!branchToAssign && d.patient) {
        const pat = await db.collection("patients").findOne({ _id: d.patient });
        if (pat && pat.branch) branchToAssign = pat.branch;
      }
      if (!branchToAssign && d.room) {
        const rm = await db.collection("rooms").findOne({ _id: d.room });
        if (rm && rm.branch) branchToAssign = rm.branch;
      }
      if (branchToAssign) {
        needsBranchCount++;
        console.log(`  Doc ID ${d._id} (${colName}): can inherit branch -> ${branchToAssign}`);
      }
    }
    console.log(`Summary ${colName}: ${needsBranchCount} docs can inherit branch from doctor/patient/room.`);
  }

  await mongoose.disconnect();
}
check();
