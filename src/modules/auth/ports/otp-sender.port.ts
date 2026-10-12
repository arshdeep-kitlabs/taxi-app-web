/**
 * Delivers a code. Twilio, MessageBird or a console line — the service cannot
 * tell which, and does not need to.
 */
export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}
