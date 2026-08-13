import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  console.log("=== ROOMS ===");
  const rooms = await db.collection("rooms").find({}).toArray();
  for (const r of rooms) {
    console.log(`Room ID: ${r._id} | Room Number: ${r.roomNumber} | Ward: ${r.wardName} | Branch: ${r.branch}`);
  }

  console.log("\n=== BEDS ===");
  const beds = await db.collection("beds").find({}).toArray();
  for (const b of beds) {
    console.log(`Bed ID: ${b._id} | Bed Number: ${b.bedNumber} | Room ID: ${b.room} | isOccupied: ${b.isOccupied} | Branch: ${b.branch}`);
  }

  await mongoose.disconnect();
}
check();
