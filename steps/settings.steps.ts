import { expect, type Page } from "@playwright/test";
import { API_URL } from "../support/env";
import { googleSignIn } from "../support/google";
import { Given, Then, When } from "./fixtures";

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

Then("my mobile number reads {string}", async ({ page }, number: string) => {
  await expect(section(page, "Profile")).toContainText(`Mobile number${number}`);
});

When("I change my mobile number to {string}", async ({ page }, number: string) => {
  const profile = section(page, "Profile");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await profile.getByLabel("Mobile number").fill(number);
  await profile.getByRole("button", { name: "Save", exact: true }).click();
});

Then("I am never asked to confirm my mobile number", async ({ page }) => {
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByText(/confirm your mobile number/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /confirm mobile number/i })).toHaveCount(0);
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

// --- Devices ---

Given("I am also signed in on another device", async ({ world }) => {
  // The same Google account signing in again, outside this browser.
  const signedIn = await googleSignIn(world.google!);
  expect(signedIn.refreshToken).toBeDefined();
  world.otherDevice = signedIn.refreshToken;
});

const deviceRows = (page: Page) => section(page, "Devices").getByRole("listitem");

Then("my devices are {string} only", async ({ page }, label: string) => {
  await expect(deviceRows(page)).toHaveCount(1);
  await expect(deviceRows(page).first()).toContainText(label);
  await expect(section(page, "Devices").getByRole("button")).toHaveCount(0);
});

Then("I see {int} devices, this one first", async ({ page }, count: number) => {
  await expect(deviceRows(page)).toHaveCount(count);
  await expect(deviceRows(page).first()).toContainText("This device");
});

Then("the other device is signed out", async ({ world }) => {
  const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", headers: { cookie: `chukta_rt=${world.otherDevice}` } });
  expect(res.status).toBe(401);
});

// --- Your data and deleting the account ---

Then("downloading my data gives a JSON file with my centre {string}", async ({ page }, centre: string) => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download my data" }).click()]);
  const path = await download.path();
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile(path, "utf8")) as { centre: { name: string } };
  expect(data.centre.name).toBe(centre);
});

When("I delete my account, typing {string}", async ({ page }, name: string) => {
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await dialog.getByLabel(`Type ${name} to confirm`).fill(name);
  await dialog.getByRole("button", { name: "Delete account", exact: true }).click();
});

Then("I am warned the account will be deleted", async ({ page }) => {
  await expect(page.getByRole("alert").filter({ hasText: /This account will be deleted on \d{1,2} \w{3} \d{4}\./ })).toBeVisible();
});
