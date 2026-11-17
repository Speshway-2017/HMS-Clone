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

export interface OnboardingEmailParams {
  to: string;
  name: string;
  role: string;
  employeeId: string;
  tempPassword: string;
  hospitalName?: string;
  logoUrl?: string;
  loginUrl?: string;
}

export async function sendOnboardingCredentialsEmail({
  to,
  name,
  role,
  employeeId,
  tempPassword,
  hospitalName = "Preethi Fertility, Hyderabad",
  logoUrl = "",
  loginUrl = "http://localhost:5173/login",
}: OnboardingEmailParams): Promise<boolean> {
  const formattedRole = role
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const subject = `Welcome to ${hospitalName} - Your Staff Portal Login Credentials`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Welcome to ${hospitalName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 24px 0; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .brand-header { background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .brand-header h1 { margin: 8px 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff; }
        .brand-header p { margin: 4px 0 0; font-size: 13px; color: #a7f3d0; font-weight: 500; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .intro { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .credentials-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .cred-badge { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 6px; font-size: 13px; font-weight: 800; }
        .cred-pass { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 6px; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #059669; color: #ffffff !important; font-weight: 700; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); }
        .security-note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #92400e; line-height: 1.5; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="brand-header">
          ${logoUrl ? `<img src="${logoUrl}" alt="${hospitalName}" style="max-height: 48px; border-radius: 8px; margin-bottom: 8px;" />` : ""}
          <h1>${hospitalName}</h1>
          <p>Clinical Information System — Personnel Onboarding</p>
        </div>
        <div class="content">
          <h2 class="greeting">Welcome, ${name}!</h2>
          <p class="intro">
            Your healthcare personnel profile and staff portal access account have been successfully registered at <strong>${hospitalName}</strong>. 
            Below are your official operational identification credentials and temporary login password:
          </p>

          <div class="credentials-card">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Designation / Role</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a;">${formattedRole}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Unique ID</td>
                <td style="padding: 10px 0; text-align: right;"><span class="cred-badge">${employeeId}</span></td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Login Email (Username)</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a;">${to}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Temporary Password</td>
                <td style="padding: 10px 0; text-align: right;"><span class="cred-pass">${tempPassword}</span></td>
              </tr>
            </table>
          </div>

          <div class="btn-wrapper">
            <a href="${loginUrl}" class="btn" target="_blank">Sign In to Staff Portal</a>
          </div>

          <div class="security-note">
            <strong>⚠️ Security Notice:</strong> This is a temporary computer-generated password. For data integrity and healthcare compliance, you are required to reset this password upon your initial sign-in via Account Settings.
          </div>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} ${hospitalName}. All rights reserved. Confidential Healthcare Communication.
        </div>
      </div>
    </body>
    </html>
  `;

  const body = `Welcome to ${hospitalName}, ${name}!

Your staff portal account has been successfully configured.
Here are your credentials:

- Role / Designation: ${formattedRole}
- Unique Employee ID: ${employeeId}
- Login Email (Username): ${to}
- Temporary Password: ${tempPassword}

Please log in to the portal at: ${loginUrl}
Note: You are required to update your temporary password upon first login.

Best regards,
${hospitalName} Administration
`;

  return sendEmail({
    to,
    subject,
    body,
    html,
    fromName: hospitalName,
  });
}
