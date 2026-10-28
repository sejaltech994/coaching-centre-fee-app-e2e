import { expect, type Page } from "@playwright/test";
import { Then, When } from "./fixtures";

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
