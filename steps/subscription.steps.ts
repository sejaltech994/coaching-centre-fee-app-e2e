import { expect, type Page } from "@playwright/test";
import { API_URL } from "../support/env";
import { Given, Then, When, type World } from "./fixtures";

// Screen: Settings › Plan, and the API's fake Razorpay checkout for Pro.

const plan = (page: Page) => page.getByRole("region", { name: "Plan", exact: true });

async function goPro(page: Page) {
  await plan(page).getByRole("button", { name: /^Go Pro/ }).click();
  await page.getByRole("button", { name: /^Subscribe for ₹499/ }).click();
  await page.waitForURL(/\/settings\/?$/);
  await expect(plan(page)).toContainText("Pro");
}

Then("my plan reads {string} with {string}", async ({ page }, name: string, usage: string) => {
  await expect(plan(page)).toContainText(name);
  await expect(plan(page)).toContainText(usage);
});

Then("Payments says {string}", async ({ page }, text: string) => {
  await expect(page.getByRole("region", { name: "Payments", exact: true })).toContainText(text);
});

When("I go Pro on the checkout", async ({ page }) => {
  await goPro(page);
});

Given("my centre is on Pro", async ({ page }) => {
  await page.goto("/settings/");
  await goPro(page);
});

Then("my plan says it renews", async ({ page }) => {
  await expect(plan(page)).toContainText(/Renews on \d{1,2} \w{3} \d{4}/);
});

When("I cancel Pro", async ({ page }) => {
  await plan(page).getByRole("button", { name: "Cancel Pro", exact: true }).click();
});

Then("my plan says Pro lasts until the month ends", async ({ page }) => {
  await expect(plan(page)).toContainText(/Pro until \d{1,2} \w{3} \d{4}, then Free\./);
});

Given("my centre is on Pro through the API", async ({ world }) => {
  const res = await fetch(`${API_URL}/subscription`, { method: "POST", headers: { authorization: `Bearer ${(world as World).accessToken}` } });
  const { url } = (await res.json()) as { url: string };
  // The fake checkout's Pay button, as the owner would press it.
  const paid = await fetch(`${url}/pay`, { method: "POST", redirect: "manual" });
  expect(paid.status).toBe(303);
});
