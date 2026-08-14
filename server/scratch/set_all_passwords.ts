import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function setAllPasswords() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const pass123 = await bcrypt.hash("receptionist@123", 10);
  const adminPass = await bcrypt.hash("admin123", 10);

  // Update receptionist accounts
  await db.collection("users").updateMany(
    { email: { $in: ["receptionist@hms.com", "receptionist@frcs.com", "receptionist@cms.com"] } },
    { $set: { passwordHash: pass123, status: "active" } }
  );

  // Update admin accounts
  await db.collection("users").updateMany(
    { email: { $in: ["admin@hms.com", "admin@frcs.com"] } },
    { $set: { passwordHash: adminPass, status: "active" } }
  );

  console.log("✓ Updated accounts passwords");
  await mongoose.disconnect();
}

setAllPasswords().catch(console.error);
