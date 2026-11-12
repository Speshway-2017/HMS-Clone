import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  pdfPath?: string;
  fromName?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  console.log(`[Email Service] Sending email to ${options.to}...`);

  let smtpHost = (process.env.SMTP_HOST || "").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const fromEmail = (process.env.SMTP_FROM || smtpUser || "no-reply@hospital.com").trim();
  const fromName = options.fromName || process.env.SMTP_FROM_NAME || "Hospital Management System";

  // Auto-correct common typo 'smpt.' -> 'smtp.'
  if (smtpHost.toLowerCase().startsWith("smpt.")) {
    smtpHost = "smtp." + smtpHost.slice(5);
  }

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const isGmail =
        smtpHost.toLowerCase().includes("gmail.com") ||
        process.env.SMTP_SERVICE?.toLowerCase() === "gmail";

      const transportOptions: any =
        isGmail && (!process.env.SMTP_PORT || smtpPort === 465 || smtpPort === 587)
          ? {
              service: "gmail",
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              tls: {
                rejectUnauthorized: false,
              },
            }
          : {
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
              tls: {
                rejectUnauthorized: false,
              },
            };

      const transporter = nodemailer.createTransport(transportOptions);

      const attachments: any[] = [];
      if (options.pdfPath && fs.existsSync(options.pdfPath)) {
        attachments.push({
          filename: path.basename(options.pdfPath),
          path: options.pdfPath,
        });
      }

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.html,
        attachments,
      });

      console.log(`[Email Service] Email successfully sent to ${options.to}`);
      return true;
    } catch (err: any) {
      console.error(`[Email Service] SMTP send failed to ${options.to}:`, err.message || err);
      throw new Error(`Email gateway failed: ${err.message || String(err)}`);
    }
  }

  // Developer Simulation Fallback Mode (only when SMTP credentials are not configured)
  const isTestingRetry = process.env.SIMULATE_GATEWAY_FAIL === "true";
  if (isTestingRetry && Math.random() < 0.3) {
    console.warn(`[Email Service] Simulated SMTP Server Downtime for ${options.to}`);
    throw new Error("SMTP Gateway Connection Refused (Simulated Offline Support)");
  }

  console.log(`[EMAIL LOG (Fallback Simulated Delivery)]
------------------------------------
TO: ${options.to}
FROM: "${fromName}" <${fromEmail}>
SUBJECT: ${options.subject}
ATTACHMENT: ${options.pdfPath ? path.basename(options.pdfPath) : "None"}
BODY:
${options.body}
------------------------------------`);
  return true;
}
