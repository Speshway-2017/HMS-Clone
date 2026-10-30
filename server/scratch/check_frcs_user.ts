import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const user = await db.collection("users").findOne({ email: /frcs/i });
  console.log("Found FRCS user:", user);

  if (user) {
    const isMatch123 = await bcrypt.compare("receptionist@123", user.passwordHash);
    const isMatchAdmin = await bcrypt.compare("admin123", user.passwordHash);
    console.log("Password match receptionist@123:", isMatch123);
    console.log("Password match admin123:", isMatchAdmin);

    if (!isMatch123 && !isMatchAdmin) {
      const newHash = await bcrypt.hash("receptionist@123", 10);
      await db.collection("users").updateOne({ _id: user._id }, { $set: { passwordHash: newHash, status: "active" } });
      console.log("Updated password hash to receptionist@123");
    }
  }

  await mongoose.disconnect();
}

checkUser().catch(console.error);
