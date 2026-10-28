import { expect, type Page } from "@playwright/test";
import { freshPhone, type OtpInbox } from "../support/otp-inbox";
import { Then, When, type World } from "./fixtures";

const section = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

When("I open Settings from the menu", async ({ page }) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/?$/);
});

Then("my email is shown as confirmed, from my Google account", async ({ page, world }) => {
  const profile = section(page, "Profile");
  await expect(profile).toContainText(world.google!.email);
  await expect(profile).toContainText("Confirmed");
  await expect(profile).toContainText("From your Google account");
});

Then("my mobile number {string} is shown as not confirmed", async ({ page }, number: string) => {
  const profile = section(page, "Profile");
  await expect(profile).toContainText(number);
  await expect(profile).toContainText("Not confirmed");
});

Then("I sign in with Google as my own email", async ({ page, world }) => {
  await expect(section(page, "Sign-in methods")).toContainText(`Connected as ${world.google!.email}`);
});

When(
  "I change my centre to {string}, a {string} centre in {string}",
  async ({ page }, name: string, type: string, city: string) => {
    const centre = section(page, "Centre");
    await page.getByRole("button", { name: "Edit centre", exact: true }).click();
    await centre.getByLabel("Centre name").fill(name);
    await centre.getByLabel("City").fill(city);
    await centre.getByRole("button", { name: type, exact: true }).click();
    await centre.getByRole("button", { name: "Save", exact: true }).click();
  },
);

Then("the centre reads {string}", async ({ page }, summary: string) => {
  await expect(section(page, "Centre").getByText(summary, { exact: true })).toBeVisible();
});

Then("the menu shows the centre {string}", async ({ page }, name: string) => {
  await expect(page.getByRole("complementary")).toContainText(name);
});

When("I change my name to {string}", async ({ page }, name: string) => {
  const profile = section(page, "Profile");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await profile.getByLabel("Your name").fill(name);
  await profile.getByRole("button", { name: "Save", exact: true }).click();
});

Then("my name reads {string}", async ({ page }, name: string) => {
  await expect(section(page, "Profile").getByText(name, { exact: true })).toBeVisible();
});

Then("the name field says {string}", async ({ page }, message: string) => {
  await expect(section(page, "Profile").getByLabel("Your name")).toHaveAccessibleDescription(message);
});

// --- Confirming the mobile number ---

const BANNER = "Confirm your mobile number to start sending fee reminders on WhatsApp.";
const spaced = (e164: string) => `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;

Then("I am asked to confirm my mobile number to send fee reminders on WhatsApp", async ({ page }) => {
  await expect(page.getByRole("status").filter({ hasText: BANNER })).toBeVisible();
});

Then("I am no longer asked to confirm my mobile number", async ({ page }) => {
  await expect(page.getByText(BANNER)).toBeHidden();
});

When("I follow {string} in the banner", async ({ page }, name: string) => {
  await page.getByRole("status").filter({ hasText: BANNER }).getByRole("link", { name, exact: true }).click();
});

/** Opens the confirm steps and asks for a code for a fresh number, noting where the API's log was. */
async function askForCode(page: Page, world: World, otp: OtpInbox) {
  world.phone = freshPhone();
  const profile = section(page, "Profile");
  await page.getByRole("button", { name: "Confirm mobile number", exact: true }).click();
  await profile.getByLabel("Mobile number").fill(world.phone.slice(3));
  world.otpMark = otp.mark();
  await profile.getByRole("button", { name: "Send code", exact: true }).click();
  await expect(profile.getByText(`Sent by SMS to ${spaced(world.phone)}.`)).toBeVisible();
}

async function typeCode(page: Page, code: string) {
  const profile = section(page, "Profile");
  await profile.getByLabel("Digit 1", { exact: true }).click();
  await page.keyboard.type(code);
  await profile.getByRole("button", { name: "Confirm", exact: true }).click();
}

When("I ask for a code for a new mobile number", async ({ page, world, otp }) => {
  await askForCode(page, world, otp);
});

When("I confirm a new mobile number with the code from the SMS", async ({ page, world, otp }) => {
  await askForCode(page, world, otp);
  await typeCode(page, await otp.codeFor(world.phone!, world.otpMark));
});

When("I enter a wrong code", async ({ page, world, otp }) => {
  const right = await otp.codeFor(world.phone!, world.otpMark);
  await typeCode(page, right === "000000" ? "111111" : "000000");
});

Then("my new mobile number is shown as confirmed", async ({ page, world }) => {
  const profile = section(page, "Profile");
  await expect(profile).toContainText(spaced(world.phone!));
  await expect(profile).not.toContainText("Not confirmed");
  await expect(profile.getByRole("button", { name: "Change mobile number", exact: true })).toBeVisible();
});
