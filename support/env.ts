/** Where the suite points. Defaults are the local dev servers from the app repo's README. */
export const WEB_URL = (process.env.WEB_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const API_URL = (process.env.API_URL ?? "http://localhost:8787/api/v1").replace(/\/+$/, "");
export const WEB_ORIGIN = new URL(WEB_URL).origin;

/**
 * A live HTTPS site (the nightly smoke run) rather than a local stack. Scenarios
 * tagged @journey sign in through the API's fake Google (GOOGLE_PROVIDER=fake),
 * which only a local stack has, so they run only when this is false.
 */
export const DEPLOYED = WEB_URL.startsWith("https://");
