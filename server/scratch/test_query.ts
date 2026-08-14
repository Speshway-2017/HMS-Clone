import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const hospitalFilter = { hospital: new mongoose.Types.ObjectId("6a7420cc7a91fcd2e80b14bb"), branch: null };

  const query: any = {
    hospital: hospitalFilter.hospital,
    $or: [{ branch: null }, { branch: { $exists: false } }],
    status: {
      $in: [
        "admitted",
        "Admitted",
        "Bed Allocated",
        "Under Observation",
        "Waiting for Bed",
        "In Ward",
        "ICU",
        "Operation Scheduled",
        "Under Treatment",
        "Transferred"
      ]
    }
  };

  const results = await db.collection("admissions").find(query).toArray();
  console.log("QueryResult count:", results.length);
  console.log("QueryResult admissions:", results.map(r => ({
    _id: r._id,
    admissionNumber: r.admissionNumber,
    patient: r.patient,
    room: r.room,
    bed: r.bed,
    status: r.status
  })));

  await mongoose.disconnect();
}
check();
