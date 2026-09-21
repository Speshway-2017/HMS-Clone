export interface SMSOptions {
  to: string;
  body: string;
}

export async function sendSMS(options: SMSOptions): Promise<boolean> {
  console.log(`[SMS Gateway] Sending SMS to ${options.to}...`);
  
  // Real Twilio or other SMS Gateway integration point
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM;

  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      // Lazy-load twilio to avoid crash if not installed
      const twilio = require("twilio");
      const client = twilio(twilioSid, twilioAuthToken);
      await client.messages.create({
        to: options.to,
        from: twilioFrom,
        body: options.body,
      });
      console.log(`[SMS Gateway] Twilio SMS successfully sent to ${options.to}`);
      return true;
    } catch (err: any) {
      console.error(`[SMS Gateway] Twilio SMS failed:`, err.message);
      throw new Error(`SMS gateway failed: ${err.message}`);
    }
  }

  // Developer Simulation Fallback Mode
  // Simulates occasional offline network failures (e.g. 20% rate) in test/dev modes when no API keys are present,
  // verifying that the retry queue handles gateways transient outages.
  const isTestingRetry = process.env.SIMULATE_GATEWAY_FAIL === "true";
  if (isTestingRetry && Math.random() < 0.3) {
    console.warn(`[SMS Gateway] Simulated Gateway Timeout for ${options.to}`);
    throw new Error("SMS Gateway Connection Timeout (Simulated Offline Support)");
  }

  console.log(`[SMS LOG]
------------------------------------
TO: ${options.to}
MESSAGE:
${options.body}
------------------------------------`);
  return true;
}
