import { NotificationQueue } from "../models/NotificationQueue";
import { sendSMS } from "../services/smsService";
import { sendWhatsApp } from "../services/whatsappService";
import { sendEmail } from "../services/emailService";
import { Prescription } from "../models/Prescription";

let workerIntervalId: NodeJS.Timeout | null = null;

export async function processQueue() {
  try {
    // Find jobs that are failed or pending, and haven't exceeded 5 attempts
    const jobs = await NotificationQueue.find({
      status: { $in: ["pending", "failed"] },
      attempts: { $lt: 5 },
    }).sort({ createdAt: 1 });

    if (jobs.length === 0) {
      return;
    }

    console.log(`[Notification Worker] Found ${jobs.length} jobs to process.`);

    for (const job of jobs) {
      job.attempts += 1;
      job.lastAttempt = new Date();

      try {
        let success = false;
        if (job.type === "sms") {
          success = await sendSMS({ to: job.recipient, body: job.content });
        } else if (job.type === "whatsapp") {
          try {
            success = await sendWhatsApp({ to: job.recipient, body: job.content });
          } catch (waErr: any) {
            console.warn(`[Notification Worker] WhatsApp failed for job ${job._id}. Falling back to SMS.`);
            // Create fallback SMS job
            await NotificationQueue.create({
              prescription: job.prescription,
              type: "sms",
              recipient: job.recipient,
              content: job.content,
              status: "pending",
              attempts: 0,
            });

            // Update prescription delivery status if applicable
            await Prescription.findByIdAndUpdate(job.prescription, {
              "deliveryStatus.mobile": "pending",
            });

            throw waErr; // Throw to mark WhatsApp job as failed
          }
        } else if (job.type === "email") {
          success = await sendEmail({
            to: job.recipient,
            subject: job.emailSubject || "Your Prescription Details",
            body: job.content,
            pdfPath: job.pdfPath,
          });
        }

        if (success) {
          job.status = "success";
          job.error = "";
          
          // Update prescription delivery status
          const updateField = job.type === "email" ? null : "deliveryStatus.mobile";
          if (updateField) {
            await Prescription.findByIdAndUpdate(job.prescription, {
              [updateField]: "delivered",
            });
          }
        }
      } catch (err: any) {
        job.status = "failed";
        job.error = err.message || "Unknown error";
        console.error(`[Notification Worker] Job ${job._id} attempt ${job.attempts} failed: ${job.error}`);

        // Update prescription delivery status if it's the final attempt
        if (job.attempts >= 5) {
          const updateField = job.type === "email" ? null : "deliveryStatus.mobile";
          if (updateField) {
            await Prescription.findByIdAndUpdate(job.prescription, {
              [updateField]: "failed",
            });
          }
        }
      }

      await job.save();
    }
  } catch (error) {
    console.error("[Notification Worker] Error in worker loop:", error);
  }
}

export function startNotificationWorker() {
  if (workerIntervalId) {
    console.warn("[Notification Worker] Worker is already running.");
    return;
  }

  console.log("[Notification Worker] Starting background worker (interval: 30s)...");
  // Run once immediately
  processQueue();
  
  // Set interval to run every 30 seconds
  workerIntervalId = setInterval(processQueue, 30000);
}

export function stopNotificationWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log("[Notification Worker] Background worker stopped.");
  }
}
