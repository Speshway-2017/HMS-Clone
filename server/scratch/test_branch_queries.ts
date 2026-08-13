import mongoose from "mongoose";
import dotenv from "dotenv";
import { buildBranchQuery } from "../src/utils/branchQueryHelper";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const hmsFilter = { hospital: new mongoose.Types.ObjectId("6a7420cc7a91fcd2e80b14bb"), branch: null };
  const frcsFilter = { hospital: new mongoose.Types.ObjectId("6a7420cc7a91fcd2e80b14bb"), branch: new mongoose.Types.ObjectId("6a7af34021c9633db292c91c") };

  // HMS Main Hospital admissions query:
  const hmsQuery: any = {
    ...buildBranchQuery(hmsFilter),
    status: { $in: ["admitted", "Admitted"] }
  };
  const hmsAdmissions = await db.collection("admissions").find(hmsQuery).toArray();
  console.log("HMS (Main Hospital) admissions found:", hmsAdmissions.map(a => ({ _id: a._id, IP: a.admissionNumber, branch: a.branch })));

  // FRCS Branch admissions query:
  const frcsQuery: any = {
    ...buildBranchQuery(frcsFilter),
    status: { $in: ["admitted", "Admitted"] }
  };
  const frcsAdmissions = await db.collection("admissions").find(frcsQuery).toArray();
  console.log("FRCS Branch admissions found:", frcsAdmissions.map(a => ({ _id: a._id, IP: a.admissionNumber, branch: a.branch })));

  // Discharged admissions query:
  const hmsDischargedQuery: any = {
    ...buildBranchQuery(hmsFilter),
    status: { $in: ["discharged", "Discharged"] }
  };
  const hmsDischarged = await db.collection("admissions").find(hmsDischargedQuery).toArray();
  console.log("HMS (Main Hospital) discharged admissions found:", hmsDischarged.map(a => ({ _id: a._id, IP: a.admissionNumber, branch: a.branch })));

  const frcsDischargedQuery: any = {
    ...buildBranchQuery(frcsFilter),
    status: { $in: ["discharged", "Discharged"] }
  };
  const frcsDischarged = await db.collection("admissions").find(frcsDischargedQuery).toArray();
  console.log("FRCS Branch discharged admissions found:", frcsDischarged.map(a => ({ _id: a._id, IP: a.admissionNumber, branch: a.branch })));

  await mongoose.disconnect();
}
check();
