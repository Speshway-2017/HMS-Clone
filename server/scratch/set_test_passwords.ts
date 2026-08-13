import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function setTestPasswords() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const passwordHash = await bcrypt.hash("admin123", 10);

  const res1 = await db.collection("users").updateOne(
    { email: "receptionist@frcs.com" },
    { $set: { passwordHash, status: "active" } }
  );
  console.log("Updated receptionist@frcs.com password:", res1.modifiedCount);

  const res2 = await db.collection("users").updateOne(
    { email: "receptionist@hms.com" },
    { $set: { passwordHash, status: "active" } }
  );
  console.log("Updated receptionist@hms.com password:", res2.modifiedCount);

  const res3 = await db.collection("users").updateOne(
    { email: "admin@hms.com" },
    { $set: { passwordHash, status: "active" } }
  );
  console.log("Updated admin@hms.com password:", res3.modifiedCount);

  await mongoose.disconnect();
}

setTestPasswords().catch(console.error);
