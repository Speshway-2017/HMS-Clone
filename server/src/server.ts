// Server Entry Point - Updated Schema & Repository Links
import { createServer, Server as HTTPServer } from "http";
import app from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { ensureSuperAdmin } from "./utils/ensureSuperAdmin";
import { initSocket, closeSocket } from "./config/socket";
import { Invoice } from "./models/Invoice";
import { startNotificationWorker, stopNotificationWorker } from "./utils/notificationWorker";

let httpServer: HTTPServer | null = null;
let isShuttingDown = false;

async function migrateInvoices() {
  console.log("Running Invoices billingType migration...");
  const invoices = await Invoice.find({ billingType: { $exists: false } });
  if (invoices.length === 0) {
    console.log("No invoices need migration.");
    return;
  }
  console.log(`Found ${invoices.length} invoices needing migration.`);
  for (const inv of invoices) {
    let type = "OP";
    const hasAdmission = inv.items.some(
      item => 
        item.category?.includes("admission") || 
        item.category?.includes("ip") || 
        item.description?.toLowerCase().includes("admission") ||
        item.description?.toLowerCase().includes("advance deposit") ||
        item.description?.toLowerCase().includes("ward") ||
        item.description?.toLowerCase().includes("bed") ||
        item.description?.toLowerCase().includes("room")
    );
    const hasMedicine = inv.items.some(
      item => 
        item.category?.includes("pharmacy") || 
        item.category?.includes("medicine") || 
        item.description?.toLowerCase().includes("tab") ||
        item.description?.toLowerCase().includes("syp") ||
        item.description?.toLowerCase().includes("cap") ||
        item.description?.toLowerCase().includes("injection")
    );
    const hasLab = inv.items.some(
      item => 
        item.category?.includes("lab") || 
        item.category?.includes("laboratory") || 
        item.category?.includes("test") || 
        item.description?.toLowerCase().includes("blood") ||
        item.description?.toLowerCase().includes("urine") ||
        item.description?.toLowerCase().includes("profile") ||
        item.description?.toLowerCase().includes("cbc")
    );
    const hasRadiology = inv.items.some(
      item => 
        item.category?.includes("radiology") || 
        item.category?.includes("x-ray") || 
        item.description?.toLowerCase().includes("xray") ||
        item.description?.toLowerCase().includes("scan") ||
        item.description?.toLowerCase().includes("mri") ||
        item.description?.toLowerCase().includes("ultrasound")
    );

    if (hasAdmission) {
      type = "IP";
    } else if (hasMedicine) {
      type = "PHARMACY";
    } else if (hasLab) {
      type = "LAB";
    } else if (hasRadiology) {
      type = "RADIOLOGY";
    }
    
    inv.billingType = type as any;
    await inv.save();
  }
  console.log("✓ Invoices billingType migration completed successfully.");
}

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log(`Already shutting down (received ${signal})`);
    return;
  }
  isShuttingDown = true;
  console.log(`\nReceived ${signal}, shutting down gracefully...`);

  try {
    // Stop notification worker first
    stopNotificationWorker();

    // Close Socket.IO
    await closeSocket();

    // Close HTTP server
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => {
          if (err) reject(err);
          else {
            console.log("✓ HTTP server closed");
            resolve();
          }
        });
      });
    }

    // Disconnect MongoDB
    await disconnectDB();

    console.log("✓ All resources closed, exiting now.");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

import { syncAllBranchDepartments } from "./utils/branchDepartmentSync";
import { backfillLabBranchData } from "./utils/backfillBranchData";

async function main() {
  console.log("Starting Hospital Management System Backend...\n");

  try {
    // Step 1: Environment already loaded via env.ts (dotenv.config() called there)
    console.log("✓ Environment variables loaded");

    // Step 2: Connect to MongoDB
    await connectDB();

    // Step 3: Ensure super admin exists
    await ensureSuperAdmin();
    console.log("✓ Super admin ensured");

    // Step 4: Run migrations & branch sync
    await migrateInvoices();
    await syncAllBranchDepartments();
    await backfillLabBranchData();
    console.log("✓ System-wide multi-branch data scoping and alignment complete");

    // Step 5: Create HTTP server & register Express routes (app already has routes)
    httpServer = createServer(app);
    console.log("✓ Express routes registered");

    // Step 6: Initialize Socket.IO
    initSocket(httpServer, env.clientUrl);

    // Step 7: Start background workers
    startNotificationWorker();
    console.log("✓ Notification worker started");

    // Step 8: Start listening
    httpServer.listen(env.port, "0.0.0.0", () => {
      console.log(`\n✓ Server listening on http://localhost:${env.port}`);
      console.log(`✓ Health check available at http://localhost:${env.port}/api/v1/health`);
      console.log(`✓ LAN access available at http://[your-local-ip]:${env.port}`);
    });

    // Handle server errors (like EADDRINUSE, EACCES)
    httpServer.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error("\n-------------------------------------");
        console.error(`Port ${env.port} is already in use.`);
        console.error("\nPossible reasons:");
        console.error("• Another HMS backend instance is already running.");
        console.error("• Another application is using this port.");
        console.error("\nSolutions:");
        console.error("1. Stop the existing process.");
        console.error("2. Change PORT in .env.");
        console.error("3. Restart the backend.");
        console.error("-------------------------------------\n");
      } else if (err.code === "EACCES") {
        console.error(`❌ Port ${env.port} requires elevated privileges!`);
      } else {
        console.error("❌ Server error:", err);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("\n❌ Failed to start server:", error);
    await gracefulShutdown("STARTUP_ERROR");
  }
}

// Register graceful shutdown handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

main();
