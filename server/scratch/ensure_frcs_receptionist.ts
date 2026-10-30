import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function ensureFRCSUser() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const hospital = await db.collection("hospitals").findOne({});
  const frcsBranch = await db.collection("branches").findOne({ name: /Ameerpet/i });

  if (!hospital || !frcsBranch) {
    console.error("Hospital or Branch not found.");
    process.exit(1);
  }

  const pass123 = await bcrypt.hash("receptionist@123", 10);

  const res = await db.collection("users").updateOne(
    { email: "receptionist@frcs.com" },
    {
      $set: {
        name: "Receptionist FRCS",
        email: "receptionist@frcs.com",
        passwordHash: pass123,
        role: "receptionist",
        hospital: hospital._id,
        branch: frcsBranch._id,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log("✓ Ensured receptionist@frcs.com in DB with branch:", frcsBranch._id);
  await mongoose.disconnect();
}

ensureFRCSUser().catch(console.error);
