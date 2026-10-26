import { expect } from "@playwright/test";
import { Given, Then, When } from "./fixtures";
import { logInThroughTheUi } from "./login.steps";

Given("I have logged in as a new owner", async ({ page, world, otp }) => {
  await logInThroughTheUi(page, world, otp);
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

Then("I am welcomed to Chukta and asked to name my centre", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Welcome to Chukta" })).toBeVisible();
  await expect(page.getByText(/name your centre/i)).toBeVisible();
});

Then("I see {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});
