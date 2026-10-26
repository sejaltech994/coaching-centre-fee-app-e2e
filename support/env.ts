/** Where the suite points. Defaults are the local dev servers from the app repo's README. */
export const WEB_URL = (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const API_URL = (process.env.API_URL ?? "http://localhost:8787/api/v1").replace(/\/+$/, "");
export const WEB_ORIGIN = new URL(WEB_URL).origin;

/**
 * File the API's console SMS provider writes to (`[sms:console] Chukta login code …`).
 * Scenarios tagged @journey read real OTPs from it, so they only run when it is set.
 */
export const OTP_LOG_FILE = process.env.OTP_LOG_FILE;
