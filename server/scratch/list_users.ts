import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function listUsers() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const users = await db.collection("users").find({}).toArray();
  console.log("Users in DB:");
  users.forEach(u => console.log(`- ${u.email} (${u.role}) branch: ${u.branch}`));

  await mongoose.disconnect();
}

listUsers().catch(console.error);
