import { existsSync, readFileSync, statSync } from "node:fs";

/**
 * Reads the codes the API "sent" with its console SMS provider. Real SMS
 * can't be read in CI, and the API never exposes codes, so the suite runs the
 * API locally and watches its log.
 */
export class OtpInbox {
  constructor(private readonly logFile: string | undefined) {}

  /** Call before requesting a code; pass the result to codeFor(). */
  mark(): number {
    return this.logFile && existsSync(this.logFile) ? statSync(this.logFile).size : 0;
  }

  /** The newest code sent to `phone` (E.164) after `since`. Waits up to 10 s for the log line. */
  async codeFor(phone: string, since: number): Promise<string> {
    if (!this.logFile) throw new Error("OTP_LOG_FILE is not set: @sms scenarios need the API's log");
    // The API masks numbers in logs: +919876543210 is logged as +91******3210.
    const pattern = new RegExp(`code for \\+91\\*{6}${phone.slice(-4)}: (\\d{6})`, "g");
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const log = existsSync(this.logFile) ? readFileSync(this.logFile).subarray(since).toString() : "";
      const codes = [...log.matchAll(pattern)].map((m) => m[1]!);
      if (codes.length) return codes.at(-1)!;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`No OTP for ${phone.slice(0, 3)}******${phone.slice(-4)} appeared in ${this.logFile}`);
  }
}

/** A random Indian mobile number in E.164, so scenarios never share rate limits or accounts. */
export function freshPhone(): string {
  return `+919${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
}
