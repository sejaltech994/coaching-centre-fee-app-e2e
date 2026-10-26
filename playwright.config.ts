import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { OTP_LOG_FILE, WEB_URL } from "./support/env";

const testDir = defineBddConfig({
  features: "features/**/*.feature",
  steps: ["steps/**/*.ts"],
});

// Scenarios that need something this run doesn't have are left out, not failed:
// @journey needs the API's OTP log; @deployed needs a live HTTPS site.
const unavailable = [!OTP_LOG_FILE && "@journey", !WEB_URL.startsWith("https://") && "@deployed"].filter(Boolean);
const excluding = (tags: string[]) => {
  const all = [...tags, ...unavailable];
  return all.length ? new RegExp(all.join("|")) : undefined;
};

const ci = !!process.env.CI;
// PW_CHANNEL=chrome drives the installed Google Chrome instead of Playwright's
// own Chromium (which no longer supports macOS 13). CI uses the bundled one.
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Video needs Playwright's ffmpeg build, which isn't available for every OS; CI always has it.
    video: ci ? "retain-on-failure" : "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...channel }, grepInvert: excluding(["@mobile", "@api"]) },
    { name: "mobile", use: { ...devices["Pixel 7"], ...channel }, grep: /@mobile/, grepInvert: excluding([]) },
    { name: "api", grep: /@api/, grepInvert: excluding([]) },
  ],
});
