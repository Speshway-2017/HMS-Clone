import mongoose from "mongoose";
import { env } from "./env";

let isMongoConnected = false;

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  isMongoConnected = true;
  console.log(`✓ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isMongoConnected = false;
    console.log("✓ MongoDB disconnected");
  }
}

export function getMongoStatus(): boolean {
  return isMongoConnected && mongoose.connection.readyState === 1;
}
