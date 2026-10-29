import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";
import { signUpWithGoogle } from "./login.steps";

Given("I have logged in as a new owner", async ({ page, world }) => {
  await signUpWithGoogle(page, world);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
});

When("I open the dashboard", async ({ page }) => {
  await page.goto("/dashboard/");
});

When("I reload the page", async ({ page }) => {
  await page.reload();
});

Then("I am on my dashboard", async ({ page }) => {
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
});

Then("I see {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});

Then("the page is headed {string}", async ({ page }, heading: string) => {
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
});

Then("the dashboard shows {string} {string}", async ({ page }, tile: string, amount: string) => {
  await expect(page.getByRole("region", { name: tile, exact: true })).toContainText(amount);
});

Then("the dashboard offers {string}", async ({ page }, link: string) => {
  await expect(page.getByRole("main").getByRole("link", { name: link, exact: true })).toBeVisible();
});

Then("the dashboard says {string}", async ({ page }, text: string) => {
  await expect(page.getByRole("main").getByText(text)).toBeVisible();
});

Then(
  "this month's report lists {string} as {string} by {string}",
  async ({ page }, student: string, status: string, method: string) => {
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download .* report$/ }).click()]);
    const { readFile } = await import("node:fs/promises");
    const lines = (await readFile(await download.path(), "utf8")).split(/\r?\n/);
    const row = lines.find((line) => line.includes(student) && line.includes(`,${status},`));
    expect(row, lines.join("\n")).toBeDefined();
    expect(row).toContain(`,${method},`);
  },
);
