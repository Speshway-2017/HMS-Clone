import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  pdfPath?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  console.log(`[Email Service] Sending email to ${options.to}...`);

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || "no-reply@hospital.com";

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const attachments: any[] = [];
      if (options.pdfPath && fs.existsSync(options.pdfPath)) {
        attachments.push({
          filename: path.basename(options.pdfPath),
          path: options.pdfPath,
        });
      }

      await transporter.sendMail({
        from: `"Hospital Management System" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.body,
        attachments,
      });

      console.log(`[Email Service] Email successfully sent to ${options.to}`);
      return true;
    } catch (err: any) {
      console.error(`[Email Service] SMTP send failed:`, err.message);
      throw new Error(`Email gateway failed: ${err.message}`);
    }
  }

  // Developer Simulation Fallback Mode
  const isTestingRetry = process.env.SIMULATE_GATEWAY_FAIL === "true";
  if (isTestingRetry && Math.random() < 0.3) {
    console.warn(`[Email Service] Simulated SMTP Server Downtime for ${options.to}`);
    throw new Error("SMTP Gateway Connection Refused (Simulated Offline Support)");
  }

  console.log(`[EMAIL LOG]
------------------------------------
TO: ${options.to}
SUBJECT: ${options.subject}
ATTACHMENT: ${options.pdfPath ? path.basename(options.pdfPath) : "None"}
BODY:
${options.body}
------------------------------------`);
  return true;
}
