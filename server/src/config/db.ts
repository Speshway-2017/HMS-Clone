import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env";

// Resolve querySrv ECONNREFUSED on Windows/ISPs by using reliable public DNS resolvers
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }
} catch (dnsErr) {
  // Ignore fallback if custom DNS cannot be configured in environment
}

let isMongoConnected = false;

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
      isMongoConnected = true;
      console.log(`✓ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    } catch (err: any) {
      console.error(`⚠️ MongoDB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw new Error(`MongoDB Connection Error after ${maxRetries} attempts: ${err.message}. Please check your internet connection or MongoDB Atlas Network Access (IP Whitelist: 0.0.0.0/0).`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
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
