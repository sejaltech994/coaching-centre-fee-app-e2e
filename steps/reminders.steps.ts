import { expect, type Page } from "@playwright/test";
import { Then, When } from "./fixtures";

// Screens: Fees › Remind (with its preview) and Reminders.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const thisMonth = () => `${MONTHS[Number(today().slice(5, 7)) - 1]} ${today().slice(0, 4)}`;
const billFor = (page: Page, student: string) =>
  page.getByRole("table").getByRole("row").filter({ hasText: student }).filter({ hasText: thisMonth() });

When("I start a reminder for {string}", async ({ page }, student: string) => {
  await billFor(page, student).getByRole("button", { name: /^Remind about bill/ }).click();
});

Then("the reminder reads {string} and has the pay link", async ({ page }, start: string) => {
  const dialog = page.getByRole("dialog", { name: "Send a WhatsApp reminder" });
  await expect(dialog).toContainText(start);
  await expect(dialog).toContainText(/\/pay\/\?t=[0-9a-f]{32}/);
});

When("I send it", async ({ page }) => {
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
});

Then("I am told {string} in the dialog", async ({ page }, text: string) => {
  await expect(page.getByRole("dialog")).toContainText(text);
});

When("I open Reminders from the menu", async ({ page }) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Reminders", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reminders", level: 1 })).toBeVisible();
});

Then("the reminders list {string}: {string}, {string}", async ({ page }, student: string, kind: string, status: string) => {
  const row = page.getByRole("table").getByRole("row").filter({ hasText: student }).first();
  await expect(row).toContainText(kind);
  await expect(row).toContainText(status);
});

When("I choose the {string} tone", async ({ page }, tone: string) => {
  await page.getByRole("group", { name: "Tone" }).getByRole("button", { name: tone, exact: true }).click();
});
