import { createServer } from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { ensureSuperAdmin } from "./utils/ensureSuperAdmin";
import { initSocket } from "./config/socket";
import { Invoice } from "./models/Invoice";

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
  console.log("Invoices billingType migration completed successfully.");
}

import { startNotificationWorker } from "./utils/notificationWorker";

async function main() {
  await connectDB();
  await ensureSuperAdmin();
  await migrateInvoices();

  const httpServer = createServer(app);
  initSocket(httpServer, env.clientUrl);

  // Start background notification queue worker for SMS, WhatsApp, Email retries
  startNotificationWorker();

  httpServer.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
