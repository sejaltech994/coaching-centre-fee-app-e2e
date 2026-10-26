import { expect, type Page } from "@playwright/test";
import { freshPhone } from "../support/otp-inbox";
import { Given, Then, When, type World } from "./fixtures";

const formatted = (e164: string) => `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
const codeBox = (page: Page) => page.getByLabel("6-digit code");

Given("I open the login page", async ({ page }) => {
  await page.goto("/login/");
});

Given("a mobile number that has never logged in", async ({ world }) => {
  world.phone = freshPhone();
});

When("I enter my mobile number and press {string}", async ({ page, world, otp }, button: string) => {
  world.otpMark = otp.mark();
  await page.getByLabel("Mobile number").fill(world.phone!.slice(3));
  await page.getByRole("button", { name: button, exact: true }).click();
});

When("I enter {string} as my mobile number and press {string}", async ({ page }, number: string, button: string) => {
  await page.getByLabel("Mobile number").fill(number);
  await page.getByRole("button", { name: button, exact: true }).click();
});

When("I press {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
});

Then("I am asked for the 6-digit code sent to my number", async ({ page, world }) => {
  await expect(codeBox(page)).toBeVisible();
  await expect(page.getByText(`sent a 6-digit code to ${formatted(world.phone!)}`)).toBeVisible();
});

Then("I am asked for the 6-digit code sent to {string}", async ({ page }, shown: string) => {
  await expect(codeBox(page)).toBeVisible();
  await expect(page.getByText(`sent a 6-digit code to ${shown}`)).toBeVisible();
});

When("I enter the code from the SMS", async ({ page, world, otp }) => {
  world.lastCode = await otp.codeFor(world.phone!, world.otpMark);
  await codeBox(page).fill(world.lastCode);
});

When("I enter a wrong code", async ({ page, world, otp }) => {
  const right = await otp.codeFor(world.phone!, world.otpMark);
  await codeBox(page).fill(right === "000000" ? "111111" : "000000");
});

When("I type {string} into the code box", async ({ page }, text: string) => {
  await codeBox(page).pressSequentially(text);
});

Then("the code box shows {string}", async ({ page }, value: string) => {
  await expect(codeBox(page)).toHaveValue(value);
});

Then("the code box is empty", async ({ page }) => {
  await expect(codeBox(page)).toHaveValue("");
});

Then("I see the error {string}", async ({ page }, message: string) => {
  // Scoped to <main>: Next.js adds its own role="alert" route announcer outside it.
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(message);
});

Then("I am still asked for my mobile number", async ({ page }) => {
  await expect(page.getByLabel("Mobile number")).toBeVisible();
  await expect(codeBox(page)).toBeHidden();
});

Then("I am on the login page", async ({ page }) => {
  await expect(page).toHaveURL(/\/login\/?(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Chukta" })).toBeVisible();
});

Then("the mobile number field shows {string}", async ({ page }, value: string) => {
  await expect(page.getByLabel("Mobile number")).toHaveValue(value);
});

// --- Stubbed API (@mocked) ---

Given("the API is replaced by a stub", async ({ page, stub }) => {
  await stub.install(page);
});

Given("the API is replaced by a stub with no session", async ({ page, stub }) => {
  await stub.install(page); // the stub answers /auth/refresh with 401 by default
});

Given(
  "the API will refuse OTP requests with {string} {string}",
  async ({ stub }, code: string, message: string) => {
    stub.failNext("/auth/otp/request", 429, code, message);
  },
);

Given("the API cannot be reached", async ({ stub }) => {
  stub.goOffline();
});

Then("no OTP was requested", async ({ stub }) => {
  expect(stub.requestsTo("/auth/otp/request")).toHaveLength(0);
});

Then("an OTP was requested for {string}", async ({ stub }, phone: string) => {
  expect(stub.requestsTo("/auth/otp/request").map((r) => r.body)).toEqual([{ phone }]);
});

Then("{int} OTPs were requested", async ({ stub }, count: number) => {
  expect(stub.requestsTo("/auth/otp/request")).toHaveLength(count);
});

Then("the {string} button is disabled", async ({ page }, name: string) => {
  await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
});

Then("the {string} button is enabled", async ({ page }, name: string) => {
  await expect(page.getByRole("button", { name, exact: true })).toBeEnabled();
});

When("{int} seconds pass", async ({ page }, seconds: number) => {
  await page.clock.fastForward(seconds * 1000);
});

/** Logs in through the real screens; used by dashboard scenarios. */
export async function logInThroughTheUi(page: Page, world: World, otp: import("../support/otp-inbox").OtpInbox) {
  world.phone ??= freshPhone();
  await page.goto("/login/");
  world.otpMark = otp.mark();
  await page.getByLabel("Mobile number").fill(world.phone.slice(3));
  await page.getByRole("button", { name: "Get OTP", exact: true }).click();
  await codeBox(page).fill(await otp.codeFor(world.phone, world.otpMark));
  await page.getByRole("button", { name: "Verify and log in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
}
