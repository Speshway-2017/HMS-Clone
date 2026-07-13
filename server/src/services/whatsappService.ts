export interface WhatsAppOptions {
  to: string;
  body: string;
}

export async function sendWhatsApp(options: WhatsAppOptions): Promise<boolean> {
  console.log(`[WhatsApp Gateway] Sending WhatsApp message to ${options.to}...`);

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886"; // Twilio Sandbox default

  if (twilioSid && twilioAuthToken) {
    try {
      const twilio = require("twilio");
      const client = twilio(twilioSid, twilioAuthToken);
      const recipient = options.to.startsWith("whatsapp:") ? options.to : `whatsapp:${options.to}`;
      await client.messages.create({
        to: recipient,
        from: whatsappFrom,
        body: options.body,
      });
      console.log(`[WhatsApp Gateway] Twilio WhatsApp successfully sent to ${options.to}`);
      return true;
    } catch (err: any) {
      console.error(`[WhatsApp Gateway] Twilio WhatsApp failed:`, err.message);
      throw new Error(`WhatsApp gateway failed: ${err.message}`);
    }
  }

  // Developer Simulation Mode
  const isTestingRetry = process.env.SIMULATE_GATEWAY_FAIL === "true";
  if (isTestingRetry && Math.random() < 0.3) {
    console.warn(`[WhatsApp Gateway] Simulated Network Failure for ${options.to}`);
    throw new Error("WhatsApp Gateway Handshake Failure (Simulated Offline Support)");
  }

  console.log(`[WHATSAPP LOG]
------------------------------------
TO: whatsapp:${options.to}
MESSAGE:
${options.body}
------------------------------------`);
  return true;
}
