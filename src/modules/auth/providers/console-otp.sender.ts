import type { OtpSender } from '../ports/otp-sender.port.js';

/**
 * Development sender. Replace with a Twilio implementation in the container
 * and no service changes — that substitution is the point of the port.
 */
export class ConsoleOtpSender implements OtpSender {
  async send(phone: string, code: string): Promise<void> {
    console.log(`[otp] ${phone} → ${code}`);
  }
}
